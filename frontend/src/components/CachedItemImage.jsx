import React, { useEffect, useState, useRef } from 'react';
import { dotaService } from '../services/dotaService';

const placeholderClass = 'flex items-center justify-center bg-gray-700 text-gray-300 text-xs';

/**
 * Optimized Item Image component
 * - No localStorage caching (browser cache is sufficient for small images)
 * - Proper abort handling to prevent memory leaks
 * - Fast rendering with direct URLs
 */
export default function CachedItemImage({ itemName, className = '', alt = '' }) {
  const [src, setSrc] = useState(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    
    // Clean up previous abort controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setHasError(false);
    setIsLoading(true);

    if (!itemName) {
      setSrc(null);
      setIsLoading(false);
      return () => { 
        isMounted = false;
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }

    const proxyUrl = dotaService.getItemImageUrl(itemName);
    if (!proxyUrl) {
      setSrc(dotaService.getItemImageFallbackUrl(itemName));
      setIsLoading(false);
      return () => { 
        isMounted = false;
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }

    // Preload image to verify it exists
    const img = new Image();
    
    img.onload = () => {
      if (isMounted && !signal.aborted) {
        setSrc(proxyUrl);
        setIsLoading(false);
      }
    };
    
    img.onerror = () => {
      if (isMounted && !signal.aborted) {
        setHasError(true);
        setSrc(dotaService.getItemImageFallbackUrl(itemName));
        setIsLoading(false);
      }
    };

    // Check if already aborted before setting src
    if (!signal.aborted) {
      img.src = proxyUrl;
    }

    return () => {
      isMounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [itemName]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setSrc(dotaService.getItemImageFallbackUrl(itemName));
      setIsLoading(false);
    }
  };

  if (!itemName) {
    return (
      <div className={`${placeholderClass} ${className}`}>
        ?
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`${placeholderClass} ${className}`}>
        <div className="animate-pulse w-full h-full bg-gray-600"></div>
      </div>
    );
  }

  return (
    <img
      src={src || dotaService.getItemImageFallbackUrl(itemName)}
      alt={alt || itemName}
      className={className}
      loading="lazy"
      onError={handleError}
    />
  );
}
