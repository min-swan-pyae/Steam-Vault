import axios from 'axios';
import asyncHandler from '../middleware/asyncHandler.js';
import { cacheService, CACHE_TYPES } from '../services/cacheService.js';

/**
 * Proxy hero images from Steam CDN to avoid CORS issues
 */
export const getHeroImage = asyncHandler(async (req, res) => {
  const { heroId } = req.params;
  
  console.log(`[HERO IMAGE] Processing request for hero ID: ${heroId}`);
  
  try {
    // Check cache first
    const cacheKey = `hero_img_${heroId}`;
    const cachedImage = cacheService.get(CACHE_TYPES.IMAGE_DATA, cacheKey);
    
    if (cachedImage) {
      console.log(`[HERO IMAGE] Cache hit for hero ID: ${heroId}`);
      const imgBuffer = Buffer.from(cachedImage, 'base64');
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 1 week
      return res.send(imgBuffer);
    }

    // Get OpenDota hero data - this is the most reliable source
    let heroes = [];
    try {
      // Try to get all heroes from OpenDota directly
      const heroesResponse = await axios.get('https://api.opendota.com/api/heroes', { timeout: 5000 });
      if (heroesResponse.status === 200 && Array.isArray(heroesResponse.data)) {
        heroes = heroesResponse.data;
        cacheService.set(CACHE_TYPES.HERO_DATA, 'all_heroes', heroes);
      }
    } catch (err) {
      console.error('Failed to fetch heroes from OpenDota API:', err.message);
      
      // Fall back to cache
      heroes = cacheService.get(CACHE_TYPES.HERO_DATA, 'all_heroes') || [];
    }
    
    // Find the hero by ID
    const hero = heroes.find(h => h.id === parseInt(heroId));
    let imageResponse = null;
    
    // Attempt 1: Direct OpenDota CDN path if available from API
    if (hero && hero.img) {
      try {
        const imgUrl = 'https://api.opendota.com' + hero.img;
        console.log(`[HERO IMAGE] Attempt 1: ${imgUrl}`);
        imageResponse = await axios.get(imgUrl, { 
          responseType: 'arraybuffer',
          timeout: 5000
        });
      } catch (err) {
        console.error(`[HERO IMAGE] Failed Attempt 1 for hero ${heroId}:`, err.message);
      }
    }
    
    // Attempt 2: OpenDota CDN with hero name
    if (!imageResponse && hero && hero.name) {
      try {
        // Strip "npc_dota_hero_" prefix if present
        const simpleName = hero.name.replace('npc_dota_hero_', '');
        const imgUrl = `https://cdn.dota2.com/apps/dota2/images/heroes/${simpleName}_full.png`;
        console.log(`[HERO IMAGE] Attempt 2: ${imgUrl}`);
        imageResponse = await axios.get(imgUrl, { 
          responseType: 'arraybuffer',
          timeout: 5000
        });
      } catch (err) {
        console.error(`[HERO IMAGE] Failed Attempt 2 for hero ${heroId}:`, err.message);
      }
    }
    
    // Attempt 3: Use predefined mapping
    if (!imageResponse) {
      const heroNames = hero.name.replace('npc_dota_hero_', '');
      const imgUrls = [
        // OpenDota official CDN paths
        `https://cdn.dota2.com/apps/dota2/images/heroes/${heroNames}_full.png`,
        `https://cdn.dota2.com/apps/dota2/images/heroes/${heroNames}_sb.png`,
        // Steam CDN paths
        `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${heroNames}.png`,
        `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/heroes/${heroNames}_full.png`
      ];
      
      for (const url of imgUrls) {
        try {
          console.log(`[HERO IMAGE] Attempt 3: ${url}`);
          imageResponse = await axios.get(url, { 
            responseType: 'arraybuffer',
            timeout: 3000
          });
          if (imageResponse.status === 200) {
            console.log(`[HERO IMAGE] Successfully fetched from ${url}`);
            break;
          }
        } catch (err) {
          console.log(`[HERO IMAGE] Failed to fetch from ${url}`);
        }
      }
    }
    
    // Attempt 4: Try a completely different approach with DotaBuff
    if (!imageResponse) {
      try {
        const url = `https://www.dotabuff.com/assets/heroes/${heroId}.jpg`;
        console.log(`[HERO IMAGE] Attempt 4 (DotaBuff): ${url}`);
        imageResponse = await axios.get(url, { 
          responseType: 'arraybuffer',
          timeout: 3000
        });
      } catch (err) {
        console.error(`[HERO IMAGE] Failed to fetch from DotaBuff:`, err.message);
      }
    }
    
    // Final fallback: use a default hero image
    if (!imageResponse || !imageResponse.data) {
      console.log('[HERO IMAGE] All attempts failed, using default hero image');
      try {
        const defaultUrl = 'https://steamcdn-a.akamaihd.net/apps/dota2/images/blog/play/dota_hero_default.jpg';
        imageResponse = await axios.get(defaultUrl, { responseType: 'arraybuffer' });
      } catch (err) {
        return res.status(404).send('Hero image not found');
      }
    }

    // Cache the successful image
    try {
      const base64Image = Buffer.from(imageResponse.data).toString('base64');
      cacheService.set(CACHE_TYPES.IMAGE_DATA, cacheKey, base64Image);
      console.log(`[HERO IMAGE] Successfully cached image for hero ${heroId}`);
    } catch (cacheErr) {
      console.error("[HERO IMAGE] Error caching image:", cacheErr);
    }

    // Send the image
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=604800'); // 1 week
    res.send(imageResponse.data);
  } catch (error) {
    console.error('[HERO IMAGE] Error proxying hero image:', error.message);
    res.status(500).send('Failed to fetch hero image');
  }
});

