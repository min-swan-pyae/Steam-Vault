import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SearchBar = React.memo(() => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsLoading(true);
    // Clean the input to handle different Steam ID formats
    const cleanedQuery = query.trim().replace(/.*\//, '');
    const normalizeSteamId = (steamId) => {
      if (typeof steamId === "number" &&steamId.length < 16) {
        // Convert from 32-bit to 64-bit
        return (BigInt(steamId) + BigInt("76561197960265728")).toString();
      }
      return steamId;
    };
    const normalizedSteamId = normalizeSteamId(cleanedQuery);
    navigate(`/dota2/players/${normalizedSteamId}`);
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter Steam ID or Dota2 account ID"
          className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gray-800 border border-gray-700 
                     rounded-lg text-white placeholder-gray-400 focus:outline-none 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                     transition-all text-sm sm:text-base"
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className={`absolute right-2 top-1/2 transform -translate-y-1/2 
                     px-3 sm:px-6 py-1.5 sm:py-2 bg-blue-600 text-white rounded-md
                     text-sm sm:text-base
                     ${isLoading || !query.trim() 
                       ? 'opacity-50 cursor-not-allowed' 
                       : 'hover:bg-blue-700'} 
                     transition-all duration-200`}
        >
          {isLoading ? (
            <div className="flex items-center space-x-1 sm:space-x-2">
              <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="hidden sm:inline">Searching</span>
            </div>
          ) : (
            <span>Search</span>
          )}
        </button>
      </form>
      <p className="text-gray-400 text-xs sm:text-sm mt-2 break-words">
        Example: https://steamcommunity.com/profiles/76561198111251027 or 150985299
      </p>
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;