import asyncHandler from '../middleware/asyncHandler.js';
import marketService from '../services/marketService.js';
import firebaseService from '../services/firebaseService.js';

// GET /api/market/categories?appid=730
export const getCategories = asyncHandler(async (req, res) => {
  const appid = parseInt(req.query.appid || '730', 10);
  if (appid === 730) {
    return res.json({
      appid,
      categories: {
        type: [
          { label: 'All', value: null },
          { label: 'Rifles', value: 'tag_CSGO_Type_Rifle' },
          { label: 'Pistols', value: 'tag_CSGO_Type_Pistol' },
          { label: 'SMGs', value: 'tag_CSGO_Type_SMG' },
          { label: 'Sniper Rifles', value: 'tag_CSGO_Type_SniperRifle' },
          { label: 'Shotguns', value: 'tag_CSGO_Type_Shotgun' },
          { label: 'Knives', value: 'tag_CSGO_Type_Knife' },
          { label: 'Gloves', value: 'tag_Type_Hands' },
          { label: 'Cases', value: 'tag_CSGO_Type_WeaponCase' },
          { label: 'Stickers', value: 'tag_CSGO_Tool_Sticker' },
          { label: 'Music Kits', value: 'tag_CSGO_Type_MusicKit' },
          { label: 'Agents', value: 'tag_CSGO_Type_Equipment' }
        ]
      }
    });
  }
  // Dota 2 categories - comprehensive list
  return res.json({
    appid,
    categories: {
      rarity: [
        { label: 'All', value: null },
        { label: 'Arcana', value: 'Arcana' },
        { label: 'Immortal', value: 'Immortal' },
        { label: 'Legendary', value: 'Legendary' },
        { label: 'Mythical', value: 'Mythical' },
        { label: 'Rare', value: 'Rare' },
        { label: 'Uncommon', value: 'Uncommon' },
        { label: 'Common', value: 'Common' }
      ],
      type: [
        { label: 'All', value: null },
        { label: 'Hero Items', value: 'Wearable' },
        { label: 'Weapon', value: 'Weapon' },
        { label: 'Bundle', value: 'Bundle' },
        { label: 'Ward', value: 'Ward' },
        { label: 'Courier', value: 'Courier' },
        { label: 'Loading Screen', value: 'Loading Screen' },
        { label: 'Music Pack', value: 'Music' },
        { label: 'Emoticon', value: 'Emoticon' },
        { label: 'Voice', value: 'Voice' },
        { label: 'Announcer', value: 'Announcer' },
        { label: 'HUD Skin', value: 'HUD Skin' },
        { label: 'Cursors', value: 'Cursors' },
        { label: 'Tools', value: 'Tool' }
      ],
      hero: [
        { label: 'All Heroes', value: null },
        { label: 'Anti-Mage', value: 'Anti-Mage' },
        { label: 'Axe', value: 'Axe' },
        { label: 'Bane', value: 'Bane' },
        { label: 'Bloodseeker', value: 'Bloodseeker' },
        { label: 'Crystal Maiden', value: 'Crystal Maiden' },
        { label: 'Drow Ranger', value: 'Drow Ranger' },
        { label: 'Earthshaker', value: 'Earthshaker' },
        { label: 'Juggernaut', value: 'Juggernaut' },
        { label: 'Mirana', value: 'Mirana' },
        { label: 'Morphling', value: 'Morphling' },
        { label: 'Shadow Fiend', value: 'Shadow Fiend' },
        { label: 'Phantom Lancer', value: 'Phantom Lancer' },
        { label: 'Puck', value: 'Puck' },
        { label: 'Pudge', value: 'Pudge' },
        { label: 'Razor', value: 'Razor' },
        { label: 'Sand King', value: 'Sand King' },
        { label: 'Storm Spirit', value: 'Storm Spirit' },
        { label: 'Sven', value: 'Sven' },
        { label: 'Tiny', value: 'Tiny' },
        { label: 'Vengeful Spirit', value: 'Vengeful Spirit' },
        { label: 'Windranger', value: 'Windranger' },
        { label: 'Zeus', value: 'Zeus' },
        { label: 'Kunkka', value: 'Kunkka' },
        { label: 'Lina', value: 'Lina' },
        { label: 'Lion', value: 'Lion' },
        { label: 'Shadow Shaman', value: 'Shadow Shaman' },
        { label: 'Slardar', value: 'Slardar' },
        { label: 'Tidehunter', value: 'Tidehunter' },
        { label: 'Witch Doctor', value: 'Witch Doctor' },
        { label: 'Lich', value: 'Lich' },
        { label: 'Riki', value: 'Riki' },
        { label: 'Enigma', value: 'Enigma' },
        { label: 'Tinker', value: 'Tinker' },
        { label: 'Sniper', value: 'Sniper' },
        { label: 'Necrophos', value: 'Necrophos' },
        { label: 'Warlock', value: 'Warlock' },
        { label: 'Beastmaster', value: 'Beastmaster' },
        { label: 'Queen of Pain', value: 'Queen of Pain' },
        { label: 'Venomancer', value: 'Venomancer' },
        { label: 'Faceless Void', value: 'Faceless Void' },
        { label: 'Wraith King', value: 'Wraith King' },
        { label: 'Death Prophet', value: 'Death Prophet' },
        { label: 'Phantom Assassin', value: 'Phantom Assassin' },
        { label: 'Pugna', value: 'Pugna' },
        { label: 'Templar Assassin', value: 'Templar Assassin' },
        { label: 'Viper', value: 'Viper' },
        { label: 'Luna', value: 'Luna' },
        { label: 'Dragon Knight', value: 'Dragon Knight' },
        { label: 'Dazzle', value: 'Dazzle' },
        { label: 'Clockwerk', value: 'Clockwerk' },
        { label: 'Leshrac', value: 'Leshrac' },
        { label: "Nature's Prophet", value: "Nature's Prophet" },
        { label: 'Lifestealer', value: 'Lifestealer' },
        { label: 'Dark Seer', value: 'Dark Seer' },
        { label: 'Clinkz', value: 'Clinkz' },
        { label: 'Omniknight', value: 'Omniknight' },
        { label: 'Enchantress', value: 'Enchantress' },
        { label: 'Huskar', value: 'Huskar' },
        { label: 'Night Stalker', value: 'Night Stalker' },
        { label: 'Broodmother', value: 'Broodmother' },
        { label: 'Bounty Hunter', value: 'Bounty Hunter' },
        { label: 'Weaver', value: 'Weaver' },
        { label: 'Jakiro', value: 'Jakiro' },
        { label: 'Batrider', value: 'Batrider' },
        { label: 'Chen', value: 'Chen' },
        { label: 'Spectre', value: 'Spectre' },
        { label: 'Ancient Apparition', value: 'Ancient Apparition' },
        { label: 'Doom', value: 'Doom' },
        { label: 'Ursa', value: 'Ursa' },
        { label: 'Spirit Breaker', value: 'Spirit Breaker' },
        { label: 'Gyrocopter', value: 'Gyrocopter' },
        { label: 'Alchemist', value: 'Alchemist' },
        { label: 'Invoker', value: 'Invoker' },
        { label: 'Silencer', value: 'Silencer' },
        { label: 'Outworld Destroyer', value: 'Outworld Destroyer' },
        { label: 'Lycan', value: 'Lycan' },
        { label: 'Brewmaster', value: 'Brewmaster' },
        { label: 'Shadow Demon', value: 'Shadow Demon' },
        { label: 'Lone Druid', value: 'Lone Druid' },
        { label: 'Chaos Knight', value: 'Chaos Knight' },
        { label: 'Meepo', value: 'Meepo' },
        { label: 'Treant Protector', value: 'Treant Protector' },
        { label: 'Ogre Magi', value: 'Ogre Magi' },
        { label: 'Undying', value: 'Undying' },
        { label: 'Rubick', value: 'Rubick' },
        { label: 'Disruptor', value: 'Disruptor' },
        { label: 'Nyx Assassin', value: 'Nyx Assassin' },
        { label: 'Naga Siren', value: 'Naga Siren' },
        { label: 'Keeper of the Light', value: 'Keeper of the Light' },
        { label: 'Io', value: 'Io' },
        { label: 'Visage', value: 'Visage' },
        { label: 'Slark', value: 'Slark' },
        { label: 'Medusa', value: 'Medusa' },
        { label: 'Troll Warlord', value: 'Troll Warlord' },
        { label: 'Centaur Warrunner', value: 'Centaur Warrunner' },
        { label: 'Magnus', value: 'Magnus' },
        { label: 'Timbersaw', value: 'Timbersaw' },
        { label: 'Bristleback', value: 'Bristleback' },
        { label: 'Tusk', value: 'Tusk' },
        { label: 'Skywrath Mage', value: 'Skywrath Mage' },
        { label: 'Abaddon', value: 'Abaddon' },
        { label: 'Elder Titan', value: 'Elder Titan' },
        { label: 'Legion Commander', value: 'Legion Commander' },
        { label: 'Techies', value: 'Techies' },
        { label: 'Ember Spirit', value: 'Ember Spirit' },
        { label: 'Earth Spirit', value: 'Earth Spirit' },
        { label: 'Underlord', value: 'Underlord' },
        { label: 'Terrorblade', value: 'Terrorblade' },
        { label: 'Phoenix', value: 'Phoenix' },
        { label: 'Oracle', value: 'Oracle' },
        { label: 'Winter Wyvern', value: 'Winter Wyvern' },
        { label: 'Arc Warden', value: 'Arc Warden' },
        { label: 'Monkey King', value: 'Monkey King' },
        { label: 'Dark Willow', value: 'Dark Willow' },
        { label: 'Pangolier', value: 'Pangolier' },
        { label: 'Grimstroke', value: 'Grimstroke' },
        { label: 'Hoodwink', value: 'Hoodwink' },
        { label: 'Void Spirit', value: 'Void Spirit' },
        { label: 'Snapfire', value: 'Snapfire' },
        { label: 'Mars', value: 'Mars' },
        { label: 'Dawnbreaker', value: 'Dawnbreaker' },
        { label: 'Marci', value: 'Marci' },
        { label: 'Primal Beast', value: 'Primal Beast' },
        { label: 'Muerta', value: 'Muerta' }
      ]
    }
  });
});

