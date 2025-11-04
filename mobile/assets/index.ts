// Asset imports for local images
export const Images = {
  // Profile images
  placeholder: require('./placeholder_icon.png'),
  heroImage: require('./hero-image.jpg'),
  icon: require('./icon.png'),
  splash: require('./splash.png'),
  profile: require('./profile.png'),
  shalom: require('./shalom.png'),

  // Social login assets
  google: require('./google.png'),
  googlePill: require('./google-pill.png'),

  // Achievement assets
  certificates: require('./certificates.png'),
  streak: require('./streak.png'),

  // Quiz assets
  quizSuccess: require('./quiz_success.png'),
  quizFail: require('./quiz_fail.png'),
  quizRetry: require('./quiz_retry.png'),
  quizReview: require('./quiz_review.png'),
  quizComplete: require('./quiz_complete_icon.png'),

  // Default avatars/placeholders
  defaultAvatar: require('./placeholder_icon.png'),
  coursePlaceholder: require('./placeholder_icon.png'),

  // Star icon (frequently used)
  star: require('./icon.png'), // Using icon as star placeholder
} as const;

export type ImageKeys = keyof typeof Images;
