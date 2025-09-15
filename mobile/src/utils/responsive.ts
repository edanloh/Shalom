import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Get device type based on screen width
export const getDeviceType = () => {
  if (SCREEN_WIDTH < 768) return 'mobile';
  if (SCREEN_WIDTH < 1024) return 'tablet';
  return 'desktop';
};

// Responsive font scaling
export const scale = (size: number): number => {
  const scale = SCREEN_WIDTH / 375; // iPhone X base width
  const newSize = size * scale;
  
  // Apply different scaling for different device types
  const deviceType = getDeviceType();
  
  if (deviceType === 'tablet') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize * 0.9));
  } else if (deviceType === 'desktop') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize * 0.8));
  }
  
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Responsive width scaling
export const horizontalScale = (size: number): number => {
  const scale = SCREEN_WIDTH / 375;
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
};

// Responsive height scaling
export const verticalScale = (size: number): number => {
  const scale = SCREEN_HEIGHT / 812; // iPhone X base height
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
};

// Moderate scaling - less aggressive than full scale
export const moderateScale = (size: number, factor: number = 0.5): number => {
  return size + (scale(size) - size) * factor;
};

// Get responsive padding/margin based on device size
export const getResponsiveSpacing = (baseSpacing: number) => {
  const deviceType = getDeviceType();
  
  switch (deviceType) {
    case 'tablet':
      return baseSpacing * 1.2;
    case 'desktop':
      return baseSpacing * 1.4;
    default:
      return baseSpacing;
  }
};

// Check if device is in landscape mode
export const isLandscape = () => SCREEN_WIDTH > SCREEN_HEIGHT;

// Get screen dimensions
export const screenData = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  deviceType: getDeviceType(),
  isLandscape: isLandscape(),
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
};

// Responsive grid calculations
export const getGridColumns = (itemWidth: number, spacing: number = 16) => {
  const availableWidth = SCREEN_WIDTH - (spacing * 2); // Account for container padding
  const itemWithSpacing = itemWidth + spacing;
  return Math.floor(availableWidth / itemWithSpacing);
};

// Calculate item width based on columns
export const getItemWidth = (columns: number, spacing: number = 16) => {
  const availableWidth = SCREEN_WIDTH - (spacing * 2); // Account for container padding
  const totalSpacing = spacing * (columns - 1);
  return (availableWidth - totalSpacing) / columns;
};

// Safe area helpers
export const getSafeAreaTop = () => {
  if (Platform.OS === 'ios') {
    return SCREEN_HEIGHT >= 812 ? 44 : 20; // iPhone X and newer vs older iPhones
  }
  return 24; // Android status bar height
};

export const getSafeAreaBottom = () => {
  if (Platform.OS === 'ios') {
    return SCREEN_HEIGHT >= 812 ? 34 : 0; // iPhone X and newer have home indicator
  }
  return 0;
};

// Breakpoints for different layouts
export const breakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1200,
} as const;

// Media queries equivalent for React Native
export const useResponsiveLayout = () => {
  const deviceType = getDeviceType();
  
  return {
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT,
    columns: {
      mobile: 1,
      tablet: 2,
      desktop: 3,
    }[deviceType],
    spacing: getResponsiveSpacing(16),
  };
};
