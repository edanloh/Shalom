import { Colors } from './Colors';

// // Web Typography System
// export const Typography = {
//   // Font Family - Updated for web
//   fontFamily: {
//     regular: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
//     medium: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
//     semiBold: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
//     bold: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
//     extraBold: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
//   },
  
//   // Font Weights for web
//   fontWeight: {
//     regular: '400',
//     medium: '500',
//     semiBold: '600',
//     bold: '700',
//     extraBold: '800',
//   },
  
//   // Font Sizes (in rem for web)
//   fontSize: {
//     xs: '0.75rem',      // 12px
//     sm: '0.875rem',     // 14px
//     base: '1rem',       // 16px
//     lg: '1.125rem',     // 18px
//     xl: '1.25rem',      // 20px
//     '2xl': '1.5rem',    // 24px
//     '3xl': '1.75rem',   // 28px
//     '4xl': '2rem',      // 32px
//     '5xl': '2.25rem',   // 36px
//   },
  
//   // Line Heights
//   lineHeight: {
//     tight: '1.25',
//     normal: '1.5',
//     relaxed: '1.625',
//   },
// } as const;

// export const Spacing = {
//   xs: '0.25rem',    // 4px
//   sm: '0.5rem',     // 8px
//   md: '0.75rem',    // 12px
//   base: '1rem',     // 16px
//   lg: '1.25rem',    // 20px
//   xl: '1.5rem',     // 24px
//   '2xl': '2rem',    // 32px
//   '3xl': '3rem',    // 48px
//   '4xl': '4rem',    // 64px
// } as const;

// export const BorderRadius = {
//   none: '0',
//   sm: '0.25rem',    // 4px
//   base: '0.5rem',   // 8px
//   md: '0.75rem',    // 12px
//   lg: '1rem',       // 16px
//   xl: '1.25rem',    // 20px
//   '2xl': '1.5rem',  // 24px
//   full: '9999px',
// } as const;

// // Web-compatible Box Shadows
// export const Shadows = {
//   small: '0 2px 4px rgba(0, 0, 0, 0.1)',
//   medium: '0 4px 8px rgba(0, 0, 0, 0.15)',
//   large: '0 8px 16px rgba(0, 0, 0, 0.2)',
//   xl: '0 12px 24px rgba(0, 0, 0, 0.25)',
// } as const;

// // CSS-in-JS Text Styles for Web
// export const TextStyles = {
//   h1: {
//     fontFamily: Typography.fontFamily.bold,
//     fontWeight: Typography.fontWeight.bold,
//     fontSize: Typography.fontSize['4xl'],
//     lineHeight: Typography.lineHeight.tight,
//     color: Colors.textPrimary,
//     marginBottom: Spacing.base,
//   },
  
//   h2: {
//     fontFamily: Typography.fontFamily.bold,
//     fontWeight: Typography.fontWeight.bold,
//     fontSize: Typography.fontSize['3xl'],
//     lineHeight: Typography.lineHeight.tight,
//     color: Colors.textPrimary,
//     marginBottom: Spacing.base,
//   },
  
//   h3: {
//     fontFamily: Typography.fontFamily.semiBold,
//     fontWeight: Typography.fontWeight.semiBold,
//     fontSize: Typography.fontSize['2xl'],
//     lineHeight: Typography.lineHeight.normal,
//     color: Colors.textPrimary,
//     marginBottom: Spacing.md,
//   },
  
//   h4: {
//     fontFamily: Typography.fontFamily.semiBold,
//     fontWeight: Typography.fontWeight.semiBold,
//     fontSize: Typography.fontSize.xl,
//     lineHeight: Typography.lineHeight.normal,
//     color: Colors.textPrimary,
//     marginBottom: Spacing.md,
//   },

//   h5: {
//     fontFamily: Typography.fontFamily.semiBold,
//     fontWeight: Typography.fontWeight.semiBold,
//     fontSize: Typography.fontSize.lg,
//     lineHeight: Typography.lineHeight.normal,
//     color: Colors.textPrimary,
//     marginBottom: Spacing.sm,
//   },

//   body: {
//     fontFamily: Typography.fontFamily.regular,
//     fontWeight: Typography.fontWeight.regular,
//     fontSize: Typography.fontSize.base,
//     lineHeight: Typography.lineHeight.normal,
//     color: Colors.textPrimary,
//   },
  
//   bodyMedium: {
//     fontFamily: Typography.fontFamily.medium,
//     fontWeight: Typography.fontWeight.medium,
//     fontSize: Typography.fontSize.base,
//     lineHeight: Typography.lineHeight.normal,
//     color: Colors.textPrimary,
//   },

