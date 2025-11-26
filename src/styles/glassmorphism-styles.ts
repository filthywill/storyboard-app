/**
 * Unified Color & Styling System
 * 
 * This file contains ALL styling patterns used throughout the application.
 * This is the single source of truth for colors, borders, and effects.
 * 
 * Design System Principles:
 * - Single source of truth for ALL styling
 * - Progressive enhancement (build up from foundations)
 * - Consistent color palette across all components
 * - No global overrides - component-specific styling
 * - Unified shadow, border, and effect schemes
 */

/**
 * Unified Color Palette
 * All colors used throughout the application
 * 
 * ORGANIZATION:
 * - Base colors: Fundamental color values
 * - Border colors: All border styling
 * - Background colors: Container/surface backgrounds (headers, panels, wrappers)
 * - Button colors: Interactive button elements (separate from containers)
 * - Input colors: Form input fields (separate from buttons and containers)
 * - Text colors: All text styling
 * - Status colors: Status indicators, banners, alerts (warning, error, info, success, offline)
 * - Template colors: Template background component placeholder elements
 */
export const COLOR_PALETTE = {
  // Base colors
  black: 'rgba(0, 0, 0, 1)',
  white: 'rgba(255, 255, 255, 1)',
  
  // Border colors (unified system)
  border: {
    primary: 'rgba(0, 0, 0, 0)',        // Transparent (no border)
    secondary: 'rgba(0, 0, 0, 0)',      // Transparent (no border)
    subtle: 'rgba(0, 0, 0, 0)',         // Transparent (no border)
    accent: 'rgba(0, 0, 0, 0)',         // Transparent (no border)
    dashed: 'rgba(255, 255, 255, 0.2)', // Dashed borders (upload zones, placeholders)
  },
  
  // Background colors (for containers, panels, headers - NOT buttons)
  background: {
    primary: 'rgba(1, 1, 1, 0.05)',      // Main container backgrounds
    secondary: 'rgba(15, 15, 15, 1)',    // Dark surfaces (modals, dropdowns)
    subtle: 'rgba(1, 1, 1, 0.3)',        // Subtle container backgrounds
    lighter: 'rgba(255, 255, 255, 0.03)', // Lighter backgrounds (upload zones, placeholders)
    themeSection: 'rgba(1, 1, 1, 0.2)', // Theme toolbar section containers (independent from subtle) - use 'transparent' instead of rgba(0,0,0,0) to avoid visual stacking
    themeParent: 'rgba(1, 1, 1, 0.3)',   // Theme toolbar parent container
    themeSubContainer: 'rgba(0, 0, 0, 0.6)', // Theme toolbar sub-containers (grouping controls)
    themeSelect: 'rgba(1, 1, 1, 0.2)',   // Theme toolbar select dropdown
    accent: 'rgba(59, 130, 246, 0.9)',   // Accent surfaces
  },
  
  // Button colors (separate from container backgrounds for independent control)
  button: {
    primary: 'rgba(33, 212, 252, 0.7)',       // Primary action buttons (Export, Save, Create) - cyan
    secondary: 'rgba(255, 255, 255, 0.08)',   // Secondary/Cancel buttons - subtle default
    accent: 'rgba(33, 212, 252, 0.7)',       // DEPRECATED: Use button.primary instead (kept for backwards compatibility)
    hover: 'rgba(255, 255, 255, 0.15)',      // Hover state overlay
    active: 'rgba(0, 0, 0, 0.7)',            // Active/pressed button state (dark)
    toggleInactive: 'rgba(255, 255, 255, 0.05)', // Icon toggle inactive state
    toggleInactiveHover: 'rgba(255, 255, 255, 0.20)', // Icon toggle inactive hover
    toggleActive: 'rgba(255, 255, 255, 0.30)',   // Icon toggle active state
    toggleActiveHover: 'rgba(255, 255, 255, 0.40)', // Icon toggle active hover
    // Action button colors (for "Add Page", "Add Shot", etc. - purple accent)
    actionBackground: 'rgba(33, 212, 252, 0.5)',  // Action button background (purple-500/20)
    actionBackgroundHover: 'rgba(33, 212, 252, 0.8)', // Action button hover background (purple-500/30)
    actionText: 'rgba(221, 214, 254, 1)',         // Action button text/icon color (purple-200)
    actionTextHover: 'rgba(237, 233, 254, 1)',     // Action button hover text/icon color (purple-100)
    // Destructive button colors (for "Delete Shot", "Delete Page", etc. - red accent)
    destructive: 'rgba(250, 12, 12, 0.9)',        // Destructive button background (red)
    destructiveHover: 'rgba(250, 12, 12, 1)',     // Destructive button hover background (red, full opacity)
    destructiveText: 'rgba(255, 255, 255, 1)',    // Destructive button text/icon color (white)
    destructiveTextHover: 'rgba(255, 255, 255, 1)', // Destructive button hover text/icon color (white)
  },
  
  // Input colors (form fields - separate from buttons and containers)
  input: {
    background: 'rgba(255, 255, 255, 0.05)', // Input field backgrounds
    backgroundDark: 'rgba(0, 0, 0, 0.8)',    // Dark input backgrounds (theme toolbar numeric inputs)
    border: 'rgba(255, 255, 255, 0.15)',     // Input field borders
    borderSubtle: 'rgba(255, 255, 255, 0.1)', // Subtle input borders (theme toolbar)
    placeholderBorder: 'rgba(209, 213, 219, 1)',  // gray-300 - placeholder input borders
    placeholderBackground: 'rgba(249, 250, 251, 1)', // gray-50 - placeholder input backgrounds
    placeholderHoverBorder: 'rgba(156, 163, 175, 1)', // gray-400 - placeholder input hover borders
    placeholderText: 'rgba(156, 163, 175, 1)', // gray-400 - placeholder text color
  },
  
  // Checkbox colors (for form checkboxes - needs strong contrast on dark backgrounds)
  checkbox: {
    background: 'rgba(255, 255, 255, 0.1)',   // Unselected checkbox background (visible on dark)
    backgroundChecked: 'rgba(33, 212, 252, 0.8)', // Selected checkbox background (cyan/primary)
    border: 'rgba(255, 255, 255, 0.3)',      // Checkbox border (stronger contrast)
    borderChecked: 'rgba(33, 212, 252, 1)',  // Selected checkbox border
    icon: 'rgba(255, 255, 255, 1)',         // Check icon color (white for visibility)
  },
  
  // Radio button colors (same as checkbox for consistency)
  radio: {
    background: 'rgba(255, 255, 255, 0.1)',   // Unselected radio background (visible on dark)
    border: 'rgba(255, 255, 255, 0.3)',      // Radio border (stronger contrast)
    borderChecked: 'rgba(33, 212, 252, 1)',  // Selected radio border (cyan)
    indicator: 'rgba(33, 212, 252, 1)',      // Radio indicator dot (cyan)
  },
  
  // Text colors
  text: {
    primary: 'white',
    secondary: 'rgba(255, 255, 255, 0.7)',
    muted: 'rgba(255, 255, 255, 0.5)',
    subtle: 'rgba(255, 255, 255, 0.4)',
    inverse: 'white',  // White text on dark backgrounds
    dark: 'rgba(0, 0, 0, 0.9)',  // Dark text on light backgrounds
  },
  
  // Status colors (for banners, alerts, notifications)
  status: {
    warning: 'rgba(245, 158, 11, 0.15)',   // Orange tint (session expiry)
    warningLight: 'rgba(251, 191, 36, 0.15)',  // Lighter orange tint (session timeout)
    error: 'rgba(239, 68, 68, 0.15)',      // Red tint (errors, security warnings)
    info: 'rgba(59, 130, 246, 0.15)',      // Blue tint (syncing, pending)
    success: 'rgba(34, 197, 94, 0.15)',    // Green tint (completed)
    offline: 'rgba(156, 163, 175, 0.2)',   // Gray tint (offline state)
    // Glow effects for status indicators
    errorGlow: 'rgba(239, 68, 68, 0.8)',      // Error glow (boxShadow)
    errorGlowStrong: 'rgba(239, 68, 68, 0.9)', // Error glow (filter)
    infoGlow: 'rgba(59, 130, 246, 0.8)',      // Info glow (boxShadow)
    infoGlowStrong: 'rgba(59, 130, 246, 0.9)', // Info glow (filter)
    successGlow: 'rgba(34, 197, 94, 0.8)',    // Success glow (boxShadow)
    successGlowStrong: 'rgba(34, 197, 94, 0.9)', // Success glow (filter)
    // Status badges (for dark backgrounds with colored accents)
    statusBadgeBlue: 'rgba(59, 130, 246, 0.2)',    // Dark blue tint for update badges
    statusBadgeGreen: 'rgba(34, 197, 94, 0.2)',    // Dark green tint for create badges
    statusBadgeRed: 'rgba(239, 68, 68, 0.2)',     // Dark red tint for error badges
    statusBadgeBlueText: 'rgba(147, 197, 253, 1)',  // Light blue text for update badges
    statusBadgeGreenText: 'rgba(134, 239, 172, 1)', // Light green text for create badges
    statusBadgeRedText: 'rgba(248, 113, 113, 1)',   // Light red text for error badges
  },
  
  // Template colors (for TemplateBackground component - placeholder/preview elements)
  template: {
    cardBackground: 'rgba(255, 255, 255, 0.95)',  // Template card background
    headerBackground: 'rgba(255, 255, 255, 0.9)', // Template header background
    placeholderDark: 'rgba(0, 0, 0, 0.1)',      // Dark placeholder elements
    placeholderMedium: 'rgba(0, 0, 0, 0.08)',  // Medium placeholder elements
    placeholderLight: 'rgba(0, 0, 0, 0.03)',    // Light placeholder elements (shot placeholders)
  },
  
  // Interaction colors (for drag states, hover effects, etc.)
  interaction: {
    dragOver: 'rgba(96, 165, 250, 1)',      // #60a5fa - Blue drag-over state
    dragActive: 'rgba(59, 130, 246, 1)',    // Blue active drag
    hover: 'rgba(255, 255, 255, 0.1)',     // Subtle hover overlay
    active: 'rgba(59, 130, 246, 1)',       // #3b82f6 - blue-500 - Active/primary interactive elements
  },
  
  // Overlay button colors (for ShotCard image overlays)
  overlayButton: {
    blue: 'rgba(59, 130, 246, 1)',         // #3b82f6 - blue-500 - Primary overlay buttons
    purple: 'rgb(192, 5, 145)',       // #a855f7 - purple-500 - Insert batch button
    red: 'rgba(250, 12, 12, 0.9)',         // red-500 with 90% opacity - Destructive actions
    gray: 'rgba(75, 85, 99, 1)',           // #4b5563 - gray-600 - Secondary overlay buttons
    white: 'rgba(255, 255, 255, 0.9)',     // white with 90% opacity - Light overlay buttons
  },
  
  // Progress bar colors (for progress indicators in dark modals)
  progress: {
    background: 'rgba(55, 65, 81, 1)',     // gray-700 - Progress bar background (dark theme)
    fill: 'rgba(59, 130, 246, 1)',         // blue-600 - Progress bar fill
  },
  
  // App background colors (for the main application background - gradients, base, filter overlay)
  appBackground: {
    // Base color (single source of truth for dark background)
    base: '#0a0911',                        // HTML base color (dark blue-black)
    
    // Gradient color definitions (rgba format for editor color swatches - RGB defined once per color)
    // Change the RGB values here, and both main gradient and fade will use the new color
    gradient1Color: 'rgb(0, 174, 255)',  // Pink aurora RGB - opacity ignored, uses gradient1Opacity
    gradient2Color: 'rgb(61, 255, 148)',  // Purple aurora RGB - opacity ignored, uses gradient2Opacity
    gradient3Color: 'rgb(0, 153, 255)',    // Indigo aurora RGB - opacity ignored, uses gradient3Opacity
    gradient4Color: 'rgb(0, 81, 255)',   // Optional 4th gradient RGB - opacity ignored, uses gradient4Opacity
    
    // Gradient opacities (applied to RGB colors above - change these to adjust intensity)
    gradient1Opacity: 0.25,                 // Pink aurora full intensity
    gradient1FadeOpacity: 0.12,             // Pink fade (uses gradient1Color RGB)
    gradient2Opacity: 0.22,                 // Purple aurora full intensity
    gradient2FadeOpacity: 0.1,              // Purple fade (uses gradient2Color RGB)
    gradient3Opacity: 0.28,                 // Indigo aurora full intensity
    gradient3FadeOpacity: 0.14,             // Indigo fade (uses gradient3Color RGB)
    gradient4Opacity: 0.2,                  // 4th gradient intensity (no fade needed for circular gradient)
    
    // Base gradient uses base color with different opacities for depth
    // All derived from 'base' color above - change base color, all gradient stops update automatically
    baseGradientStartOpacity: 1.0,          // Start: full base color opacity
    baseGradientMid1Opacity: 0.8,            // Mid 1: 80% base color (lighter)
    baseGradientMid2Opacity: 0.6,           // Mid 2: 60% base color (lighter still)
    baseGradientEndOpacity: 0.7,            // End: 70% base color
    
    // Note: filterOverlay is now controlled directly in index.css (body::after) for immediate effect
  }
} as const;

