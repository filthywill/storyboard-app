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
import { Plus, X, Trash2, ChevronUp, ChevronDown, FileText, Type, Save, Spline, Square, PaintBucket } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { getToolbarContainerStyles, getThemeSectionStyles, TOOLBAR_STYLES } from '@/styles/toolbar-styles';
import { getColor, getGlassmorphismStyles } from '@/styles/glassmorphism-styles';
import { PRESET_THEMES, getThemeById, StoryboardTheme } from '@/styles/storyboardTheme';
import { ThemeService } from '@/services/themeService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const ThemeToolbar: React.FC = () => {
  const { storyboardTheme, setStoryboardTheme } = useAppStore();
  const [userThemes, setUserThemes] = useState(ThemeService.getCachedUserThemes());
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState<string | null>(null);
  const [themeName, setThemeName] = useState('');

  // Color picker state
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [editingColorPath, setEditingColorPath] = useState('');
  const [editingColorValue, setEditingColorValue] = useState('#ffffff');
  const [colorPickerPosition, setColorPickerPosition] = useState<{ x: number; y: number } | null>(null);

  // Reload user themes
  useEffect(() => {
    const loadThemes = async () => {
      await ThemeService.loadUserThemesIntoMemory();
      setUserThemes(ThemeService.getCachedUserThemes());
    };
    loadThemes();
  }, [showSaveDialog]); // Reload when save dialog closes

  const handleThemeChange = (themeId: string) => {
    const presetTheme = getThemeById(themeId);
    if (presetTheme) {
      setStoryboardTheme(presetTheme);
      return;
    }

    const userTheme = userThemes.find(t => t.id === themeId);
    if (userTheme) {
      setStoryboardTheme(userTheme);
    }
  };

  const handleSaveTheme = async () => {
    if (!themeName.trim()) {
      toast.error('Please enter a theme name');
      return;
    }

    try {
      const themeToSave: StoryboardTheme = {
        ...storyboardTheme,
        id: crypto.randomUUID(),
        name: themeName.trim(),
        isPreset: false,
      };

      await ThemeService.saveTheme(themeToSave);
      setStoryboardTheme(themeToSave);
      toast.success(`Theme "${themeName}" saved!`);
      setThemeName('');
      setShowSaveDialog(false);
    } catch (error) {
      toast.error('Failed to save theme');
      console.error('Error saving theme:', error);
    }
  };

  const handleDeleteTheme = async () => {
    if (!themeToDelete) return;

    try {
      await ThemeService.deleteTheme(themeToDelete);
      
      // If deleting current theme, switch to Light
      if (storyboardTheme.id === themeToDelete) {
        setStoryboardTheme(PRESET_THEMES.light);
      }
      
      toast.success('Theme deleted');
      setShowDeleteDialog(false);
      setThemeToDelete(null);
      
      // Reload themes
      await ThemeService.loadUserThemesIntoMemory();
      setUserThemes(ThemeService.getCachedUserThemes());
    } catch (error) {
      toast.error('Failed to delete theme');
      console.error('Error deleting theme:', error);
    }
  };

  const confirmDeleteTheme = (themeId: string) => {
    setThemeToDelete(themeId);
    setShowDeleteDialog(true);
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

  // Radial on/off button (radio button style toggle)
  const RadialToggle = ({ checked, onChange, disabled = false }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) => (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        "h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all",
        disabled 
          ? "opacity-40 cursor-not-allowed" 
          : checked
            ? "cursor-pointer"
            : "bg-transparent cursor-pointer"
      )}
      style={{
        borderColor: disabled 
          ? getColor('text', 'muted') as string
          : checked
            ? getColor('text', 'primary') as string
            : 'rgba(255, 255, 255, 0.6)',
        backgroundColor: checked ? getColor('text', 'primary') as string : 'transparent'
      }}
      title={checked ? "Enabled" : "Disabled"}
      onMouseEnter={(e) => {
        if (!disabled && !checked) {
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.8)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !checked) {
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
        }
      }}
    >
      {checked && (
        <div 
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: getColor('background', 'secondary') as string }}
        />
      )}
    </button>
  );

  // Icon button toggle (icon serves as the on/off button)
  const IconToggle = ({ 
    checked, 
    onChange, 
    disabled = false, 
    icon: Icon,
    label 
  }: { 
    checked: boolean; 
    onChange: (value: boolean) => void; 
    disabled?: boolean; 
    icon: React.ElementType;
    label: string;
  }) => {
    const getBackgroundColor = () => {
      if (disabled) return undefined;
      if (checked) return getColor('button', 'toggleActive');
      return getColor('button', 'toggleInactive');
    };

    const getHoverClass = () => {
      if (disabled) return '';
      if (checked) return `hover:bg-[${getColor('button', 'toggleActiveHover')}]`;
      return `hover:bg-[${getColor('button', 'toggleInactiveHover')}]`;
    };

    return (
      <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          "h-6 w-6 rounded flex items-center justify-center transition-all shadow-sm",
          disabled && "opacity-40 cursor-not-allowed",
          !disabled && "cursor-pointer"
        )}
        style={!disabled ? { backgroundColor: getBackgroundColor() } : undefined}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.backgroundColor = checked 
              ? getColor('button', 'toggleActiveHover')
              : getColor('button', 'toggleInactiveHover');
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.backgroundColor = getBackgroundColor() || '';
          }
        }}
        title={`${label}: ${checked ? "Enabled" : "Disabled"}`}
      >
        <Icon 
          size={14} 
          className={cn(
            TOOLBAR_STYLES.textClasses,
            checked ? "opacity-100" : "opacity-60"
          )} 
        />
      </button>
    );
  };

  // Sub-container styling for grouping related controls
  // Centralized style - adjust in COLOR_PALETTE.background.themeSubContainer
  const getSubContainerStyles = () => ({
    backgroundColor: getColor('background', 'themeSubContainer'),
    borderRadius: '4px',
    padding: '4px 6px',
  });

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
                : "cursor-pointer hover:bg-white/10"
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
                : "cursor-pointer hover:bg-white/10"
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
  const NumberInputWithArrows = ({ value, onChange, min, max, disabled = false }: { value: number; onChange: (value: number) => void; min: number; max: number; disabled?: boolean }) => {
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
                : "cursor-pointer hover:bg-white/10"
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
                : "cursor-pointer hover:bg-white/10"
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
              <SelectItem value="preset-light">Light</SelectItem>
              <SelectItem value="preset-dark">Dark</SelectItem>
              
              {userThemes.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1" style={{ borderTop: `1px solid ${getColor('border', 'primary') as string}` }}>
                    Custom Themes
                  </div>
                  {userThemes.map(theme => (
                    <div key={theme.id} className="flex items-center justify-between group px-2 hover:bg-accent">
                      <SelectItem value={theme.id} className="flex-1">
                        {theme.name}
                      </SelectItem>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDeleteTheme(theme.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
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
              onClick={() => setShowSaveDialog(true)}
              title="Save current settings as theme"
            >
              <Save size={16} className={TOOLBAR_STYLES.iconClasses} />
            </Button>
          </div>
        </div>

        {/* Right: Inline Settings */}
        <div className="flex items-stretch gap-2">
          {/* Page Style */}
          <div className="flex flex-col gap-1 px-2 py-1 rounded h-full" style={getThemeSectionStyles()}>
            <Label className={cn("text-[10px] font-semibold uppercase mb-1", TOOLBAR_STYLES.textClasses)}>Page Style</Label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded" style={getSubContainerStyles()}>
                <span title="Background">
                  <PaintBucket size={14} className={cn(TOOLBAR_STYLES.textClasses)} style={{ opacity: TOOLBAR_STYLES.iconOpacity }} />
                </span>
                <ColorSwatchButton path="contentBackground" value={storyboardTheme.contentBackground} />
              </div>
              <div className="flex items-center gap-1.5 rounded" style={getSubContainerStyles()}>
                <span title="Header">
                  <Type size={14} className={cn(TOOLBAR_STYLES.textClasses)} style={{ opacity: TOOLBAR_STYLES.iconOpacity }} />
                </span>
                <ColorSwatchButton path="header.text" value={storyboardTheme.header.text} />
              </div>
            </div>
          </div>

          {/* Shot Card */}
          <div className="flex flex-col gap-1 px-2 py-1 rounded h-full" style={getThemeSectionStyles()}>
            <Label className={cn("text-[10px] font-semibold uppercase mb-1", TOOLBAR_STYLES.textClasses)}>Shot Card</Label>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 rounded" style={getSubContainerStyles()}>
                  <IconToggle 
                    checked={storyboardTheme.shotCard.backgroundEnabled} 
                    onChange={(val) => handleBooleanChange('shotCard.backgroundEnabled', val)}
                    icon={PaintBucket}
                    label="Background"
                  />
                  <ColorSwatchButton 
                    path="shotCard.background" 
                    value={storyboardTheme.shotCard.background}
                    disabled={!storyboardTheme.shotCard.backgroundEnabled}
                  />
                </div>
                <div className="flex items-center gap-1.5 rounded" style={getSubContainerStyles()}>
                  <span title="Radius">
                    <Spline size={14} className={cn(TOOLBAR_STYLES.textClasses)} style={{ opacity: TOOLBAR_STYLES.iconOpacity }} />
                  </span>
                  <NumberInputWithArrows 
                    value={storyboardTheme.shotCard.borderRadius}
                    onChange={(val) => handleNumberChange('shotCard.borderRadius', val)}
                    min={0}
                    max={20}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 rounded" style={getSubContainerStyles()}>
                  <IconToggle 
                    checked={storyboardTheme.shotCard.borderEnabled} 
                    onChange={(val) => handleBooleanChange('shotCard.borderEnabled', val)}
                    icon={Square}
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
                </div>
              </div>
            </div>
          </div>

          {/* Image Frame */}
          <div className="flex flex-col gap-1 px-2 py-1 rounded h-full" style={getThemeSectionStyles()}>
            <Label className={cn("text-[10px] font-semibold uppercase mb-1", TOOLBAR_STYLES.textClasses)}>Image Frame</Label>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 rounded" style={getSubContainerStyles()}>
                  <IconToggle 
                    checked={storyboardTheme.imageFrame.borderEnabled} 
                    onChange={(val) => handleBooleanChange('imageFrame.borderEnabled', val)}
                    icon={Square}
                    label="Border"
                  />
                  <ColorSwatchButton 
                    path="imageFrame.border" 
                    value={storyboardTheme.imageFrame.border}
                    disabled={!storyboardTheme.imageFrame.borderEnabled}
                  />
                  <BorderWidthInput 
                    value={storyboardTheme.imageFrame.borderWidth}
                    onChange={(val) => handleNumberChange('imageFrame.borderWidth', val)}
                    min={0}
                    max={5}
                    disabled={!storyboardTheme.imageFrame.borderEnabled}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Label Style */}
          <div className="flex flex-col gap-1 px-2 py-1 rounded h-full" style={getThemeSectionStyles()}>
            <Label className={cn("text-[10px] font-semibold uppercase mb-1", TOOLBAR_STYLES.textClasses)}>Label Style</Label>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded" style={getSubContainerStyles()}>
                  <div className="w-6 h-6 flex items-center justify-center" title="Text">
                    <Type size={14} className={cn(TOOLBAR_STYLES.textClasses)} style={{ opacity: TOOLBAR_STYLES.iconOpacity }} />
                  </div>
                  <ColorSwatchButton path="shotNumber.text" value={storyboardTheme.shotNumber.text} />
                </div>
                <div className="flex items-center gap-1.5 rounded" style={getSubContainerStyles()}>
                  <div className="w-6 h-6 flex items-center justify-center" title="Radius">
                    <Spline size={14} className={cn(TOOLBAR_STYLES.textClasses)} style={{ opacity: TOOLBAR_STYLES.iconOpacity }} />
                  </div>
                  <NumberInputWithArrows 
                    value={storyboardTheme.shotNumber.borderRadius}
                    onChange={(val) => handleNumberChange('shotNumber.borderRadius', val)}
                    min={0}
                    max={20}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 rounded" style={getSubContainerStyles()}>
                  <div className="w-6 h-6 flex items-center justify-center" title="Background">
                    <PaintBucket size={14} className={cn(TOOLBAR_STYLES.textClasses)} style={{ opacity: TOOLBAR_STYLES.iconOpacity }} />
                  </div>
                  <ColorSwatchButton path="shotNumber.background" value={storyboardTheme.shotNumber.background} />
                </div>
                <div className="flex items-center gap-1.5 rounded" style={getSubContainerStyles()}>
                  <IconToggle 
                    checked={storyboardTheme.shotNumber.borderEnabled} 
                    onChange={(val) => handleBooleanChange('shotNumber.borderEnabled', val)}
                    icon={Square}
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
                </div>
              </div>
            </div>
          </div>

          {/* Shot Text */}
          <div className="flex flex-col gap-1 px-2 py-1 rounded h-full" style={getThemeSectionStyles()}>
            <Label className={cn("text-[10px] font-semibold uppercase mb-1", TOOLBAR_STYLES.textClasses)}>Shot Text</Label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center justify-between gap-1.5 rounded w-[80px]" style={getSubContainerStyles()}>
                <Label className={cn("text-xs font-light", TOOLBAR_STYLES.textClasses)}>Action</Label>
                <ColorSwatchButton path="actionText.text" value={storyboardTheme.actionText.text} />
              </div>
              <div className="flex items-center justify-between gap-1.5 rounded w-[80px]" style={getSubContainerStyles()}>
                <Label className={cn("text-xs font-light", TOOLBAR_STYLES.textClasses)}>Script</Label>
                <ColorSwatchButton path="scriptText.text" value={storyboardTheme.scriptText.text} />
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
          className="max-w-sm"
          style={getGlassmorphismStyles('dark')}
        >
          <DialogHeader>
            <DialogTitle style={{ color: getColor('text', 'primary') as string }}>
              Save Theme
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
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
                if (e.key === 'Enter') handleSaveTheme();
              }}
              style={{
                backgroundColor: getColor('input', 'background') as string,
                border: `1px solid ${getColor('input', 'border') as string}`,
                color: getColor('text', 'primary') as string
              }}
            />
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setShowSaveDialog(false)}
              style={getGlassmorphismStyles('button')}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveTheme}
              style={getGlassmorphismStyles('buttonAccent')}
            >
              Save
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
          <DialogFooter>
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

