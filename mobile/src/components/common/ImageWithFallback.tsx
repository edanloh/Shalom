import React, { useState } from 'react';
import { Image, ImageStyle } from 'react-native';

interface ImageWithFallbackProps {
  source: { uri: string } | any;
  fallback: any;
  style: ImageStyle;
  onError?: () => void;
}

const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({ 
  source, 
  fallback, 
  style, 
  onError 
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    onError?.();
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  // If there's no URI or an error occurred, use fallback
  if (!source?.uri || hasError) {
    return <Image source={fallback} style={style} onLoad={handleLoad} />;
  }

  return (
    <Image
      source={source}
      style={style}
      onError={handleError}
      onLoad={handleLoad}
    />
  );
};

export default ImageWithFallback;
