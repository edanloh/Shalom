import * as Font from 'expo-font';

export const loadFonts = async () => {
  await Font.loadAsync({
    'PlusJakartaSans': require('../../assets/fonts/PlusJakartaSans-Regular.ttf'),
    'PlusJakartaSans-Medium': require('../../assets/fonts/PlusJakartaSans-Medium.ttf'),
    'PlusJakartaSans-SemiBold': require('../../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'PlusJakartaSans-Bold': require('../../assets/fonts/PlusJakartaSans-Bold.ttf'),
    'PlusJakartaSans-ExtraBold': require('../../assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
  });
};

// If fonts are not available locally, use system fonts as fallback
export const fontFallback = {
  regular: 'System',
  medium: 'System',
  semiBold: 'System', 
  bold: 'System',
  extraBold: 'System',
};
