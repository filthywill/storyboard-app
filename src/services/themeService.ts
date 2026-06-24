import { supabase } from '@/lib/supabase';
import { StoryboardTheme } from '@/styles/storyboardTheme';

// In-memory cache for user themes
let userThemesCache: StoryboardTheme[] = [];

export type ThemeServiceErrorCode =
  | 'AUTH_REQUIRED'
  | 'DUPLICATE_NAME'
  | 'NOT_FOUND'
  | 'UNKNOWN';

export class ThemeServiceError extends Error {
  code: ThemeServiceErrorCode;

  constructor(message: string, code: ThemeServiceErrorCode) {
    super(message);
    this.name = 'ThemeServiceError';
    this.code = code;
  }
}

const mapRowToTheme = (row: {
  id: string;
  name: string;
  theme_data: StoryboardTheme;
  user_id: string;
}): StoryboardTheme => ({
  ...row.theme_data,
  id: row.id,
  name: row.name,
  isPreset: false,
  createdBy: row.user_id,
});

const buildThemePayload = (theme: StoryboardTheme): StoryboardTheme => ({
  ...theme,
  isPreset: false,
});

/**
 * Theme Service
 *
 * Manages user-created custom themes saved to Supabase.
 * Uses in-memory caching for fast synchronous access.
 */
export class ThemeService {
  static clearCache(): void {
    userThemesCache = [];
  }

  private static async requireAuthenticatedUserId(): Promise<string> {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      throw new ThemeServiceError(
        'Unable to verify your account. Please sign in again.',
        'AUTH_REQUIRED'
      );
    }

    if (!data.user) {
      throw new ThemeServiceError(
        'Sign in to manage saved themes.',
        'AUTH_REQUIRED'
      );
    }

    return data.user.id;
  }

  private static mapSupabaseError(error: { message?: string; code?: string }): ThemeServiceError {
    const message = error.message ?? 'An unexpected error occurred.';
    const normalized = message.toLowerCase();

    if (normalized.includes('duplicate key') || error.code === '23505') {
      return new ThemeServiceError(
        'You already have a theme with this name. Choose a different name.',
        'DUPLICATE_NAME'
      );
    }

    if (
      normalized.includes('row-level security') ||
      normalized.includes('permission denied') ||
      normalized.includes('jwt')
    ) {
      return new ThemeServiceError(
        'Sign in to manage saved themes.',
        'AUTH_REQUIRED'
      );
    }

    return new ThemeServiceError(message, 'UNKNOWN');
  }

  /**
   * Load user's saved themes from Supabase into memory
   * Called on app init for authenticated users
   */
  static async loadUserThemesIntoMemory(): Promise<void> {
    try {
      const themes = await this.getUserThemes();
      userThemesCache = themes;
      console.log(`✅ Loaded ${themes.length} user themes`);
    } catch (error) {
      console.error('Failed to load user themes:', error);
      userThemesCache = [];
    }
  }

  /**
   * Get cached user themes (synchronous)
   * Returns empty array if not loaded yet
   */
  static getCachedUserThemes(): StoryboardTheme[] {
    return userThemesCache;
  }

  /**
   * Load user's saved themes from Supabase
   */
  static async getUserThemes(): Promise<StoryboardTheme[]> {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return [];
    }

    const { data, error } = await supabase
      .from('user_storyboard_themes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load user themes:', error);
      return [];
    }

    return data.map(mapRowToTheme);
  }

  /**
   * Save a new theme to user's profile
   */
  static async saveTheme(theme: StoryboardTheme): Promise<StoryboardTheme> {
    const userId = await this.requireAuthenticatedUserId();
    const themePayload = buildThemePayload(theme);

    const { data, error } = await supabase
      .from('user_storyboard_themes')
      .insert({
        user_id: userId,
        name: theme.name.trim(),
        theme_data: themePayload,
      })
      .select()
      .single();

    if (error) {
      throw this.mapSupabaseError(error);
    }

    const savedTheme = mapRowToTheme(data);
    userThemesCache = [savedTheme, ...userThemesCache.filter((item) => item.id !== savedTheme.id)];

    return savedTheme;
  }

  /**
   * Update existing theme
   */
  static async updateTheme(themeId: string, theme: StoryboardTheme): Promise<StoryboardTheme> {
    await this.requireAuthenticatedUserId();
    const themePayload = buildThemePayload({ ...theme, id: themeId, name: theme.name.trim() });

    const { data, error } = await supabase
      .from('user_storyboard_themes')
      .update({
        name: themePayload.name,
        theme_data: themePayload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', themeId)
      .select()
      .single();

    if (error) {
      throw this.mapSupabaseError(error);
    }

    if (!data) {
      throw new ThemeServiceError('Theme not found.', 'NOT_FOUND');
    }

    const updatedTheme = mapRowToTheme(data);
    const index = userThemesCache.findIndex((item) => item.id === themeId);

    if (index !== -1) {
      userThemesCache[index] = updatedTheme;
    } else {
      userThemesCache.unshift(updatedTheme);
    }

    return updatedTheme;
  }

  /**
   * Rename an existing saved theme
   */
  static async renameTheme(themeId: string, newName: string): Promise<StoryboardTheme> {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      throw new ThemeServiceError('Please enter a theme name.', 'UNKNOWN');
    }

    const existingTheme = userThemesCache.find((theme) => theme.id === themeId);
    if (!existingTheme) {
      throw new ThemeServiceError('Theme not found.', 'NOT_FOUND');
    }

    return this.updateTheme(themeId, {
      ...existingTheme,
      name: trimmedName,
    });
  }

  /**
   * Delete a theme
   */
  static async deleteTheme(themeId: string): Promise<void> {
    await this.requireAuthenticatedUserId();

    const { error } = await supabase
      .from('user_storyboard_themes')
      .delete()
      .eq('id', themeId);

    if (error) {
      throw this.mapSupabaseError(error);
    }

    userThemesCache = userThemesCache.filter((theme) => theme.id !== themeId);
  }
}

export const getThemeServiceErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof ThemeServiceError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};
