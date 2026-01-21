import axios from 'axios';
import http from 'http';
import https from 'https';
import { cacheService, CACHE_TYPES } from './cacheService.js';
import { TIMEOUTS } from '../utils/retryUtils.js';

// HTTP/HTTPS agents with connection pooling (keep-alive)
const httpAgent = new http.Agent({ 
  keepAlive: true, 
  maxSockets: 5,  // Lower limit for Steam Market to avoid rate limiting
  keepAliveMsecs: 30000 
});
const httpsAgent = new https.Agent({ 
  keepAlive: true, 
  maxSockets: 5,
  keepAliveMsecs: 30000 
});

const steamApi = axios.create({
  baseURL: 'https://api.steampowered.com',
  timeout: TIMEOUTS.STEAM_API,
  headers: { 
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate'
  },
  httpAgent,
  httpsAgent
});

// Steam Community Market client
const httpClient = axios.create({
  baseURL: 'https://steamcommunity.com/market',
  timeout: TIMEOUTS.STEAM_MARKET,
  headers: {
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://steamcommunity.com/market/',
    'Origin': 'https://steamcommunity.com',
    'X-Requested-With': 'XMLHttpRequest'
  },
  httpAgent,
  httpsAgent
});

const IMAGE_BASE = 'https://steamcommunity-a.akamaihd.net/economy/image/';

function buildIconUrl(icon) {
  if (!icon) return null;
  return `${IMAGE_BASE}${icon}/128fx128f`;
}

function normalizeSearchResult(r, fallbackAppid) {
  const asset = r.asset_description || {};
  return {
    id: `${(r.appid || fallbackAppid)}_${encodeURIComponent(r.hash_name || r.name)}`,
    appid: r.appid || fallbackAppid,
    name: r.name,
    hashName: r.hash_name || r.name,
    iconUrl: buildIconUrl(asset.icon_url || asset.icon_url_large),
    sellListings: r.sell_listings || 0,
    sellPriceText: normalizePriceText(r.sell_price_text) || null,
    salePriceText: normalizePriceText(r.sale_price_text) || null,
    appName: (asset.app_data && asset.app_data.app_name) || (r.app_data && r.app_data.app_name) || undefined,
  };
}

function parsePriceTextToNumber(text) {
  if (!text || typeof text !== 'string') return 0;
  const num = parseFloat(text.replace(/[^0-9.,]/g, '').replace(/,(?=\d{2}$)/, '.').replace(/,/g, ''));
  return Number.isFinite(num) ? num : 0;
}

function normalizePriceText(priceText) {
  if (!priceText || typeof priceText !== 'string') return null;
  
  // Remove Singapore Dollar prefix and replace with USD
  // S$25.50 -> $25.50
  const normalized = priceText.replace(/^S\$/, '$');
  
  return normalized;
}

