import { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getColor } from '@/styles/glassmorphism-styles';
import { Palette } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { getToolbarContainerStyles, TOOLBAR_STYLES } from '@/styles/toolbar-styles';
import { PRESET_THEMES, getThemeById } from '@/styles/storyboardTheme';
import { ThemeService } from '@/services/themeService';
import { ThemeEditorModal } from './ThemeEditorModal';

export const StyleSettings: React.FC = () => {
  const { storyboardTheme, setStoryboardTheme } = useAppStore();
  const [userThemes, setUserThemes] = useState(ThemeService.getCachedUserThemes());
  const [showThemeEditor, setShowThemeEditor] = useState(false);

  // Reload user themes when component mounts or when modal closes
  useEffect(() => {
    const loadThemes = async () => {
      await ThemeService.loadUserThemesIntoMemory();
      setUserThemes(ThemeService.getCachedUserThemes());
    };
    loadThemes();
  }, [showThemeEditor]); // Reload when editor closes

  const handleThemeChange = (themeId: string) => {
    // Check preset themes first
    const presetTheme = getThemeById(themeId);
    if (presetTheme) {
      setStoryboardTheme(presetTheme);
      return;
    }

    // Check user themes
    const userTheme = userThemes.find(t => t.id === themeId);
    if (userTheme) {
      setStoryboardTheme(userTheme);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Theme Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: TOOLBAR_STYLES.textColor }}>
            Theme:
          </span>
          <Select value={storyboardTheme.id} onValueChange={handleThemeChange}>
            <SelectTrigger 
              className="w-[140px] h-8"
              style={getToolbarContainerStyles()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {/* Preset Themes */}
              <SelectItem value="preset-light">Light</SelectItem>
              <SelectItem value="preset-dark">Dark</SelectItem>
              
              {/* User Custom Themes */}
              {userThemes.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1" style={{ borderTop: `1px solid ${getColor('border', 'primary') as string}` }}>
                    Custom Themes
                  </div>
                  {userThemes.map(theme => (
                    <SelectItem key={theme.id} value={theme.id}>
                      {theme.name}
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Create Custom Theme Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="compact"
              className="py-1.5 flex items-center justify-center gap-1"
              style={getToolbarContainerStyles()}
              onClick={() => setShowThemeEditor(true)}
            >
              <Palette size={16} className={TOOLBAR_STYLES.iconClasses} />
              <span className="text-xs">Customize</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Create or edit custom theme</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Theme Editor Modal */}
      <ThemeEditorModal
        open={showThemeEditor}
        onClose={() => setShowThemeEditor(false)}
      />
    </>
  );
};