//   bodySmall: {
//     fontFamily: Typography.fontFamily.regular,
//     fontWeight: Typography.fontWeight.regular,
//     fontSize: Typography.fontSize.sm,
//     lineHeight: Typography.lineHeight.normal,
//     color: Colors.textPrimary,
//   },

//   bodySmallBold: {
//     fontFamily: Typography.fontFamily.bold,
//     fontWeight: Typography.fontWeight.bold,
//     fontSize: Typography.fontSize.sm,
//     lineHeight: Typography.lineHeight.normal,
//     color: Colors.textPrimary,
//   },
  
//   caption: {
//     fontFamily: Typography.fontFamily.regular,
//     fontWeight: Typography.fontWeight.regular,
//     fontSize: Typography.fontSize.sm,
//     lineHeight: Typography.lineHeight.normal,
//     color: Colors.textSecondary,
//   },
  
//   small: {
//     fontFamily: Typography.fontFamily.regular,
//     fontWeight: Typography.fontWeight.regular,
//     fontSize: Typography.fontSize.xs,
//     lineHeight: Typography.lineHeight.normal,
//     color: Colors.textMuted,
//   },
// } as const;

// // CSS-in-JS Container Styles for Web
// export const ContainerStyles = {
//   screen: {
//     minHeight: '100vh',
//     backgroundColor: Colors.primary,
//   },
  
//   container: {
//     paddingLeft: Spacing.lg,
//     paddingRight: Spacing.lg,
//     maxWidth: '1200px',
//     margin: '0 auto',
//   },
  
//   card: {
//     backgroundColor: Colors.cardBackground,
//     borderRadius: BorderRadius.lg,
//     padding: Spacing.base,
//     boxShadow: Shadows.medium,
//   },
  
//   button: {
//     paddingLeft: Spacing.xl,
//     paddingRight: Spacing.xl,
//     paddingTop: Spacing.md,
//     paddingBottom: Spacing.md,
//     borderRadius: BorderRadius.md,
//     display: 'flex',
//     alignItems: 'center',
//     justifyContent: 'center',
//     border: 'none',
//     cursor: 'pointer',
//     transition: 'all 0.2s ease',
//   },
  
//   buttonPrimary: {
//     backgroundColor: Colors.secondary,
//     color: Colors.white,
//   },
  
//   buttonSecondary: {
//     backgroundColor: Colors.accent,
//     color: Colors.white,
//   },
// } as const;



// Typography Standards
export const Typography = {
  // Headings
  h1: {
    fontSize: '32px',
    fontWeight: '700',
    lineHeight: '1.2',
  },
  h2: {
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '1.3',
  },
  h3: {
    fontSize: '18px',
    fontWeight: '600',
    lineHeight: '1.4',
  },
  // Body
  body: {
    fontSize: '14px',
    fontWeight: '400',
    lineHeight: '1.5',
  },
  bodyLarge: {
    fontSize: '16px',
    fontWeight: '400',
    lineHeight: '1.5',
  },
  // Labels
  label: {
    fontSize: '12px',
    fontWeight: '500',
    lineHeight: '1.5',
    textTransform: 'uppercase' as const,
  },
  labelMedium: {
    fontSize: '14px',
    fontWeight: '500',
    lineHeight: '1.5',
    textTransform: 'uppercase' as const,
  },
};

// Spacing (8px grid system)
export const Spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

// Border Radius
export const BorderRadius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  full: '9999px',
};

// Shadows
export const Shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
};

// Transitions
export const Transitions = {
  fast: '150ms ease-in-out',
  normal: '200ms ease-in-out',
  slow: '300ms ease-in-out',
};

// Status Badge Styles
export const StatusStyles = {
  published: {
    backgroundColor: Colors.green,
    color: Colors.white,
  },
  draft: {
    backgroundColor: Colors.yellow,
    color: Colors.black,
  },
  unpublished: {
    backgroundColor: Colors.red,
    color: Colors.white,
  },
};

// Button Styles
export const ButtonStyles = {
  primary: {
    backgroundColor: Colors.secondary,
    color: Colors.textPrimary,
    padding: `${Spacing.sm} ${Spacing.lg}`,
    borderRadius: BorderRadius.full,
    transition: Transitions.normal,
  },
  secondary: {
    backgroundColor: Colors.accent,
    color: Colors.textPrimary,
    padding: `${Spacing.sm} ${Spacing.lg}`,
    borderRadius: BorderRadius.full,
    transition: Transitions.normal,
  },
  ghost: {
    backgroundColor: Colors.transparent,
    color: Colors.textSecondary,
    padding: `${Spacing.sm} ${Spacing.lg}`,
    borderRadius: BorderRadius.full,
    transition: Transitions.normal,
  },
};

// Card Styles
export const CardStyles = {
  default: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    boxShadow: Shadows.md,
  },
  surface: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    boxShadow: Shadows.sm,
  },
};