/**
 * Unified Component Styles
 * All component styling patterns
 */
export const COMPONENT_STYLES = {
  // Button styles
  button: {
    primary: {
      backgroundColor: COLOR_PALETTE.background.primary,
      border: `0.25px solid ${COLOR_PALETTE.border.primary}`,
      color: COLOR_PALETTE.text.primary,
    },
    secondary: {
      backgroundColor: COLOR_PALETTE.background.secondary,
      border: `0.25px solid ${COLOR_PALETTE.border.secondary}`,
      color: COLOR_PALETTE.text.primary,
    },
    accent: {
      backgroundColor: COLOR_PALETTE.background.accent,
      border: `0.25px solid ${COLOR_PALETTE.border.primary}`,
      color: COLOR_PALETTE.text.primary,
    }
  },
  
  // Input styles
  input: {
    primary: {
      backgroundColor: COLOR_PALETTE.background.primary,
      border: `0.25px solid ${COLOR_PALETTE.border.primary}`,
      color: COLOR_PALETTE.text.primary,
    }
  },
  
  // Container styles
  container: {
    primary: {
      backgroundColor: COLOR_PALETTE.background.primary,
      border: `0.25px solid ${COLOR_PALETTE.border.primary}`,
      color: COLOR_PALETTE.text.primary,
    },
    secondary: {
      backgroundColor: COLOR_PALETTE.background.secondary,
      border: `0.25px solid ${COLOR_PALETTE.border.secondary}`,
      color: COLOR_PALETTE.text.primary,
    }
  }
} as const;

