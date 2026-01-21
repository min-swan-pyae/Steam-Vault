import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { marketApi } from '../services/marketService';
import { useAuth } from '../context/AuthContext';
import Sparkline from '../components/charts/Sparkline';

const DEFAULT_APPID = 730; // CS2

// Dota2 categories for filtering (moved to top level for reuse)
const DOTA_CATEGORIES = {
  heroes: {
    label: 'Heroes',
    value: 'heroes',
    subcategories: [
      { label: 'Abaddon', value: 'tag_npc_dota_hero_abaddon' },
      { label: 'Alchemist', value: 'tag_npc_dota_hero_alchemist' },
      { label: 'Ancient Apparition', value: 'tag_npc_dota_hero_ancient_apparition' },
      { label: 'Anti-Mage', value: 'tag_npc_dota_hero_antimage' },
      { label: 'Arc Warden', value: 'tag_npc_dota_hero_arc_warden' },
      { label: 'Axe', value: 'tag_npc_dota_hero_axe' },
      { label: 'Bane', value: 'tag_npc_dota_hero_bane' },
      { label: 'Batrider', value: 'tag_npc_dota_hero_batrider' },
      { label: 'Beastmaster', value: 'tag_npc_dota_hero_beastmaster' },
      { label: 'Bloodseeker', value: 'tag_npc_dota_hero_bloodseeker' },
      { label: 'Bounty Hunter', value: 'tag_npc_dota_hero_bounty_hunter' },
      { label: 'Brewmaster', value: 'tag_npc_dota_hero_brewmaster' },
      { label: 'Bristleback', value: 'tag_npc_dota_hero_bristleback' },
      { label: 'Broodmother', value: 'tag_npc_dota_hero_broodmother' },
      { label: 'Centaur Warrunner', value: 'tag_npc_dota_hero_centaur' },
      { label: 'Chaos Knight', value: 'tag_npc_dota_hero_chaos_knight' },
      { label: 'Chen', value: 'tag_npc_dota_hero_chen' },
      { label: 'Clinkz', value: 'tag_npc_dota_hero_clinkz' },
      { label: 'Clockwerk', value: 'tag_npc_dota_hero_clockwerk' },
      { label: 'Crystal Maiden', value: 'tag_npc_dota_hero_crystal_maiden' },
      { label: 'Dark Seer', value: 'tag_npc_dota_hero_dark_seer' },
      { label: 'Dark Willow', value: 'tag_npc_dota_hero_dark_willow' },
      { label: 'Dawnbreaker', value: 'tag_npc_dota_hero_dawnbreaker' },
      { label: 'Dazzle', value: 'tag_npc_dota_hero_dazzle' },
      { label: 'Death Prophet', value: 'tag_npc_dota_hero_death_prophet' },
      { label: 'Disruptor', value: 'tag_npc_dota_hero_disruptor' },
      { label: 'Doom', value: 'tag_npc_dota_hero_doom_bringer' },
      { label: 'Dragon Knight', value: 'tag_npc_dota_hero_dragon_knight' },
      { label: 'Drow Ranger', value: 'tag_npc_dota_hero_drow_ranger' },
      { label: 'Earth Spirit', value: 'tag_npc_dota_hero_earth_spirit' },
      { label: 'Earthshaker', value: 'tag_npc_dota_hero_earthshaker' },
      { label: 'Elder Titan', value: 'tag_npc_dota_hero_elder_titan' },
      { label: 'Ember Spirit', value: 'tag_npc_dota_hero_ember_spirit' },
      { label: 'Enchantress', value: 'tag_npc_dota_hero_enchantress' },
      { label: 'Enigma', value: 'tag_npc_dota_hero_enigma' },
      { label: 'Faceless Void', value: 'tag_npc_dota_hero_faceless_void' },
      { label: 'Grimstroke', value: 'tag_npc_dota_hero_grimstroke' },
      { label: 'Gyrocopter', value: 'tag_npc_dota_hero_gyrocopter' },
      { label: 'Hoodwink', value: 'tag_npc_dota_hero_hoodwink' },
      { label: 'Huskar', value: 'tag_npc_dota_hero_huskar' },
      { label: 'Invoker', value: 'tag_npc_dota_hero_invoker' },
      { label: 'Io', value: 'tag_npc_dota_hero_wisp' },
      { label: 'Jakiro', value: 'tag_npc_dota_hero_jakiro' },
      { label: 'Juggernaut', value: 'tag_npc_dota_hero_juggernaut' },
      { label: 'Keeper of the Light', value: 'tag_npc_dota_hero_keeper_of_the_light' },
      { label: 'Kunkka', value: 'tag_npc_dota_hero_kunkka' },
      { label: 'Legion Commander', value: 'tag_npc_dota_hero_legion_commander' },
      { label: 'Leshrac', value: 'tag_npc_dota_hero_leshrac' },
      { label: 'Lich', value: 'tag_npc_dota_hero_lich' },
      { label: 'Lifestealer', value: 'tag_npc_dota_hero_life_stealer' },
      { label: 'Lina', value: 'tag_npc_dota_hero_lina' },
      { label: 'Lion', value: 'tag_npc_dota_hero_lion' },
      { label: 'Lone Druid', value: 'tag_npc_dota_hero_lone_druid' },
      { label: 'Luna', value: 'tag_npc_dota_hero_luna' },
      { label: 'Lycan', value: 'tag_npc_dota_hero_lycan' },
      { label: 'Magnus', value: 'tag_npc_dota_hero_magnataur' },
      { label: 'Marci', value: 'tag_npc_dota_hero_marci' },
      { label: 'Mars', value: 'tag_npc_dota_hero_mars' },
      { label: 'Medusa', value: 'tag_npc_dota_hero_medusa' },
      { label: 'Meepo', value: 'tag_npc_dota_hero_meepo' },
      { label: 'Mirana', value: 'tag_npc_dota_hero_mirana' },
      { label: 'Monkey King', value: 'tag_npc_dota_hero_monkey_king' },
      { label: 'Morphling', value: 'tag_npc_dota_hero_morphling' },
      { label: 'Muerta', value: 'tag_npc_dota_hero_muerta' },
      { label: 'Naga Siren', value: 'tag_npc_dota_hero_naga_siren' },
      { label: "Nature's Prophet", value: 'tag_npc_dota_hero_furion' },
      { label: 'Necrophos', value: 'tag_npc_dota_hero_necrolyte' },
      { label: 'Night Stalker', value: 'tag_npc_dota_hero_night_stalker' },
      { label: 'Nyx Assassin', value: 'tag_npc_dota_hero_nyx_assassin' },
      { label: 'Ogre Magi', value: 'tag_npc_dota_hero_ogre_magi' },
      { label: 'Omniknight', value: 'tag_npc_dota_hero_omniknight' },
      { label: 'Oracle', value: 'tag_npc_dota_hero_oracle' },
      { label: 'Outworld Destroyer', value: 'tag_npc_dota_hero_obsidian_destroyer' },
      { label: 'Pangolier', value: 'tag_npc_dota_hero_pangolier' },
      { label: 'Phantom Assassin', value: 'tag_npc_dota_hero_phantom_assassin' },
      { label: 'Phantom Lancer', value: 'tag_npc_dota_hero_phantom_lancer' },
      { label: 'Phoenix', value: 'tag_npc_dota_hero_phoenix' },
      { label: 'Primal Beast', value: 'tag_npc_dota_hero_primal_beast' },
      { label: 'Puck', value: 'tag_npc_dota_hero_puck' },
      { label: 'Pudge', value: 'tag_npc_dota_hero_pudge' },
      { label: 'Pugna', value: 'tag_npc_dota_hero_pugna' },
      { label: 'Queen of Pain', value: 'tag_npc_dota_hero_queenofpain' },
      { label: 'Razor', value: 'tag_npc_dota_hero_razor' },
      { label: 'Riki', value: 'tag_npc_dota_hero_riki' },
      { label: 'Rubick', value: 'tag_npc_dota_hero_rubick' },
      { label: 'Sand King', value: 'tag_npc_dota_hero_sand_king' },
      { label: 'Shadow Demon', value: 'tag_npc_dota_hero_shadow_demon' },
      { label: 'Shadow Fiend', value: 'tag_npc_dota_hero_nevermore' },
      { label: 'Shadow Shaman', value: 'tag_npc_dota_hero_shadow_shaman' },
      { label: 'Silencer', value: 'tag_npc_dota_hero_silencer' },
      { label: 'Skywrath Mage', value: 'tag_npc_dota_hero_skywrath_mage' },
      { label: 'Slardar', value: 'tag_npc_dota_hero_slardar' },
      { label: 'Slark', value: 'tag_npc_dota_hero_slark' },
      { label: 'Snapfire', value: 'tag_npc_dota_hero_snapfire' },
      { label: 'Sniper', value: 'tag_npc_dota_hero_sniper' },
      { label: 'Spectre', value: 'tag_npc_dota_hero_spectre' },
      { label: 'Spirit Breaker', value: 'tag_npc_dota_hero_spirit_breaker' },
      { label: 'Storm Spirit', value: 'tag_npc_dota_hero_storm_spirit' },
      { label: 'Sven', value: 'tag_npc_dota_hero_sven' },
      { label: 'Techies', value: 'tag_npc_dota_hero_techies' },
      { label: 'Templar Assassin', value: 'tag_npc_dota_hero_templar_assassin' },
      { label: 'Terrorblade', value: 'tag_npc_dota_hero_terrorblade' },
      { label: 'Tidehunter', value: 'tag_npc_dota_hero_tidehunter' },
      { label: 'Timbersaw', value: 'tag_npc_dota_hero_shredder' },
      { label: 'Tinker', value: 'tag_npc_dota_hero_tinker' },
      { label: 'Tiny', value: 'tag_npc_dota_hero_tiny' },
      { label: 'Treant Protector', value: 'tag_npc_dota_hero_treant' },
      { label: 'Troll Warlord', value: 'tag_npc_dota_hero_troll_warlord' },
      { label: 'Tusk', value: 'tag_npc_dota_hero_tusk' },
      { label: 'Underlord', value: 'tag_npc_dota_hero_abyssal_underlord' },
      { label: 'Undying', value: 'tag_npc_dota_hero_undying' },
      { label: 'Ursa', value: 'tag_npc_dota_hero_ursa' },
      { label: 'Vengeful Spirit', value: 'tag_npc_dota_hero_vengefulspirit' },
      { label: 'Venomancer', value: 'tag_npc_dota_hero_venomancer' },
      { label: 'Viper', value: 'tag_npc_dota_hero_viper' },
      { label: 'Visage', value: 'tag_npc_dota_hero_visage' },
      { label: 'Void Spirit', value: 'tag_npc_dota_hero_void_spirit' },
      { label: 'Warlock', value: 'tag_npc_dota_hero_warlock' },
      { label: 'Weaver', value: 'tag_npc_dota_hero_weaver' },
      { label: 'Windranger', value: 'tag_npc_dota_hero_windrunner' },
      { label: 'Winter Wyvern', value: 'tag_npc_dota_hero_winter_wyvern' },
      { label: 'Witch Doctor', value: 'tag_npc_dota_hero_witch_doctor' },
      { label: 'Zeus', value: 'tag_npc_dota_hero_zuus' }
    ]
  },
  types: {
    label: 'Item Types',
    value: 'types',
    subcategories: [
      { label: 'Ancient', value: 'tag_ancient' },
      { label: 'Announcer', value: 'tag_announcer' },
      { label: 'Bundle', value: 'tag_bundle' },
      { label: 'Courier', value: 'tag_courier' },
      { label: 'Cursor Pack', value: 'tag_cursor_pack' },
      { label: 'Dire Creeps', value: 'tag_direcreeps' },
      { label: 'Dire Siege Creeps', value: 'tag_diresiegecreeps' },
      { label: 'Dire Towers', value: 'tag_diretowers' },
      { label: 'Emblem', value: 'tag_emblem' },
      { label: 'Emoticon Tool', value: 'tag_emoticon_tool' },
      { label: 'Gem/Rune', value: 'tag_socket_gem' },
      { label: 'HUD Skin', value: 'tag_hud_skin' },
      { label: 'League', value: 'tag_league' },
      { label: 'Loading Screen', value: 'tag_loading_screen' },
      { label: 'Misc', value: 'tag_misc' },
      { label: 'Music', value: 'tag_music' },
      { label: 'Pennant', value: 'tag_pennant' },
      { label: 'Player Card', value: 'tag_player_card' },
      { label: 'Radiant Creeps', value: 'tag_radiantcreeps' },
      { label: 'Radiant Siege Creeps', value: 'tag_radiantsiegecreeps' },
      { label: 'Radiant Towers', value: 'tag_radianttowers' },
      { label: 'Retired Chest', value: 'tag_retired_treasure_chest' },
      { label: 'Showcase Decoration', value: 'tag_showcase_decoration' },
      { label: 'Sticker', value: 'tag_sticker' },
      { label: 'Sticker Capsule', value: 'tag_sticker_capsule' },
      { label: 'Taunt', value: 'tag_taunt' },
      { label: 'Terrain', value: 'tag_terrain' },
      { label: 'Tool', value: 'tag_tool' },
      { label: 'Treasure', value: 'tag_treasure_chest' },
      { label: 'Treasure Key', value: 'tag_key' },
      { label: 'Ward', value: 'tag_ward' },
      { label: 'Wearable', value: 'tag_wearable' }
    ]
  },
  rarities: {
    label: 'Rarity',
    value: 'rarities',
    subcategories: [
      { label: 'Arcana', value: 'tag_Rarity_Arcana' },
      { label: 'Ancient', value: 'tag_Rarity_Ancient' },
      { label: 'Legendary', value: 'tag_Rarity_Legendary' },
      { label: 'Immortal', value: 'tag_Rarity_Immortal' },
      { label: 'Mythical', value: 'tag_Rarity_Mythical' },
      { label: 'Rare', value: 'tag_Rarity_Rare' },
      { label: 'Uncommon', value: 'tag_Rarity_Uncommon' },
      { label: 'Common', value: 'tag_Rarity_Common' }
    ]
  }
};

