import axios from 'axios';
import asyncHandler from '../middleware/asyncHandler.js';
import { cacheService, CACHE_TYPES } from '../services/cacheService.js';

/**
 * Proxy hero images from Steam CDN to avoid CORS issues
 */
export const getHeroImage = asyncHandler(async (req, res) => {
  const { heroId } = req.params;
  
  
  // Check cache first
  const cacheKey = `hero_img_${heroId}`;
  const cachedImage = cacheService.get(CACHE_TYPES.IMAGE_DATA, cacheKey);
  
  if (cachedImage) {
    const imgBuffer = Buffer.from(cachedImage, 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=604800'); // 1 week
    return res.send(imgBuffer);
  }
  
  try {
    // Get hero data from cache only (loaded on server startup via dotaUtils.loadHeroMap)
    // NEVER fetch from API on image requests - causes timeouts!
    const cachedHeroes = cacheService.get(CACHE_TYPES.HERO_DATA, 'all_heroes');
    const heroes = Array.isArray(cachedHeroes) ? cachedHeroes : [];
    
    // Find the hero by ID
    const hero = heroes.find(h => h.id === parseInt(heroId));
    let imageResponse = null;
    let successUrl = null;
    
    // Attempt 1: Direct OpenDota CDN path if available from API
    if (hero && hero.img) {
      try {
        const imgUrl = 'https://api.opendota.com' + hero.img;
        imageResponse = await axios.get(imgUrl, { 
          responseType: 'arraybuffer',
          timeout: 5000,
          validateStatus: (status) => status === 200
        });
        successUrl = imgUrl;
      } catch (err) {
      }
    }
    
    // Attempt 2: Try multiple CDN paths
    if (!imageResponse && hero && hero.name) {
      const simpleName = hero.name.replace('npc_dota_hero_', '');
      const imgUrls = [
        `https://cdn.steamstatic.com/apps/dota2/images/dota_react/heroes/${simpleName}.png`,
        `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${simpleName}.png`,
        `https://steamcdn-a.akamaihd.net/apps/dota2/images/heroes/${simpleName}_full.png`,
        `https://api.opendota.com/apps/dota2/images/heroes/${simpleName}_full.png`,
        `https://api.opendota.com/apps/dota2/images/heroes/${simpleName}_sb.png`
      ];
      
      for (const url of imgUrls) {
        try {
          imageResponse = await axios.get(url, { 
            responseType: 'arraybuffer',
            timeout: 3000,
            validateStatus: (status) => status === 200
          });
          successUrl = url;
          break;
        } catch (err) {
        }
      }
    }
    
    // Attempt 3: If we still don't have an image and don't have hero data, try direct ID approach
    if (!imageResponse) {
      const fallbackUrls = [
        `https://cdn.steamstatic.com/apps/dota2/images/dota_react/heroes/hero_${heroId}.png`,
        `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/hero_${heroId}.png`
      ];
      
      for (const url of fallbackUrls) {
        try {
          imageResponse = await axios.get(url, { 
            responseType: 'arraybuffer',
            timeout: 3000,
            validateStatus: (status) => status === 200
          });
          successUrl = url;
          break;
        } catch (err) {
        }
      }
    }
    
    // If all attempts failed, return 404 with a transparent 1x1 PNG instead of 500
    if (!imageResponse || !imageResponse.data) {
      // Return a 1x1 transparent PNG as fallback
      const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes only
      return res.status(200).send(transparentPng);
    }

    // Cache the successful image
    try {
      const base64Image = Buffer.from(imageResponse.data).toString('base64');
      cacheService.set(CACHE_TYPES.IMAGE_DATA, cacheKey, base64Image, 604800); // 1 week
    } catch (cacheErr) {
      console.error('[HERO IMAGE] Error caching image:', cacheErr);
    }

    // Send the image
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=604800'); // 1 week
    return res.send(imageResponse.data);
  } catch (error) {
    console.error('[HERO IMAGE] Error fetching hero image:', error.message);
    // Return a 1x1 transparent PNG as fallback instead of 500
    const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).send(transparentPng);
  }
});

/**
 * Proxy item images and cache aggressively so the UI can render instantly
 */