function buildFilterParams(appid, filters = {}) {
  const params = {};
  const clean = Object.fromEntries(
    Object.entries(filters).filter(([_, v]) => v != null && v !== '')
  );

  // Dota 2
  if (appid === 570) {
    if (clean.rarity) params[`category_${appid}_Rarity[]`] = clean.rarity; // Rarity values now include tag_Rarity_ prefix
    if (clean.hero) params[`category_${appid}_Hero[]`] = clean.hero; // Hero values now include tag_ prefix
    if (clean.type) params[`category_${appid}_Type[]`] = clean.type; // Type values now include tag_ prefix
    // Legacy support for old heroTag field
    if (clean.heroTag) params[`category_${appid}_Hero[]`] = clean.heroTag;
  }

  // CS2
  if (appid === 730) {
    if (clean.type) {
      if (clean.type.startsWith('tag_weapon_')) {
        // Specific weapons (M4A1-S, AK-47, Gut Knife, etc.) go to Weapon category
        params[`category_${appid}_Weapon[]`] = clean.type;
      } else {
        // General types (Knives, Rifles, etc.) go to Type category
        params[`category_${appid}_Type[]`] = clean.type;
      }
    }

    // Wear (Exterior) – match frontend noExteriorTypes
    const noExterior = [
      'tag_Type_CustomPlayer',
      'tag_CSGO_Type_MusicKit',
      'tag_CSGO_Tool_Keychain', 
      'tag_CSGO_Type_Spray',  
      'tag_CSGO_Tool_Patch',
      'tag_CSGO_Type_Collectible',
      'tag_CSGO_Type_Ticket',
      'tag_CSGO_Tool_WeaponCase_KeyTag',
      'tag_CSGO_Tool_GiftTag',
      'tag_CSGO_Tool_Name_TagTag', 
      'tag_CSGO_Type_Tool',
      'tag_weapon_taser',
      'tag_CSGO_Tool_Sticker',      // Stickers
      'tag_CSGO_Type_WeaponCase',   // Cases
    ];
    
    if (clean.exterior && !noExterior.includes(clean.type)) {
      const wearMap = {
        factorynew: 'tag_WearCategory0',
        minimalwear: 'tag_WearCategory1',
        fieldtested: 'tag_WearCategory2',
        wellworn: 'tag_WearCategory3',
        battlescarred: 'tag_WearCategory4'
      };
      
      if (wearMap[clean.exterior]) {
        params[`category_${appid}_Exterior[]`] = wearMap[clean.exterior];
      }
    }

    // Quality – souvenir=tag_tournament, stattrak=tag_strange
    // Items that don't support quality filters at all - match frontend noQualityTypes
    const noQuality = [
      'tag_Type_Hands',              // Gloves
      'tag_Type_CustomPlayer',
      'tag_CSGO_Tool_Keychain', 
      'tag_CSGO_Type_Spray',  
      'tag_CSGO_Tool_Patch',
      'tag_CSGO_Type_Collectible',
      'tag_CSGO_Type_Ticket',
      'tag_CSGO_Tool_WeaponCase_KeyTag',
      'tag_CSGO_Tool_GiftTag',
      'tag_CSGO_Tool_Name_TagTag', 
      'tag_CSGO_Type_Tool',
      'tag_CSGO_Tool_Sticker',      // Stickers
      'tag_CSGO_Type_WeaponCase',   // Cases
    ];
    
    // Items that only support StatTrak (not Souvenir) - match frontend statTrakOnlyTypes
    const statTrakOnlyItems = [
      'tag_CSGO_Type_Knife',     // Knives (general)
      'tag_weapon_bayonet',
      'tag_weapon_knife_survival_bowie',
      'tag_weapon_knife_butterfly',
      'tag_weapon_knife_css',
      'tag_weapon_knife_falchion',
      'tag_weapon_knife_flip',
      'tag_weapon_knife_gut',
      'tag_weapon_knife_karambit',
      'tag_weapon_knife_kukri',
      'tag_weapon_knife_m9_bayonet',
      'tag_weapon_knife_gypsy_jackknife',
      'tag_CSGO_Type_MusicKit'   // Music Kits
    ];
    
    // Check if it's a knife weapon (specific knife)
    const isKnifeWeapon = clean.type && clean.type.includes('knife');
    const isKnifeType = clean.type === 'tag_CSGO_Type_Knife';
    
    if (!noQuality.includes(clean.type)) {
      if (clean.stattrak === true || clean.stattrak === 'true') {
        params[`category_${appid}_Quality[]`] = 'tag_strange';
      }
      // Only allow souvenir for weapons (not knives/music kits)
      if ((clean.souvenir === true || clean.souvenir === 'true') && 
          !statTrakOnlyItems.includes(clean.type) && 
          !isKnifeWeapon) {
        params[`category_${appid}_Quality[]`] = 'tag_tournament';
      }
    }
  }

  return params;
}