/**
 * Glassmorphism Style Variants
 * 
 * USAGE GUIDE:
 * - 'primary': General containers, headers, panels (uses background.primary)
 * - 'dark': Modal cards, dropdown menus (uses background.secondary)
 * - 'button': Cancel/secondary buttons (uses button.secondary) - subtle default style
 * - 'buttonSecondary': Emphasized secondary buttons (uses button.secondary) - slightly more prominent
 * - 'buttonAccent': Primary action buttons (uses button.primary) - Export, Save, Create (cyan)
 * - 'header': Main app headers (uses background.primary)
 * - 'content': Main content wrappers (uses background.subtle)
 * - 'background': Subtle backgrounds (uses background.subtle)
 * - 'themeSection': Theme toolbar section containers (uses background.themeSection) - independent from subtle
 * 
 * NOTE: Containers and buttons are now separate! Change button colors 
 * independently without affecting container backgrounds.
 */
export const GLASSMORPHISM_STYLES = {
  // Primary glassmorphism container (for headers, panels, NOT buttons)
  primary: {
    backgroundColor: COLOR_PALETTE.background.primary,
    backdropFilter: 'blur(5px)',
    WebkitBackdropFilter: 'blur(0.5px)',
    border: `0.25px solid ${COLOR_PALETTE.border.primary}`,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    color: COLOR_PALETTE.text.primary
  },

  // Dark glassmorphism (for modals, dropdowns, NOT buttons)
  dark: {
    backgroundColor: COLOR_PALETTE.background.secondary,
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    border: `0.25px solid ${COLOR_PALETTE.border.primary}`,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
    color: COLOR_PALETTE.text.primary
  },

  // Button glassmorphism - Secondary/Cancel buttons (subtle default)
  button: {
    backgroundColor: COLOR_PALETTE.button.secondary,
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: `1px solid ${COLOR_PALETTE.border.primary}`,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    color: COLOR_PALETTE.text.primary,
    transition: 'all 0.2s ease'
  },

  // Button glassmorphism - Secondary/emphasized buttons (slightly more prominent than default)
  buttonSecondary: {
    backgroundColor: COLOR_PALETTE.button.secondary,
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: `1px solid ${COLOR_PALETTE.border.secondary}`,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
    color: COLOR_PALETTE.text.primary,
    transition: 'all 0.2s ease'
  },

  // Button glassmorphism - Primary action buttons (Export, Save, Create) - cyan
  buttonAccent: {
    backgroundColor: COLOR_PALETTE.button.primary,
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    border: `1px solid ${COLOR_PALETTE.border.accent}`,
    boxShadow: 'none',
    color: COLOR_PALETTE.text.primary,
    transition: 'all 0.2s ease'
  },

  // Subtle glassmorphism (for status indicators)
  subtle: {
    backgroundColor: COLOR_PALETTE.background.subtle,
    backdropFilter: 'blur(1px)',
    WebkitBackdropFilter: 'blur(0.3px)',
    border: `0.25px solid ${COLOR_PALETTE.border.subtle}`,
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    color: COLOR_PALETTE.text.primary
  },

  // Header glassmorphism (for main headers)
  header: {
    backgroundColor: COLOR_PALETTE.background.primary,
    backdropFilter: 'blur(2px)',
    WebkitBackdropFilter: 'blur(0.5px)',
    border: `0.25px solid ${COLOR_PALETTE.border.primary}`,
    boxShadow: '0 1px 0 0 rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    color: COLOR_PALETTE.text.primary
  },

  // Content glassmorphism (for main content areas)
  content: {
    backgroundColor: COLOR_PALETTE.background.subtle,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: `0.25px solid ${COLOR_PALETTE.border.primary}`,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    color: COLOR_PALETTE.text.primary
  },

  // Background container (no color inheritance)
  background: {
    backgroundColor: COLOR_PALETTE.background.subtle,
    backdropFilter: 'blur(0.3px)',
    WebkitBackdropFilter: 'blur(0.3px)',
    border: `1px solid ${COLOR_PALETTE.border.subtle}`,
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
    // Note: No color property - won't affect child text
  },

  // Theme section containers (for ThemeToolbar sections - independent from subtle)
  themeSection: {
    backgroundColor: COLOR_PALETTE.background.themeSection,
    backdropFilter: 'blur(2px)',
    WebkitBackdropFilter: 'blur(2px)',
    border: `none`,
    color: COLOR_PALETTE.text.primary
  }
} as const;