export const getItemImage = asyncHandler(async (req, res) => {
  const rawName = req.params.itemName || '';
  
  // Normalize item name: remove 'item_' prefix, convert to lowercase, clean special chars
  const itemSlug = rawName
    .toLowerCase()
    .replace(/^item_/, '')
    .replace(/[^a-z0-9_]/g, '');

  if (!itemSlug) {
    // Return transparent 1x1 PNG for invalid items
    const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).send(transparentPng);
  }

  // Check cache
  const cacheKey = `item_img_${itemSlug}`;
  const cached = cacheService.get(CACHE_TYPES.IMAGE_DATA, cacheKey);
  if (cached) {
    const imgBuffer = Buffer.from(cached, 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days
    return res.send(imgBuffer);
  }

  // Try multiple CDN sources
  const cdnCandidates = [
    `https://cdn.steamstatic.com/apps/dota2/images/dota_react/items/${itemSlug}.png`,
    `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${itemSlug}.png`,
    `https://steamcdn-a.akamaihd.net/apps/dota2/images/items/${itemSlug}_lg.png`,
    `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/items/${itemSlug}_lg.png`,
    `https://api.opendota.com/apps/dota2/images/items/${itemSlug}_lg.png`
  ];

  let imageResponse = null;
  let successUrl = null;

  for (const url of cdnCandidates) {
    try {
      imageResponse = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 5000,
        validateStatus: (status) => status === 200
      });
      
      if (imageResponse && imageResponse.data && imageResponse.data.length > 0) {
        successUrl = url;
        break;
      }
    } catch (err) {
    }
  }

  // If all attempts failed, return transparent PNG
  if (!imageResponse || !imageResponse.data) {
    const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache failed lookups for 5 minutes only
    return res.status(200).send(transparentPng);
  }

  // Cache the successful image
  try {
    const base64Image = Buffer.from(imageResponse.data).toString('base64');
    cacheService.set(CACHE_TYPES.IMAGE_DATA, cacheKey, base64Image, 86400 * 30); // 30 days
  } catch (err) {
    console.error('[ITEM IMAGE] Failed to cache image:', err.message);
  }

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days
  res.send(imageResponse.data);
});

/**
 * Pre-warm hero image cache on server startup
 * Fetches and caches all hero images to avoid slow first-load
 */
export const preWarmHeroImageCache = async () => {
  try {
    const cachedHeroes = cacheService.get(CACHE_TYPES.HERO_DATA, 'all_heroes');
    const heroes = Array.isArray(cachedHeroes) ? cachedHeroes : [];
    
    if (heroes.length === 0) {
      console.log('⚠️ No heroes in cache, skipping image pre-warming');
      return;
    }
    
    console.log(`🔥 Pre-warming hero image cache for ${heroes.length} heroes...`);
    let cached = 0;
    let skipped = 0;
    let failed = 0;
    
    // Process in batches of 10 to avoid overwhelming the CDN
    const batchSize = 10;
    for (let i = 0; i < heroes.length; i += batchSize) {
      const batch = heroes.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (hero) => {
        const cacheKey = `hero_img_${hero.id}`;
        
        // Skip if already cached
        if (cacheService.get(CACHE_TYPES.IMAGE_DATA, cacheKey)) {
          skipped++;
          return;
        }
        
        try {
          // Try OpenDota CDN path first
          let imageResponse = null;
          const simpleName = hero.name.replace('npc_dota_hero_', '');
          const imgUrl = `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${simpleName}.png`;
          
          imageResponse = await axios.get(imgUrl, { 
            responseType: 'arraybuffer',
            timeout: 5000,
            validateStatus: (status) => status === 200
          });
          
          if (imageResponse && imageResponse.data) {
            // Cache the image
            const base64Image = Buffer.from(imageResponse.data).toString('base64');
            cacheService.set(CACHE_TYPES.IMAGE_DATA, cacheKey, base64Image, 86400 * 30); // 30 days
            cached++;
          }
        } catch (err) {
          failed++;
        }
      }));
      
      // Small delay between batches to be nice to CDN
      if (i + batchSize < heroes.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`✅ Hero image cache warmed: ${cached} cached, ${skipped} already cached, ${failed} failed`);
  } catch (err) {
    console.error('❌ Error pre-warming hero image cache:', err.message);
  }
};

