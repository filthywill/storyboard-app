import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Trash2, ChevronUp, ChevronDown, Save, Pencil } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useAuthModalStore } from '@/store/authModalStore';
import { CloudAccessService, type CloudAccessState } from '@/services/cloudAccessService';
import { ProjectLimitDialog } from '@/components/ProjectLimitDialog';
import { UpgradeToProDialog } from '@/components/UpgradeToProDialog';
import { HexColorPicker } from 'react-colorful';
import { getToolbarContainerStyles, getThemeSectionStyles, TOOLBAR_STYLES } from '@/styles/toolbar-styles';
import { getColor, getGlassmorphismStyles } from '@/styles/glassmorphism-styles';
import {
  PRESET_THEMES,
  getThemeById,
  StoryboardTheme,
  SHOT_TEXT_FONT_SIZE_MAX,
  SHOT_TEXT_FONT_SIZE_MIN,
  SHOT_TEXT_FONT_SIZE_STEP,
  normalizeShotTextFontSize,
} from '@/styles/storyboardTheme';
import { ThemeService, getThemeServiceErrorMessage } from '@/services/themeService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const cloneTheme = (theme: StoryboardTheme): StoryboardTheme =>
  JSON.parse(JSON.stringify(theme));

const FREE_SAVED_THEME_LIMIT = 3;

