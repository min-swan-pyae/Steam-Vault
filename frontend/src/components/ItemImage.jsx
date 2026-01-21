import { useState, useEffect, useRef } from 'react';

/**
 * ItemImage component that loads Dota 2 item images through backend proxy
 * No caching needed - items are small and served efficiently by backend
 */
export const ItemImage = ({ itemName, itemId, alt, className, title }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    // Create new abort controller for this fetch
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const loadImage = async () => {
      // Skip if no item name or ID
      if (!itemName && !itemId) {
        setIsLoading(false);
        setError(true);
        return;
      }

      try {
        setIsLoading(true);
        setError(false);

        // Convert item name: remove 'item_' prefix if present
        const cleanItemName = (itemName || `item_${itemId}`)
          .replace(/^item_/, '')
          .toLowerCase();

        // Use backend proxy endpoint (no caching - let browser handle it)
        const imageUrl = `/api/dota2/items/image/${cleanItemName}`;
        
        // Preload image to check if it exists
        await new Promise((resolve, reject) => {
          const img = new Image();
          
          img.onload = () => resolve(imageUrl);
          img.onerror = () => reject(new Error('Failed to load'));
          
          // Check if aborted before setting src
          if (signal.aborted) {
            reject(new Error('AbortError'));
            return;
          }
          
          img.src = imageUrl;
        });
        
        if (mounted && !signal.aborted) {
          setImageSrc(imageUrl);
          setIsLoading(false);
        }
      } catch (err) {
        // Only log non-abort errors
        if (err.message !== 'AbortError' && mounted && !signal.aborted) {
          setError(true);
          setIsLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      mounted = false;
      // Abort any ongoing fetch when component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [itemName, itemId]);

  const handleError = () => {
    setError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
    setError(false);
  };

  // Show placeholder while loading or on error
  if (isLoading || error || !imageSrc) {
    return (
      <div 
        className={`${className} bg-gray-700 flex items-center justify-center`}
        title={title || alt}
      >
        {error ? (
          <span className="text-xs text-gray-500">?</span>
        ) : (
          <div className="animate-pulse bg-gray-600 w-full h-full"></div>
        )}
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      title={title || alt}
      onError={handleError}
      onLoad={handleLoad}
      loading="lazy"
    />
  );
};

export default ItemImage;
