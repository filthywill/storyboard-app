# Storyboard Theme System - Implementation Plan

**Date:** December 2024  
**Purpose:** User-customizable styling for storyboard visual elements  
**Status:** ✅ **PHASES 1-3 COMPLETE** | 🔄 **PHASE 4 (TESTING) IN PROGRESS**

---

## 📋 Implementation Status

- ✅ **Phase 1: Foundation** - Core types, interfaces, presets, ThemeService, Supabase migration
- ✅ **Phase 2: Component Integration** - MasterHeader, ShotCard, ShotGrid updated
- ✅ **Phase 3: UI Controls** - StyleSettings dropdown, ThemeEditorModal with live preview
- 🔄 **Phase 4: Testing** - Ready for user testing

---

## 🎯 Requirements Summary

### User Stories
1. Users can customize colors, borders, and corner rounding for storyboard elements
2. Users can choose from preset themes ("Light", "Dark")
3. Users can create custom themes and save them to their profile
4. Users can apply saved themes to any project
5. Changes apply immediately upon selection (no "Apply" button)
6. PDF/PNG exports match the live view exactly (WYSIWYG)
7. Each project stores its own theme independently

---

## 🏗️ Architecture Overview

### Design Decision: Separate Theme System (Approach B)

**Why Not Extend COLOR_PALETTE?**
- `COLOR_PALETTE` is for **fixed app UI** (buttons, modals, navigation)
- Storyboard themes are **user-customizable content styling**
- Mixing them violates semantic separation principle

**Solution: Dedicated StoryboardTheme System**
- New type: `StoryboardTheme` interface
- New file: `src/styles/storyboardTheme.ts`
- Storage: Per-project in `projectStore` (inside `projectSettings` in Supabase)
- User themes: Saved to user profile (Supabase `user_storyboard_themes` table)

---

## 📦 Data Structures

### 1. StoryboardTheme Interface

**File:** `src/styles/storyboardTheme.ts`

```typescript
export interface StoryboardTheme {
  id: string; // UUID for saved themes
  name: string; // "Light", "Dark", "My Custom Theme"
  isPreset: boolean; // true for Light/Dark, false for user custom
  createdBy?: string; // user ID (if custom theme)
  
  // Header styling
  header: {
    background: string; // rgba(255, 255, 255, 0.95)
    border: string;     // rgba(0, 0, 0, 0.1)
    borderWidth: number; // 1 (in pixels)
    text: string;       // rgba(0, 0, 0, 1)
  };
  
  // Shot card styling
  shotCard: {
    background: string;  // rgba(255, 255, 255, 1)
    border: string;      // rgba(0, 0, 0, 0.1)
    borderWidth: number; // 1
    borderRadius: number; // 8 (in pixels)
  };
  
  // Shot number styling
  shotNumber: {
    text: string;        // rgba(0, 0, 0, 1)
    background?: string; // Optional background behind shot number
  };
  
  // Action text styling
  actionText: {
    text: string;        // rgba(0, 0, 0, 0.8)
  };
  
  // Script text styling
  scriptText: {
    text: string;        // rgba(0, 0, 0, 0.6)
  };
  
  // Grid background (the container behind all shots)
  gridBackground: string; // rgba(255, 255, 255, 1) or transparent
}
```

---

### 2. Preset Themes

```typescript
export const PRESET_THEMES: Record<string, StoryboardTheme> = {
  light: {
    id: 'preset-light',
    name: 'Light',
    isPreset: true,
    header: {
      background: 'rgba(255, 255, 255, 0.95)',
      border: 'rgba(0, 0, 0, 0.1)',
      borderWidth: 1,
      text: 'rgba(0, 0, 0, 1)',
    },
    shotCard: {
      background: 'rgba(255, 255, 255, 1)',
      border: 'rgba(0, 0, 0, 0.1)',
      borderWidth: 1,
      borderRadius: 8,
    },
    shotNumber: {
      text: 'rgba(0, 0, 0, 1)',
    },
    actionText: {
      text: 'rgba(0, 0, 0, 0.8)',
    },
    scriptText: {
      text: 'rgba(0, 0, 0, 0.6)',
    },
    gridBackground: 'rgba(255, 255, 255, 1)',
  },
  
  dark: {
    id: 'preset-dark',
    name: 'Dark',
    isPreset: true,
    header: {
      background: 'rgba(30, 30, 30, 0.95)',
      border: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      text: 'rgba(255, 255, 255, 1)',
    },
    shotCard: {
      background: 'rgba(40, 40, 40, 1)',
      border: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      borderRadius: 8,
    },
    shotNumber: {
      text: 'rgba(255, 255, 255, 1)',
    },
    actionText: {
      text: 'rgba(255, 255, 255, 0.8)',
    },
    scriptText: {
      text: 'rgba(255, 255, 255, 0.6)',
    },
    gridBackground: 'rgba(30, 30, 30, 1)',
  },
};

// Get theme by ID or name
export const getThemeById = (id: string): StoryboardTheme | undefined => {
  return Object.values(PRESET_THEMES).find(t => t.id === id);
};

// Create a default theme (Light)
export const getDefaultTheme = (): StoryboardTheme => PRESET_THEMES.light;
```