export const ThemeToolbar: React.FC = () => {
  const navigate = useNavigate();
  const openAuthModal = useAuthModalStore((state) => state.openAuthModal);
  const { storyboardTheme, setStoryboardTheme } = useAppStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const [userThemes, setUserThemes] = useState(ThemeService.getCachedUserThemes());
  const [accessState, setAccessState] = useState<CloudAccessState | null>(
    CloudAccessService.getCachedAccessState()
  );
  const [showGuestLimitDialog, setShowGuestLimitDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState<string | null>(null);
  const [themeToRename, setThemeToRename] = useState<{ id: string; name: string } | null>(null);
  const [themeName, setThemeName] = useState('');
  const [renameThemeName, setRenameThemeName] = useState('');
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [isRenamingTheme, setIsRenamingTheme] = useState(false);

  // Color picker state
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [editingColorPath, setEditingColorPath] = useState('');
  const [editingColorValue, setEditingColorValue] = useState('#ffffff');
  const [colorPickerPosition, setColorPickerPosition] = useState<{ x: number; y: number } | null>(null);

  const reloadUserThemes = async () => {
    await ThemeService.loadUserThemesIntoMemory();
    setUserThemes(ThemeService.getCachedUserThemes());
  };

  // Reload user themes when auth state or theme dialogs change
  useEffect(() => {
    if (!isAuthenticated) {
      ThemeService.clearCache();
      setUserThemes([]);
      setAccessState(null);
      return;
    }

    void reloadUserThemes();
  }, [isAuthenticated, showSaveDialog, showRenameDialog, showDeleteDialog]);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      return;
    }

    CloudAccessService.getAccessState()
      .then((state) => {
        if (active) setAccessState(state);
      })
      .catch(() => {
        if (active) setAccessState(null);
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, user?.id, userThemes.length]);

  const matchingSavedTheme = userThemes.find((theme) => theme.id === storyboardTheme.id);
  const isPresetTheme = Boolean(getThemeById(storyboardTheme.id));
  const isProjectLocalTheme = !isPresetTheme && !matchingSavedTheme;

  const buildThemeFromCurrentSettings = (name: string, id: string): StoryboardTheme => ({
    ...cloneTheme(storyboardTheme),
    id,
    name: name.trim(),
    isPreset: false,
  });

  const handleThemeChange = (themeId: string) => {
    const presetTheme = getThemeById(themeId);
    if (presetTheme) {
      setStoryboardTheme(cloneTheme(presetTheme));
      return;
    }

    const userTheme = userThemes.find((theme) => theme.id === themeId);
    if (userTheme) {
      setStoryboardTheme(cloneTheme(userTheme));
    }
  };

  const canSaveNewSavedTheme =
    accessState?.plan === 'pro' || userThemes.length < FREE_SAVED_THEME_LIMIT;

  const isAtFreeSavedThemeLimit =
    accessState?.plan !== 'pro' && userThemes.length >= FREE_SAVED_THEME_LIMIT;

  const openSaveDialog = () => {
    if (!isAuthenticated) {
      setShowGuestLimitDialog(true);
      return;
    }

    if (isAtFreeSavedThemeLimit && !matchingSavedTheme) {
      setShowUpgradeDialog(true);
      return;
    }

    setThemeName(matchingSavedTheme?.name ?? '');
    setShowSaveDialog(true);
  };

  const handleSaveNewTheme = async () => {
    if (!canSaveNewSavedTheme) {
      setShowUpgradeDialog(true);
      return;
    }

    if (!themeName.trim()) {
      toast.error('Please enter a theme name');
      return;
    }

    setIsSavingTheme(true);
    try {
      const themeToSave = buildThemeFromCurrentSettings(themeName, crypto.randomUUID());
      const savedTheme = await ThemeService.saveTheme(themeToSave);
      setStoryboardTheme(cloneTheme(savedTheme));
      toast.success(`Theme "${savedTheme.name}" saved`);
      setThemeName('');
      setShowSaveDialog(false);
      await reloadUserThemes();
    } catch (error) {
      toast.error(getThemeServiceErrorMessage(error, 'Failed to save theme'));
      console.error('Error saving theme:', error);
    } finally {
      setIsSavingTheme(false);
    }
  };

  const handleUpdateExistingTheme = async () => {
    if (!matchingSavedTheme) {
      toast.error('This project is not using a saved theme. Use Save as New instead.');
      return;
    }

    if (!themeName.trim()) {
      toast.error('Please enter a theme name');
      return;
    }

    setIsSavingTheme(true);
    try {
      const themeToUpdate = buildThemeFromCurrentSettings(themeName, matchingSavedTheme.id);
      const updatedTheme = await ThemeService.updateTheme(matchingSavedTheme.id, themeToUpdate);
      setStoryboardTheme(cloneTheme(updatedTheme));
      toast.success(`Theme "${updatedTheme.name}" updated`);
      setThemeName('');
      setShowSaveDialog(false);
      await reloadUserThemes();
    } catch (error) {
      toast.error(getThemeServiceErrorMessage(error, 'Failed to update theme'));
      console.error('Error updating theme:', error);
    } finally {
      setIsSavingTheme(false);
    }
  };

  const handleDeleteTheme = async () => {
    if (!themeToDelete) return;

    try {
      await ThemeService.deleteTheme(themeToDelete);

      toast.success('Theme deleted');
      setShowDeleteDialog(false);
      setThemeToDelete(null);
      await reloadUserThemes();
    } catch (error) {
      toast.error(getThemeServiceErrorMessage(error, 'Failed to delete theme'));
      console.error('Error deleting theme:', error);
    }
  };

  const confirmDeleteTheme = (themeId: string) => {
    if (!isAuthenticated) {
      toast.error('Sign in to manage saved themes');
      return;
    }

    setThemeToDelete(themeId);
    setShowDeleteDialog(true);
  };

  const openRenameDialog = (theme: StoryboardTheme) => {
    if (!isAuthenticated) {
      toast.error('Sign in to manage saved themes');
      return;
    }

    setThemeToRename({ id: theme.id, name: theme.name });
    setRenameThemeName(theme.name);
    setShowRenameDialog(true);
  };

  const handleRenameTheme = async () => {
    if (!themeToRename) return;

    if (!renameThemeName.trim()) {
      toast.error('Please enter a theme name');
      return;
    }

    setIsRenamingTheme(true);
    try {
      const renamedTheme = await ThemeService.renameTheme(themeToRename.id, renameThemeName);
      toast.success(`Theme renamed to "${renamedTheme.name}"`);
      setShowRenameDialog(false);
      setThemeToRename(null);
      setRenameThemeName('');
      await reloadUserThemes();
    } catch (error) {
      toast.error(getThemeServiceErrorMessage(error, 'Failed to rename theme'));
      console.error('Error renaming theme:', error);
    } finally {
      setIsRenamingTheme(false);
    }
  };

  // Color change handler
  const handleColorChange = (path: string, value: string) => {
    const keys = path.split('.');
    
    if (keys.length === 1) {
      const updated = {
        ...storyboardTheme,
        [keys[0]]: value
      };
      setStoryboardTheme(JSON.parse(JSON.stringify(updated)));
    } else if (keys.length === 2) {
      const updated = {
        ...storyboardTheme,
        [keys[0]]: {
          ...(storyboardTheme as any)[keys[0]],
          [keys[1]]: value
        }
      };
      setStoryboardTheme(JSON.parse(JSON.stringify(updated)));
    }
  };

  // Boolean change handler
  const handleBooleanChange = (path: string, value: boolean) => {
    const keys = path.split('.');
    
    if (keys.length === 2) {
      const updated = {
        ...storyboardTheme,
        [keys[0]]: {
          ...(storyboardTheme as any)[keys[0]],
          [keys[1]]: value
        }
      };
      setStoryboardTheme(JSON.parse(JSON.stringify(updated)));
    }
  };

  // Number change handler
  const handleNumberChange = (path: string, value: number) => {
    const keys = path.split('.');
    
    if (keys.length === 2) {
      const updated = {
        ...storyboardTheme,
        [keys[0]]: {
          ...(storyboardTheme as any)[keys[0]],
          [keys[1]]: value
        }
      };
      setStoryboardTheme(JSON.parse(JSON.stringify(updated)));
    }
  };

  const openColorPicker = (path: string, currentValue: string, event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    // Position below the swatch with a small offset
    setColorPickerPosition({
      x: rect.left,
      y: rect.bottom + 8, // 8px below the swatch
    });
    setEditingColorPath(path);
    setEditingColorValue(currentValue);
    setColorPickerOpen(true);
  };

  const handleColorPickerChange = (newColor: string) => {
    setEditingColorValue(newColor);
    handleColorChange(editingColorPath, newColor);
  };

  // Color swatch button
  const ColorSwatchButton = ({ path, value, disabled = false }: { path: string; value: string; disabled?: boolean }) => (
    <button
      type="button"
      className={cn(
        "w-6 h-6 rounded border-0 transition-colors",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
      )}
      style={{ backgroundColor: value }}
      onClick={(e) => !disabled && openColorPicker(path, value, e)}
      disabled={disabled}
      title={disabled ? "Disabled" : "Click to pick color"}
    />
  );

  // Checkbox on/off toggle (matches Template dropdown checkbox styling)
  const CheckboxToggle = ({
    checked,
    onChange,
    disabled = false,
    label,
  }: {
    checked: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
    label: string;
  }) => (
    <Checkbox
      checked={checked}
      onCheckedChange={(value) => onChange(value === true)}
      disabled={disabled}
      title={`${label}: ${checked ? 'Enabled' : 'Disabled'}`}
      className="h-4 w-4 rounded-sm"
    />
  );

  // Sub-container styling for grouping related controls
  // Centralized style - adjust in COLOR_PALETTE.background.themeSubContainer
  const getSubContainerStyles = () => ({
    backgroundColor: getColor('background', 'themeSubContainer'),
    borderRadius: '4px',
    padding: '4px 6px',
  });

  const themeSectionHeadClasses = cn("text-[10px] font-semibold uppercase mb-1", TOOLBAR_STYLES.textClasses);
  const themeSubHeadClasses = cn("text-[8px] font-semibold uppercase leading-none", TOOLBAR_STYLES.mutedTextClasses);

  const ThemeSubHead = ({ children }: { children: React.ReactNode }) => (
    <span className={themeSubHeadClasses}>{children}</span>
  );

  const LabeledControlGroup = ({
    label,
    children,
    className,
  }: {
    label: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={cn("flex flex-col items-start gap-0.5", className)}>
      <ThemeSubHead>{label}</ThemeSubHead>
      <div className="flex items-center gap-1.5 rounded" style={getSubContainerStyles()}>
        {children}
      </div>
    </div>
  );

  // Border Width input with up/down arrows
  const BorderWidthInput = ({ value, onChange, min, max, disabled = false }: { value: number; onChange: (value: number) => void; min: number; max: number; disabled?: boolean }) => {
    const handleIncrement = () => {
      if (!disabled && value < max) {
        onChange(value + 1);
      }
    };

    const handleDecrement = () => {
      if (!disabled && value > min) {
        onChange(value - 1);
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value);
      if (!isNaN(val)) {
        const clamped = Math.max(min, Math.min(max, val));
        onChange(clamped);
      }
    };

    return (
      <div className="flex items-center rounded overflow-hidden" style={disabled ? { border: '1px solid transparent' } : { border: `1px solid ${getColor('input', 'borderSubtle') as string}` }}>
        <input
          type="number"
          value={value}
          onChange={handleInputChange}
          min={min}
          max={max}
          disabled={disabled}
          className={cn(
            "w-8 h-6 px-1 text-xs text-center border-0 bg-transparent focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            disabled 
              ? "cursor-not-allowed" 
              : TOOLBAR_STYLES.textClasses
          )}
          style={disabled 
            ? { color: getColor('text', 'muted') as string } 
            : { backgroundColor: getColor('input', 'backgroundDark') as string }
          }
        />
        <div className="flex flex-col border-0" style={{ borderColor: getColor('input', 'borderSubtle') }}>
          <button
            type="button"
            onClick={handleIncrement}
            disabled={disabled || value >= max}
            className={cn(
              "h-3 w-3.5 flex items-center justify-center border-b transition-colors",
              disabled || value >= max
                ? "cursor-not-allowed opacity-50"
                : `cursor-pointer ${TOOLBAR_STYLES.editableHoverClasses}`
            )}
            style={disabled || value >= max 
              ? { color: getColor('text', 'muted') as string } 
              : { borderColor: getColor('input', 'borderSubtle') as string, color: getColor('text', 'primary') as string }
            }
          >
            <ChevronUp size={10} />
          </button>
          <button
            type="button"
            onClick={handleDecrement}
            disabled={disabled || value <= min}
            className={cn(
              "h-3 w-3.5 flex items-center justify-center transition-colors",
              disabled || value <= min
                ? "cursor-not-allowed opacity-50"
                : `cursor-pointer ${TOOLBAR_STYLES.editableHoverClasses}`
            )}
            style={{
              color: (disabled || value <= min) 
                ? getColor('text', 'muted') as string 
                : getColor('text', 'primary') as string
            }}
          >
            <ChevronDown size={10} />
          </button>
        </div>
      </div>
    );
  };

  // Number input with up/down arrows (reusable for radius and other numeric inputs)
  const NumberInputWithArrows = ({ value, onChange, min, max, step = 1, disabled = false }: { value: number; onChange: (value: number) => void; min: number; max: number; step?: number; disabled?: boolean }) => {
    const handleIncrement = () => {
      if (!disabled && value < max) {
        onChange(Math.min(max, value + step));
      }
    };

    const handleDecrement = () => {
      if (!disabled && value > min) {
        onChange(Math.max(min, value - step));
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value);
      if (!isNaN(val)) {
        const clamped = Math.max(min, Math.min(max, val));
        onChange(clamped);
      }
    };

    return (
      <div className="flex items-center rounded overflow-hidden" style={disabled ? { border: '1px solid transparent' } : { border: `1px solid ${getColor('input', 'borderSubtle') as string}` }}>
        <input
          type="number"
          value={value}
          onChange={handleInputChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={cn(
            "w-8 h-6 px-1 text-xs text-center border-0 bg-transparent focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            disabled 
              ? "cursor-not-allowed" 
              : TOOLBAR_STYLES.textClasses
          )}
          style={disabled 
            ? { color: getColor('text', 'muted') as string } 
            : { backgroundColor: getColor('input', 'backgroundDark') as string }
          }
        />
        <div className="flex flex-col border-0" style={{ borderColor: getColor('input', 'borderSubtle') }}>
          <button
            type="button"
            onClick={handleIncrement}
            disabled={disabled || value >= max}
            className={cn(
              "h-3 w-3.5 flex items-center justify-center border-b transition-colors",
              disabled || value >= max
                ? "cursor-not-allowed opacity-50"
                : `cursor-pointer ${TOOLBAR_STYLES.editableHoverClasses}`
            )}
            style={disabled || value >= max 
              ? { color: getColor('text', 'muted') as string } 
              : { borderColor: getColor('input', 'borderSubtle') as string, color: getColor('text', 'primary') as string }
            }
          >
            <ChevronUp size={10} />
          </button>
          <button
            type="button"
            onClick={handleDecrement}
            disabled={disabled || value <= min}
            className={cn(
              "h-3 w-3.5 flex items-center justify-center transition-colors",
              disabled || value <= min
                ? "cursor-not-allowed opacity-50"
                : `cursor-pointer ${TOOLBAR_STYLES.editableHoverClasses}`
            )}
            style={{
              color: (disabled || value <= min) 
                ? getColor('text', 'muted') as string 
                : getColor('text', 'primary') as string
            }}
          >
            <ChevronDown size={10} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div 
        className="w-full mb-2 rounded-md" 
        style={{
          ...getGlassmorphismStyles('subtle'),
          // PARENT CONTAINER BACKGROUND - Adjust in COLOR_PALETTE.background.themeParent
          backgroundColor: getColor('background', 'themeParent'),
          boxShadow: 'none',
          border: 'none',
          // Remove backdrop-filter to prevent visual darkening of child containers
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
        }}
      >
        <div className="flex items-stretch gap-3 px-2 py-2">
          {/* Left: Theme Management */}
        <div className="flex flex-col gap-1 px-2 py-1 rounded h-full" style={getThemeSectionStyles()}>
          <Label className={cn("text-[10px] font-semibold uppercase mb-1", TOOLBAR_STYLES.textClasses)}>Themes</Label>
          <div className="flex items-center gap-2 rounded" style={getSubContainerStyles()}>
            <Select value={storyboardTheme.id} onValueChange={handleThemeChange}>
            <SelectTrigger 
              className="w-[140px] h-8 rounded transition-colors"
              style={{
                ...getToolbarContainerStyles(),
                border: 'none',
                backgroundColor: getColor('background', 'themeSelect'),
              }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="preset-light">Default</SelectItem>
              <SelectItem value="preset-dark">Dark</SelectItem>

              {isProjectLocalTheme && (
                <SelectItem value={storyboardTheme.id}>
                  {storyboardTheme.name}
                </SelectItem>
              )}
              
              {userThemes.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1" style={{ borderTop: `1px solid ${getColor('border', 'primary') as string}` }}>
                    Custom Themes
                  </div>
                  {userThemes.map(theme => (
                    <div key={theme.id} className="relative group">
                      <SelectItem value={theme.id} className="pr-14">
                        {theme.name}
                      </SelectItem>
                      <div
                        className="absolute right-1 top-1/2 z-10 flex -translate-y-1/2 items-center gap-0.5"
                        onPointerDown={(e) => e.preventDefault()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openRenameDialog(theme);
                          }}
                          className={cn(
                            "rounded-sm p-1 transition-colors",
                            "opacity-70 group-hover:opacity-100",
                            "hover:bg-white/10"
                          )}
                          style={{
                            color: getColor('text', 'primary') as string,
                          }}
                          title="Rename theme"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDeleteTheme(theme.id);
                          }}
                          className={cn(
                            "rounded-sm p-1 transition-colors",
                            "opacity-70 group-hover:opacity-100",
                            "hover:bg-white/10"
                          )}
                          style={{
                            color: getColor('text', 'primary') as string,
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(220, 38, 38, 1)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = getColor('text', 'primary') as string}
                          title="Delete theme"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              style={getGlassmorphismStyles('buttonAccent')}
              onClick={openSaveDialog}
              title="Save current settings as theme"
            >
              <Save size={16} className={TOOLBAR_STYLES.iconClasses} />
            </Button>
          </div>
        </div>

        {/* Right: Inline Settings */}
        <div className="flex items-stretch gap-2">
          {/* Page Colors */}
          <div className="flex flex-col gap-1 px-2 py-1 rounded h-full" style={getThemeSectionStyles()}>
            <Label className={themeSectionHeadClasses}>Page Colors</Label>
            <div className="flex flex-wrap items-end gap-2">
              <LabeledControlGroup label="BG">
                <ColorSwatchButton path="contentBackground" value={storyboardTheme.contentBackground} />
              </LabeledControlGroup>
              <LabeledControlGroup label="Text">
                <ColorSwatchButton path="header.text" value={storyboardTheme.header.text} />
              </LabeledControlGroup>
            </div>
          </div>

          {/* Shot Card */}
          <div className="flex flex-col gap-1 px-2 py-1 rounded h-full" style={getThemeSectionStyles()}>
            <Label className={themeSectionHeadClasses}>Shot Card</Label>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-end justify-between gap-2">
                <LabeledControlGroup label="BG">
                  <CheckboxToggle 
                    checked={storyboardTheme.shotCard.backgroundEnabled} 
                    onChange={(val) => handleBooleanChange('shotCard.backgroundEnabled', val)}
                    label="Background"
                  />
                  <ColorSwatchButton 
                    path="shotCard.background" 
                    value={storyboardTheme.shotCard.background}
                    disabled={!storyboardTheme.shotCard.backgroundEnabled}
                  />
                </LabeledControlGroup>
                <LabeledControlGroup label="Corners">
                  <NumberInputWithArrows 
                    value={storyboardTheme.shotCard.borderRadius}
                    onChange={(val) => handleNumberChange('shotCard.borderRadius', val)}
                    min={0}
                    max={20}
                  />
                </LabeledControlGroup>
              </div>
              <LabeledControlGroup label="Border">
                <CheckboxToggle 
                  checked={storyboardTheme.shotCard.borderEnabled} 
                  onChange={(val) => handleBooleanChange('shotCard.borderEnabled', val)}
                  label="Border"
                />
                <ColorSwatchButton 
                  path="shotCard.border" 
                  value={storyboardTheme.shotCard.border}
                  disabled={!storyboardTheme.shotCard.borderEnabled}
                />
                <BorderWidthInput 
                  value={storyboardTheme.shotCard.borderWidth}
                  onChange={(val) => handleNumberChange('shotCard.borderWidth', val)}
                  min={0}
                  max={5}
                  disabled={!storyboardTheme.shotCard.borderEnabled}
                />
              </LabeledControlGroup>
            </div>
          </div>

          {/* Shot Border */}
          <div className="flex flex-col gap-1 px-2 py-1 rounded h-full" style={getThemeSectionStyles()}>
            <Label className={themeSectionHeadClasses}>Shot Border</Label>
            <div className="flex items-end gap-2">
              <LabeledControlGroup label="Color">
                <CheckboxToggle 
                  checked={storyboardTheme.imageFrame.borderEnabled} 
                  onChange={(val) => handleBooleanChange('imageFrame.borderEnabled', val)}
                  label="Border"
                />
                <ColorSwatchButton 
                  path="imageFrame.border" 
                  value={storyboardTheme.imageFrame.border}
                  disabled={!storyboardTheme.imageFrame.borderEnabled}
                />
              </LabeledControlGroup>
              <LabeledControlGroup label="Size">
                <BorderWidthInput 
                  value={storyboardTheme.imageFrame.borderWidth}
                  onChange={(val) => handleNumberChange('imageFrame.borderWidth', val)}
                  min={0}
                  max={5}
                  disabled={!storyboardTheme.imageFrame.borderEnabled}
                />
              </LabeledControlGroup>
            </div>
          </div>

          {/* Shot Numbers */}
          <div className="flex flex-col gap-1 px-2 py-1 rounded h-full" style={getThemeSectionStyles()}>
            <Label className={themeSectionHeadClasses}>Shot Numbers</Label>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-end gap-2">
                <LabeledControlGroup label="Text">
                  <ColorSwatchButton path="shotNumber.text" value={storyboardTheme.shotNumber.text} />
                </LabeledControlGroup>
                <LabeledControlGroup label="Corners">
                  <NumberInputWithArrows 
                    value={storyboardTheme.shotNumber.borderRadius}
                    onChange={(val) => handleNumberChange('shotNumber.borderRadius', val)}
                    min={0}
                    max={20}
                  />
                </LabeledControlGroup>
              </div>
              <div className="flex items-end justify-between gap-2">
                <LabeledControlGroup label="BG">
                  <ColorSwatchButton path="shotNumber.background" value={storyboardTheme.shotNumber.background} />
                </LabeledControlGroup>
                <LabeledControlGroup label="Borders">
                  <CheckboxToggle 
                    checked={storyboardTheme.shotNumber.borderEnabled} 
                    onChange={(val) => handleBooleanChange('shotNumber.borderEnabled', val)}
                    label="Border"
                  />
                  <ColorSwatchButton 
                    path="shotNumber.border" 
                    value={storyboardTheme.shotNumber.border}
                    disabled={!storyboardTheme.shotNumber.borderEnabled}
                  />
                  <BorderWidthInput 
                    value={storyboardTheme.shotNumber.borderWidth}
                    onChange={(val) => handleNumberChange('shotNumber.borderWidth', val)}
                    min={0}
                    max={5}
                    disabled={!storyboardTheme.shotNumber.borderEnabled}
                  />
                </LabeledControlGroup>
              </div>
            </div>
          </div>

          {/* Shot Text */}
          <div className="flex flex-col gap-1 px-2 py-1 rounded h-full" style={getThemeSectionStyles()}>
            <Label className={cn("text-[10px] font-semibold uppercase mb-1", TOOLBAR_STYLES.textClasses)}>Shot Text</Label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center justify-between gap-1.5 rounded w-[122px]" style={getSubContainerStyles()}>
                <Label className={cn("text-xs font-light", TOOLBAR_STYLES.textClasses)}>Action</Label>
                <ColorSwatchButton path="actionText.text" value={storyboardTheme.actionText.text} />
                <NumberInputWithArrows
                  value={normalizeShotTextFontSize(storyboardTheme.actionText.fontSize)}
                  onChange={(val) => handleNumberChange('actionText.fontSize', val)}
                  min={SHOT_TEXT_FONT_SIZE_MIN}
                  max={SHOT_TEXT_FONT_SIZE_MAX}
                  step={SHOT_TEXT_FONT_SIZE_STEP}
                />
              </div>
              <div className="flex items-center justify-between gap-1.5 rounded w-[122px]" style={getSubContainerStyles()}>
                <Label className={cn("text-xs font-light", TOOLBAR_STYLES.textClasses)}>Script</Label>
                <ColorSwatchButton path="scriptText.text" value={storyboardTheme.scriptText.text} />
                <NumberInputWithArrows
                  value={normalizeShotTextFontSize(storyboardTheme.scriptText.fontSize)}
                  onChange={(val) => handleNumberChange('scriptText.fontSize', val)}
                  min={SHOT_TEXT_FONT_SIZE_MIN}
                  max={SHOT_TEXT_FONT_SIZE_MAX}
                  step={SHOT_TEXT_FONT_SIZE_STEP}
                />
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Color Picker Modal */}
      <Dialog open={colorPickerOpen} onOpenChange={setColorPickerOpen} modal={false}>
        <DialogContent 
          className="w-auto p-1 [&>button]:hidden"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: colorPickerPosition ? 'fixed' : undefined,
            left: colorPickerPosition ? `${colorPickerPosition.x}px` : undefined,
            top: colorPickerPosition ? `${colorPickerPosition.y}px` : undefined,
            ...getGlassmorphismStyles('dark'),
          }}
        >
          <div className="flex flex-col items-center gap-1 px-1 pb-1 pt-1">
            <div onClick={(e) => e.stopPropagation()}>
              <HexColorPicker 
                color={editingColorValue} 
                onChange={handleColorPickerChange}
              />
            </div>
            
            <div className="flex items-center gap-2" style={{ width: '200px' }}>
              <div 
                className="w-8 h-8 rounded flex-shrink-0"
                style={{ 
                  backgroundColor: editingColorValue,
                  border: `1px solid ${getColor('border', 'primary') as string}`,
                }}
              />
              <div className="flex-1">
                <Input
                  value={editingColorValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                      setEditingColorValue(val);
                      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                        handleColorChange(editingColorPath, val);
                      }
                    }
                  }}
                  className="font-mono text-xs h-7 text-white placeholder:text-white/50"
                  style={{
                    backgroundColor: getColor('input', 'background'),
                    border: `1px solid ${getColor('input', 'border')}`,
                    color: getColor('text', 'primary'),
                  }}
                  maxLength={7}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Theme Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent 
          className="max-w-sm gap-4 p-6"
          style={getGlassmorphismStyles('dark')}
        >
          <DialogHeader className="pr-8">
            <DialogTitle style={{ color: getColor('text', 'primary') as string }}>
              Save Theme
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pr-2">
            <div>
              <Label 
                className="text-sm mb-2 block"
                style={{ color: getColor('text', 'primary') as string }}
              >
                Theme Name
              </Label>
              <Input
                placeholder="My Custom Theme"
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void handleSaveNewTheme();
                  }
                }}
                style={{
                  backgroundColor: getColor('input', 'background') as string,
                  border: `1px solid ${getColor('input', 'border') as string}`,
                  color: getColor('text', 'primary') as string
                }}
              />
            </div>
            {matchingSavedTheme && (
              <p
                className="text-xs text-center"
                style={{ color: getColor('text', 'secondary') as string }}
              >
                Update will save the current project styling to "{matchingSavedTheme.name}".
              </p>
            )}
          </div>
          <DialogFooter className="flex flex-wrap gap-2 justify-center sm:justify-center w-full pr-2">
            <Button 
              onClick={() => setShowSaveDialog(false)}
              disabled={isSavingTheme}
              style={getGlassmorphismStyles('button')}
            >
              Cancel
            </Button>
            {matchingSavedTheme && (
              <Button 
                onClick={() => void handleUpdateExistingTheme()}
                disabled={isSavingTheme}
                style={getGlassmorphismStyles('button')}
              >
                Update
              </Button>
            )}
            <Button 
              onClick={() => void handleSaveNewTheme()}
              disabled={isSavingTheme}
              style={getGlassmorphismStyles('buttonAccent')}
              title={
                canSaveNewSavedTheme
                  ? undefined
                  : `Free accounts can save up to ${FREE_SAVED_THEME_LIMIT} themes`
              }
            >
              Save as New
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProjectLimitDialog
        isOpen={showGuestLimitDialog}
        onClose={() => setShowGuestLimitDialog(false)}
        onSignIn={() => {
          setShowGuestLimitDialog(false);
          openAuthModal();
        }}
        title="Save Custom Themes"
        description="Create a free account to save reusable themes and use them across projects and devices."
        featureBullets={[
          { emoji: '🎨', text: 'Save custom color and layout presets' },
          { emoji: '🔄', text: 'Reuse themes across any project' },
          { emoji: '📱', text: 'Access your themes from any device' },
        ]}
      />

      <UpgradeToProDialog
        isOpen={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
        onUpgrade={() => navigate('/billing')}
        description={`Free accounts can save up to ${FREE_SAVED_THEME_LIMIT} themes. Upgrade to Pro for unlimited saved themes.`}
      />

      {/* Rename Theme Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent
          className="max-w-sm gap-4 p-6"
          style={getGlassmorphismStyles('dark')}
        >
          <DialogHeader className="pr-8">
            <DialogTitle style={{ color: getColor('text', 'primary') as string }}>
              Rename Theme
            </DialogTitle>
          </DialogHeader>
          <div className="pr-2">
            <Label
              className="text-sm mb-2 block"
              style={{ color: getColor('text', 'primary') as string }}
            >
              Theme Name
            </Label>
            <Input
              placeholder="Theme name"
              value={renameThemeName}
              onChange={(e) => setRenameThemeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void handleRenameTheme();
                }
              }}
              style={{
                backgroundColor: getColor('input', 'background') as string,
                border: `1px solid ${getColor('input', 'border') as string}`,
                color: getColor('text', 'primary') as string
              }}
            />
          </div>
          <DialogFooter className="pr-2">
            <Button
              onClick={() => setShowRenameDialog(false)}
              disabled={isRenamingTheme}
              style={getGlassmorphismStyles('button')}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleRenameTheme()}
              disabled={isRenamingTheme}
              style={getGlassmorphismStyles('buttonAccent')}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Theme Confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent 
          className="max-w-sm"
          style={getGlassmorphismStyles('dark')}
        >
          <DialogHeader>
            <DialogTitle style={{ color: getColor('text', 'primary') as string }}>
              Delete Theme
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm" style={{ color: getColor('text', 'secondary') as string }}>
              Are you sure you want to delete this theme? This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="pr-2">
            <Button 
              onClick={() => setShowDeleteDialog(false)}
              style={getGlassmorphismStyles('button')}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteTheme}
              style={{
                backgroundColor: getColor('button', 'destructive') as string,
                color: getColor('button', 'destructiveText') as string,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = getColor('button', 'destructiveHover') as string;
                e.currentTarget.style.color = getColor('button', 'destructiveTextHover') as string;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = getColor('button', 'destructive') as string;
                e.currentTarget.style.color = getColor('button', 'destructiveText') as string;
              }}
            >
              <Trash2 size={16} className="mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