// Gentle rate limiter with retry/backoff
class RequestQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.lastRequestTime = 0;
    this.minDelay = 3500; // ~3.5s between calls to avoid 429 rate limiting from Steam
    this.maxDelay = 30000; // Longer max delay for backoff
    this.currentDelay = this.minDelay;
    this.failureCount = 0;
    this.concurrentLimit = 1;
    this.activeRequests = 0;
    this.lastRateLimitTime = 0; // Track when we last hit a 429
  }
  async enqueue(requestFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ requestFn, resolve, reject, retries: 0 });
      this.processQueue();
    });
  }
  async processQueue() {
    if (this.processing || this.queue.length === 0 || this.activeRequests >= this.concurrentLimit) return;
    this.processing = true;
    while (this.queue.length > 0 && this.activeRequests < this.concurrentLimit) {
      const { requestFn, resolve, reject, retries } = this.queue.shift();
      this.activeRequests++;
      try {
        const now = Date.now();
        const span = now - this.lastRequestTime;
        const wait = Math.max(0, this.currentDelay - span);
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
        this.lastRequestTime = Date.now();

        const result = await requestFn();
        this.failureCount = 0;
        this.currentDelay = this.minDelay;
        this.activeRequests--;
        resolve(result);
      } catch (err) {
        this.activeRequests--;
        console.error(`[REQUEST QUEUE] Request failed:`, err.message);
        const status = err?.response?.status;
        const isTimeout = err.code === 'ECONNABORTED' || /timeout/i.test(err.message || '');
        const isRateLimit = status === 429;
        const isConnectionError = err.code === 'ECONNRESET' || /socket hang up/i.test(err.message || '');
        
        if ((isRateLimit || isTimeout || isConnectionError) && retries < 3) {
          this.failureCount++;
          
          // Longer cooldown for rate limits
          if (isRateLimit) {
            this.lastRateLimitTime = Date.now();
            // Wait 10-30 seconds on 429
            const rateLimitWait = 10000 + Math.random() * 20000;
            console.warn(`[REQUEST QUEUE] Rate limited (429). Waiting ${(rateLimitWait/1000).toFixed(1)}s before retry...`);
            await new Promise(r => setTimeout(r, rateLimitWait));
          } else {
            // Exponential backoff for other errors
            this.currentDelay = Math.min(this.maxDelay, this.minDelay * Math.pow(2, this.failureCount));
            await new Promise(r => setTimeout(r, this.currentDelay));
          }
          
          this.queue.unshift({ requestFn, resolve, reject, retries: retries + 1 });
          continue;
        }
        console.error(`[REQUEST QUEUE] Request failed permanently:`, err.message);
        reject(err);
      }
    }
    this.processing = false;
  }
}
const requestQueue = new RequestQueue();
function scheduledGet(path, config) {
  return requestQueue.enqueue(() => httpClient.get(path, config));
}