// GET /api/market/trending?appid=730&count=20
export const getTrendingItems = asyncHandler(async (req, res) => {
  const appid = parseInt(req.query.appid || '730', 10);
  const count = Math.min(parseInt(req.query.count || '20', 10), 50);
  const { results, total } = await marketService.getTrending({ appid, count });
  res.json({ appid, count, total, items: results });
});

// GET /api/market/search?appid=730&q=ak&start=0&count=20
export const searchMarket = asyncHandler(async (req, res) => {
  const appid = parseInt(req.query.appid || '730', 10);
  const q = String(req.query.q || '');
  const start = Math.max(parseInt(req.query.start || '0', 10), 0);
  const count = Math.min(parseInt(req.query.count || '20', 10), 50);
  const filters = {
    rarity: req.query.rarity || undefined,
    heroTag: req.query.heroTag || undefined,
    typeTag: req.query.typeTag || undefined,
    exterior: req.query.exterior || undefined,
    stattrak: req.query.stattrak || undefined,
    souvenir: req.query.souvenir || undefined
  };


  const result = await marketService.searchItems({ appid, query: q, start, count, filters });
  // Always return 200 with empty results to make UI simple
  res.json({ 
    appid, 
    query: q, 
    start, 
    count, 
    filters, 
    total: result.total || 0, 
    results: result.results || [],
    fullDataset: result.fullDataset || false // Indicate if this contains bulk data
  });
});

