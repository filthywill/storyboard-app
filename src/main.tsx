import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { getAppBackgroundCSSVars, getColor } from './styles/glassmorphism-styles'

// Prevent Radix UI from adding padding-right to body when dropdowns open
// Radix adds padding to compensate for scrollbar, but we use scrollbar-gutter: stable
// This creates a double gutter, so we prevent it by watching for style changes
if (typeof window !== 'undefined') {
  const setupBodyObserver = () => {
    const body = document.body;
    if (!body) {
      // If body doesn't exist yet, wait a bit and try again
      setTimeout(setupBodyObserver, 10);
      return;
    }

    // Use a more aggressive approach: check and remove padding-right on every frame
    // This ensures we catch Radix's changes immediately, even before MutationObserver fires
    let rafId: number;
    const checkAndRemovePadding = () => {
      // Check body
      if (body.style.paddingRight) {
        body.style.paddingRight = '';
      }
      if (body.style.marginRight) {
        body.style.marginRight = '';
      }
      // Also check html element (Radix sometimes modifies both)
      const html = document.documentElement;
      if (html.style.paddingRight) {
        html.style.paddingRight = '';
      }
      if (html.style.marginRight) {
        html.style.marginRight = '';
      }
      // Also check for overflow changes that might affect scrollbar
      if (body.style.overflow === 'hidden') {
        // Don't remove overflow: hidden as Radix needs it, but ensure padding isn't added
        body.style.paddingRight = '';
        body.style.marginRight = '';
      }
      rafId = requestAnimationFrame(checkAndRemovePadding);
    };
    checkAndRemovePadding();

    // Also use MutationObserver as backup for both body and html
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target as HTMLElement;
          if (target === body || target === document.documentElement) {
            if (target.style.paddingRight) {
              target.style.paddingRight = '';
            }
            if (target.style.marginRight) {
              target.style.marginRight = '';
            }
          }
        }
      });
    });

    // Observe both body and html elements
    observer.observe(body, {
      attributes: true,
      attributeFilter: ['style'],
      attributeOldValue: false
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
      attributeOldValue: false
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
    });
  };

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupBodyObserver);
  } else {
    setupBodyObserver();
  }
}

// Inject app background CSS variables from centralized color system
// This ensures changes in glassmorphism-styles.ts are immediately reflected
if (typeof window !== 'undefined') {
  const injectCSSVars = () => {
    const root = document.documentElement;
    
    // Inject background CSS variables
    const bgCssVars = getAppBackgroundCSSVars();
    Object.entries(bgCssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    
    // Inject checkbox CSS variables
    root.style.setProperty('--checkbox-bg', getColor('checkbox', 'background') as string);
    root.style.setProperty('--checkbox-bg-checked', getColor('checkbox', 'backgroundChecked') as string);
    root.style.setProperty('--checkbox-border', getColor('checkbox', 'border') as string);
    root.style.setProperty('--checkbox-border-checked', getColor('checkbox', 'borderChecked') as string);
    root.style.setProperty('--checkbox-icon', getColor('checkbox', 'icon') as string);
    
    // Inject radio button CSS variables
    root.style.setProperty('--radio-bg', getColor('radio', 'background') as string);
    root.style.setProperty('--radio-border', getColor('radio', 'border') as string);
    root.style.setProperty('--radio-border-checked', getColor('radio', 'borderChecked') as string);
    root.style.setProperty('--radio-indicator', getColor('radio', 'indicator') as string);
  };

  // Inject immediately if DOM is ready, otherwise wait
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectCSSVars);
  } else {
    injectCSSVars();
  }
}

createRoot(document.getElementById("root")!).render(<App />);