/**
 * Get glassmorphism styles by type
 */
export const getGlassmorphismStyles = (type: keyof typeof GLASSMORPHISM_STYLES) => {
  return GLASSMORPHISM_STYLES[type];
};

/**
 * Common glassmorphism classes for Tailwind
 */
export const GLASSMORPHISM_CLASSES = {
  // Base glassmorphism classes
  base: 'backdrop-blur-sm bg-black/20 border border-black/10',
  
  // Dark glassmorphism classes
  dark: 'bg-gray-900/95 border border-black/20',
  
  // Subtle glassmorphism classes
  subtle: 'backdrop-blur-xs bg-black/10 border border-black/5',
  
  // Accent glassmorphism classes
  accent: 'backdrop-blur-sm bg-blue-500/90 border border-black/10',
  
  // Content glassmorphism classes
  content: 'backdrop-blur-sm bg-black/20 border border-black/10 shadow-sm'
} as const;

/**
 * Get glassmorphism classes by type
 */
export const getGlassmorphismClasses = (type: keyof typeof GLASSMORPHISM_CLASSES) => {
  return GLASSMORPHISM_CLASSES[type];
};

/**
 * Utility function to apply glassmorphism styles to any element
 */
export const applyGlassmorphism = (
  element: HTMLElement, 
  type: keyof typeof GLASSMORPHISM_STYLES = 'primary'
) => {
  const styles = getGlassmorphismStyles(type);
  Object.assign(element.style, styles);
};

