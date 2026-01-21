import React from 'react';

export const PlayerSearch = React.memo(({ searchQuery, setSearchQuery, handleSearch }) => {
  return (
    <div className="mb-8">
      <form onSubmit={handleSearch} className="flex">
        <input
          type="number"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Steam ID or Dota 2 ID"
          className="bg-gray-700 text-white px-4 py-2 rounded-l-lg flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Search
        </button>
      </form>
    </div>
  );
}, (prevProps, nextProps) => 
  prevProps.searchQuery === nextProps.searchQuery &&
  prevProps.setSearchQuery === nextProps.setSearchQuery &&
  prevProps.handleSearch === nextProps.handleSearch
);

PlayerSearch.displayName = 'PlayerSearch';