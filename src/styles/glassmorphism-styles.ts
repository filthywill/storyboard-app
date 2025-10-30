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
 */
export const COLOR_PALETTE = {
  // Base colors
  black: 'rgba(0, 0, 0, 1)',
  white: 'rgba(255, 255, 255, 1)',
  
  // Border colors (unified system)
  border: {
    primary: 'rgba(0, 0, 0, 0.1)',
    secondary: 'rgba(0, 0, 0, 0.1)',
    subtle: 'rgba(0, 0, 0, 0.1)',
    accent: 'rgba(0, 0, 0, 0.1)',
  },
  
  // Background colors (for containers, panels, headers - NOT buttons)
  background: {
    primary: 'rgba(1, 1, 1, 0.05)',      // Main container backgrounds
    secondary: 'rgba(15, 15, 15, 1)',    // Dark surfaces (modals, dropdowns)
    subtle: 'rgba(1, 1, 1, 0.2)',        // Subtle container backgrounds
    accent: 'rgba(59, 130, 246, 0.9)',   // Accent surfaces
  },
  
  // Button colors (separate from container backgrounds for independent control)
  button: {
    primary: 'rgba(255, 255, 255, 0.08)',    // Default button background
    secondary: 'rgba(255, 255, 255, 0.12)',  // Secondary/emphasized buttons
    accent: 'rgba(59, 130, 246, 0.9)',       // CTA/accent buttons
    hover: 'rgba(255, 255, 255, 0.15)',      // Hover state overlay
  },
  
  // Input colors (form fields - separate from buttons and containers)
  input: {
    background: 'rgba(255, 255, 255, 0.05)', // Input field backgrounds
    border: 'rgba(255, 255, 255, 0.15)',     // Input field borders
  },
  
  // Text colors
  text: {
    primary: 'white',
    secondary: 'rgba(255, 255, 255, 0.7)',
    muted: 'rgba(255, 255, 255, 0.5)',
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
 * - 'button': Interactive buttons (uses button.primary) - NEW! Use for buttons
 * - 'buttonSecondary': Emphasized buttons (uses button.secondary) - NEW!
 * - 'buttonAccent': CTA/accent buttons (uses button.accent) - NEW!
 * - 'header': Main app headers (uses background.primary)
 * - 'content': Main content wrappers (uses background.subtle)
 * - 'background': Subtle backgrounds (uses background.subtle)
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

  // Button glassmorphism - Default interactive buttons
  button: {
    backgroundColor: COLOR_PALETTE.button.primary,
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: `1px solid ${COLOR_PALETTE.border.primary}`,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    color: COLOR_PALETTE.text.primary,
    transition: 'all 0.2s ease'
  },

  // Button glassmorphism - Secondary/emphasized buttons
  buttonSecondary: {
    backgroundColor: COLOR_PALETTE.button.secondary,
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: `1px solid ${COLOR_PALETTE.border.secondary}`,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
    color: COLOR_PALETTE.text.primary,
    transition: 'all 0.2s ease'
  },

  // Button glassmorphism - Accent/CTA buttons
  buttonAccent: {
    backgroundColor: COLOR_PALETTE.button.accent,
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: `1px solid ${COLOR_PALETTE.border.accent}`,
    boxShadow: '0 4px 6px rgba(59, 130, 246, 0.25)',
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