/**
 * React hook for glassmorphism styles
 */
export const useGlassmorphism = (type: keyof typeof GLASSMORPHISM_STYLES = 'primary') => {
  return getGlassmorphismStyles(type);
};

/**
 * Get component styles by type
 */
export const getComponentStyles = (component: keyof typeof COMPONENT_STYLES, variant: string) => {
  return COMPONENT_STYLES[component][variant as keyof typeof COMPONENT_STYLES[typeof component]];
};

/**
 * Get color from palette
 */
export const getColor = (category: keyof typeof COLOR_PALETTE, variant: string) => {
  return COLOR_PALETTE[category][variant as keyof typeof COLOR_PALETTE[typeof category]];
};

/**
 * Unified styling system - single source of truth
 */
export const UNIFIED_STYLES = {
  // Color palette
  colors: COLOR_PALETTE,
  
  // Component styles
  components: COMPONENT_STYLES,
  
  // Glassmorphism effects
  glassmorphism: GLASSMORPHISM_STYLES,
  
  // Utility functions
  getGlassmorphism: getGlassmorphismStyles,
  getComponent: getComponentStyles,
  getColor: getColor,
} as const;

/**
 * Centralized modal overlay styling (dim background behind modals)
 * Use this across all modal overlays for consistent blur/opacity/color
 */