export default function MarketPlace() {
  const { user } = useAuth();
  const steamId = user?.id || user?.steamId || null;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [appid, setAppid] = useState(DEFAULT_APPID);
  const [subCategory, setSubCategory] = useState(null);
  // Separate Dota2 filters for combination filtering
  const [dotaHero, setDotaHero] = useState('');
  const [dotaRarity, setDotaRarity] = useState('');
  const [dotaType, setDotaType] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('popularity');
  const [items, setItems] = useState([]); // Current page items
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Steam API only returns 10 items per request
  // Page caching for instant navigation
  const [pageCache, setPageCache] = useState(new Map());
  const [cacheKey, setCacheKey] = useState('');
  // Calculate start from page and pageSize
  const start = (page - 1) * pageSize;
  const [loading, setLoading] = useState(true);
  const [priceFilterInfo, setPriceFilterInfo] = useState(null); // Track filtered items info
  const [watchlist, setWatchlist] = useState([]);
  // Watchlist pagination
  const [watchlistPage, setWatchlistPage] = useState(1);
  const [watchlistPageSize, setWatchlistPageSize] = useState(10);
  const [watchlistShowAll, setWatchlistShowAll] = useState(false);

  // Keep watchlist page in bounds when data or page size changes
  useEffect(() => {
    const wlTotal = watchlist?.length || 0;
    const wlMaxPage = Math.max(1, Math.ceil(wlTotal / watchlistPageSize));
    if (watchlistPage > wlMaxPage) {
      setWatchlistPage(wlMaxPage);
    }
  }, [watchlist, watchlistPage, watchlistPageSize]);
  const [categories, setCategories] = useState({});
  const [exterior, setExterior] = useState('');
  const [stattrak, setStattrak] = useState(false);
  const [souvenir, setSouvenir] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Track if initial load has been completed
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  
  // Search state management
  const [isSearching, setIsSearching] = useState(false);
  const [isAutoSearching, setIsAutoSearching] = useState(false);
  const [processedUrl, setProcessedUrl] = useState('');

  // Only load on mount and app changes - NO filter dependencies
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    
    // Load initial data - just watchlist and categories
    const loadInitialData = async () => {
      try {
        let watchResult = { items: [] };
        let catResult = { categories: {} };
        
        // Load watchlist only if user is authenticated
        if (steamId) {
          try {
            watchResult = await marketApi.getWatchlist(steamId);
          } catch (watchError) {
            console.warn('Failed to load watchlist (user not authenticated):', watchError.message);
            // Continue without watchlist for unauthenticated users
          }
        }
        
        // Load categories - this should work for everyone
        try {
          catResult = await marketApi.getCategories(appid);
        } catch (catError) {
          console.warn('Failed to load categories:', catError.message);
          // Continue with empty categories
        }
        
        if (!mounted) return;
        
        setWatchlist(watchResult?.items || []);
        setCategories(catResult?.categories || {});
      } catch (err) {
        console.error('Failed to load initial data:', err);
        if (mounted) {
          setError('Failed to load marketplace data');
          setLoading(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadInitialData();
    return () => { mounted = false; };
  }, [steamId, appid, retryCount, pageSize]); // Remove fetchPage dependency to prevent auto-search on filter changes



  // Track the last executed search to enable reliable retries and preloading
  const lastSearchRef = useRef(null);

  const fetchPage = useCallback(async (
    pageNum,
    opts = {}
  ) => {
    // Options allow passing explicit values to avoid stale state
    const {
      forceRefresh = false,
      query: queryOverride,
      appid: appidOverride,
      subCategory: subCategoryOverride,
      dotaHero: dotaHeroOverride,
      dotaRarity: dotaRarityOverride,
      dotaType: dotaTypeOverride,
      exterior: exteriorOverride,
      stattrak: stattrakOverride,
      souvenir: souvenirOverride,
      pageSize: pageSizeOverride,
      sortBy: sortByOverride,
      minPrice: minPriceOverride,
      maxPrice: maxPriceOverride
    } = opts;

    // Effective values for this invocation
    const effAppid = parseInt(appidOverride ?? appid);
    const effQuery = (queryOverride ?? query ?? '').trim();
    const effSubCategory = subCategoryOverride ?? subCategory ?? null;
    const effDotaHero = effAppid === 570 ? (dotaHeroOverride ?? dotaHero ?? '') : 'n/a';
    const effDotaRarity = effAppid === 570 ? (dotaRarityOverride ?? dotaRarity ?? '') : 'n/a';
    const effDotaType = effAppid === 570 ? (dotaTypeOverride ?? dotaType ?? '') : 'n/a';
    const effExterior = exteriorOverride ?? exterior ?? '';
    const effStattrak = Boolean(stattrakOverride ?? stattrak);
    const effSouvenir = Boolean(souvenirOverride ?? souvenir);
    const effPageSize = pageSizeOverride ?? pageSize;
    const effSortBy = sortByOverride ?? sortBy;
  const effMinPrice = (minPriceOverride ?? minPrice) || undefined;
  const effMaxPrice = (maxPriceOverride ?? maxPrice) || undefined;

    setLoading(true);
    setError(null);
    
    try {
      // Generate cache key that properly isolates different search contexts
      const currentCacheKey = JSON.stringify({
        query: effQuery,
        appid: effAppid,
        subCategory: effSubCategory || 'all',
        dotaHero: effAppid === 570 ? (effDotaHero || 'all') : 'n/a',
        dotaRarity: effAppid === 570 ? (effDotaRarity || 'all') : 'n/a', 
        dotaType: effAppid === 570 ? (effDotaType || 'all') : 'n/a',
        exterior: effExterior,
        stattrak: effStattrak,
        souvenir: effSouvenir,
        pageSize: effPageSize,
        sortBy: effSortBy,
        minPrice: effMinPrice,
        maxPrice: effMaxPrice
      });
      const pageKey = `${currentCacheKey}|p=${pageNum}`;
      
      // Only clear cache if the search context fundamentally changed
      const searchContextChanged = currentCacheKey !== cacheKey;
      if (searchContextChanged) {
        // No need to nuke the whole cache now that we key by context+page
        setCacheKey(currentCacheKey);
      }
      
      // Check if this page is already cached (unless force refresh)
      const cachedPage = pageCache.get(pageKey);
      if (cachedPage && !forceRefresh) {
        // Verify the cached page matches current search context
        const cacheStillValid = currentCacheKey === cacheKey || !searchContextChanged;
        if (cacheStillValid) {
          setItems(cachedPage.items);
          setTotal(cachedPage.total);
          setPage(pageNum);
          
          // Set price filter info when loading from cache
          if (effMinPrice || effMaxPrice) {
            setPriceFilterInfo({
              minPrice: effMinPrice,
              maxPrice: effMaxPrice,
              hasPriceFilter: true
            });
          } else {
            setPriceFilterInfo(null);
          }
          
          setLoading(false);
          return;
        } else {
        }
      }
      
      
      const filters = effAppid === 570
        ? { 
            // For Dota2, use combination filtering with separate hero, type, and rarity
            ...(effDotaHero ? { hero: effDotaHero } : {}),
            ...(effDotaType ? { type: effDotaType } : {}),
            ...(effDotaRarity ? { rarity: effDotaRarity } : {}),
            // Legacy support: if using old subCategory system, convert it
            ...(effSubCategory && !effDotaHero && !effDotaType && !effDotaRarity ? (() => {
              if (DOTA_CATEGORIES.heroes.subcategories.some(h => h.value === effSubCategory)) {
                return { hero: subCategory };
              } else if (DOTA_CATEGORIES.types.subcategories.some(t => t.value === effSubCategory)) {
                return { type: subCategory };
              } else if (DOTA_CATEGORIES.rarities.subcategories.some(r => r.value === effSubCategory)) {
                return { rarity: subCategory };
              }
              return {};
            })() : {})
          }
        : { 
            typeTag: effSubCategory || undefined, 
            exterior: effExterior || undefined, 
            stattrak: effStattrak || undefined, 
            souvenir: effSouvenir || undefined 
          };

      const start = (pageNum - 1) * effPageSize;
      const res = await marketApi.searchBulk({ 
        appid: effAppid, 
        q: effQuery, 
        filters,
        start,
        pageSize: effPageSize,
        sortBy: effSortBy,
        minPrice: effMinPrice,
        maxPrice: effMaxPrice,
        bustCache: forceRefresh // Bust cache when forcing refresh
      });

      if (!res.results || res.results.length === 0) {
        setItems([]);
        setTotal(0);
        setError(null);
        
        // Show price filter info when no results and price filter is active
        if (effMinPrice || effMaxPrice) {
          setPriceFilterInfo({
            minPrice: effMinPrice,
            maxPrice: effMaxPrice,
            hasPriceFilter: true,
            steamApiEmpty: true
          });
        } else {
          setPriceFilterInfo(null);
        }
      } else {
        
        // Set items directly from Steam API
        setItems(res.results);
        setTotal(res.total);
        
        // Show price filter info when price filtering is active
        if (effMinPrice || effMaxPrice) {
          setPriceFilterInfo({
            minPrice: effMinPrice,
            maxPrice: effMaxPrice,
            hasPriceFilter: true
          });
        } else {
          setPriceFilterInfo(null);
        }
        
        // Cache this page for instant access later
        setPageCache(prev => {
          const newCache = new Map(prev);
          newCache.set(pageKey, { 
            items: res.results, 
            total: res.total,
            timestamp: Date.now() 
          });
          
          // Limit cache size to last 10 pages to prevent memory issues
          if (newCache.size > 10) {
            const oldestKey = Array.from(newCache.keys())[0];
            newCache.delete(oldestKey);
          }
          
          return newCache;
        });
      }
      
      setPage(pageNum);
      // Persist last search used successfully
      lastSearchRef.current = {
        pageNum,
        query: effQuery,
        appid: effAppid,
        subCategory: effSubCategory,
        dotaHero: effDotaHero,
        dotaRarity: effDotaRarity,
        dotaType: effDotaType,
        exterior: effExterior,
        stattrak: effStattrak,
        souvenir: effSouvenir,
        pageSize: effPageSize,
        sortBy: effSortBy,
        minPrice: effMinPrice,
        maxPrice: effMaxPrice
      };
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setItems([]);
      setTotal(0);
      
      // Don't cache error states for rate limit issues
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        setError('Steam API is temporarily busy. Please wait a moment and try again.');
        // Clear this page from cache so retries will refetch instead of showing cached error
        setPageCache(prev => {
          const newCache = new Map(prev);
          const currentCacheKey = cacheKey;
          const pageKey = `${currentCacheKey}|p=${pageNum}`;
          newCache.delete(pageKey);
          return newCache;
        });
      } else {
        setError('Unable to load marketplace data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [appid, subCategory, dotaHero, dotaRarity, dotaType, exterior, stattrak, souvenir, pageSize, pageCache, cacheKey, sortBy, minPrice, maxPrice]);

  const handleRetry = useCallback(() => {
    setError(null);
    setRetryCount(prev => prev + 1);
    const last = lastSearchRef.current;
    if (last) {
      fetchPage(last.pageNum ?? page, { ...last, forceRefresh: true });
    } else {
      fetchPage(page, { forceRefresh: true, query, appid, subCategory, dotaHero, dotaRarity, dotaType, exterior, stattrak, souvenir, pageSize, sortBy, minPrice, maxPrice });
    }
  }, [page, fetchPage, query, appid, subCategory, dotaHero, dotaRarity, dotaType, exterior, stattrak, souvenir, pageSize, sortBy, minPrice, maxPrice]);

  // Background preloading for smoother navigation
  const preloadAdjacentPages = useCallback(async (currentPage) => {
    const maxPages = Math.ceil(total / pageSize);
    const nextPage = currentPage + 1;
    
    // Only preload if next page exists and isn't cached
    const currentCacheKey = cacheKey;
    const pageKey = `${currentCacheKey}|p=${nextPage}`;
    if (nextPage <= maxPages && !pageCache.has(pageKey) && !loading) {
      try {
        
        const filters = appid === 570
          ? { 
              // For Dota2, use combination filtering with separate hero, type, and rarity
              ...(dotaHero ? { hero: dotaHero } : {}),
              ...(dotaType ? { type: dotaType } : {}),
              ...(dotaRarity ? { rarity: dotaRarity } : {}),
              // Legacy support: if using old subCategory system, convert it
              ...(subCategory && !dotaHero && !dotaType && !dotaRarity ? (() => {
                if (DOTA_CATEGORIES.heroes.subcategories.some(h => h.value === subCategory)) {
                  return { hero: subCategory };
                } else if (DOTA_CATEGORIES.types.subcategories.some(t => t.value === subCategory)) {
                  return { type: subCategory };
                } else if (DOTA_CATEGORIES.rarities.subcategories.some(r => r.value === subCategory)) {
                  return { rarity: subCategory };
                }
                return {};
              })() : {})
            }
          : { 
              typeTag: subCategory || undefined, 
              exterior: exterior || undefined, 
              stattrak: stattrak || undefined, 
              souvenir: souvenir || undefined 
            };

        const start = (nextPage - 1) * pageSize;
        const res = await marketApi.searchBulk({ 
          appid, 
          q: query, 
          filters,
          start,
          pageSize,
          sortBy,
          minPrice: minPrice || undefined,
          maxPrice: maxPrice || undefined
        });

        if (res.results && res.results.length > 0) {
          setPageCache(prev => {
            const newCache = new Map(prev);
            newCache.set(pageKey, { 
              items: res.results, 
              total: res.total,
              timestamp: Date.now() 
            });
            
            // Limit cache size to last 10 pages
            if (newCache.size > 10) {
              const oldestKey = Array.from(newCache.keys())[0];
              newCache.delete(oldestKey);
            }
            
            return newCache;
          });
        }
      } catch (error) {
      }
    }
  }, [appid, query, subCategory, exterior, stattrak, souvenir, pageSize, total, pageCache, loading, cacheKey]);

  // Trigger preloading after page loads
  useEffect(() => {
    if (!loading && total > 0) {
      const timer = setTimeout(() => preloadAdjacentPages(page), 1000); // Preload after 1 second
      return () => clearTimeout(timer);
    }
  }, [page, loading, total, preloadAdjacentPages]);

  // Removed duplicate initial load that could conflict with manual/URL-based searches

  // Initial trending load on first visit (no URL params, no active search)
  useEffect(() => {
    // Only run once per mount
    if (hasInitiallyLoaded) return;

    // Skip if navigated here with URL params (handled by auto-search effect)
    const hasUrlParams = Boolean(searchParams.get('search') || searchParams.get('appid') || searchParams.get('segment'));
    if (hasUrlParams) return;

    // Don't interfere with an in-flight manual/auto search
    if (isAutoSearching || isSearching) return;

    // If we already have items (e.g., from cache restoration), skip
    if (items && items.length > 0) return;

    setHasInitiallyLoaded(true);

    // Show trending by using empty query and default sort (popularity)
    fetchPage(1, {
      forceRefresh: false,
      query: '',
      appid,
      subCategory: null,
      dotaHero: '',
      dotaRarity: '',
      dotaType: '',
      exterior: '',
      stattrak: false,
      souvenir: false,
      pageSize,
      sortBy,
      minPrice: undefined,
      maxPrice: undefined
    });
  }, [hasInitiallyLoaded, searchParams, isAutoSearching, isSearching, items, fetchPage, appid, pageSize, sortBy]);

  // Target price modal state
  const [targetPriceModal, setTargetPriceModal] = useState({ open: false, item: null, targetPrice: '' });
  const [isAddingToWatchlist, setIsAddingToWatchlist] = useState(false);
  const [removingItemIds, setRemovingItemIds] = useState(new Set());

  const addToWatchlist = (item) => {
    if (!steamId) return alert('Please login with Steam to manage your watchlist');
    
    // Check watchlist limit
    if (watchlist.length >= 30) {
      alert('Watchlist limit reached. Maximum 30 items allowed.');
      return;
    }
    
    // Open modal to get target price
    // Parse price correctly - handle comma as thousands separator (e.g., "$1,912.81")
    let suggestedPrice = item.currentPrice;
    if (!suggestedPrice && item.salePriceText) {
      const match = item.salePriceText.match(/\$?([0-9,]+\.?[0-9]*)/);
      if (match) {
        suggestedPrice = parseFloat(match[1].replace(/,/g, ''));
      }
    }
    suggestedPrice = suggestedPrice || 0;
    
    setTargetPriceModal({
      open: true,
      item,
      targetPrice: suggestedPrice > 0 ? (suggestedPrice * 0.9).toFixed(2) : '' // Suggest 10% below current
    });
  };

  const confirmAddToWatchlist = async () => {
    const { item, targetPrice } = targetPriceModal;
    const parsedTarget = parseFloat(targetPrice);
    
    if (!parsedTarget || parsedTarget <= 0) {
      alert('Please enter a valid target price greater than $0');
      return;
    }
    
    setIsAddingToWatchlist(true);
    try {
      // Extract currentPrice from salePriceText if available
      let currentPrice = item.currentPrice;
      if (!currentPrice && item.salePriceText) {
        const match = item.salePriceText.match(/\$?([0-9,]+\.?[0-9]*)/);
        if (match) {
          currentPrice = parseFloat(match[1].replace(/,/g, ''));
        }
      }
      
      await marketApi.upsertWatchItem(steamId, {
        appid: item.appid || DEFAULT_APPID,
        hashName: item.hashName,
        name: item.name,
        iconUrl: item.iconUrl,
        targetPrice: parsedTarget,
        salePriceText: item.salePriceText,
        sellPriceText: item.sellPriceText,
        currentPrice: currentPrice || parsedTarget
      });
      const wl = await marketApi.getWatchlist(steamId);
      setWatchlist(wl.items || []);
      setTargetPriceModal({ open: false, item: null, targetPrice: '' });
      alert(`Added to watchlist! You'll be notified when price drops to $${parsedTarget.toFixed(2)} or below.`);
    } catch (error) {
      console.error('Failed to add item to watchlist:', error);
      const msg = error?.response?.data?.message || 'Failed to add item to watchlist';
      alert(msg);
    } finally {
      setIsAddingToWatchlist(false);
    }
  };

  const removeFromWatchlist = async (item) => {
    if (!steamId) return;
    
    const itemKey = `${item.appid || DEFAULT_APPID}_${item.hashName}`;
    setRemovingItemIds(prev => new Set(prev).add(itemKey));
    try {
      await marketApi.removeWatchItem(steamId, `${steamId}_${item.appid || DEFAULT_APPID}_${item.hashName}`);
      const wl = await marketApi.getWatchlist(steamId);
      setWatchlist(wl.items || []);
    } catch (error) {
      console.error('Failed to remove item from watchlist:', error);
      alert('Failed to remove item from watchlist. Please try again.');
    } finally {
      setRemovingItemIds(prev => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  const isInWatchlist = (item) => watchlist.some(w => w.hashName === item.hashName && Number(w.appid) === Number(item.appid));

  // Simple pagination calculations
  const maxPage = Math.max(1, Math.ceil((total || 0) / pageSize));

  // Safety check for page bounds (but don't auto-reset, just disable navigation)
  const pageInBounds = page >= 1 && page <= maxPage;

  // Reset page only when search button is clicked (not on filter changes)
  const prevFiltersRef = useRef();
  
  // Remove auto-triggering filter changes - only manual search should trigger
  const handleSearch = useCallback(async (e) => {
    e?.preventDefault?.();
    
    // Prevent double-clicks and multiple submissions
    if (isSearching || loading || isAutoSearching) {
      return;
    }
    
    
    // Clear any existing URL parameters when doing manual search
    if (searchParams.get('search') || searchParams.get('appid')) {
      navigate('/marketplace', { replace: true });
    }
    
    setIsSearching(true);
    setPage(1);
    setError(null); // Clear any existing errors for manual search
    
    try {
      await fetchPage(1, {
        forceRefresh: true,
        query,
        appid,
        subCategory,
        dotaHero,
        dotaRarity,
        dotaType,
        exterior,
        stattrak,
        souvenir,
        pageSize,
        sortBy,
        minPrice,
        maxPrice
      });
    } catch (error) {
      console.error('[HANDLE SEARCH] Manual search failed:', error);
      setError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [fetchPage, isSearching, loading, isAutoSearching, query, searchParams, navigate, appid, subCategory, dotaHero, dotaRarity, dotaType, exterior, stattrak, souvenir, pageSize, sortBy, minPrice, maxPrice]);

  const handleCategoryChange = useCallback((newCategory) => {
    setSubCategory(newCategory);
    // Don't auto-search, wait for user to click Search button
  }, []);

  const handleAppChange = useCallback((newAppId) => {
    setAppid(parseInt(newAppId));
    // Clear all filters when switching apps
    setSubCategory(null);
    setDotaHero('');
    setDotaRarity('');
    setDotaType('');
    setExterior('');
    setStattrak('');
    setSouvenir('');
    // Don't auto-search, wait for user to click Search button
  }, []);

  const handleFilterChange = useCallback((filterType, value) => {
    
    switch (filterType) {
      case 'exterior':
        setExterior(value);
        break;
      case 'stattrak':
        setStattrak(value);
        break;
      case 'souvenir':
        setSouvenir(value);
        break;
      case 'sortBy':
        setSortBy(value);
        break;
      case 'minPrice':
        setMinPrice(value);
        break;
      case 'maxPrice':
        setMaxPrice(value);
        break;
    }
    // Don't auto-search, wait for user to click Search button
  }, []);

  // Add helper to check if current category supports exterior filtering
  const supportsExterior = useMemo(() => {
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
      'tag_CSGO_Type_Tool' , 
      'tag_weapon_taser',
      'tag_CSGO_Tool_Sticker',      // Stickers
      'tag_CSGO_Type_WeaponCase',   // Cases
          
    ];
    return appid === 730 && !noExteriorTypes.includes(subCategory);
  }, [appid, subCategory]);

  const supportsQuality = useMemo(() => {
    // Items that don't support any quality filters
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
      'tag_CSGO_Type_Tool' , 
      'tag_CSGO_Tool_Sticker',      // Stickers
      'tag_CSGO_Type_WeaponCase',   // Cases
    ];
    return appid === 730 && !noQualityTypes.includes(subCategory);
  }, [appid, subCategory]);

  // Check which quality filters are supported
  const qualitySupport = useMemo(() => {
    if (!supportsQuality) return { stattrak: false, souvenir: false };
    
    // Items that only support StatTrak (not Souvenir)
    const statTrakOnlyTypes = [
      'tag_CSGO_Type_Knife',     // Knives
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
    
    const supportsStatTrak = true; // All quality-supporting items support StatTrak
    const supportsSouvenir = !statTrakOnlyTypes.includes(subCategory);
    
    return { stattrak: supportsStatTrak, souvenir: supportsSouvenir };
  }, [supportsQuality, subCategory]);

  // Reset exterior and quality filters when switching to incompatible categories
  useEffect(() => {
    if (!supportsExterior && exterior) {
      setExterior('');
    }
    if (!qualitySupport.stattrak && stattrak) {
      setStattrak(false);
    }
    if (!qualitySupport.souvenir && souvenir) {
      setSouvenir(false);
    }
  }, [supportsExterior, qualitySupport, exterior, stattrak, souvenir]);

  // Handle URL parameters and auto-trigger search (e.g., from notifications)
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    const urlHash = searchParams.get('hash'); // Exact item hash for specific match
    const urlAppid = searchParams.get('appid');
    const urlSegment = searchParams.get('segment');
    const currentUrl = `${urlSearch || ''}_${urlHash || ''}_${urlAppid || ''}_${urlSegment || ''}`;
    
    // Skip if we've already processed these exact URL parameters
    if (!urlSearch && !urlHash && !urlAppid && !urlSegment) return;
    if (processedUrl === currentUrl) {
      return;
    }
    
    // Don't interfere with manual searches
    if (isSearching) {
      return;
    }
    
    setProcessedUrl(currentUrl);
    setIsAutoSearching(true);
    
    // Set appid first if it's different (explicit or inferred via segment)
    if (urlAppid && parseInt(urlAppid) !== appid) {
      setAppid(parseInt(urlAppid));
    } else if (urlSegment && !urlAppid && appid !== 730) {
      // For now, all known segments map to CS2 (appid 730)
      setAppid(730);
    }
    
    // Handle exact hash search (from notifications) - takes precedence
    const searchQuery = urlHash || urlSearch;
    const isExactHashSearch = !!urlHash;
    
    // Handle explicit item search parameter (takes precedence over segment)
    if (searchQuery) {
      const decodedSearch = decodeURIComponent(searchQuery.replace(/\+/g, ' '));
      
      // For exact hash searches, parse and auto-apply filters
      let autoFilters = {
        exterior: '',
        stattrak: false,
        souvenir: false
      };
      
      if (isExactHashSearch) {
        // Extract exterior from hash name (e.g., "MP7 | Bloodsport (Minimal Wear)")
        const exteriorMatch = decodedSearch.match(/\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)/i);
        if (exteriorMatch) {
          const exteriorDisplayValue = exteriorMatch[1];
          // Map display names to API format (lowercase, no spaces/hyphens)
          const exteriorApiMap = {
            'Factory New': 'factorynew',
            'Minimal Wear': 'minimalwear',
            'Field-Tested': 'fieldtested',
            'Well-Worn': 'wellworn',
            'Battle-Scarred': 'battlescarred'
          };
          const exteriorValue = exteriorApiMap[exteriorDisplayValue] || exteriorDisplayValue.toLowerCase().replace(/[\s-]/g, '');
          setExterior(exteriorValue);
          autoFilters.exterior = exteriorValue;
        }
        
        // Check for StatTrak
        if (decodedSearch.includes('StatTrak™')) {
          setStattrak(true);
          autoFilters.stattrak = true;
        }
        
        // Check for Souvenir
        if (decodedSearch.includes('Souvenir')) {
          setSouvenir(true);
          autoFilters.souvenir = true;
        }
        
        // Remove quality indicators from search query for better results
        const cleanQuery = decodedSearch
          .replace(/\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)/gi, '')
          .replace(/StatTrak™\s*/gi, '')
          .replace(/Souvenir\s*/gi, '')
          .trim();
        
        setQuery(cleanQuery);
      } else {
        setQuery(decodedSearch);
      }
      
      setPage(1);
      setError(null);
      
      // Execute search with a stable function reference to avoid infinite loops
      const executeSearch = async () => {
        
        try {
          // Use unified fetchPage to ensure consistent cache and retry state
          const targetAppid = urlAppid ? parseInt(urlAppid) : appid;
          const searchQuery = isExactHashSearch 
            ? decodedSearch
                .replace(/\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)/gi, '')
                .replace(/StatTrak™\s*/gi, '')
                .replace(/Souvenir\s*/gi, '')
                .trim()
            : decodedSearch;
          
          await fetchPage(1, {
            forceRefresh: true,
            query: searchQuery,
            appid: targetAppid,
            subCategory: null,
            dotaHero: '',
            dotaRarity: '',
            dotaType: '',
            exterior: autoFilters.exterior,
            stattrak: autoFilters.stattrak,
            souvenir: autoFilters.souvenir,
            pageSize,
            sortBy: 'popularity',
            minPrice: undefined,
            maxPrice: undefined
          });
          
          // If fetchPage succeeded, lastSearchRef will be updated
          if (lastSearchRef.current && lastSearchRef.current.query === searchQuery && lastSearchRef.current.appid === targetAppid) {
            navigate('/marketplace', { replace: true });
          }
        } catch (error) {
          console.error('[MARKETPLACE] Auto-search failed:', error);
          setError('Failed to search for item from notification');
        } finally {
          setIsAutoSearching(false);
        }
      };
      
      // Use a timeout to ensure state updates are applied
      const timer = setTimeout(executeSearch, 300);
      return () => clearTimeout(timer);
    } else if (urlSegment) {
      // Map segment to subCategory/category context
      const segmentMap = {
        knife: 'tag_CSGO_Type_Knife'
        // future segments can be added here
      };
      const targetSubCategory = segmentMap[urlSegment.toLowerCase()];
      if (targetSubCategory) {
        // Clear any existing search query for segment browsing
        setQuery('');
        setSubCategory(targetSubCategory);
        setPage(1);
        setError(null);
        const executeSegmentLoad = async () => {
          try {
            await fetchPage(1, {
              forceRefresh: true,
              query: '',
              appid: 730,
              subCategory: targetSubCategory,
              dotaHero: '',
              dotaRarity: '',
              dotaType: '',
              exterior: '',
              stattrak: false,
              souvenir: false,
              pageSize,
              sortBy: 'popularity',
              minPrice: undefined,
              maxPrice: undefined
            });
            if (lastSearchRef.current && lastSearchRef.current.subCategory === targetSubCategory) {
              navigate('/marketplace', { replace: true });
            }
          } catch (error) {
            console.error('[MARKETPLACE] Segment load failed:', error);
            setError('Failed to load marketplace segment');
          } finally {
            setIsAutoSearching(false);
          }
        };
        const t = setTimeout(executeSegmentLoad, 250);
        return () => clearTimeout(t);
      } else {
        console.warn('[MARKETPLACE] Unknown segment parameter value:', urlSegment);
        setIsAutoSearching(false);
      }
    } else {
      setIsAutoSearching(false);
    }
  }, [searchParams, navigate]); // Only depend on searchParams and navigate

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-gradient-to-br from-gray-900 to-gray-800 text-white relative">
      {/* Loading Spinner Overlay */}
      {(loading || isAutoSearching) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500"></div>
            <p className="text-white text-lg">
              {isAutoSearching ? 'Loading from notification...' : 'Searching marketplace...'}
            </p>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Marketplace</h1>
            <p className="text-gray-300 mt-2">Track CS2/ Dota2 item prices and build a watchlist</p>
            {/* Cache Status Indicator */}
            {/* {pageCache.size > 0 && (
              <p className="text-xs text-green-400 mt-1">
                📋 {pageCache.size} page{pageCache.size !== 1 ? 's' : ''} cached for instant navigation
              </p>
            )} */}
          </div>
          <form onSubmit={handleSearch} className="w-full flex flex-wrap gap-3 items-stretch">
            <select value={appid} onChange={e => handleAppChange(e.target.value)} className="w-full sm:w-auto sm:min-w-[100px] bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
              <option value={730}>CS2</option>
              <option value={570}>Dota 2</option>
            </select>
            
            {/* CS2 category dropdown */}
            {appid === 730 && (
              <div className="w-full sm:w-auto sm:min-w-[140px] sm:max-w-[200px]">
                <SubCategorySelect appid={appid} value={subCategory} onChange={handleCategoryChange} />
              </div>
            )}
            
            {/* Dota2 combination filters */}
            {appid === 570 && (
              <>
                <select value={dotaHero} onChange={e => setDotaHero(e.target.value)} className="w-full sm:w-auto sm:min-w-[100px] bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                  <option value="">Hero</option>
                  {DOTA_CATEGORIES.heroes.subcategories.map(hero => (
                    <option key={hero.value} value={hero.value}>{hero.label}</option>
                  ))}
                </select>
                <select value={dotaType} onChange={e => setDotaType(e.target.value)} className="w-full sm:w-auto sm:min-w-[100px] bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                  <option value="">Type</option>
                  {DOTA_CATEGORIES.types.subcategories.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                <select value={dotaRarity} onChange={e => setDotaRarity(e.target.value)} className="w-full sm:w-auto sm:min-w-[100px] bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                  <option value="">Rarity</option>
                  {DOTA_CATEGORIES.rarities.subcategories.map(rarity => (
                    <option key={rarity.value} value={rarity.value}>{rarity.label}</option>
                  ))}
                </select>
              </>
            )}
            
            {/* CS2-only filters */}
            {appid === 730 && (
              <>
                {/* Only show exterior filter for items that support it */}
                {supportsExterior && (
                  <select value={exterior} onChange={e => handleFilterChange('exterior', e.target.value)} className="w-full sm:w-auto sm:min-w-[100px] bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                    <option value="">Exterior</option>
                    <option value="factorynew">Factory New</option>
                    <option value="minimalwear">Minimal Wear</option>
                    <option value="fieldtested">Field-Tested</option>
                    <option value="wellworn">Well-Worn</option>
                    <option value="battlescarred">Battle-Scarred</option>
                  </select>
                )}
                
                {/* Quality selection (mutually exclusive): None | StatTrak | Souvenir */}
                {(qualitySupport.stattrak || qualitySupport.souvenir) && (
                  <div className="flex flex-wrap items-center gap-3 text-sm w-full sm:w-auto">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="quality"
                        value="none"
                        checked={!stattrak && !souvenir}
                        onChange={() => { setStattrak(false); setSouvenir(false); }}
                      />
                      None
                    </label>
                    {qualitySupport.stattrak && (
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="radio"
                          name="quality"
                          value="stattrak"
                          checked={!!stattrak}
                          onChange={() => { setStattrak(true); setSouvenir(false); }}
                        />
                        StatTrak
                      </label>
                    )}
                    {qualitySupport.souvenir && (
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="radio"
                          name="quality"
                          value="souvenir"
                          checked={!!souvenir}
                          onChange={() => { setSouvenir(true); setStattrak(false); }}
                        />
                        Souvenir
                      </label>
                    )}
                  </div>
                )}
                
              
              </>
            )}
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search items (e.g., AK-47 | Redline)"
              className="flex-1 min-w-[200px] max-w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <input value={minPrice} onChange={e => handleFilterChange('minPrice', e.target.value)} placeholder="Min $" className="w-20 sm:w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" />
            <input value={maxPrice} onChange={e => handleFilterChange('maxPrice', e.target.value)} placeholder="Max $" className="w-20 sm:w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" />
            <select value={sortBy} onChange={e => handleFilterChange('sortBy', e.target.value)} className="w-full sm:w-auto sm:min-w-[120px] bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
              <option value="popularity">Popularity</option>
              <option value="priceAsc">Price: Low to High</option>
              <option value="priceDesc">Price: High to Low</option>
              <option value="name">Name</option>
            </select>
            <button type="submit" disabled={isSearching || loading || isAutoSearching} className="w-full sm:w-auto px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
              {isSearching || loading || isAutoSearching ? 'Searching...' : 'Search'}
            </button>
          </form>
          {/* Price Filter Info */}
          {/* {(minPrice || maxPrice) && (
            <div className="w-full">
              <p className="text-xs text-yellow-400 mt-2">
                💡 Price filtering applied to current market prices. Steam's API may include items with outdated cached prices.
              </p>
            </div>
          )} */}
        </header>

        {/* Enhanced Error Message */}
        {error && (
          <div className="mt-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="text-red-400 mt-1">⚠️</div>
              <div className="flex-1">
                <p className="text-red-400 font-medium">Service Temporarily Unavailable</p>
                <p className="text-red-300 text-sm mt-1">{error}</p>
                <p className="text-gray-400 text-xs mt-2">
                  Steam's market service is experiencing delays. Data may be cached or limited.
                </p>
              </div>
            </div>
            <button 
              onClick={handleRetry}
              className="mt-3 px-4 py-2 text-sm bg-red-600 hover:bg-red-500 rounded transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Watchlist */}
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Watchlist</h2>
            <div className="flex items-center gap-3">
              {watchlist?.length > 0 && (
                <span className="text-sm text-gray-400 hidden sm:inline">
                  {watchlistShowAll
                    ? `Showing all ${watchlist.length}`
                    : (() => {
                        const wlTotal = watchlist.length;
                        const startIdx = (watchlistPage - 1) * watchlistPageSize + 1;
                        const endIdx = Math.min(startIdx + watchlistPageSize - 1, wlTotal);
                        return `Showing ${startIdx}-${endIdx} of ${wlTotal}`;
                      })()
                  }
                </span>
              )}
              {!steamId && <span className="text-sm text-gray-400">Login to save watchlist</span>}
            </div>
          </div>

          {/* Watchlist controls */}
          {watchlist?.length > 10 && (
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <button
                  className="px-2 py-1 text-xs rounded bg-gray-700 disabled:opacity-50"
                  disabled={watchlistShowAll || watchlistPage <= 1}
                  onClick={() => setWatchlistPage(p => Math.max(1, p - 1))}
                >
                  ◀ Prev
                </button>
                <span className="text-xs text-gray-300">
                  Page {watchlistShowAll ? '-' : watchlistPage} of {watchlistShowAll ? '-' : Math.max(1, Math.ceil((watchlist?.length || 0) / watchlistPageSize))}
                </span>
                <button
                  className="px-2 py-1 text-xs rounded bg-gray-700 disabled:opacity-50"
                  disabled={watchlistShowAll || watchlistPage >= Math.ceil((watchlist?.length || 0) / watchlistPageSize)}
                  onClick={() => setWatchlistPage(p => p + 1)}
                >
                  Next ▶
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400">Per page</label>
                <select
                  className="bg-gray-800 text-xs text-gray-200 rounded px-2 py-1 border border-gray-700"
                  value={watchlistPageSize}
                  onChange={(e) => {
                    setWatchlistPageSize(Number(e.target.value));
                    setWatchlistPage(1);
                  }}
                  disabled={watchlistShowAll}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <div className="h-4 w-px bg-gray-700 mx-1" />
                <button
                  className="px-2 py-1 text-xs rounded bg-gray-700"
                  onClick={() => {
                    setWatchlistShowAll(v => !v);
                    // Reset page when toggling
                    setWatchlistPage(1);
                  }}
                >
                  {watchlistShowAll ? 'Show paginated' : 'Show all'}
                </button>
              </div>
            </div>
          )}
          {/* Fixed grid to show 5 columns */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {(() => {
              const wl = watchlist || [];
              if (wl.length === 0) return null;
              if (watchlistShowAll) {
                return wl.map(item => (
                  <ItemCard key={item.id || `${item.appid || 730}_${item.hashName}`}
                    item={item}
                    inWatchlist={true}
                    onAdd={addToWatchlist}
                    onRemove={removeFromWatchlist}
                    eager={true}
                    isRemoving={removingItemIds.has(`${item.appid || 730}_${item.hashName}`)}
                  />
                ));
              }
              const start = (watchlistPage - 1) * watchlistPageSize;
              const end = Math.min(start + watchlistPageSize, wl.length);
              return wl.slice(start, end).map(item => (
                <ItemCard key={item.id || `${item.appid || 730}_${item.hashName}`}
                  item={item}
                  inWatchlist={true}
                  onAdd={addToWatchlist}
                  onRemove={removeFromWatchlist}
                  eager={true}
                  isRemoving={removingItemIds.has(`${item.appid || 730}_${item.hashName}`)}
                />
              ));
            })()}
            {watchlist.length === 0 && (
              <div className="col-span-full text-gray-400 text-sm">No items yet. Add from results below.</div>
            )}
          </div>
        </section>

        {/* Results */}
        {/* Results: Show section unless there's an error */}
        {!error && (
          <section className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{query ? 'Search Results' : 'Market Items'}</h2>
              <div className="text-sm text-gray-400">
                {total > 0 && `${total} items found`}
                {/* {loading && ' • Loading...'} */}
              </div>
            </div>
            

            
            {/* Price Filter Info - show simple message about Steam API price filtering */}
            {priceFilterInfo && priceFilterInfo.hasPriceFilter && (
              <div className="mt-2 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400 text-sm">
                    🔍 Price filter active
                    {priceFilterInfo.minPrice && ` (≥ $${priceFilterInfo.minPrice})`}
                    {priceFilterInfo.maxPrice && ` (≤ $${priceFilterInfo.maxPrice})`}
                  </span>
                </div>
                <div className="text-yellow-400 text-sm mt-1">
                  ⚠️ Steam uses cached prices for filtering, so displayed prices might not exactly match your filter criteria.
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  ℹ️ This is how Steam's marketplace works - search filters use older price data while item displays show current prices.
                </div>
              </div>
            )}
            
            {/* Enhanced Pagination controls - only show if we have items */}
            {total > 0 && items.length > 0 && (
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2 order-2 sm:order-1">
                  <button 
                    disabled={page <= 1 || loading || !pageInBounds} 
                    onClick={() => {
                      setError(null); // Clear any existing errors when navigating
                      fetchPage(page - 1);
                    }} 
                    className="px-2 py-1 text-xs sm:px-3 sm:py-2 sm:text-sm rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm">
                    Page {page} of {maxPage} {!pageInBounds && <span className="text-red-400">(Out of bounds!)</span>}
                  </span>
                  <button 
                    disabled={page >= maxPage || loading || !pageInBounds} 
                    onClick={() => {
                      setError(null); // Clear any existing errors when navigating
                      fetchPage(page + 1);
                    }} 
                    className="px-2 py-1 text-xs sm:px-3 sm:py-2 sm:text-sm rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="order-1 sm:order-2 text-xs sm:text-sm text-gray-400">
                  {/* Show simple pagination info */}
                  {items.length > 0 ? (
                    `Showing ${Math.min(start + 1, total)} - ${Math.min(start + items.length, total)} of ${total}`
                  ) : ''}
                  {/* {pageCache.has(page) && !loading && (
                    <span className="ml-2 text-green-400">📋 Cached</span>
                  )} */}
                </div>
              </div>
            )}
            {/* Fixed grid layout - 5 columns, natural rows based on item count */}
            <div className="mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {items.map((item, idx) => (
                  <ItemCard key={item.id || `${item.appid}_${item.hashName}`}
                    item={item}
                    inWatchlist={isInWatchlist(item)}
                    onAdd={addToWatchlist}
                    onRemove={removeFromWatchlist}
                    eager={idx < 15}
                    showWatchlistView={false}
                    isRemoving={removingItemIds.has(`${item.appid || 730}_${item.hashName}`)}
                  />
                ))}
                {!loading && items.length === 0 && !error && (
                  <div className="col-span-full text-center py-12">
                    {priceFilterInfo ? (
                      priceFilterInfo.steamApiEmpty ? (
                        // Case: Steam API returned 0 results with price filter
                        <div>
                          <div className="text-orange-400 text-lg mb-2">
                            🎯 No items found with specified price range
                          </div>
                          <p className="text-gray-400 text-sm mb-2">
                            Steam's marketplace doesn't have any items matching your criteria
                            {priceFilterInfo.minPrice && ` with price ≥ $${priceFilterInfo.minPrice}`}
                            {priceFilterInfo.maxPrice && ` ${priceFilterInfo.minPrice ? 'and' : 'with price'} ≤ $${priceFilterInfo.maxPrice}`}
                          </p>
                          <p className="text-gray-500 text-xs">
                            💡 Try widening your price range or check different item categories.
                          </p>
                        </div>
                      ) : (
                        // This shouldn't happen with the new approach, but keeping as fallback
                        <div>
                          <div className="text-orange-400 text-lg mb-2">
                            🔍 No items match your criteria on this page
                          </div>
                          <p className="text-gray-400 text-sm">
                            Try navigating to other pages or adjusting your search criteria.
                          </p>
                        </div>
                      )
                    ) : (
                      // No price filter active
                      <div>
                        <div className="text-gray-400 text-lg mb-2">
                          {query ? '🔍 No items found' : '📦 No items available'}
                        </div>
                        <p className="text-gray-500 text-sm">
                          {query ? 'Try adjusting your search terms or filters.' : 'Check back later for new items.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {/* {loading && (
                  <div className="col-span-full flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <p className="text-gray-400 mt-2">Loading items...</p>
                  </div>
                )} */}
              </div>
            </div>
            {/* Bottom pagination */}
            {total > pageSize && (
              <div className="mt-8 flex items-center justify-center">
                <div className="flex items-center gap-2">
                  <button 
                    disabled={page <= 1 || loading} 
                    onClick={() => {
                      setError(null); // Clear any existing errors when navigating
                      fetchPage(page - 1);
                    }} 
                    className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-sm">
                    {page} / {maxPage}
                    {/* {pageCache.has(page) && !loading && (
                      <span className="ml-2 text-green-400 text-xs">📋</span>
                    )} */}
                  </span>
                  <button 
                    disabled={page >= maxPage || loading} 
                    onClick={() => {
                      setError(null); // Clear any existing errors when navigating
                      fetchPage(page + 1);
                    }} 
                    className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Target Price Modal */}
      {targetPriceModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Set Target Price</h3>
            
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-2">Item:</div>
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                {targetPriceModal.item?.iconUrl && (
                  <img src={targetPriceModal.item.iconUrl} alt="" className="w-12 h-12 object-contain" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{targetPriceModal.item?.name}</div>
                  <div className="text-sm text-gray-400">
                    Current: {targetPriceModal.item?.salePriceText || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">
                Alert me when price drops to:
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={targetPriceModal.targetPrice}
                  onChange={(e) => setTargetPriceModal(prev => ({ ...prev, targetPrice: e.target.value }))}
                  className="w-full pl-8 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-lg focus:outline-none focus:border-blue-500"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <div className="text-xs text-gray-500 mt-2">
                💡 Tip: Set 5-10% below current price for best deals
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setTargetPriceModal({ open: false, item: null, targetPrice: '' })}
                disabled={isAddingToWatchlist}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmAddToWatchlist}
                disabled={isAddingToWatchlist}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isAddingToWatchlist ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Adding...</span>
                  </>
                ) : (
                  'Add to Watchlist'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemCard({ item, inWatchlist, onAdd, onRemove, eager = false, showWatchlistView = true, isRemoving = false }) {
  const [refEl, setRefEl] = useState(null);

  // Use price history from Firebase if available (stored when item was added/updated)
  // Convert Firebase format {price, timestamp} to Sparkline format [timestamp, price]
  const priceHistoryData = useMemo(() => {
    if (!Array.isArray(item.priceHistory) || item.priceHistory.length < 2) {
      return null;
    }

    const normalizeTimestamp = (raw) => {
      if (!raw) return null;
      if (typeof raw === 'number') {
        // Assume seconds if value looks small
        return raw > 1e12 ? raw : raw * 1000;
      }
      if (raw instanceof Date) return raw.getTime();
      if (typeof raw.toDate === 'function') return raw.toDate().getTime();
      if (typeof raw.seconds === 'number') {
        return raw.seconds * 1000 + Math.floor((raw.nanoseconds || 0) / 1e6);
      }
      if (typeof raw._seconds === 'number') {
        return raw._seconds * 1000 + Math.floor((raw._nanoseconds || 0) / 1e6);
      }
      const parsed = Date.parse(raw);
      return Number.isNaN(parsed) ? null : parsed;
    };

    const normalizePrice = (raw) => {
      const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^0-9.-]/g, ''));
      return Number.isNaN(num) ? null : num;
    };

    const formatted = item.priceHistory
      .map(entry => {
        const ts = normalizeTimestamp(entry.timestamp);
        const price = normalizePrice(entry.price);
        if (!ts || price === null) return null;
        return [ts, price];
      })
      .filter(Boolean)
      .sort((a, b) => a[0] - b[0]);

    return formatted.length >= 2 ? formatted.slice(-30) : null;
  }, [item.priceHistory]);

  // Determine if we should show watchlist-specific view
  // In search results, even if item is in watchlist, show the current price from search
  const showAsWatchlist = inWatchlist && showWatchlistView;

  return (
  <div ref={setRefEl} className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden hover:border-blue-600/60 transition-colors flex flex-col h-full">
      <div className="aspect-square w-full bg-gray-900 flex items-center justify-center overflow-hidden">
        {item.iconUrl ? (
          <img src={item.iconUrl} alt={item.name} className="w-2/3 object-contain" />
        ) : (
          <span className="text-gray-600">No Image</span>
        )}
      </div>
      <div className="p-4 space-y-2 flex flex-col flex-1">
        <div className="text-sm text-gray-400">{item.appName || (Number(item.appid) === 570 ? 'Dota 2' : 'CS2')}</div>
        <div className="font-semibold line-clamp-2 min-h-[3rem]">{item.name}</div>
        
        {/* Price display */}
        <div className="text-sm text-gray-300 flex-1">
          {showAsWatchlist ? (
            <div className="space-y-3 h-full flex flex-col">
              {/* Target price - main focus for watchlist */}
              {item.targetPrice ? (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">Target Price:</span>
                  <span className="text-yellow-400 font-semibold text-base">${item.targetPrice.toFixed(2)}</span>
                </div>
              ) : (
                <div className="text-gray-500 text-xs italic">No target price set</div>
              )}
              {/* Sparkline - price trend from stored history */}
              <div className="mt-1 bg-gray-900/40 border border-gray-800 rounded-lg p-2">
                <div className="text-gray-400 text-[11px] uppercase tracking-wide mb-2 flex items-center justify-between">
                  <span>Price Trend</span>
                  {priceHistoryData && (
                    <span className="text-gray-500 normal-case">{priceHistoryData.length} pts</span>
                  )}
                </div>
                {priceHistoryData ? (
                  <Sparkline data={priceHistoryData} width={180} height={38} className="w-full" />
                ) : (
                  <div className="text-gray-600 text-xs text-center py-1">No price history</div>
                )}
              </div>
            </div>
          ) : (
            /* Non-watchlist item OR search result - show current price */
            (item.salePriceText || item.sellPriceText || (item.currentPrice ? `$${item.currentPrice.toFixed(2)}` : null)) ? (
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs">Current:</span>
                <span className="text-green-400 font-medium">
                  {item.salePriceText || item.sellPriceText || `$${item.currentPrice.toFixed(2)}`}
                </span>
              </div>
            ) : (
              <span className="text-gray-500">—</span>
            )
          )}
        </div>
        
        <div className="pt-2 mt-auto">
          {inWatchlist ? (
            <button 
              onClick={() => onRemove(item)} 
              disabled={isRemoving}
              className="w-full px-3 py-2 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isRemoving ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                  <span>Removing...</span>
                </>
              ) : (
                'Remove'
              )}
            </button>
          ) : (
            <button onClick={() => onAdd(item)} className="w-full px-3 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500">Add to Watchlist</button>
          )}
        </div>
      </div>
    </div>
  );
}

function SubCategorySelect({ appid, value, onChange }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const cs2Categories = {
    rifles: {
      label: 'Rifles',
      value: 'tag_CSGO_Type_Rifle',
      subcategories: [
        { label: 'AK-47', value: 'tag_weapon_ak47' },
        { label: 'AUG', value: 'tag_weapon_aug' },
        { label: 'FAMAS', value: 'tag_weapon_famas' },
        { label: 'Galil AR', value: 'tag_weapon_galilar' },
        { label: 'M4A1-S', value: 'tag_weapon_m4a1_silencer' },
        { label: 'M4A4', value: 'tag_weapon_m4a1' },
        { label: 'SG 553', value: 'tag_weapon_sg556' }
      ]
    },
    pistols: {
      label: 'Pistols',
      value: 'tag_CSGO_Type_Pistol',
      subcategories: [
        { label: 'CZ75-Auto', value: 'tag_weapon_cz75a' },
        { label: 'Desert Eagle', value: 'tag_weapon_deagle' },
        { label: 'Dual Berettas', value: 'tag_weapon_elite' },
        { label: 'Five-SeveN', value: 'tag_weapon_fiveseven' },
        { label: 'Glock-18', value: 'tag_weapon_glock' },
        { label: 'P2000', value: 'tag_weapon_hkp2000' },
        { label: 'P250', value: 'tag_weapon_p250' },
        { label: 'R8 Revolver', value: 'tag_weapon_revolver' },
        { label: 'Tec-9', value: 'tag_weapon_tec9' },
        { label: 'USP-S', value: 'tag_weapon_usp_silencer' }
      ]
    },
    smgs: {
      label: 'SMGs',
      value: 'tag_CSGO_Type_SMG',
      subcategories: [
        { label: 'MAC-10', value: 'tag_weapon_mac10' },
        { label: 'MP5-SD', value: 'tag_weapon_mp5sd' },
        { label: 'MP7', value: 'tag_weapon_mp7' },
        { label: 'MP9', value: 'tag_weapon_mp9' },
        { label: 'P90', value: 'tag_weapon_p90' },
        { label: 'PP-Bizon', value: 'tag_weapon_bizon' },
        { label: 'UMP-45', value: 'tag_weapon_ump45' }
      ]
    },
    sniperRifles: {
      label: 'Sniper Rifles',
      value: 'tag_CSGO_Type_SniperRifle',
      subcategories: [
        { label: 'AWP', value: 'tag_weapon_awp' },
        { label: 'G3SG1', value: 'tag_weapon_g3sg1' },
        { label: 'SCAR-20', value: 'tag_weapon_scar20' },
        { label: 'SSG 08', value: 'tag_weapon_ssg08' }
      ]
    },
    shotguns: {
      label: 'Shotguns',
      value: 'tag_CSGO_Type_Shotgun',
      subcategories: [
        { label: 'MAG-7', value: 'tag_weapon_mag7' },
        { label: 'Nova', value: 'tag_weapon_nova' },
        { label: 'Sawed-Off', value: 'tag_weapon_sawedoff' },
        { label: 'XM1014', value: 'tag_weapon_xm1014' }
      ]
    },
    machineguns: {
      label: 'Machineguns',
      value: 'tag_CSGO_Type_Machinegun',
      subcategories: [
        { label: 'M249', value: 'tag_weapon_m249' },
        { label: 'Negev', value: 'tag_weapon_negev' }
      ]
    },
    knives: {
      label: 'Knives',
      value: 'tag_CSGO_Type_Knife',
      subcategories: [
         { label: 'Bayonet', value: 'tag_weapon_bayonet' },
          { label: 'Bowie Knife', value: 'tag_weapon_knife_survival_bowie' },
           { label: 'Butterfly Knife', value: 'tag_weapon_knife_butterfly' },
            { label: 'Classic Knife', value: 'tag_weapon_knife_css' },
             { label: 'Falchion Knife', value: 'tag_weapon_knife_falchion' },
             { label: 'Flip Knife', value: 'tag_weapon_knife_flip' },
             { label: 'Gut Knife', value: 'tag_weapon_knife_gut' },
             { label: 'Karambit', value: 'tag_weapon_knife_karambit' },
             { label: 'Kukri Knife', value: 'tag_weapon_knife_kukri' },
             { label: 'M9 Bayonet', value: 'tag_weapon_knife_m9_bayonet' },
             { label: 'Navaja Knife', value: 'tag_weapon_knife_gypsy_jackknife' },

         
      ]
    },
    gloves: {
      label: 'Gloves',
      value: 'tag_Type_Hands',
      subcategories: []
    },
    other: {
      label: 'Other',
      value: 'tag_CSGO_Type_Other',
      subcategories: [
        { label: 'Agent', value: 'tag_Type_CustomPlayer' },
        { label: 'Music Kit', value: 'tag_CSGO_Type_MusicKit' },
        { label: 'Charm', value: 'tag_CSGO_Tool_Keychain' },
        { label: 'Graffiti', value: 'tag_CSGO_Type_Spray' },
        { label: 'Patch', value: 'tag_CSGO_Tool_Patch' },
        { label: 'Collectible', value: 'tag_CSGO_Type_Collectible' },
        { label: 'Pass', value: 'tag_CSGO_Type_Ticket' },
        { label: 'Key', value: 'tag_CSGO_Tool_WeaponCase_KeyTag' },
        { label: 'Gift', value: 'tag_CSGO_Tool_GiftTag' },
        { label: 'Tag', value: 'tag_CSGO_Tool_Name_TagTag' },
        { label: 'Tool', value: 'tag_CSGO_Type_Tool' },
        { label: 'Zeus x27', value: 'tag_weapon_taser' },
        { label: 'Cases', value: 'tag_CSGO_Type_WeaponCase' },
        { label: 'Stickers', value: 'tag_CSGO_Tool_Sticker' }
      ]
    }
  };

  const getCurrentLabel = () => {
    if (!value) return 'All';
    
    if (appid === 570) {
      // Check for Dota2 categories (heroes, types, rarities)
      for (const [categoryKey, category] of Object.entries(DOTA_CATEGORIES)) {
        if (category.value === value) {
          return category.label;
        }
        const subcategory = category.subcategories.find(sub => sub.value === value);
        if (subcategory) {
          return `${category.label} • ${subcategory.label}`;
        }
      }
      return 'Custom';
    }
    
    // For CS2, check both main categories and subcategories
    for (const [key, category] of Object.entries(cs2Categories)) {
      if (category.value === value) {
        return category.label;
      }
      const subcategory = category.subcategories.find(sub => sub.value === value);
      if (subcategory) {
        return `${category.label} • ${subcategory.label}`;
      }
    }
    return 'Custom';
  };

  const handleSelection = (selectedValue) => {
    onChange(selectedValue);
    // Do not close modal here; wait for user to click 'Done'
  };

  const clearSelection = () => {
    onChange(null);
    // Do not close modal here; wait for user to click 'Done'
  };

  // Use modal for both CS2 and Dota 2
  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 hover:border-gray-600 transition-colors flex items-center gap-2"
      >
        <span className="truncate flex-1 text-left">{getCurrentLabel()}</span>
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Category Selection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black bg-opacity-75 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl w-full max-w-[95vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[85vh] overflow-hidden border border-gray-600 flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-4 sm:p-6 border-b border-gray-600">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Search Community Market</h3>
                  <p className="text-gray-300 text-sm mt-1">Select a category to filter items</p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="px-4 py-2 text-sm bg-gray-700/80 hover:bg-gray-600 rounded-lg transition-all duration-200 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear Selection
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* All option */}
                <div className="group bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-xl p-4 border border-gray-600/50 hover:border-blue-500/50 transition-all duration-300">
                  <button
                    type="button"
                    onClick={() => handleSelection(null)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                      !value 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25' 
                        : 'hover:bg-gray-600/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold">All Categories</div>
                        <div className="text-xs text-gray-400">Show all items</div>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Category groups */}
                {Object.entries(appid === 570 ? DOTA_CATEGORIES : cs2Categories).map(([key, category]) => (
                  <div key={key} className="group bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-xl p-4 border border-gray-600/50 hover:border-blue-500/50 transition-all duration-300">
                    <button
                      type="button"
                      onClick={() => handleSelection(category.value)}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-200 mb-3 ${
                        value === category.value 
                          ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25' 
                          : 'hover:bg-gray-600/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-semibold">{category.label}</div>
                          <div className="text-xs text-gray-400">All {category.label.toLowerCase()}</div>
                        </div>
                      </div>
                    </button>
                    
                    {/* Subcategories */}
                    {category.subcategories.length > 0 && (
                      <div className="space-y-1 ml-2 pl-4 border-l border-gray-600/50">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Specific Items</div>
                        {category.subcategories.map(subcategory => (
                          <button
                            key={subcategory.value}
                            type="button"
                            onClick={() => handleSelection(subcategory.value)}
                            className={`w-full text-left p-2 rounded-lg text-sm transition-all duration-200 ${
                              value === subcategory.value 
                                ? 'bg-gradient-to-r from-blue-500 to-blue-400 text-white shadow-md shadow-blue-500/20' 
                                : 'hover:bg-gray-600/50 text-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60"></div>
                              {subcategory.label}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex-shrink-0 bg-gray-800/50 p-3 sm:p-4 border-t border-gray-600">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  {value ? (
                    <span>Selected: <span className="text-white font-medium">{getCurrentLabel()}</span></span>
                  ) : (
                    <span>No category selected - showing all items</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Use setTimeout to close modal after current event loop to avoid any timing issues
                    setTimeout(() => setIsModalOpen(false), 0);
                  }}
                  className="px-4 sm:px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg font-medium transition-all duration-200 shadow-lg shadow-blue-500/25"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
