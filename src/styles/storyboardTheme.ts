/**
 * Storyboard Theme System
 * 
 * User-customizable styling for storyboard visual elements.
 * Separate from COLOR_PALETTE (fixed app UI) to maintain semantic separation.
 */

export interface StoryboardTheme {
  id: string; // UUID for saved themes
  name: string; // "Default", "Dark", "My Custom Theme"
  isPreset: boolean; // true for Default/Dark, false for user custom
  createdBy?: string; // user ID (if custom theme)
  
  // Content container background (the single white container holding header + shots)
  contentBackground: string; // rgba(255, 255, 255, 1)
  
  // Header text styling (header has transparent background)
  header: {
    text: string;       // rgba(0, 0, 0, 1)
  };
  
  // Shot card styling
  shotCard: {
    background: string;  // rgba(255, 255, 255, 1)
    backgroundEnabled: boolean; // Toggle for background
    border: string;      // rgba(0, 0, 0, 0.1)
    borderEnabled: boolean; // Toggle for border
    borderWidth: number; // 1
    borderRadius: number; // 8 (in pixels)
  };
  
  // Image frame styling (border around image container inside shot card)
  imageFrame: {
    border: string;      // rgba(0, 0, 0, 0.1)
    borderEnabled: boolean; // Toggle for border
    borderWidth: number; // 1
  };
  
  // Shot number styling
  shotNumber: {
    text: string;        // rgba(0, 0, 0, 1)
    background: string;  // Background behind shot number label
    border: string;      // Border color
    borderEnabled: boolean; // Toggle for border
    borderWidth: number; // Border width in pixels
    borderRadius: number; // Border radius in pixels
  };
  
  // Action text styling
  actionText: {
    text: string;        // rgba(0, 0, 0, 0.8)
    fontSize: number;   // 12 (in pixels)
  };
  
  // Script text styling
  scriptText: {
    text: string;        // rgba(0, 0, 0, 0.6)
    fontSize: number;   // 12 (in pixels)
  };
}

export const DEFAULT_SHOT_TEXT_FONT_SIZE = 12;
export const SHOT_TEXT_FONT_SIZE_MIN = 8;
export const SHOT_TEXT_FONT_SIZE_MAX = 18;
export const SHOT_TEXT_FONT_SIZE_STEP = 1;

export const normalizeShotTextFontSize = (fontSize: unknown): number => {
  if (typeof fontSize !== 'number' || !Number.isFinite(fontSize)) {
    return DEFAULT_SHOT_TEXT_FONT_SIZE;
  }

  const roundedFontSize = Math.round(fontSize);
  return Math.min(SHOT_TEXT_FONT_SIZE_MAX, Math.max(SHOT_TEXT_FONT_SIZE_MIN, roundedFontSize));
};

export const SHOT_TEXT_LINE_HEIGHT = 1.2;

export const getShotTextSpacing = (fontSize: unknown) => {
  const normalizedFontSize = normalizeShotTextFontSize(fontSize);

  return {
    fontSize: normalizedFontSize,
    lineHeight: SHOT_TEXT_LINE_HEIGHT,
    blockPaddingY: Math.max(1, Math.round(normalizedFontSize * 0.16)),
    domTextYOffset: Math.max(3, Math.round(normalizedFontSize * 0.35)),
  };
};

/**
 * Preset Themes
 */
export const PRESET_THEMES: Record<string, StoryboardTheme> = {
  light: {
    id: 'preset-light',
    name: 'Default',
    isPreset: true,
    contentBackground: '#ffffff',
    header: {
      text: '#000000',
    },
    shotCard: {
      background: '#ffffff',
      backgroundEnabled: false,
      border: '#cccccc',
      borderEnabled: false,
      borderWidth: 1,
      borderRadius: 8,
    },
    imageFrame: {
      border: '#e5e7eb',
      borderEnabled: true,
      borderWidth: 1,
    },
    shotNumber: {
      text: '#000000',
      background: '#ffffff',
      border: '#e5e7eb',
      borderEnabled: true,
      borderWidth: 1,
      borderRadius: 6,
    },
    actionText: {
      text: '#333333',
      fontSize: DEFAULT_SHOT_TEXT_FONT_SIZE,
    },
    scriptText: {
      text: '#666666',
      fontSize: DEFAULT_SHOT_TEXT_FONT_SIZE,
    },
  },
  
  dark: {
    id: 'preset-dark',
    name: 'Dark',
    isPreset: true,
    contentBackground: '#1e1e1e',
    header: {
      text: '#ffffff',
    },
    shotCard: {
      background: '#282828',
      backgroundEnabled: false,
      border: '#505050',
      borderEnabled: false,
      borderWidth: 1,
      borderRadius: 8,
    },
    imageFrame: {
      border: '#505050',
      borderEnabled: true,
      borderWidth: 1,
    },
    shotNumber: {
      text: '#ffffff',
      background: '#2a2a2a',
      border: '#505050',
      borderEnabled: true,
      borderWidth: 1,
      borderRadius: 6,
    },
    actionText: {
      text: '#dddddd',
      fontSize: DEFAULT_SHOT_TEXT_FONT_SIZE,
    },
    scriptText: {
      text: '#aaaaaa',
      fontSize: DEFAULT_SHOT_TEXT_FONT_SIZE,
    },
  },
};

/**
 * Get theme by ID (checks presets)
 */
export const getThemeById = (id: string): StoryboardTheme | undefined => {
  return Object.values(PRESET_THEMES).find(t => t.id === id);
};

/**
 * Get default theme
 */
export const getDefaultTheme = (): StoryboardTheme => {
  return PRESET_THEMES.light;
};

/**
 * Migrate old theme to include new shotNumber border properties if missing
 */
export const migrateTheme = (theme: any): StoryboardTheme => {
  if (!theme) {
    return getDefaultTheme();
  }

  // If it's missing shotNumber border properties, add defaults
  if (theme.shotNumber && (!('border' in theme.shotNumber) || !('borderEnabled' in theme.shotNumber))) {
    theme = {
      ...theme,
      shotNumber: {
        ...theme.shotNumber,
        border: theme.shotNumber.border || '#e5e7eb',
        borderEnabled: theme.shotNumber.borderEnabled !== undefined ? theme.shotNumber.borderEnabled : true,
        borderWidth: theme.shotNumber.borderWidth || 1,
        borderRadius: theme.shotNumber.borderRadius || 6,
      }
    } as StoryboardTheme;
  }

  // If it's missing imageFrame properties, add defaults
  if (!theme.imageFrame) {
    theme = {
      ...theme,
      imageFrame: {
        border: theme.imageFrame?.border || '#e5e7eb',
        borderEnabled: theme.imageFrame?.borderEnabled !== undefined ? theme.imageFrame.borderEnabled : true,
        borderWidth: theme.imageFrame?.borderWidth || 1,
      }
    } as StoryboardTheme;
  }

  // If it's missing shot text font sizes, add safe defaults
  theme = {
    ...theme,
    actionText: {
      ...theme.actionText,
      fontSize: normalizeShotTextFontSize(theme.actionText?.fontSize),
    },
    scriptText: {
      ...theme.scriptText,
      fontSize: normalizeShotTextFontSize(theme.scriptText?.fontSize),
    },
  } as StoryboardTheme;

  return theme as StoryboardTheme;
};

