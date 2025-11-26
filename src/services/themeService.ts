import { supabase } from '@/lib/supabase';
import { StoryboardTheme } from '@/styles/storyboardTheme';

// In-memory cache for user themes
let userThemesCache: StoryboardTheme[] = [];

/**
 * Theme Service
 * 
 * Manages user-created custom themes saved to Supabase.
 * Uses in-memory caching for fast synchronous access.
 */
export class ThemeService {
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
    const { data, error } = await supabase
      .from('user_storyboard_themes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Failed to load user themes:', error);
      return [];
    }
    
    return data.map(row => ({
      ...row.theme_data,
      id: row.id,
      name: row.name,
      isPreset: false,
      createdBy: row.user_id,
    }));
  }
  
  /**
   * Save a new theme to user's profile
   */
  static async saveTheme(theme: StoryboardTheme): Promise<StoryboardTheme> {
    const { data, error } = await supabase
      .from('user_storyboard_themes')
      .insert({
        name: theme.name,
        theme_data: theme,
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to save theme: ${error.message}`);
    }
    
    const savedTheme = {
      ...theme,
      id: data.id,
    };
    
    // Update cache
    userThemesCache.push(savedTheme);
    
    return savedTheme;
  }
  
  /**
   * Update existing theme
   */
  static async updateTheme(themeId: string, theme: StoryboardTheme): Promise<void> {
    const { error } = await supabase
      .from('user_storyboard_themes')
      .update({
        name: theme.name,
        theme_data: theme,
        updated_at: new Date().toISOString(),
      })
      .eq('id', themeId);
    
    if (error) {
      throw new Error(`Failed to update theme: ${error.message}`);
    }
    
    // Update cache
    const index = userThemesCache.findIndex(t => t.id === themeId);
    if (index !== -1) {
      userThemesCache[index] = { ...theme, id: themeId };
    }
  }
  
  /**
   * Delete a theme
   */
  static async deleteTheme(themeId: string): Promise<void> {
    const { error } = await supabase
      .from('user_storyboard_themes')
      .delete()
      .eq('id', themeId);
    
    if (error) {
      throw new Error(`Failed to delete theme: ${error.message}`);
    }
    
    // Update cache
    userThemesCache = userThemesCache.filter(t => t.id !== themeId);
  }
}




