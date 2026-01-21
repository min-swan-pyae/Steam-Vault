import React from 'react';

/**
 * Skeleton loader for player stats cards
 */
export const PlayerStatsSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-8 bg-gray-700 rounded w-1/3"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-gray-800 rounded-lg p-4 space-y-3">
          <div className="h-4 bg-gray-700 rounded w-2/3"></div>
          <div className="h-8 bg-gray-700 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Skeleton loader for match history
 */
export const MatchHistorySkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-6 bg-gray-700 rounded w-1/4"></div>
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="bg-gray-800 rounded-lg p-4 space-y-2">
        <div className="flex justify-between">
          <div className="h-5 bg-gray-700 rounded w-1/4"></div>
          <div className="h-5 bg-gray-700 rounded w-1/6"></div>
        </div>
        <div className="h-4 bg-gray-700 rounded w-1/3"></div>
      </div>
    ))}
  </div>
);

/**
 * Skeleton loader for hero grid
 */
export const HeroGridSkeleton = () => (
  <div className="animate-pulse grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
    {[...Array(15)].map((_, i) => (
      <div key={i} className="bg-gray-800 rounded-lg p-3 space-y-2">
        <div className="h-24 bg-gray-700 rounded"></div>
        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
        <div className="h-3 bg-gray-700 rounded w-1/2"></div>
      </div>
    ))}
  </div>
);

/**
 * Skeleton loader for marketplace items
 */
export const MarketItemsSkeleton = () => (
  <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {[...Array(12)].map((_, i) => (
      <div key={i} className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="h-40 bg-gray-700"></div>
        <div className="p-4 space-y-2">
          <div className="h-5 bg-gray-700 rounded w-3/4"></div>
          <div className="h-6 bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    ))}
  </div>
);

/**
 * Skeleton loader for leaderboard table
 */
export const LeaderboardSkeleton = () => (
  <div className="animate-pulse space-y-2">
    <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="h-12 bg-gray-700"></div>
      {[...Array(10)].map((_, i) => (
        <div key={i} className="h-16 bg-gray-800 border-t border-gray-700 flex items-center space-x-4 px-4">
          <div className="h-10 w-10 bg-gray-700 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-700 rounded w-1/3"></div>
            <div className="h-3 bg-gray-700 rounded w-1/4"></div>
          </div>
          <div className="h-8 bg-gray-700 rounded w-16"></div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Skeleton loader for meta analysis cards
 */
export const MetaAnalysisSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-8 bg-gray-700 rounded w-1/3"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-gray-800 rounded-lg p-4 space-y-3">
          <div className="h-20 bg-gray-700 rounded"></div>
          <div className="h-5 bg-gray-700 rounded w-3/4"></div>
          <div className="flex justify-between">
            <div className="h-4 bg-gray-700 rounded w-1/4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Progressive loading wrapper with time estimate
 */
export const ProgressiveLoader = ({ 
  message = "Loading data...", 
  estimatedTime = "~2-3 seconds",
  hint = "This data is fetched from external APIs" 
}) => (
  <div className="flex flex-col items-center justify-center py-12 space-y-4">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
    </div>
    <div className="text-center space-y-2">
      <p className="text-white font-medium">{message}</p>
      <p className="text-gray-400 text-sm">Expected wait: {estimatedTime}</p>
      {hint && <p className="text-gray-500 text-xs">{hint}</p>}
    </div>
  </div>
);

/**
 * Skeleton wrapper with progressive enhancement
 * Shows skeleton initially, then content when loaded
 */
export const SkeletonWrapper = ({ 
  loading, 
  skeleton: SkeletonComponent,
  estimatedTime,
  message,
  children 
}) => {
  if (!loading) return children;
  
  return (
    <div className="space-y-6">
      {estimatedTime && (
        <ProgressiveLoader 
          message={message} 
          estimatedTime={estimatedTime}
        />
      )}
      <SkeletonComponent />
    </div>
  );
};

export default {
  PlayerStatsSkeleton,
  MatchHistorySkeleton,
  HeroGridSkeleton,
  MarketItemsSkeleton,
  LeaderboardSkeleton,
  MetaAnalysisSkeleton,
  ProgressiveLoader,
  SkeletonWrapper
};
