/**
 * Price Alert Scheduler
 * - Fetches current prices for watchlist items every 3 hours
 * - Compares with target prices and triggers alerts
 * - Implements rate limiting and batching to avoid API abuse
 */

import firebaseService, { admin } from './firebaseService.js';
import marketService from './marketService.js';
import { FieldValue } from 'firebase-admin/firestore';

const PRICE_UPDATE_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours
const BATCH_SIZE = 10; // Process 10 items at a time
const BATCH_DELAY_MS = 2000; // 2 second delay between batches (10 items per 2s = 5 items/sec)
const MIN_PRICE_DROP_PERCENT = 5; // Minimum 5% drop
const MIN_PRICE_DROP_AMOUNT = 1; // Or minimum $1 drop

class PriceAlertScheduler {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('[PRICE SCHEDULER] Already running');
      return;
    }

    this.isRunning = true;

    // Run immediately on start
    this._runPriceUpdate().catch(e => console.error('[PRICE SCHEDULER] Initial run failed:', e));

    // Then run on interval
    this.intervalId = setInterval(() => {
      this._runPriceUpdate().catch(e => console.error('[PRICE SCHEDULER] Interval run failed:', e));
    }, PRICE_UPDATE_INTERVAL_MS);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[PRICE SCHEDULER] Stopped');
  }

  /**
   * Main price update logic
   */
  async _runPriceUpdate() {
    try {
      const startTime = Date.now();

      // Get all watchlist items with alerts enabled
      const watchlistQuery = await firebaseService.marketWatchlists
        .where('alertsEnabled', '==', true)
        .where('targetPrice', '>', 0)
        .get();

      if (watchlistQuery.empty) {
        console.log('[PRICE SCHEDULER] No watchlist items with alerts enabled');
        return;
      }

      const items = watchlistQuery.docs.map(doc => ({ id: doc.id, ref: doc.ref, ...doc.data() }));
      console.log(`[PRICE SCHEDULER] Found ${items.length} items to check`);

      // Process in batches to avoid rate limiting
      let updated = 0;
      let alerted = 0;
      let failed = 0;

      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        console.log(`[PRICE SCHEDULER] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(items.length / BATCH_SIZE)}`);

        await Promise.all(
          batch.map(item => this._updateItemPrice(item).then(result => {
            if (result.updated) updated++;
            if (result.alerted) alerted++;
            if (result.failed) failed++;
          }))
        );

        // Delay between batches (except for the last batch)
        if (i + BATCH_SIZE < items.length) {
          await this._delay(BATCH_DELAY_MS);
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[PRICE SCHEDULER] Cycle complete in ${duration}s: ${updated} updated, ${alerted} alerted, ${failed} failed`);
    } catch (error) {
      console.error('[PRICE SCHEDULER] Error in price update cycle:', error);
    }
  }

  /**
   * Update price for a single item
   */
  async _updateItemPrice(item) {
    try {
      // Fetch current price from Steam API
      const priceData = await marketService.getPriceOverview({
        appid: item.appid,
        hashName: item.hashName,
        currency: 1 // USD
      });
      
      if (!priceData || !priceData.success) {
        return { updated: false, alerted: false, failed: true };
      }

      // Parse price - getPriceOverview returns medianPrice or lowestPrice
      let currentPrice = 0;
      if (priceData.medianPrice) {
        currentPrice = parseFloat(priceData.medianPrice.replace(/[^0-9.]/g, '')) || 0;
      } else if (priceData.lowestPrice) {
        currentPrice = parseFloat(priceData.lowestPrice.replace(/[^0-9.]/g, '')) || 0;
      }
      
      if (currentPrice <= 0) {
        return { updated: false, alerted: false, failed: true };
      }

      // Update the currentPrice in Firestore AND add to priceHistory
      await item.ref.update({
        currentPrice,
        lastPriceCheck: FieldValue.serverTimestamp(),
        // Append to priceHistory array for sparkline display
        priceHistory: FieldValue.arrayUnion({
          price: currentPrice,
          timestamp: new Date()
        })
      });

      // Check if price drop is significant enough to alert
      const targetPrice = item.targetPrice || 0;
      const previousPrice = item.currentPrice || currentPrice;
      
      if (this._shouldAlert(currentPrice, targetPrice, previousPrice, item)) {
        await this._triggerAlert(item, currentPrice);
        return { updated: true, alerted: true, failed: false };
      }

      return { updated: true, alerted: false, failed: false };
    } catch (error) {
      console.error(`[PRICE SCHEDULER] Failed to update price for ${item.hashName}:`, error.message);
      return { updated: false, alerted: false, failed: true };
    }
  }

  /**
   * Determine if we should send an alert
   */
  _shouldAlert(currentPrice, targetPrice, previousPrice, item) {
    // Must be at or below target price
    if (currentPrice > targetPrice) {
      return false;
    }

    // Calculate price drop
    const dropAmount = previousPrice - currentPrice;
    const dropPercent = (dropAmount / previousPrice) * 100;

    // Must have significant drop (5% OR $1)
    if (dropAmount < MIN_PRICE_DROP_AMOUNT && dropPercent < MIN_PRICE_DROP_PERCENT) {
      return false;
    }

    // Check cooldown (don't spam alerts)
    const lastAlertAt = item.lastAlertAt?._seconds 
      ? item.lastAlertAt._seconds * 1000 
      : item.lastAlertAt 
      ? new Date(item.lastAlertAt).getTime() 
      : 0;
    
    const cooldown = firebaseService.PRICE_ALERT_COOLDOWN_MS || (4 * 60 * 60 * 1000);
    if (lastAlertAt && (Date.now() - lastAlertAt) < cooldown) {
      return false;
    }

    return true;
  }

  /**
   * Trigger a price alert notification
   */
  async _triggerAlert(item, currentPrice) {
    try {
      await firebaseService._triggerPriceAlert(item.ref, {
        ...item,
        currentPrice
      });
      console.log(`[PRICE SCHEDULER] Alert triggered: ${item.name} → $${currentPrice.toFixed(2)} (Target: $${item.targetPrice.toFixed(2)})`);
    } catch (error) {
      console.error(`[PRICE SCHEDULER] Failed to trigger alert for ${item.hashName}:`, error);
      throw error;
    }
  }

  /**
   * Utility: delay for rate limiting
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
const scheduler = new PriceAlertScheduler();
export default scheduler;
