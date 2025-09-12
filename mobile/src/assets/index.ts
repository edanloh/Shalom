// Asset imports for local images
export const Images = {
  // Profile images
  placeholder: require('../assets/placeholder.png'),
  heroImage: require('../assets/hero-image.jpg'),
  icon: require('../assets/icon.png'),
  splash: require('../assets/splash.png'),

  // Default avatars/placeholders
  defaultAvatar: require('../assets/placeholder.png'),
  coursePlaceholder: require('../assets/placeholder.png'),

  // Star icon (frequently used)
  star: require('../assets/icon.png'), // Using icon as star placeholder
} as const;

export type ImageKeys = keyof typeof Images;