// GET /api/market/search/bulk?appid=730&q=ak&filters={}
// Paginated search endpoint
export const searchMarketBulk = asyncHandler(async (req, res) => {
  const appid = parseInt(req.query.appid || '730', 10);
  const q = String(req.query.q || '');
  const start = parseInt(req.query.start || '0', 10);
  const pageSize = parseInt(req.query.pageSize || '10', 10); // Steam API returns max 10 items
  const sortBy = req.query.sortBy || 'popularity';
  const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : undefined;
  const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined;
  

  // Support both new (hero/type) and legacy (heroTag/typeTag) keys, prefer new if present
  const filters = {
    rarity: req.query.rarity || undefined,
    hero: req.query.hero || req.query.heroTag || undefined,
    type: req.query.type || req.query.typeTag || undefined,
    exterior: req.query.exterior || undefined,
    stattrak: req.query.stattrak || undefined,
    souvenir: req.query.souvenir || undefined
  };

  const result = await marketService.searchItemsBulk({ 
    appid, 
    query: q, 
    start, 
    pageSize, 
    filters, 
    sortBy, 
    minPrice, 
    maxPrice 
  });
  res.json({ 
    appid, 
    query: q, 
    filters, 
    start,
    pageSize,
    total: result.total || 0, 
    results: result.results || [],
    fullDataset: false,
    cacheTime: Date.now()
  });
});

// GET /api/market/price?appid=730&hashName=AK-47%20|%20Redline (Field-Tested)
export const getPrice = asyncHandler(async (req, res) => {
  const appid = parseInt(req.query.appid || '730', 10);
  const currency = parseInt(req.query.currency || '1', 10); // 1 = USD
  const hashName = String(req.query.hashName || '');
  if (!hashName) return res.status(400).json({ message: 'hashName is required' });
  const data = await marketService.getPriceOverview({ appid, hashName, currency });
  res.json({ appid, currency, hashName, ...data });
});