// Search with intelligent bulk fetching (no pagination on backend)
async function searchItems({ appid, query = '', start = 0, pageSize = 10, filters = {}, sortBy = 'popularity', minPrice, maxPrice }) {
  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(([_, v]) => v != null && v !== '')
  );
  
  // Create cache key for this specific page including sorting
  const cacheParams = { appid, query, start, pageSize, filters: cleanFilters, sortBy, minPrice, maxPrice };
  const pageKey = `search_page_${JSON.stringify(cacheParams)}`;

  return cacheService.getOrSetDeduped(CACHE_TYPES.MARKET_DATA, pageKey, async () => {
    // Map sortBy to Steam's sort options
    // Based on Steam URLs like #p1_name_asc, #p1_price_asc
    let sortColumn = 'popular';
    let sortDir = 'desc';
    
    
    switch (sortBy) {
      case 'priceAsc':
      case 'price_asc':
        sortColumn = 'price';
        sortDir = 'asc';
        break;
      case 'priceDesc':
      case 'price_desc':
        sortColumn = 'price';
        sortDir = 'desc';
        break;
      case 'name':
      case 'nameAsc':
      case 'name_asc':
        sortColumn = 'name';
        sortDir = 'asc';
        break;
      case 'nameDesc':
      case 'name_desc':
        sortColumn = 'name';
        sortDir = 'desc';
        break;
      case 'popularity':
      default:
        sortColumn = 'popular';
        sortDir = 'desc';
        break;
    }

    const baseParams = {
      appid,
      start: start || 0,
      count: pageSize || 10,
      norender: 1,
      format: 'json',
      search_descriptions: 0,
      hl: 'en',
      currency: 1, // Force USD (1 = USD, 3 = EUR, 23 = SGD, etc.)
    };
    
    // Add sorting parameters - try different approaches
    if (sortBy === 'priceAsc') {
      baseParams.sort_column = 'price';
      baseParams.sort_dir = 'asc';
    } else if (sortBy === 'priceDesc') {
      baseParams.sort_column = 'price'; 
      baseParams.sort_dir = 'desc';
    } else if (sortBy === 'name') {
      baseParams.sort_column = 'name';
      baseParams.sort_dir = 'asc';
    } else {
      // Default to popularity
      baseParams.sort_column = 'popular';
      baseParams.sort_dir = 'desc';
    }
    
    if (query) baseParams.query = query;
    if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
      const minPriceNum = parseFloat(minPrice);
      if (!isNaN(minPriceNum)) {
        baseParams.price_min = Math.floor(minPriceNum * 100); // Steam uses cents
      }
    }
    if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
      const maxPriceNum = parseFloat(maxPrice);
      if (!isNaN(maxPriceNum)) {
        baseParams.price_max = Math.floor(maxPriceNum * 100); // Steam uses cents
      }
    }
    

    // Apply the same filtering rules as the frontend
    const noExteriorTypes = [
      'tag_Type_CustomPlayer',
      'tag_CSGO_Type_MusicKit',
      'tag_CSGO_Tool_Keychain', 
      'tag_CSGO_Type_Spray',  
      'tag_CSGO_Tool_Patch',
      'tag_CSGO_Type_Collectible',
      'tag_CSGO_Type_Ticket',
      'tag_CSGO_Tool_WeaponCase_KeyTag',
      'tag_CSGO_Tool_GiftTag',
      'tag_CSGO_Tool_Name_TagTag', 
      'tag_CSGO_Type_Tool',
      'tag_weapon_taser',
      'tag_CSGO_Tool_Sticker',      // Stickers
      'tag_CSGO_Type_WeaponCase',   // Cases
    ];

    const noQualityTypes = [
      'tag_Type_Hands',              // Gloves
      'tag_Type_CustomPlayer',
      'tag_CSGO_Tool_Keychain', 
      'tag_CSGO_Type_Spray',  
      'tag_CSGO_Tool_Patch',
      'tag_CSGO_Type_Collectible',
      'tag_CSGO_Type_Ticket',
      'tag_CSGO_Tool_WeaponCase_KeyTag',
      'tag_CSGO_Tool_GiftTag',
      'tag_CSGO_Tool_Name_TagTag', 
      'tag_CSGO_Type_Tool',
      'tag_CSGO_Tool_Sticker',      // Stickers
      'tag_CSGO_Type_WeaponCase',   // Cases
    ];

    // Filter out parameters based on item type compatibility
    const filtersToRemove = [];
    
    // Remove exterior filter for items that don't support it
    if (noExteriorTypes.includes(cleanFilters.type)) {
      filtersToRemove.push('exterior');
    }
    
    // Remove quality filters for items that don't support them
    if (noQualityTypes.includes(cleanFilters.type)) {
      filtersToRemove.push('stattrak', 'souvenir');
    }

    const stitchedFilters = filtersToRemove.length > 0
      ? Object.fromEntries(
          Object.entries(cleanFilters).filter(
            ([k]) => !filtersToRemove.includes(k)
          )
        )
      : cleanFilters;

    const filterParams = buildFilterParams(appid, stitchedFilters);

    // Fetch single page with proper pagination (not bulk)
    const collected = [];
    let total = 0;
    
    const params = {
      ...baseParams,
      ...filterParams,
      start: start || 0,
      count: pageSize || 10,
    };
    
    try {
      
      const startTime = Date.now();
      const res = await scheduledGet('/search/render/', { params });
      const endTime = Date.now();
      
      
      const page = (res.data?.results || []).map((r) => normalizeSearchResult(r, appid));
      total = res.data?.total_count || 0;
      collected.push(...page);
    } catch (error) {
      console.error(`[MARKET] Single page fetch failed:`, error.message);
      console.error(`[MARKET] Error details:`, error.code, error.response?.status);
      return { total: 0, results: [] }; 
    }

    return { 
      total: total, 
      results: collected,
      fullDataset: false // Flag to indicate this is paginated data
    };
  }, 600); // Cache for 10 minutes for individual pages
}

