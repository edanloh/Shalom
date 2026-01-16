import React, { useState } from 'react';
import { Image, ImageProps, ImageStyle, View, StyleSheet } from 'react-native';
import { Images } from '../../../assets';

interface CourseImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
  style?: ImageStyle;
  placeholder?: keyof typeof Images;
  showPlaceholderOnError?: boolean;
}

/**
 * CourseImage - A component that displays course images with fallback to placeholder
 * Automatically shows placeholder when image fails to load
 */
export default function CourseImage({ 
  uri,
  style,
  placeholder = 'coursePlaceholder',
  showPlaceholderOnError = true,
  ...imageProps
}: CourseImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  // Show placeholder if there's an error or no URI provided
  if (hasError || !uri || uri.trim() === '') {
    if (showPlaceholderOnError) {
      return (
        <Image
          source={Images[placeholder]}
          style={[style, styles.placeholder]}
          {...imageProps}
        />
      );
    }
    return null;
  }

  return (
    <View style={style}>
      <Image
        source={{ uri }}
        style={[style, isLoading && styles.loading]}
        onError={handleError}
        onLoad={handleLoad}
        onLoadStart={handleLoadStart}
        {...imageProps}
      />
      {isLoading && showPlaceholderOnError && (
        <Image
          source={Images[placeholder]}
          style={[style, styles.placeholder, styles.loadingPlaceholder]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    opacity: 0.7,
  },
  loading: {
    opacity: 0.5,
  },
  loadingPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
});