// GET /api/market/price/history?appid=730&hashName=...
export const getPriceHistory = asyncHandler(async (req, res) => {
  const appid = parseInt(req.query.appid || '730', 10);
  const currency = parseInt(req.query.currency || '1', 10);
  const hashName = String(req.query.hashName || '');
  if (!hashName) return res.status(400).json({ message: 'hashName is required' });
  const data = await marketService.getPriceHistory({ appid, hashName, currency });
  res.json({ appid, currency, hashName, ...data });
});

// GET /api/market/details?appid=730&classids=a,b,c
export const getItemDetails = asyncHandler(async (req, res) => {
  const appid = parseInt(req.query.appid || '730', 10);
  const classids = String(req.query.classids || '').split(',').filter(Boolean);
  const result = await marketService.getAssetClassInfo({ appid, classids });
  res.json({ appid, result });
});

// Watchlist endpoints (require auth in future; for now open)
// GET /api/market/watchlist/:steamId
export const getWatchlist = asyncHandler(async (req, res) => {
  const { steamId } = req.params;
  const list = await firebaseService.getWatchlist(steamId);
  
  // Use stored price data instead of making fresh API calls for consistency
  const enrichedList = list.map(item => ({
    ...item,
    // Use stored price data that was captured when item was added to watchlist
    salePriceText: item.salePriceText || null,
    sellPriceText: item.sellPriceText || null,
    currentPrice: item.currentPrice || null
  }));
  
  res.json({ steamId, items: enrichedList });
});

// POST /api/market/watchlist/:steamId  { appid, hashName, name, targetPrice, salePriceText, sellPriceText, currentPrice }
export const upsertWatchItem = asyncHandler(async (req, res) => {
  const { steamId } = req.params;
  const { appid, hashName, name, targetPrice, iconUrl, salePriceText, sellPriceText, currentPrice } = req.body || {};
  
  if (!appid || !hashName) {
    return res.status(400).json({ message: 'appid and hashName are required' });
  }
  
  // Validate targetPrice
  const parsedTargetPrice = parseFloat(targetPrice);
  if (!targetPrice || isNaN(parsedTargetPrice) || parsedTargetPrice <= 0) {
    return res.status(400).json({ message: 'targetPrice is required and must be greater than 0' });
  }
  
  // Check if item already exists (updating is allowed)
  // Document ID format: ${steamId}_${appid}_${hashName}
  const existingDoc = await firebaseService.marketWatchlists
    .doc(`${steamId}_${appid}_${hashName}`)
    .get();
  
  // If adding new item, check the 30-item limit
  if (!existingDoc.exists) {
    const userWatchlist = await firebaseService.marketWatchlists
      .where('steamId', '==', steamId)
      .get();
    
    if (userWatchlist.size >= 30) {
      return res.status(400).json({ 
        message: 'Watchlist limit reached. Maximum 30 items per user.',
        limit: 30,
        current: userWatchlist.size
      });
    }
  }
  
  // Parse currentPrice properly from salePriceText if not provided
  let parsedCurrentPrice = currentPrice;
  if (!parsedCurrentPrice && salePriceText) {
    // Extract number from "$112.43" format
    const match = salePriceText.match(/\$?([0-9,]+\.?[0-9]*)/);
    if (match) {
      parsedCurrentPrice = parseFloat(match[1].replace(/,/g, ''));
    }
  }
  if (!parsedCurrentPrice || isNaN(parsedCurrentPrice)) {
    parsedCurrentPrice = parsedTargetPrice; // Fallback to target price
  }
  
  const item = { 
    appid, 
    hashName, 
    name: name || hashName, // Use hashName if name not provided
    targetPrice: parsedTargetPrice, 
    currentPrice: parsedCurrentPrice,
    iconUrl: iconUrl ?? null,
    salePriceText: salePriceText ?? null,
    sellPriceText: sellPriceText ?? null,
    alertsEnabled: true, // Enable alerts by default
    priceHistory: existingDoc.exists ? existingDoc.data().priceHistory || [] : [] // Preserve existing history
  };
  
  await firebaseService.addOrUpdateWatchItem(steamId, item);
  res.json({ success: true, item });
});

// DELETE /api/market/watchlist/:steamId/:id
export const deleteWatchItem = asyncHandler(async (req, res) => {
  const { steamId, id } = req.params;
  await firebaseService.removeWatchItem(steamId, id);
  res.json({ success: true });
});

export default {
  getCategories,
  getTrendingItems,
  searchMarket,
  getPrice,
  getPriceHistory,
  getItemDetails,
  getWatchlist,
  upsertWatchItem,
  deleteWatchItem
};
