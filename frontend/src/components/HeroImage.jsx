import { cdnConfig } from "../config/heroConfig";
import { useState, useEffect } from "react";


const getFallbackHeroImage = () => {
  return cdnConfig.fallbackHero;
};

export const HeroImage = ({ heroId, alt, className }) => {
    const [imageSrc, setImageSrc] = useState('');
    
    useEffect(() => {
      const loadImage = async () => {
        // Use the API proxy endpoint directly
        setImageSrc(`/api/dota2/heroes/image/${heroId}`);
      };
      loadImage();
    }, [heroId]);

    return (
      <img
        src={imageSrc || getFallbackHeroImage()}
        alt={alt}
        className={className}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = getFallbackHeroImage();
        }}
      />
    );
  };