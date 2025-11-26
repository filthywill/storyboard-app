import React, { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { useAppStore } from '@/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { StoryboardTheme, PRESET_THEMES } from '@/styles/storyboardTheme';
import { ThemeService } from '@/services/themeService';
import { toast } from 'sonner';
import { Trash2, Save, Pipette } from 'lucide-react';
import { getGlassmorphismStyles, getColor } from '@/styles/glassmorphism-styles';

interface ThemeEditorModalProps {
  open: boolean;
  onClose: () => void;
}

// No conversion needed - we store hex directly!

export const ThemeEditorModal: React.FC<ThemeEditorModalProps> = ({ open, onClose }) => {
  const { storyboardTheme, setStoryboardTheme } = useAppStore();
  const [editingTheme, setEditingTheme] = useState<StoryboardTheme>(storyboardTheme);
  const [themeName, setThemeName] = useState('');
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [editingColorPath, setEditingColorPath] = useState<string>('');
  const [editingColorValue, setEditingColorValue] = useState<string>('#ffffff');

  // Update editing theme when modal opens or current theme changes
  React.useEffect(() => {
    if (open) {
      setEditingTheme(storyboardTheme);
      setThemeName(storyboardTheme.isPreset ? '' : storyboardTheme.name);
    }
  }, [open, storyboardTheme]);

  const handleColorChange = (path: string, value: string) => {
    const keys = path.split('.');
    
    if (keys.length === 1) {
      // Top-level property (e.g., contentBackground)
      const updated = {
        ...editingTheme,
        [keys[0]]: value
      };
      setEditingTheme(updated);
      // Deep clone to ensure Zustand+immer detects the change
      setStoryboardTheme(JSON.parse(JSON.stringify(updated)));
    } else if (keys.length === 2) {
      // Nested property (e.g., header.text) - MUST deep clone the nested object!
      const updated = {
        ...editingTheme,
        [keys[0]]: {
          ...(editingTheme as any)[keys[0]],
          [keys[1]]: value
        }
      };
      setEditingTheme(updated);
      // Deep clone to ensure Zustand+immer detects the change
      setStoryboardTheme(JSON.parse(JSON.stringify(updated)));
    }
  };

  const handleNumberChange = (path: string, value: number) => {
    const keys = path.split('.');
    
    if (keys.length === 2) {
      // Nested property - MUST deep clone the nested object!
      const updated = {
        ...editingTheme,
        [keys[0]]: {
          ...(editingTheme as any)[keys[0]],
          [keys[1]]: value
        }
      };
      setEditingTheme(updated);
      // Deep clone to ensure Zustand+immer detects the change
      setStoryboardTheme(JSON.parse(JSON.stringify(updated)));
    }
  };

  const handleBooleanChange = (path: string, value: boolean) => {
    const keys = path.split('.');
    
    if (keys.length === 2) {
      // Nested property - MUST deep clone the nested object!
      const updated = {
        ...editingTheme,
        [keys[0]]: {
          ...(editingTheme as any)[keys[0]],
          [keys[1]]: value
        }
      };
      setEditingTheme(updated);
      // Deep clone to ensure Zustand+immer detects the change
      setStoryboardTheme(JSON.parse(JSON.stringify(updated)));
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!themeName.trim()) {
      toast.error('Please enter a theme name');
      return;
    }

    try {
      const themeToSave: StoryboardTheme = {
        ...editingTheme,
        id: crypto.randomUUID(),
        name: themeName,
        isPreset: false,
      };

      await ThemeService.saveTheme(themeToSave);
      toast.success(`Theme "${themeName}" saved!`);
      setThemeName('');
    } catch (error: any) {
      toast.error(`Failed to save theme: ${error.message}`);
    }
  };

  const handleDeleteTheme = async () => {
    if (editingTheme.isPreset) {
      toast.error('Cannot delete preset themes');
      return;
    }

    if (!confirm(`Delete theme "${editingTheme.name}"?`)) {
      return;
    }

    try {
      await ThemeService.deleteTheme(editingTheme.id);
      toast.success(`Theme "${editingTheme.name}" deleted`);
      
      // Switch to Light theme
      setStoryboardTheme(PRESET_THEMES.light);
      setEditingTheme(PRESET_THEMES.light);
    } catch (error: any) {
      toast.error(`Failed to delete theme: ${error.message}`);
    }
  };

  const openColorPicker = (path: string, currentValue: string) => {
    setEditingColorPath(path);
    setEditingColorValue(currentValue.startsWith('#') ? currentValue : '#000000');
    setColorPickerOpen(true);
  };

  const handleColorPickerChange = (newColor: string) => {
    setEditingColorValue(newColor);
    handleColorChange(editingColorPath, newColor);
  };

  const ColorPickerField = ({ label, path, value }: { label: string; path: string; value: string }) => {
    // Ensure value is a valid hex color
    const hexValue = value.startsWith('#') ? value : '#000000';
    const [localValue, setLocalValue] = React.useState(hexValue);

    // Sync with external changes
    React.useEffect(() => {
      setLocalValue(hexValue);
    }, [hexValue]);

    const handleInputChange = (newValue: string) => {
      setLocalValue(newValue);
      
      // Only update store if it's a valid hex color
      if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
        handleColorChange(path, newValue.toLowerCase());
      }
    };

    return (
      <div className="flex items-center gap-2">
        <Label className="text-xs font-medium w-32 flex-shrink-0">{label}</Label>
        
        {/* Color Preview Swatch - clickable to open visual picker */}
        <button
          type="button"
          className="w-full h-8 rounded border-2 cursor-pointer transition-colors"
          style={{ 
            backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(localValue) ? localValue : hexValue,
            borderColor: getColor('border', 'primary') as string
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = getColor('input', 'border') as string}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = getColor('border', 'primary') as string}
          onClick={() => openColorPicker(path, localValue)}
          title="Click to pick color"
        />
      </div>
    );
  };

  const SliderField = ({ label, path, value, min, max, unit }: { label: string; path: string; value: number; min: number; max: number; unit: string }) => {
    return (
      <div className="flex items-center gap-2">
        <Label className="text-xs font-medium w-32 flex-shrink-0">{label}</Label>
        <Slider
          value={[value]}
          onValueChange={([v]) => handleNumberChange(path, v)}
          min={min}
          max={max}
          step={1}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground w-12 text-right flex-shrink-0">{value}{unit}</span>
      </div>
    );
  };

  const ToggleField = ({ label, path, value }: { label: string; path: string; value: boolean }) => {
    return (
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-medium">{label}</Label>
        <Switch
          checked={value}
          onCheckedChange={(checked) => handleBooleanChange(path, checked)}
        />
      </div>
    );
  };

  return (
    <>
      {/* Color Picker Modal - Renders above everything */}
      <Dialog open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
        <DialogContent 
          className="max-w-sm" 
          onClick={(e) => e.stopPropagation()}
          style={getGlassmorphismStyles('dark')}
        >
          <DialogHeader>
            <DialogTitle style={{ color: getColor('text', 'primary') as string }}>
              Pick a Color
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-4 py-4">
            {/* React-colorful picker - smooth and reliable! */}
            <div onClick={(e) => e.stopPropagation()}>
              <HexColorPicker 
                color={editingColorValue} 
                onChange={handleColorPickerChange}
              />
            </div>
            
            {/* Current color display */}
            <div className="flex items-center gap-3 w-full">
              <div 
                className="w-16 h-16 rounded-lg border-2 flex-shrink-0"
                style={{ 
                  backgroundColor: editingColorValue,
                  borderColor: getColor('border', 'primary') as string
                }}
              />
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">Hex Color</Label>
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
                  className="font-mono text-sm"
                  maxLength={7}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setColorPickerOpen(false)} 
              size="sm"
              style={getGlassmorphismStyles('buttonAccent')}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Theme Editor Modal */}
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-2xl max-h-[85vh] overflow-y-auto"
          style={getGlassmorphismStyles('dark')}
        >
        <DialogHeader>
          <DialogTitle style={{ color: getColor('text', 'primary') as string }}>
            Customize Theme
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-3">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Background Color */}
            <ColorPickerField label="Background" path="contentBackground" value={editingTheme.contentBackground} />
            
            {/* Header Text Color */}
            <ColorPickerField label="Header Text" path="header.text" value={editingTheme.header.text} />

            {/* Shot Card Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Shot Cards</h3>
              
              <div className="space-y-2">
                <ToggleField label="Background" path="shotCard.backgroundEnabled" value={editingTheme.shotCard.backgroundEnabled} />
                {editingTheme.shotCard.backgroundEnabled && (
                  <ColorPickerField label="Color" path="shotCard.background" value={editingTheme.shotCard.background} />
                )}
              </div>

              <div className="space-y-2">
                <ToggleField label="Border" path="shotCard.borderEnabled" value={editingTheme.shotCard.borderEnabled} />
                {editingTheme.shotCard.borderEnabled && (
                  <>
                    <ColorPickerField label="Color" path="shotCard.border" value={editingTheme.shotCard.border} />
                    <SliderField label="Width" path="shotCard.borderWidth" value={editingTheme.shotCard.borderWidth} min={0} max={5} unit="px" />
                  </>
                )}
              </div>

              <SliderField label="Corner Radius" path="shotCard.borderRadius" value={editingTheme.shotCard.borderRadius} min={0} max={20} unit="px" />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Shot Number Label Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Shot Label</h3>
              <ColorPickerField label="Number Text" path="shotNumber.text" value={editingTheme.shotNumber.text} />
              <ColorPickerField label="Background" path="shotNumber.background" value={editingTheme.shotNumber.background} />
              
              <div className="space-y-2">
                <ToggleField label="Border" path="shotNumber.borderEnabled" value={editingTheme.shotNumber.borderEnabled} />
                {editingTheme.shotNumber.borderEnabled && (
                  <>
                    <ColorPickerField label="Color" path="shotNumber.border" value={editingTheme.shotNumber.border} />
                    <SliderField label="Width" path="shotNumber.borderWidth" value={editingTheme.shotNumber.borderWidth} min={0} max={5} unit="px" />
                  </>
                )}
              </div>

              <SliderField label="Corner Radius" path="shotNumber.borderRadius" value={editingTheme.shotNumber.borderRadius} min={0} max={20} unit="px" />
            </div>

            {/* Text Color Fields */}
            <div className="space-y-2">
              <ColorPickerField label="Action Text" path="actionText.text" value={editingTheme.actionText.text} />
              <ColorPickerField label="Script Text" path="scriptText.text" value={editingTheme.scriptText.text} />
            </div>

            {/* Save as Template Section */}
            <div className="space-y-2 mt-6">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Save Theme</h3>
              <Input
                placeholder="Theme name..."
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                className="h-8 text-sm"
              />
              <Button
                onClick={handleSaveAsTemplate}
                className="w-full h-8 text-xs"
                variant="outline"
                size="sm"
              >
                <Save size={14} className="mr-1" />
                Save as Template
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div>
            {!editingTheme.isPreset && (
              <Button
                onClick={handleDeleteTheme}
                size="sm"
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
                Delete Theme
              </Button>
            )}
          </div>
          <Button 
            onClick={onClose}
            style={getGlassmorphismStyles('buttonAccent')}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