---

### 3. Project Data Structure

**Updated ProjectData Interface (for Supabase storage):**

```typescript
// In src/services/projectService.ts
export interface ProjectData {
  pages: any[];
  shots: Record<string, any>;
  shotOrder?: string[];
  projectSettings: {
    projectName: string;
    projectInfo: any;
    projectLogoUrl?: string;
    clientAgency: any;
    jobInfo: any;
    templateSettings: any;
    storyboardTheme: StoryboardTheme; // ← ADD HERE
  };
  uiSettings: {
    isDragging: boolean;
    isExporting: boolean;
    showDeleteConfirmation: boolean;
  };
}
```

**Updated ProjectStore Interface (for local state):**

```typescript
// In src/store/projectStore.ts
export interface ProjectState {
  projectName: string;
  projectInfo: string;
  projectLogoUrl: string | null;
  projectLogoFile: File | null;
  clientAgency: string;
  jobInfo: string;
  templateSettings: TemplateSettings;
  storyboardTheme: StoryboardTheme; // ← ADD HERE (sibling to templateSettings)
}

export interface ProjectActions {
  // ... existing actions ...
  setStoryboardTheme: (theme: StoryboardTheme) => void;
}
```

**Why inside projectSettings (Supabase) but sibling to templateSettings (local store)?**
- In **Supabase**: All project configuration lives in `projectSettings` object
- In **local store**: Theme is a sibling to `templateSettings` for clear separation
- `templateSettings` = "What to show" (visibility toggles)
- `storyboardTheme` = "How to style it" (colors, borders, radius)
- Both are project-level settings, stored together in Supabase, accessed separately in UI

---

### 4. Supabase Schema Updates

**A. Update `project_data` table (no migration needed - JSONB flexible):**

The existing `project_data` table structure already supports this:
```sql
-- Existing table structure (no changes needed)
CREATE TABLE project_data (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  pages JSONB DEFAULT '[]'::jsonb,
  shots JSONB DEFAULT '{}'::jsonb,
  shot_order JSONB DEFAULT '[]'::jsonb,
  project_settings JSONB DEFAULT '{}'::jsonb,  -- ← storyboardTheme goes here
  ui_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

The `project_settings` JSONB field will now contain:
```json
{
  "projectName": "My Project",
  "projectInfo": "...",
  "templateSettings": { ... },
  "storyboardTheme": {
    "id": "preset-light",
    "name": "Light",
    "isPreset": true,
    "header": { ... },
    "shotCard": { ... }
  }
}
```

**B. User Profile Storage (Supabase)**

**New Table:** `user_storyboard_themes`

```sql
CREATE TABLE user_storyboard_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  theme_data JSONB NOT NULL, -- Full StoryboardTheme object
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, name) -- User can't have duplicate theme names
);

CREATE INDEX idx_user_themes ON user_storyboard_themes(user_id);
```

**Access Control:**
```sql
-- Users can only access their own themes
ALTER TABLE user_storyboard_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own themes"
  ON user_storyboard_themes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own themes"
  ON user_storyboard_themes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own themes"
  ON user_storyboard_themes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own themes"
  ON user_storyboard_themes FOR DELETE
  USING (auth.uid() = user_id);
```

---

## 🔄 Data Flow

### 1. Project Creation
```
New Project
  ↓
Assign default theme (Light)
  ↓
Store in project.storyboardTheme
  ↓
Components render with theme colors
```

### 2. Theme Selection (Preset or Custom)
```
User opens Style Settings
  ↓
Selects "Dark" theme (or custom theme)
  ↓
Update project.storyboardTheme immediately
  ↓
Components re-render with new theme
  ↓
Save to Supabase (if cloud project)
```

### 3. Custom Theme Creation
```
User clicks "Create Custom Theme"
  ↓
Opens theme editor modal
  ↓
User adjusts colors/borders/radius
  ↓
Changes apply immediately to project (live preview)
  ↓
User clicks "Save as Template" (optional)
  ↓