export const MODAL_OVERLAY_STYLES = {
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  backdropFilter: 'blur(2px)',
  WebkitBackdropFilter: 'blur(2px)'
} as const;

/**
 * Helper: Extract RGB string from rgba() color string
 */
const extractRgb = (rgbaString: string): string => {
  const match = rgbaString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return '0, 0, 0';
  return `${match[1]}, ${match[2]}, ${match[3]}`;
};

/**
 * Helper: Convert hex color to RGB string
 */
const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0, 0, 0';
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `${r}, ${g}, ${b}`;
};

/**
 * Helper: Create rgba string from RGB and opacity
 */
const rgba = (rgb: string, opacity: number): string => {
  return `rgba(${rgb}, ${opacity})`;
};

/**
 * Generate CSS custom properties for app background
 * These can be used in CSS files via var(--app-bg-*)
 * 
 * Usage in CSS:
 * background-color: var(--app-bg-base);
 * background: radial-gradient(..., var(--app-bg-gradient1), ...);
 */
export const getAppBackgroundCSSVars = () => {
  const bg = COLOR_PALETTE.appBackground;
  const baseRgb = hexToRgb(bg.base);
  
  // Extract RGB from rgba() strings (editor shows color swatches, we extract RGB for reuse)
  const gradient1Rgb = extractRgb(bg.gradient1Color);
  const gradient2Rgb = extractRgb(bg.gradient2Color);
  const gradient3Rgb = extractRgb(bg.gradient3Color);
  const gradient4Rgb = extractRgb(bg.gradient4Color);
  
  return {
    '--app-bg-base': bg.base,
    // Gradient colors (derived from RGB + opacity)
    '--app-bg-gradient1': rgba(gradient1Rgb, bg.gradient1Opacity),
    '--app-bg-gradient2': rgba(gradient2Rgb, bg.gradient2Opacity),
    '--app-bg-gradient3': rgba(gradient3Rgb, bg.gradient3Opacity),
    '--app-bg-gradient4': rgba(gradient4Rgb, bg.gradient4Opacity),
    // Gradient fades (derived from same RGB colors with different opacity)
    '--app-bg-gradient1-fade': rgba(gradient1Rgb, bg.gradient1FadeOpacity),
    '--app-bg-gradient2-fade': rgba(gradient2Rgb, bg.gradient2FadeOpacity),
    '--app-bg-gradient3-fade': rgba(gradient3Rgb, bg.gradient3FadeOpacity),
    // Base gradient stops (derived from base color with different opacities)
    '--app-bg-base-gradient-start': rgba(baseRgb, bg.baseGradientStartOpacity),
    '--app-bg-base-gradient-mid1': rgba(baseRgb, bg.baseGradientMid1Opacity),
    '--app-bg-base-gradient-mid2': rgba(baseRgb, bg.baseGradientMid2Opacity),
    '--app-bg-base-gradient-end': rgba(baseRgb, bg.baseGradientEndOpacity),
    // Note: filterOverlay is now controlled directly in index.css (body::after)
  };
};
