import React, { useState, useEffect } from 'react';

/**
 * Enhanced image component with loading states, error fallbacks, and retry logic
 * Optimized for CDN images that may be slow to load (Steam CDN, etc.)
 * 
 * @param {string} src - Image source URL
 * @param {string} fallbackSrc - Fallback image URL if main image fails
 * @param {string} alt - Alt text
 * @param {string} className - CSS classes
 * @param {number} retryCount - Number of retry attempts (default: 2)
 * @param {number} retryDelay - Delay between retries in ms (default: 1000)
 * @param {boolean} showLoadingPlaceholder - Show loading spinner while image loads
 */
const LazyImage = ({ 
  src, 
  fallbackSrc = null, 
  alt = '', 
  className = '',
  retryCount = 2,
  retryDelay = 1000,
  showLoadingPlaceholder = true
}) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!src) {
      setLoading(false);
      setError(true);
      return;
    }

    setLoading(true);
    setError(false);
    setAttempts(0);
    setImageSrc(src);
  }, [src]);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    // Retry logic
    if (attempts < retryCount) {
      console.log(`Image load failed, retrying (${attempts + 1}/${retryCount})...`, src);
      setAttempts(prev => prev + 1);
      
      // Retry after delay
      setTimeout(() => {
        setImageSrc(null);
        setTimeout(() => setImageSrc(src), 50);
      }, retryDelay);
      return;
    }

    // All retries exhausted, use fallback
    console.warn(`Image load failed after ${retryCount} retries, using fallback:`, src);
    setLoading(false);
    setError(true);
    
    if (fallbackSrc) {
      setImageSrc(fallbackSrc);
    }
  };

  if (loading && showLoadingPlaceholder) {
    return (
      <div className={`${className} bg-gray-800 animate-pulse flex items-center justify-center`}>
        <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  if (error && !fallbackSrc) {
    return (
      <div className={`${className} bg-gray-800 flex items-center justify-center`}>
        <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
      loading="lazy"
    />
  );
};

export default LazyImage;