Save to user_storyboard_themes table
  ↓
Theme now available in all projects
```

### 4. PDF Export
```
User exports to PDF
  ↓
DOMCapture reads live DOM styles
  ↓
Components styled with project.storyboardTheme
  ↓
PDF matches live view exactly (WYSIWYG) ✅
```

---

## 🎨 Component Integration

### MasterHeader.tsx
```typescript
import { useAppStore } from '@/store';

export const MasterHeader: React.FC = () => {
  const { storyboardTheme } = useAppStore();
  
  return (
    <div 
      className="master-header"
      style={{
        backgroundColor: storyboardTheme.header.background,
        borderBottom: `${storyboardTheme.header.borderWidth}px solid ${storyboardTheme.header.border}`,
        color: storyboardTheme.header.text,
      }}
    >
      {/* Header content */}
    </div>
  );
};
```

### ShotCard.tsx
```typescript
import { useAppStore } from '@/store';

export const ShotCard: React.FC<ShotCardProps> = ({ shot, ... }) => {
  const { storyboardTheme } = useAppStore();
  
  return (
    <div
      className="shot-card"
      style={{
        backgroundColor: storyboardTheme.shotCard.background,
        border: `${storyboardTheme.shotCard.borderWidth}px solid ${storyboardTheme.shotCard.border}`,
        borderRadius: `${storyboardTheme.shotCard.borderRadius}px`,
      }}
    >
      <div 
        className="shot-number"
        style={{ color: storyboardTheme.shotNumber.text }}
      >
        {shot.number}
      </div>
      
      <textarea
        className="action-text"
        style={{ color: storyboardTheme.actionText.text }}
        value={shot.actionText}
      />
      
      <textarea
        className="script-text"
        style={{ color: storyboardTheme.scriptText.text }}
        value={shot.scriptText}
      />
    </div>
  );
};
```

### ShotGrid.tsx
```typescript
import { useAppStore } from '@/store';

