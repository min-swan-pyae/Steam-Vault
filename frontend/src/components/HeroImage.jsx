import React, { useEffect, useState } from "react";

/**
 * Hero Image component - Uses backend proxy
 * Backend handles CDN fetching and caching (images cached permanently after first load)
 * Retry logic handles backend cache warming on first startup
 */
export const HeroImage = React.memo(({ heroId, alt, className }) => {
  const [src, setSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!heroId) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    let retryTimer = null;

    // Use backend proxy which caches images permanently
    const heroImageUrl = `/api/dota2/heroes/image/${heroId}`;
    
    const img = new Image();
    
    img.onload = () => {
      if (isMounted) {
        setSrc(heroImageUrl);
        setIsLoading(false);
        setHasError(false);
        setRetryCount(0);
      }
    };
    
    img.onerror = () => {
      if (isMounted) {
        // Retry up to 2 times with shorter backoff (backend might be warming cache)
        if (retryCount < 2) {
          const delay = Math.min(500 * Math.pow(2, retryCount), 2000); // 500ms, 1s max
          retryTimer = setTimeout(() => {
            if (isMounted) {
              setRetryCount(prev => prev + 1);
            }
          }, delay);
        } else {
          // After retries, show error
          setHasError(true);
          setIsLoading(false);
        }
      }
    };
    
    img.src = heroImageUrl;

    return () => {
      isMounted = false;
      if (retryTimer) clearTimeout(retryTimer);
      img.onload = null;
      img.onerror = null;
    };
  }, [heroId, retryCount]);

  // Show loading placeholder
  if (isLoading) {
    return (
      <div className={`${className} bg-gray-700 animate-pulse`} />
    );
  }

  // Show error state only after retries exhausted
  if (hasError || !src) {
    return (
      <div className={`${className} bg-gray-800 flex items-center justify-center text-gray-600 text-xs`}>
        ?
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || `Hero ${heroId}`}
      className={className}
      loading="lazy"
      onError={() => {
        // Don't retry if image fails after successful load (corrupt image)
        setHasError(true);
      }}
    />
  );
}, (prevProps, nextProps) => {
  return prevProps.heroId === nextProps.heroId && 
         prevProps.className === nextProps.className;
});

HeroImage.displayName = 'HeroImage';