async function getPriceOverview({ appid, hashName, currency = 1 }) {
  const key = `price_${appid}_${hashName}_${currency}`;
  return cacheService.getOrSetDeduped(CACHE_TYPES.MARKET_DATA, key, async () => {
    try {
      const res = await scheduledGet('/priceoverview/', {
        params: { appid, currency, market_hash_name: hashName },
      });
      return {
        success: !!res.data?.success,
        lowestPrice: res.data?.lowest_price || null,
        medianPrice: res.data?.median_price || null,
        volume: res.data?.volume || null,
      };
    } catch {
      return { success: false, lowestPrice: null, medianPrice: null, volume: null };
    }
  }, 600);
}

async function getTrending({ appid = 730, count = 15 }) {
  const key = `trending_${appid}_${count}`;
  // Cache trending items for 30 minutes since they don't change frequently
  // This reduces Steam API calls significantly
  return cacheService.getOrSetDeduped(CACHE_TYPES.MARKET_DATA, key, async () => {
    const { results, total } = await searchItems({
      appid,
      query: '',
      start: 0,
      count,
      filters: {},
    });
    const sorted = results
      .slice()
      .sort(
        (a, b) =>
          parsePriceTextToNumber(b.salePriceText || b.sellPriceText) -
          parsePriceTextToNumber(a.salePriceText || a.sellPriceText)
      );
    return { results: sorted.slice(0, count), total };
  }, 1800); // 30 minutes cache (was 600 = 10 minutes)
}

async function getPriceHistory({ appid, hashName, currency = 1 }) {
  const key = `history_${appid}_${hashName}_${currency}`;
  return cacheService.getOrSetDeduped(CACHE_TYPES.MARKET_DATA, key, async () => {
    try {
      const res = await scheduledGet('/pricehistory/', {
        params: { appid, market_hash_name: hashName, currency },
      });
      return { success: !!res.data?.success, prices: res.data?.prices || [] };
    } catch {
      return { success: false, prices: [] };
    }
  }, 600);
}

async function getAssetClassInfo({ appid, classids = [] }) {
  if (!classids.length) return {};
  const key = `classinfo_${appid}_${classids.slice(0, 10).join(',')}`;
  return cacheService.getOrSetDeduped(CACHE_TYPES.MARKET_DATA, key, async () => {
    const params = {
      appid,
      key: process.env.STEAM_API_KEY,
      class_count: classids.length,
    };
    classids.forEach((id, i) => {
      params[`classid${i}`] = id;
    });
    const res = await steamApi.get('/ISteamEconomy/GetAssetClassInfo/v1/', { params });
    return res.data?.result || {};
  }, 3600);
}

export default {
  searchItems: searchItems, // Use direct page-based version for API
  searchItemsBulk: searchItems, // Expose full dataset fetch if needed
  getPriceOverview,
  getTrending,
  getPriceHistory,
  getAssetClassInfo,
};
           