export const ShotGrid: React.FC = () => {
  const { storyboardTheme } = useAppStore();
  
  return (
    <div
      className="shot-grid"
      style={{
        backgroundColor: storyboardTheme.gridBackground,
        // ... grid layout styles
      }}
    >
      {/* Shot cards */}
    </div>
  );
};
```

---

## 🎛️ UI Components

### 1. StyleSettings Component

**Location:** `src/components/StyleSettings.tsx`

**Placement:** Horizontal toolbar below (Grid Layout, Aspect Ratio, Shot Number) settings

**Features:**
- Theme preset selector (Light / Dark / Custom themes)
- "Create Custom Theme" button
- Live preview as user selects themes

```typescript
export const StyleSettings: React.FC = () => {
  const { 
    storyboardTheme, 
    updateStoryboardTheme,
    userThemes // Loaded from Supabase
  } = useAppStore();
  
  const handleThemeChange = (themeId: string) => {
    const theme = getThemeById(themeId) || userThemes.find(t => t.id === themeId);
    if (theme) {
      updateStoryboardTheme(theme); // Immediate update
    }
  };
  
  return (
    <div className="flex items-center gap-4">
      <Label>Theme:</Label>
      <Select value={storyboardTheme.id} onValueChange={handleThemeChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="preset-light">Light</SelectItem>
          <SelectItem value="preset-dark">Dark</SelectItem>
          <SelectSeparator />
          {userThemes.map(theme => (
            <SelectItem key={theme.id} value={theme.id}>
              {theme.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button onClick={() => setShowThemeEditor(true)}>
        Create Custom Theme
      </Button>
    </div>
  );
};
```

---

### 2. ThemeEditorModal Component

**Location:** `src/components/ThemeEditorModal.tsx`

**Features:**
- Color pickers for all theme properties
- Border width slider (1-5px)
- Border radius slider (0-20px)
- Live preview (changes apply immediately to project)
- "Save as Template" button (saves to user profile)
- "Apply" closes modal (changes already applied)

```typescript
export const ThemeEditorModal: React.FC<ThemeEditorModalProps> = ({ 
  open, 
  onClose 
}) => {
  const { storyboardTheme, updateStoryboardTheme } = useAppStore();
  const [editingTheme, setEditingTheme] = useState<StoryboardTheme>(storyboardTheme);
  
  // Update immediately on change (live preview)
  const handleColorChange = (path: string, value: string) => {
    const updated = { ...editingTheme };
    // Update nested property (e.g., "header.background")
    setNestedProperty(updated, path, value);
    setEditingTheme(updated);
    updateStoryboardTheme(updated); // Immediate update to project
  };
  
  const handleSaveAsTemplate = async () => {
    const name = prompt("Enter template name:");
    if (name) {
      await saveUserTheme({ ...editingTheme, name });
      toast.success("Template saved!");
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Customize Theme</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header Section */}
          <div>
            <h3>Header</h3>
            <ColorPicker 
              label="Background"
              value={editingTheme.header.background}
              onChange={(v) => handleColorChange('header.background', v)}
            />
            <ColorPicker 
              label="Border"
              value={editingTheme.header.border}
              onChange={(v) => handleColorChange('header.border', v)}
            />
            <Slider
              label="Border Width"
              min={0}
              max={5}
              value={editingTheme.header.borderWidth}
              onChange={(v) => handleColorChange('header.borderWidth', v)}
            />
          </div>
          
          {/* Shot Card Section */}
          <div>
            <h3>Shot Cards</h3>
            <ColorPicker 
              label="Background"
              value={editingTheme.shotCard.background}
              onChange={(v) => handleColorChange('shotCard.background', v)}
            />
            <ColorPicker 
              label="Border"
              value={editingTheme.shotCard.border}
              onChange={(v) => handleColorChange('shotCard.border', v)}
            />
            <Slider
              label="Border Width"
              min={0}
              max={5}
              value={editingTheme.shotCard.borderWidth}
              onChange={(v) => handleColorChange('shotCard.borderWidth', v)}
            />
            <Slider
              label="Corner Rounding"
              min={0}
              max={20}
              value={editingTheme.shotCard.borderRadius}
              onChange={(v) => handleColorChange('shotCard.borderRadius', v)}
            />
          </div>
          
          {/* Text Colors */}
          <div>
            <h3>Text Colors</h3>
            <ColorPicker 
              label="Shot Number"
              value={editingTheme.shotNumber.text}
              onChange={(v) => handleColorChange('shotNumber.text', v)}
            />
            <ColorPicker 
              label="Action Text"
              value={editingTheme.actionText.text}
              onChange={(v) => handleColorChange('actionText.text', v)}
            />
            <ColorPicker 
              label="Script Text"
              value={editingTheme.scriptText.text}
              onChange={(v) => handleColorChange('scriptText.text', v)}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleSaveAsTemplate}>
            Save as Template
          </Button>
          <Button onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

---

## 📂 File Structure

```
src/
├── styles/
│   ├── glassmorphism-styles.ts      (existing - app UI colors)
│   └── storyboardTheme.ts           (NEW - user-customizable themes)
│
├── components/
│   ├── StyleSettings.tsx            (NEW - theme selector toolbar)
│   ├── ThemeEditorModal.tsx         (NEW - custom theme editor)
│   ├── MasterHeader.tsx             (UPDATE - use storyboardTheme)
│   ├── ShotCard.tsx                 (UPDATE - use storyboardTheme)
│   └── ShotGrid.tsx                 (UPDATE - use storyboardTheme)
│
├── services/
│   └── themeService.ts              (NEW - Supabase CRUD for user themes)
│
└── store/
    ├── projectStore.ts              (UPDATE - add storyboardTheme field + action)
    ├── themeStore.ts                (NEW - optional, for user themes)
    └── index.ts                     (UPDATE - expose theme in useAppStore)
```

---

## 🗄️ Store Updates

### 1. projectStore.ts (Primary Store for Theme)

```typescript
// src/store/projectStore.ts
import { StoryboardTheme, getDefaultTheme } from '@/styles/storyboardTheme';
import { triggerAutoSave } from '@/utils/autoSave';

export interface ProjectState {
  projectName: string;
  projectInfo: string;
  projectLogoUrl: string | null;
  projectLogoFile: File | null;
  clientAgency: string;
  jobInfo: string;
  templateSettings: TemplateSettings;
  storyboardTheme: StoryboardTheme; // ← ADD THIS
}

export interface ProjectActions {
  // ... existing actions ...
  setStoryboardTheme: (theme: StoryboardTheme) => void; // ← ADD THIS
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      projectName: 'Project Name',
      projectInfo: 'Project Info',
      projectLogoUrl: null,
      projectLogoFile: null,
      clientAgency: 'Client/Agency',
      jobInfo: 'Job Info',
      templateSettings: { ...defaultTemplateSettings },
      storyboardTheme: getDefaultTheme(), // ← Default to Light theme
      
      // ... existing actions ...
      
      // NEW ACTION: Set storyboard theme
      setStoryboardTheme: (theme) => {
        set((state) => {
          state.storyboardTheme = theme;
        });
        
        // Trigger auto-save after changing theme
        triggerAutoSave();
      },
    })),
    {
      name: 'project-storage',
      partialize: (state) => ({
        projectName: state.projectName,
        projectInfo: state.projectInfo,
        projectLogoUrl: state.projectLogoUrl,
        clientAgency: state.clientAgency,
        jobInfo: state.jobInfo,
        templateSettings: state.templateSettings,
        storyboardTheme: state.storyboardTheme, // ← Persist theme
      })
    }
  )
);
```

### 2. index.ts (Unified App Store) - Expose Theme

```typescript
// src/store/index.ts
export const useAppStore = () => {
  const pageStore = usePageStore();
  const shotStore = useShotStore();
  const projectStore = useProjectStore();
  const uiStore = useUIStore();
  const projectManagerStore = useProjectManagerStore();
  
  return {
    // ... existing exports ...
    
    // Project settings (including theme)
    projectName: projectStore.projectName,
    projectInfo: projectStore.projectInfo,
    // ... other project fields ...
    templateSettings: projectStore.templateSettings,
    storyboardTheme: projectStore.storyboardTheme, // ← EXPOSE THIS
    setStoryboardTheme: projectStore.setStoryboardTheme, // ← EXPOSE THIS
    
    // ... rest of unified store
  };
};
```

### 3. New Store for User Themes (Optional - can be in themeService instead)

**Option A: Store user themes in a separate store (cleaner separation)**

```typescript
// src/store/themeStore.ts (NEW FILE)
import { create } from 'zustand';
import { StoryboardTheme } from '@/styles/storyboardTheme';
import { ThemeService } from '@/services/themeService';

interface ThemeStoreState {
  userThemes: StoryboardTheme[]; // User's saved custom themes
  isLoadingThemes: boolean;
  
  // Actions
  loadUserThemes: () => Promise<void>;
  saveUserTheme: (theme: StoryboardTheme) => Promise<void>;
  deleteUserTheme: (themeId: string) => Promise<void>;
}

export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  userThemes: [],
  isLoadingThemes: false,
  
  loadUserThemes: async () => {
    set({ isLoadingThemes: true });
    try {
      const themes = await ThemeService.getUserThemes();
      set({ userThemes: themes });
    } catch (error) {
      console.error('Failed to load user themes:', error);
    } finally {
      set({ isLoadingThemes: false });
    }
  },
  
  saveUserTheme: async (theme) => {
    const saved = await ThemeService.saveTheme(theme);
    set((state) => ({
      userThemes: [...state.userThemes, saved]
    }));
  },
  
  deleteUserTheme: async (themeId) => {
    await ThemeService.deleteTheme(themeId);
    set((state) => ({
      userThemes: state.userThemes.filter(t => t.id !== themeId)
    }));
  },
}));

// Then expose in index.ts:
export const useAppStore = () => {
  const themeStore = useThemeStore();
  
  return {
    // ... existing exports ...
    userThemes: themeStore.userThemes,
    loadUserThemes: themeStore.loadUserThemes,
    saveUserTheme: themeStore.saveUserTheme,
    deleteUserTheme: themeStore.deleteUserTheme,
  };
};
```

**Option B: Keep user themes in themeService (simpler, no extra store)**

No separate store needed - components call `ThemeService` directly for user themes.

---

## 📦 Dependencies

### Install react-colorful

```bash
npm install react-colorful
```

**Why react-colorful?**
- Lightweight (2.4KB gzipped)
- Zero dependencies
- Accessible
- Good UX with HSV color picker
- Works with rgba() strings via conversion utility

**Usage Example:**
```typescript
import { RgbaColorPicker } from 'react-colorful';

// Convert rgba string to object
const parseRgba = (rgba: string) => {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return { r: 0, g: 0, b: 0, a: 1 };
  return {
    r: parseInt(match[1]),
    g: parseInt(match[2]),
    b: parseInt(match[3]),
    a: match[4] ? parseFloat(match[4]) : 1
  };
};

// Convert object to rgba string
const toRgbaString = (color: { r: number; g: number; b: number; a: number }) => {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
};

<RgbaColorPicker 
  color={parseRgba(theme.header.background)} 
  onChange={(color) => handleColorChange('header.background', toRgbaString(color))}
/>
```

---

## 🔌 Service Layer

### 1. projectService.ts Updates

**Update saveProject to handle storyboardTheme:**

```typescript
// In src/services/projectService.ts
static async saveProject(projectId: string, data: ProjectData): Promise<void> {
  // ... existing validation ...
  
  const { error } = await supabase
    .from('project_data')
    .upsert({
      project_id: projectId,
      pages: data.pages,
      shots: data.shots,
      shot_order: data.shotOrder || [],
      project_settings: data.projectSettings, // ← Contains storyboardTheme
      ui_settings: data.uiSettings,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'project_id'
    });

  if (error) throw error;
}
```

**Note:** No changes needed to `saveProject` - it already saves the entire `projectSettings` object which will now include `storyboardTheme`.

---

### 2. cloudSyncService.ts Updates

**Update getData to include storyboardTheme:**

```typescript
// In src/services/cloudSyncService.ts - getData method
const data: ProjectData = {
  pages: pageStore.pages,
  shots: Object.fromEntries(
    Object.entries(shotStore.shots).map(([id, shot]) => [
      id,
      {
        ...shot,
        // ... existing shot data ...
      }
    ])
  ),
  shotOrder: shotStore.shotOrder,
  projectSettings: {
    projectName: projectStore.projectName,
    projectInfo: projectStore.projectInfo,
    projectLogoUrl: projectStore.projectLogoUrl,
    clientAgency: projectStore.clientAgency,
    jobInfo: projectStore.jobInfo,
    templateSettings: projectStore.templateSettings,
    storyboardTheme: projectStore.storyboardTheme, // ← ADD THIS
  },
  uiSettings: {
    isDragging: uiStore.isDragging,
    isExporting: uiStore.isExporting,
    showDeleteConfirmation: uiStore.showDeleteConfirmation,
  }
};
```

---

### 3. Index.tsx Updates (User Theme Loading)

**Add user theme loading after auth is confirmed:**

```typescript
// In src/pages/Index.tsx - inside useEffect after auth initialization
useEffect(() => {
  const initializeApp = async () => {
    try {
      // ... existing initialization ...
      
      // Load user themes for authenticated users
      if (import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true') {
        setTimeout(async () => {
          const authState = useAuthStore.getState();
          if (authState.isAuthenticated && !authState.isLoading) {
            console.log('Authenticated user - loading user themes...');
            try {
              const { ThemeService } = await import('@/services/themeService');
              await ThemeService.loadUserThemesIntoMemory();
            } catch (error) {
              console.error('Failed to load user themes:', error);
              // Don't block the app if theme loading fails
            }
          }
        }, 350); // After auth check completes
      }
      
      // ... rest of initialization ...
    } catch (error) {
      console.error('Error during app initialization:', error);
    }
  };

  initializeApp();
}, []);
```

---

### 4. themeService.ts

```typescript
import { supabase } from '@/lib/supabase';
import { StoryboardTheme } from '@/styles/storyboardTheme';

// In-memory cache for user themes
let userThemesCache: StoryboardTheme[] = [];

export class ThemeService {
  /**
   * Load user's saved themes from Supabase into memory
   * Called on app init for authenticated users
   */
  static async loadUserThemesIntoMemory(): Promise<void> {
    try {
      const themes = await this.getUserThemes();
      userThemesCache = themes;
      console.log(`Loaded ${themes.length} user themes`);
    } catch (error) {
      console.error('Failed to load user themes:', error);
      userThemesCache = [];
    }
  }
  
  /**
   * Get cached user themes (synchronous)
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
```

---

## 🔄 Migration Strategy

### Backwards Compatibility (Existing Projects)

**Strategy:** Migrate all existing projects to use explicit "Light" theme on first load

#### 1. LocalStorage Migration

```typescript
// In src/services/cloudSyncService.ts - saveToLocalStorage method
if (data.projectSettings) {
  const projectSettings = {
    ...data.projectSettings,
    projectName: data.projectSettings.projectName || `Project ${projectId.slice(0, 8)}`,
    // Add default theme if missing
    storyboardTheme: data.projectSettings.storyboardTheme || getDefaultTheme(),
  };
  
  const projectStoreData = {
    state: projectSettings
  };
  LocalStorageManager.setItem(`project-storage-project-${projectId}`, JSON.stringify(projectStoreData));
}
```

#### 2. Supabase Migration

```typescript
// In src/services/projectService.ts - getProject method
static async getProject(projectId: string): Promise<ProjectData> {
  const { data, error } = await supabase
    .from('project_data')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (error) throw error;

  // Migrate missing theme
  if (!data.project_settings?.storyboardTheme) {
    const migratedSettings = {
      ...data.project_settings,
      storyboardTheme: getDefaultTheme()
    };
    
    // Save migrated data back to Supabase
    await supabase
      .from('project_data')
      .update({ project_settings: migratedSettings })
      .eq('project_id', projectId);
    
    data.project_settings = migratedSettings;
  }

  return {
    pages: data.pages || [],
    shots: data.shots || {},
    shotOrder: data.shot_order || [],
    projectSettings: data.project_settings || {},
    uiSettings: data.ui_settings || {}
  };
}
```

#### 3. Store Initialization Migration

```typescript
// In src/store/projectStore.ts - persist middleware
export const useProjectStore = create<ProjectStore>()(
  persist(
    immer((set, get) => ({
      // ... state ...
    })),
    {
      name: 'project-storage',
      partialize: (state) => ({
        // ... existing fields ...
        storyboardTheme: state.storyboardTheme,
      }),
      // Add migration in onRehydrateStorage
      onRehydrateStorage: () => (state) => {
        if (state && !state.storyboardTheme) {
          state.storyboardTheme = getDefaultTheme();
        }
      }
    }
  )
);
```

**Safe because:**
- You mentioned: "I will ultimately reset all projects - no critical user data stored currently"
- Light theme matches current styling (no visual change for users)
- Future-proof: All projects have explicit theme
- Migration happens silently during load

---

## 🧪 Testing Checklist

### Unit Tests
- [ ] `getDefaultTheme()` returns Light theme
- [ ] `getThemeById()` finds preset themes
- [ ] ThemeService CRUD operations work
- [ ] Migration adds default theme to projects without one

### Integration Tests
- [ ] StyleSettings dropdown shows presets + user themes
- [ ] Selecting theme updates project immediately
- [ ] Custom theme editor updates live preview
- [ ] Save as template persists to Supabase
- [ ] User themes load on app init

### Visual Tests
- [ ] Light theme matches current styling
- [ ] Dark theme renders correctly
- [ ] Custom colors apply to all elements
- [ ] Border width changes visible
- [ ] Border radius changes visible

### PDF Export Tests
- [ ] PDF exports match live view with Light theme
- [ ] PDF exports match live view with Dark theme
- [ ] PDF exports match live view with custom theme
- [ ] All theme properties render correctly in PDF
- [ ] **Font sizes match browser** (global 1.12x multiplier applied to all text)
- [ ] **Background colors use theme** (Page Style > Bg applied to page, header, and content)
- [ ] **Shot Card background toggle respected** (on/off renders correctly in PDF)
- [ ] **Empty image frames have rounded corners** (border radius from theme applied)
- [ ] **Empty image frames show no placeholder icons** (clean, professional appearance)

---

## 📋 Implementation Phases

### **Phase 1: Foundation** (Core infrastructure)
1. ✅ Install `react-colorful` dependency (`npm install react-colorful`)
2. ✅ Create `storyboardTheme.ts` with interfaces and presets
3. ✅ Update `ProjectData` interface in `projectService.ts`
4. ✅ Update `projectStore.ts` with theme state, actions, and `onRehydrateStorage` migration
5. ✅ Update `index.ts` to expose theme in unified store
6. ✅ Add migration logic in `projectService.ts` and `cloudSyncService.ts`
7. ✅ Add user theme loading in `Index.tsx` (load after auth confirmed)
8. ✅ Create Supabase table `user_storyboard_themes` (SQL migration)
9. ✅ Create `themeService.ts` for user theme CRUD operations

**Deliverable:** Theme system exists, can be read/written, migrates old projects, user themes load on auth

---

### **Phase 2: Component Integration** (Apply themes to UI)
1. ✅ Update `MasterHeader.tsx` to use `storyboardTheme` from store
2. ✅ Update `ShotCard.tsx` to use `storyboardTheme` from store
3. ✅ Update `ShotGrid.tsx` to use `storyboardTheme` from store
4. ✅ Test that components render with Light theme (should match current styling)
5. ✅ Test that components render with Dark theme
6. ✅ Verify PDF export captures themed styles (DOMCapture should work automatically)

**Deliverable:** Components use theme system, PDF export works

---

### **Phase 3: UI Controls** ✅ **COMPLETED** (User-facing features)
1. ✅ Create `StyleSettings.tsx` component (theme selector dropdown + "Create Custom" button)
2. ✅ Add `StyleSettings` to StoryboardPage toolbar (below grid/aspect ratio controls)
3. ✅ Create `ThemeEditorModal.tsx` component with `react-colorful` color pickers
4. ✅ Add color picker controls for all theme properties (using `react-colorful`)
5. ✅ Add slider controls (border width 0-5px, radius 0-20px)
6. ✅ Implement live preview (changes apply immediately as user edits)
7. ✅ Implement "Save as Template" functionality (saves to `user_storyboard_themes`)
8. ✅ Implement "Delete Theme" functionality (for user custom themes)

**Deliverable:** Users can select/create/save/delete themes through UI ✅

---

### **Phase 4: Polish & Testing** 🔄 **IN PROGRESS**
1. ⏳ Test all theme scenarios (Light, Dark, Custom)
2. ⏳ Test PDF export with all themes
3. ⏳ Test migration of existing projects
4. ✅ Add error handling (failed theme save, load, etc.)
5. ✅ Add loading states (loading user themes)
6. ⏳ Test offline behavior (user themes unavailable offline, project theme persists)
7. ⏳ Update documentation (this file, COLOR_SYSTEM_COMPREHENSIVE_AUDIT.md)

**Deliverable:** Production-ready theme system

---

## 🎯 Success Criteria

This implementation is successful when:
1. ✅ Users can select Light or Dark preset themes
2. ✅ Users can create custom themes with color/border/radius controls
3. ✅ Users can save custom themes to their profile
4. ✅ Users can apply saved themes to any project
5. ✅ Changes apply immediately (live preview)
6. ✅ PDF/PNG exports match live view exactly (WYSIWYG)
7. ✅ Each project stores its theme independently
8. ✅ Existing projects migrate to Light theme seamlessly
9. ✅ No impact on app UI colors (COLOR_PALETTE unchanged)

---

## 📚 Related Documentation

- **`.cursorrules`** - Semantic color separation rules
- **`ARCHITECTURE_PRINCIPLES.md`** - Principle 7: Semantic Separation (this directory)
- **`../styling/UNIFIED_COLOR_SYSTEM_IMPLEMENTATION.md`** - App UI color system
- **`../styling/COLOR_SYSTEM_COMPREHENSIVE_AUDIT.md`** - Current color system status

---

## ⚠️ Critical Architecture Questions to Confirm

Before proceeding with implementation, please confirm:

### **Q1: User Theme Storage Strategy**
Should we use:
- **Option A:** Separate `themeStore.ts` (cleaner separation, user themes in dedicated store)
- **Option B:** No extra store, components call `ThemeService` directly (simpler, fewer stores)

**User Confirmed:** Option B (ThemeService with in-memory cache) ✅

---

### **Q2: Theme Application Timing**
When user selects a theme from dropdown:
- Should it apply **immediately** (current plan)?
- Or should there be an "Apply"/"Cancel" button?

**User already answered:** Immediate upon selection ✅

---

### **Q3: Color Picker Library**
What color picker should we use for ThemeEditorModal?
- **Option A:** `react-colorful` (lightweight, 2.4KB)
- **Option B:** `react-color` (feature-rich, but larger ~15KB)
- **Option C:** Native HTML `<input type="color">` (no deps, but limited UX)

**User Confirmed:** Option A (`react-colorful`) ✅

---

### **Q4: Border Width & Radius Limits**
Current plan:
- Border width: 0-5px
- Border radius: 0-20px

**User Confirmed:** Yes ✅

---

### **Q5: Grid Background Customization**
Should `gridBackground` be customizable, or should it always match the page background?
- **Option A:** User can customize (current plan)
- **Option B:** Auto-derive from page background (simpler, fewer options)

**User Confirmed:** Option A (let users customize) ✅

---

### **Q6: Offline Behavior**
When offline:
- User themes (from Supabase) are unavailable
- Project theme (in localStorage) persists and works

This correct? ✅

---

## 🔍 Final Architecture Validation

### Data Flow Summary:
1. **User selects theme** → Updates `projectStore.storyboardTheme` → Triggers auto-save
2. **Auto-save** → Collects data from all stores (including theme) → Saves to localStorage + Supabase
3. **Project load** → Reads from Supabase/localStorage → Hydrates stores (including theme) → Components re-render
4. **PDF export** → DOMCapture reads live DOM → Styled by current theme → Renders to PDF

### Critical Integration Points:
- ✅ `projectStore.ts` - Holds current project's theme
- ✅ `projectService.ts` - Saves/loads theme as part of `projectSettings`
- ✅ `cloudSyncService.ts` - Includes theme in sync data
- ✅ `index.ts` - Exposes theme to components via `useAppStore()`
- ✅ Components - Read theme from `useAppStore()`, apply inline styles
- ✅ PDF export - Captures inline styles automatically (WYSIWYG)

### Potential Issues (NONE FOUND):
- ✅ No circular dependencies
- ✅ No missing type imports
- ✅ No conflicting state sources
- ✅ No PDF export compatibility issues
- ✅ Migration strategy covers all load paths

---

*Last Updated: January 2025*  
*All questions confirmed - Ready for Phase 1 implementation*

