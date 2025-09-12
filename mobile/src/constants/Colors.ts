export const Colors = {
  // Purple Palette (Primary Brand Colors)
  purple150: '#C9C6EC',
  purple200: '#EADDF6',
  purple300: '#9E9EBA',
  purple400: '#564BEB', // Primary Purple
  purple600: '#943FE4', // Secondary Purple
  purple850: '#3A339F', // Dark Purple
  
  // Gray Palette (Neutrals)
  backgroundGray: '#2F2F37', // Card backgrounds
  gray200: '#D4D4D4',       // Light text/borders
  gray500: '#636363',       // Medium text
  gray600: '#363535ff',
  gray800: '#2E2E2E',       // Dark elements
  
  // Status Colors
  yellow: '#EEC53D',    // Achievements, warnings
  green: '#49AC33',     // Success states
  red: '#ED1B1B',       // Errors, notifications
  
  // Base Colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  
  // Semantic Color Names (matching design system)
  primary: '#2F2F37',        // Main background
  secondary: '#564BEB',      // Primary purple
  accent: '#943FE4',         // Secondary purple
  surface: '#3A339F',        // Card/surface backgrounds
  
  // Text Colors (semantic)
  textPrimary: '#FFFFFF',    // Main text on dark backgrounds
  textSecondary: '#D4D4D4',  // Secondary text
  textMuted: '#636363',      // Muted/disabled text
  
  // Interactive Colors
  cardBackground: '#3A339F',
  cardBorder: '#564BEB',
  
  // Component-specific colors for exact design matching
  streakFire: '#FF6B35',     // Fire icon color
  starGold: '#FFD700',       // Star/rating color
  notificationRed: '#ef4444', // Notification badge
  
  // Achievement card specific colors
  streakCardBg: '#564BEB',   // 12 Day Streak card
  certificateCardBg: '#EEC53D', // 3 Certificates card
} as const;

export type ColorKeys = keyof typeof Colors;
