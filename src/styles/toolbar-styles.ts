/**
 * Centralized styling for toolbar components
 * Update these values to change all toolbar elements at once
 */

export const TOOLBAR_STYLES = {
  // Main container styling
  container: {
    backgroundColor: 'rgba(1, 1, 1, 0.2)',
    backdropFilter: 'blur(0.5px)',
    WebkitBackdropFilter: 'blur(0.5px)',
    border: '1px solid rgba(1, 1, 1, 0.05)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    color: 'white'
  },
  
  // Container classes
  containerClasses: 'flex items-center justify-between px-3 py-1 gap-2 rounded-md',
  
  // Icon styling
  iconClasses: 'text-white',
  
  // Text styling
  textClasses: 'text-white',
  mutedTextClasses: 'text-white/70',
  
  // Button styling (for internal buttons)
  buttonClasses: 'h-5 w-[35px] border-none shadow-none bg-transparent focus:ring-0 focus:outline-none hover:bg-white/20 hover:text-white text-white rounded-sm transition-colors',
  
  // Select trigger styling
  selectTriggerClasses: 'h-5 w-[35px] border-none shadow-none bg-transparent focus:ring-0 focus:outline-none hover:bg-white/20 hover:text-white text-white rounded-sm transition-colors [&>svg]:hidden',
  
  // Select content styling
  selectContentClasses: 'w-[45px] min-w-[45px]'
} as const;

/**
 * Get the complete styling object for toolbar containers
 */
export const getToolbarContainerStyles = () => TOOLBAR_STYLES.container;

/**
 * Get the complete styling object for toolbar containers with custom overrides
 */
export const getToolbarContainerStylesWithOverrides = (overrides: Partial<typeof TOOLBAR_STYLES.container>) => ({
  ...TOOLBAR_STYLES.container,
  ...overrides
});

/**
 * Example usage:
 * 
 * // Basic usage
 * <div style={getToolbarContainerStyles()} className={TOOLBAR_STYLES.containerClasses}>
 * 
 * // With custom overrides
 * <div style={getToolbarContainerStylesWithOverrides({ backgroundColor: 'rgba(1, 1, 1, 0.3)' })} className={TOOLBAR_STYLES.containerClasses}>
 */
