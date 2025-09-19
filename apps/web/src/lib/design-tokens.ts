/**
 * MoneyWise Design System - Enhanced Design Tokens
 * Enterprise-grade financial application design system
 * Version: 2.0.0 - Dashboard Enhancement Phase
 */

export const designTokens = {
  // Financial-grade color palette
  colors: {
    // Primary brand colors - professional financial theme
    primary: {
      50: 'hsl(223, 100%, 97%)',
      100: 'hsl(223, 100%, 94%)',
      200: 'hsl(223, 96%, 87%)',
      300: 'hsl(223, 94%, 78%)',
      400: 'hsl(223, 91%, 67%)',
      500: 'hsl(223, 87%, 56%)', // Main brand color
      600: 'hsl(223, 84%, 45%)',
      700: 'hsl(223, 74%, 36%)',
      800: 'hsl(223, 64%, 27%)',
      900: 'hsl(223, 54%, 18%)',
      950: 'hsl(223, 47%, 11%)',
    },

    // Success/Growth colors for financial gains
    success: {
      50: 'hsl(151, 81%, 96%)',
      100: 'hsl(149, 80%, 90%)',
      200: 'hsl(152, 76%, 80%)',
      300: 'hsl(156, 72%, 67%)',
      400: 'hsl(158, 64%, 52%)',
      500: 'hsl(160, 84%, 39%)', // Main success color
      600: 'hsl(161, 94%, 30%)',
      700: 'hsl(163, 94%, 24%)',
      800: 'hsl(163, 88%, 20%)',
      900: 'hsl(164, 86%, 16%)',
      950: 'hsl(166, 91%, 9%)',
    },

    // Warning/Caution colors for financial alerts
    warning: {
      50: 'hsl(48, 100%, 96%)',
      100: 'hsl(48, 96%, 89%)',
      200: 'hsl(48, 97%, 77%)',
      300: 'hsl(46, 97%, 65%)',
      400: 'hsl(43, 96%, 56%)',
      500: 'hsl(38, 92%, 50%)', // Main warning color
      600: 'hsl(32, 95%, 44%)',
      700: 'hsl(26, 90%, 37%)',
      800: 'hsl(23, 83%, 31%)',
      900: 'hsl(22, 78%, 26%)',
      950: 'hsl(21, 84%, 15%)',
    },

    // Error/Loss colors for financial losses
    error: {
      50: 'hsl(0, 86%, 97%)',
      100: 'hsl(0, 93%, 94%)',
      200: 'hsl(0, 96%, 89%)',
      300: 'hsl(0, 94%, 82%)',
      400: 'hsl(0, 91%, 71%)',
      500: 'hsl(0, 84%, 60%)', // Main error color
      600: 'hsl(0, 72%, 51%)',
      700: 'hsl(0, 74%, 42%)',
      800: 'hsl(0, 70%, 35%)',
      900: 'hsl(0, 63%, 31%)',
      950: 'hsl(0, 75%, 15%)',
    },

    // Neutral grays for professional interface
    neutral: {
      50: 'hsl(210, 20%, 98%)',
      100: 'hsl(220, 14%, 96%)',
      200: 'hsl(220, 13%, 91%)',
      300: 'hsl(216, 12%, 84%)',
      400: 'hsl(218, 11%, 65%)',
      500: 'hsl(220, 9%, 46%)',
      600: 'hsl(215, 14%, 34%)',
      700: 'hsl(217, 19%, 27%)',
      800: 'hsl(215, 28%, 17%)',
      900: 'hsl(221, 39%, 11%)',
      950: 'hsl(224, 71%, 4%)',
    },

    // Financial chart colors with accessibility considerations
    chart: {
      blue: 'hsl(223, 87%, 56%)',
      green: 'hsl(160, 84%, 39%)',
      orange: 'hsl(38, 92%, 50%)',
      red: 'hsl(0, 84%, 60%)',
      purple: 'hsl(271, 81%, 56%)',
      cyan: 'hsl(187, 85%, 53%)',
      pink: 'hsl(330, 81%, 60%)',
      indigo: 'hsl(231, 48%, 48%)',
    },

    // Dark mode variants
    dark: {
      background: 'hsl(224, 71%, 4%)',
      surface: 'hsl(215, 28%, 17%)',
      surfaceVariant: 'hsl(217, 19%, 27%)',
      onSurface: 'hsl(210, 20%, 98%)',
      onSurfaceVariant: 'hsl(220, 13%, 91%)',
    }
  },

  // Enhanced typography scale for financial applications
  typography: {
    fontFamily: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.05em' }],
      sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.025em' }],
      base: ['1rem', { lineHeight: '1.5rem', letterSpacing: '0' }],
      lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.025em' }],
      xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.025em' }],
      '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.05em' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.05em' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.075em' }],
      '5xl': ['3rem', { lineHeight: '1', letterSpacing: '-0.075em' }],
      '6xl': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.075em' }],
      '7xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.075em' }],
      '8xl': ['6rem', { lineHeight: '1', letterSpacing: '-0.075em' }],
      '9xl': ['8rem', { lineHeight: '1', letterSpacing: '-0.075em' }],
    },
    fontWeight: {
      thin: '100',
      extralight: '200',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },
  },

  // Consistent spacing system based on 0.25rem (4px) base unit
  spacing: {
    px: '1px',
    0: '0px',
    0.5: '0.125rem', // 2px
    1: '0.25rem',    // 4px
    1.5: '0.375rem', // 6px
    2: '0.5rem',     // 8px
    2.5: '0.625rem', // 10px
    3: '0.75rem',    // 12px
    3.5: '0.875rem', // 14px
    4: '1rem',       // 16px
    5: '1.25rem',    // 20px
    6: '1.5rem',     // 24px
    7: '1.75rem',    // 28px
    8: '2rem',       // 32px
    9: '2.25rem',    // 36px
    10: '2.5rem',    // 40px
    11: '2.75rem',   // 44px
    12: '3rem',      // 48px
    14: '3.5rem',    // 56px
    16: '4rem',      // 64px
    20: '5rem',      // 80px
    24: '6rem',      // 96px
    28: '7rem',      // 112px
    32: '8rem',      // 128px
    36: '9rem',      // 144px
    40: '10rem',     // 160px
    44: '11rem',     // 176px
    48: '12rem',     // 192px
    52: '13rem',     // 208px
    56: '14rem',     // 224px
    60: '15rem',     // 240px
    64: '16rem',     // 256px
    72: '18rem',     // 288px
    80: '20rem',     // 320px
    96: '24rem',     // 384px
  },

  // Enhanced border radius system
  borderRadius: {
    none: '0px',
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px',
  },

  // Smooth animations and transitions
  animations: {
    duration: {
      fastest: '100ms',
      fast: '200ms',
      normal: '300ms',
      slow: '500ms',
      slowest: '700ms',
    },
    easing: {
      linear: 'linear',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    },
    keyframes: {
      fadeIn: {
        from: { opacity: '0' },
        to: { opacity: '1' },
      },
      fadeOut: {
        from: { opacity: '1' },
        to: { opacity: '0' },
      },
      slideInUp: {
        from: {
          opacity: '0',
          transform: 'translateY(1rem)'
        },
        to: {
          opacity: '1',
          transform: 'translateY(0)'
        },
      },
      slideInDown: {
        from: {
          opacity: '0',
          transform: 'translateY(-1rem)'
        },
        to: {
          opacity: '1',
          transform: 'translateY(0)'
        },
      },
      scaleIn: {
        from: {
          opacity: '0',
          transform: 'scale(0.95)'
        },
        to: {
          opacity: '1',
          transform: 'scale(1)'
        },
      },
      shimmer: {
        from: { transform: 'translateX(-100%)' },
        to: { transform: 'translateX(100%)' },
      },
    },
  },

  // Box shadows for depth and elevation
  shadows: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    base: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    md: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    lg: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    // Financial card shadows for premium feel
    card: '0 4px 20px -2px rgb(0 0 0 / 0.08), 0 2px 8px -2px rgb(0 0 0 / 0.04)',
    cardHover: '0 8px 30px -4px rgb(0 0 0 / 0.12), 0 4px 12px -4px rgb(0 0 0 / 0.08)',
    premium: '0 20px 40px -8px rgb(0 0 0 / 0.15), 0 8px 16px -8px rgb(0 0 0 / 0.1)',
  },

  // Z-index system for layering
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
  },

  // Breakpoints for responsive design
  breakpoints: {
    xs: '475px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Component-specific design tokens
  components: {
    button: {
      height: {
        sm: '2rem',     // 32px
        md: '2.5rem',   // 40px
        lg: '3rem',     // 48px
        xl: '3.5rem',   // 56px
      },
      padding: {
        sm: '0.5rem 1rem',
        md: '0.75rem 1.5rem',
        lg: '1rem 2rem',
        xl: '1.25rem 2.5rem',
      },
    },
    card: {
      padding: {
        sm: '1rem',
        md: '1.5rem',
        lg: '2rem',
        xl: '2.5rem',
      },
      borderRadius: {
        sm: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
      },
    },
    input: {
      height: {
        sm: '2rem',
        md: '2.5rem',
        lg: '3rem',
      },
      padding: {
        sm: '0.5rem 0.75rem',
        md: '0.75rem 1rem',
        lg: '1rem 1.25rem',
      },
    },
  },
} as const;

// Type-safe design token access
export type DesignTokens = typeof designTokens;
export type ColorScale = keyof typeof designTokens.colors.primary;
export type SpacingToken = keyof typeof designTokens.spacing;
export type TypographySize = keyof typeof designTokens.typography.fontSize;

// Utility functions for accessing tokens
export const getColorValue = (color: string, shade?: number | string) => {
  if (!shade) return color;
  // Handle both numeric and string shade values
  const shadeKey = shade.toString() as ColorScale;
  return `var(--color-${color}-${shadeKey})`;
};

export const getSpacing = (space: SpacingToken) => {
  return designTokens.spacing[space];
};

export const getTypographySize = (size: TypographySize) => {
  return designTokens.typography.fontSize[size];
};