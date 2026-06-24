/**
 * Centralized styling for toolbar components
 * Update these values to change all toolbar elements at once
 */

import { COLOR_PALETTE, getGlassmorphismStyles } from './glassmorphism-styles';

export const TOOLBAR_STYLES = {
  // Main container styling (legacy/default toolbar controls)
  container: {
    backgroundColor: COLOR_PALETTE.brand.layoutToolbar,
    backdropFilter: 'blur(0.5px)',
    WebkitBackdropFilter: 'blur(0.5px)',
    border: `1px solid ${COLOR_PALETTE.border.primary}`,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    color: COLOR_PALETTE.text.primary
  },

  // Layout toolbar styling (Projects, Files, Page Size, Layout, Aspect Ratio, Numbers, Template, Styles)
  layoutContainer: {
    backgroundColor: COLOR_PALETTE.background.subtle,
    backdropFilter: 'blur(0.5px)',
    WebkitBackdropFilter: 'blur(0.5px)',
    border: `1px solid ${COLOR_PALETTE.border.primary}`,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    color: COLOR_PALETTE.text.primary
  },

  // Load toolbar styling (Load Batch, Load Shot List)
  loadContainer: {
    backgroundColor: COLOR_PALETTE.brand.loadToolbar,
    backdropFilter: 'blur(0.5px)',
    WebkitBackdropFilter: 'blur(0.5px)',
    border: `1px solid ${COLOR_PALETTE.border.primary}`,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    color: COLOR_PALETTE.text.primary
  },
  
  // Container classes
  containerClasses: 'flex items-center justify-between px-1 py-1 gap-1 rounded-md',
  
  // Icon styling
  iconClasses: 'text-white',
  iconOpacity: 0.8, // Standard opacity for icons in theme toolbar
  
  // Text styling
  textClasses: 'text-white',
  mutedTextClasses: 'text-white/70',

  // Hover/focus for editable controls (selects, inputs, toggles inside toolbars)
  editableHoverClasses: 'toolbar-editable-hover',

  // Hover/focus for editable controls on dark layout toolbar (Layout, Numbers, Aspect Ratio)
  layoutEditableHoverClasses: 'toolbar-layout-editable-hover',
  
  // Button styling (for internal buttons)
  buttonClasses: 'h-5 w-[35px] border-none shadow-none bg-transparent focus:ring-0 focus:outline-none toolbar-editable-hover hover:text-white text-white rounded-sm transition-colors',
  
  // Select trigger styling
  selectTriggerClasses: 'h-5 w-[24px] justify-center px-0 border-none shadow-none bg-transparent focus:ring-0 focus:outline-none toolbar-editable-hover hover:text-white text-white rounded-sm transition-colors [&>svg]:hidden',

  // Select trigger styling for dark layout toolbar (Layout grid selectors)
  layoutSelectTriggerClasses: 'h-5 w-[24px] justify-center px-0 border-none shadow-none bg-transparent focus:ring-0 focus:outline-none toolbar-layout-editable-hover hover:text-white text-white rounded-sm transition-colors [&>svg]:hidden',
  
  // Select content styling
  selectContentClasses: 'w-[45px] min-w-[45px]'
} as const;

/**
 * Get the complete styling object for toolbar containers
 */
export const getToolbarContainerStyles = () => TOOLBAR_STYLES.container;

/**
 * Get styling for layout toolbar sections (Page Size, Layout, Aspect Ratio, etc.)
 */
export const getLayoutToolbarContainerStyles = () => TOOLBAR_STYLES.layoutContainer;

/**
 * Get styling for load toolbar sections (Load Batch, Load Shot List)
 */
export const getLoadToolbarContainerStyles = () => TOOLBAR_STYLES.loadContainer;

/**
 * Get the complete styling object for toolbar containers with custom overrides
 */
export const getToolbarContainerStylesWithOverrides = (overrides: Partial<typeof TOOLBAR_STYLES.container>) => ({
  ...TOOLBAR_STYLES.container,
  ...overrides
});

/**
 * Get layout toolbar styling with custom overrides
 */
export const getLayoutToolbarContainerStylesWithOverrides = (overrides: Partial<typeof TOOLBAR_STYLES.layoutContainer>) => ({
  ...TOOLBAR_STYLES.layoutContainer,
  ...overrides
});

/**
 * Get styling for theme toolbar section containers
 * Uses the themeSection glassmorphism variant (independent from subtle)
 */
export const getThemeSectionStyles = () => {
  return getGlassmorphismStyles('themeSection');
};

/**
 * Example usage:
 * 
 * // Basic usage
 * <div style={getToolbarContainerStyles()} className={TOOLBAR_STYLES.containerClasses}>
 * 
 * // With custom overrides
 * <div style={getToolbarContainerStylesWithOverrides({ backgroundColor: 'rgba(1, 1, 1, 0.3)' })} className={TOOLBAR_STYLES.containerClasses}>
 */
