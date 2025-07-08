# Storyboarder Implementation Plan

## 1. Project Structure

```
src/
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Layout.tsx
│   ├── storyboard/
│   │   ├── PageTabs.tsx
│   │   ├── StoryboardPage.tsx
│   │   ├── ShotGrid.tsx
│   │   ├── ShotCard.tsx
│   │   └── AddShotButton.tsx
│   ├── modals/
│   │   ├── ExportModal.tsx
│   │   ├── GridSettingsModal.tsx
│   │   └── AuthModal.tsx
│   └── common/
│       ├── ImageDropzone.tsx
│       └── LoadingSpinner.tsx
├── hooks/
│   ├── useDragAndDrop.ts
│   ├── useImageUpload.ts
│   ├── useExport.ts
│   ├── useAutoSave.ts
│   └── useKeyboardNavigation.ts
├── lib/
│   ├── store/
│   │   ├── storyboard-store.ts
│   │   ├── auth-store.ts
│   │   └── ui-store.ts
│   ├── utils/
│   │   ├── export.ts
│   │   ├── image-utils.ts
│   │   ├── grid-utils.ts
│   │   └── persistence.ts
│   ├── types/
│   │   ├── storyboard.ts
│   │   ├── export.ts
│   │   └── auth.ts
│   └── supabase/
│       ├── client.ts
│       ├── auth.ts
│       ├── database.ts
│       └── storage.ts
├── App.tsx
├── main.tsx
└── index.css
```

## 2. Core Types

```typescript
// src/lib/types/storyboard.ts
export interface Shot {
  id: string;
  shotNumber: number;
  imageUrl?: string;
  imageFile?: File;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoryboardPage {
  id: string;
  name: string;
  shots: Shot[];
  gridCols: number;
  gridRows: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  pages: StoryboardPage[];
  defaultGridCols: number;
  defaultGridRows: number;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportSettings {
  format: 'png' | 'pdf';
  quality: 'low' | 'medium' | 'high';
  includeDescriptions: boolean;
  pageSize?: 'A4' | 'letter' | 'custom';
}
```

## 3. Zustand Store Design

```typescript
// src/lib/store/storyboard-store.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { Project, StoryboardPage, Shot, ExportSettings } from '@/lib/types/storyboard';

interface StoryboardState {
  // State
  currentProject: Project | null;
  activePageId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createProject: (name: string) => void;
  updateProject: (updates: Partial<Project>) => void;
  
  // Page management
  addPage: (name?: string) => void;
  deletePage: (pageId: string) => void;
  renamePage: (pageId: string, name: string) => void;
  setActivePage: (pageId: string) => void;
  
  // Shot management
  addShot: (pageId: string, position?: number) => void;
  updateShot: (pageId: string, shotId: string, updates: Partial<Shot>) => void;
  deleteShot: (pageId: string, shotId: string) => void;
  reorderShots: (pageId: string, fromIndex: number, toIndex: number) => void;
  
  // Image handling
  uploadShotImage: (pageId: string, shotId: string, file: File) => Promise<void>;
  
  // Persistence
  saveToSupabase: () => Promise<void>;
  loadFromSupabase: (projectId: string) => Promise<void>;
  
  // Utilities
  renumberAllShots: () => void;
  clearError: () => void;
}

export const useStoryboardStore = create<StoryboardState>()(
  persist(
    immer((set, get) => ({
      currentProject: null,
      activePageId: null,
      isLoading: false,
      error: null,
      
      createProject: (name) => set((state) => {
        const project: Project = {
          id: crypto.randomUUID(),
          name,
          pages: [],
          defaultGridCols: 4,
          defaultGridRows: 3,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        state.currentProject = project;
        
        // Create first page
        const firstPage: StoryboardPage = {
          id: crypto.randomUUID(),
          name: 'Page 1',
          shots: [],
          gridCols: 4,
          gridRows: 3,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        project.pages.push(firstPage);
        state.activePageId = firstPage.id;
      }),
      
      addPage: (name) => set((state) => {
        if (!state.currentProject) return;
        
        const pageNumber = state.currentProject.pages.length + 1;
        const newPage: StoryboardPage = {
          id: crypto.randomUUID(),
          name: name || `Page ${pageNumber}`,
          shots: [],
          gridCols: state.currentProject.defaultGridCols,
          gridRows: state.currentProject.defaultGridRows,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        state.currentProject.pages.push(newPage);
        state.activePageId = newPage.id;
        state.currentProject.updatedAt = new Date();
      }),
      
      addShot: (pageId, position) => set((state) => {
        if (!state.currentProject) return;
        
        const page = state.currentProject.pages.find(p => p.id === pageId);
        if (!page) return;
        
        const newShot: Shot = {
          id: crypto.randomUUID(),
          shotNumber: 1, // Will be renumbered
          description: '',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        if (position !== undefined) {
          page.shots.splice(position, 0, newShot);
        } else {
          page.shots.push(newShot);
        }
        
        page.updatedAt = new Date();
        state.currentProject.updatedAt = new Date();
        
        // Renumber all shots
        get().renumberAllShots();
      }),
      
      reorderShots: (pageId, fromIndex, toIndex) => set((state) => {
        if (!state.currentProject) return;
        
        const page = state.currentProject.pages.find(p => p.id === pageId);
        if (!page) return;
        
        const [movedShot] = page.shots.splice(fromIndex, 1);
        page.shots.splice(toIndex, 0, movedShot);
        
        page.updatedAt = new Date();
        state.currentProject.updatedAt = new Date();
        
        // Renumber all shots
        get().renumberAllShots();
      }),
      
      renumberAllShots: () => set((state) => {
        if (!state.currentProject) return;
        
        let globalShotNumber = 1;
        state.currentProject.pages.forEach(page => {
          page.shots.forEach(shot => {
            shot.shotNumber = globalShotNumber++;
          });
        });
      }),
      
      // ... other actions
    })),
    {
      name: 'storyboarder-storage',
      partialize: (state) => ({
        currentProject: state.currentProject,
        activePageId: state.activePageId
      })
    }
  )
);
```

## 4. Component Architecture

### App Component
```typescript
// src/App.tsx
import { useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { PageTabs } from '@/components/storyboard/PageTabs';
import { StoryboardPage } from '@/components/storyboard/StoryboardPage';
import { useStoryboardStore } from '@/lib/store/storyboard-store';
import { useAutoSave } from '@/hooks/useAutoSave';

export default function App() {
  const { currentProject, activePageId, createProject } = useStoryboardStore();
  
  useAutoSave(); // Auto-save hook
  
  useEffect(() => {
    if (!currentProject) {
      createProject('My Storyboard');
    }
  }, [currentProject, createProject]);
  
  const activePage = currentProject?.pages.find(p => p.id === activePageId);
  
  return (
    <Layout>
      <div className="flex flex-col h-full">
        <PageTabs />
        {activePage && <StoryboardPage page={activePage} />}
      </div>
    </Layout>
  );
}
```

### ShotCard Component
```typescript
// src/components/storyboard/ShotCard.tsx
import { useState, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ImageDropzone } from '@/components/common/ImageDropzone';
import { Shot } from '@/lib/types/storyboard';
import { useStoryboardStore } from '@/lib/store/storyboard-store';
import { GripVertical, Upload, X } from 'lucide-react';

interface ShotCardProps {
  shot: Shot;
  pageId: string;
  isDragOverlay?: boolean;
}

export function ShotCard({ shot, pageId, isDragOverlay }: ShotCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { updateShot, deleteShot } = useStoryboardStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: shot.id,
    data: { type: 'shot', shot, pageId }
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  
  const handleImageUpload = async (file: File) => {
    updateShot(pageId, shot.id, { imageFile: file });
  };
  
  const handleDescriptionChange = (value: string) => {
    updateShot(pageId, shot.id, { description: value });
  };
  
  const handleDescriptionBlur = () => {
    setIsEditing(false);
  };
  
  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`relative group transition-all duration-200 ${
        isDragOverlay ? 'shadow-lg scale-105' : 'hover:shadow-md'
      }`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-white/80 rounded hover:bg-white"
      >
        <GripVertical className="h-4 w-4 text-gray-600" />
      </div>
      
      {/* Shot Number */}
      <div className="absolute top-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-mono">
        {shot.shotNumber}
      </div>
      
      {/* Delete Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => deleteShot(pageId, shot.id)}
        className="absolute top-2 right-8 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-red-50 hover:text-red-600"
      >
        <X className="h-4 w-4" />
      </Button>
      
      <div className="p-3 space-y-3">
        {/* Image Area */}
        <div className="aspect-video bg-gray-50 rounded-md overflow-hidden">
          {shot.imageUrl || shot.imageFile ? (
            <img
              src={shot.imageUrl || (shot.imageFile ? URL.createObjectURL(shot.imageFile) : '')}
              alt={`Shot ${shot.shotNumber}`}
              className="w-full h-full object-contain"
            />
          ) : (
            <ImageDropzone
              onDrop={handleImageUpload}
              className="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors"
            >
              <div className="text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Drop image or click</p>
              </div>
            </ImageDropzone>
          )}
        </div>
        
        {/* Description */}
        <Textarea
          ref={textareaRef}
          value={shot.description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          onFocus={() => setIsEditing(true)}
          onBlur={handleDescriptionBlur}
          placeholder="Shot description..."
          className="min-h-[60px] resize-none text-sm"
          maxLength={200}
        />
      </div>
    </Card>
  );
}
```

## 5. Export System

```typescript
// src/lib/utils/export.ts
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { StoryboardPage, ExportSettings } from '@/lib/types/storyboard';

export class ExportService {
  static async exportPageAsPNG(
    pageElement: HTMLElement,
    settings: ExportSettings
  ): Promise<Blob> {
    const scale = this.getScaleForQuality(settings.quality);
    
    const dataUrl = await toPng(pageElement, {
      quality: 1,
      pixelRatio: scale,
      backgroundColor: '#ffffff',
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left'
      }
    });
    
    return this.dataUrlToBlob(dataUrl);
  }
  
  static async exportProjectAsPDF(
    pages: StoryboardPage[],
    settings: ExportSettings,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: settings.pageSize || 'a4'
    });
    
    let isFirstPage = true;
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pageElement = document.getElementById(`page-${page.id}`);
      
      if (!pageElement) continue;
      
      if (!isFirstPage) {
        pdf.addPage();
      }
      
      // Convert page to image
      const dataUrl = await toPng(pageElement, {
        quality: 1,
        pixelRatio: this.getScaleForQuality(settings.quality),
        backgroundColor: '#ffffff'
      });
      
      // Add to PDF
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pageWidth, pageHeight);
      
      // Add page title
      if (settings.includeDescriptions) {
        pdf.setFontSize(12);
        pdf.text(page.name, 10, pageHeight - 10);
      }
      
      isFirstPage = false;
      onProgress?.(((i + 1) / pages.length) * 100);
    }
    
    return new Blob([pdf.output('blob')], { type: 'application/pdf' });
  }
  
  private static getScaleForQuality(quality: string): number {
    switch (quality) {
      case 'low': return 1;
      case 'medium': return 2;
      case 'high': return 3;
      default: return 2;
    }
  }
  
  private static dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
  }
}
```

## 6. Drag and Drop Hook

```typescript
// src/hooks/useDragAndDrop.ts
import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { useStoryboardStore } from '@/lib/store/storyboard-store';
import { Shot } from '@/lib/types/storyboard';

export function useDragAndDrop(pageId: string, shots: Shot[]) {
  const [activeShot, setActiveShot] = useState<Shot | null>(null);
  const { reorderShots } = useStoryboardStore();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const shot = shots.find(s => s.id === active.id);
    setActiveShot(shot || null);
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      setActiveShot(null);
      return;
    }
    
    const oldIndex = shots.findIndex(shot => shot.id === active.id);
    const newIndex = shots.findIndex(shot => shot.id === over.id);
    
    reorderShots(pageId, oldIndex, newIndex);
    setActiveShot(null);
  };
  
  return {
    sensors,
    activeShot,
    handleDragStart,
    handleDragEnd,
    DndContext,
    SortableContext,
    DragOverlay,
    strategy: rectSortingStrategy
  };
}
```

## 7. Supabase Schema

```sql
-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  default_grid_cols INTEGER DEFAULT 4,
  default_grid_rows INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pages table
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grid_cols INTEGER DEFAULT 4,
  grid_rows INTEGER DEFAULT 3,
  page_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shots table
CREATE TABLE shots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  shot_number INTEGER NOT NULL,
  image_url TEXT,
  description TEXT DEFAULT '',
  shot_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Storage bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('storyboard-images', 'storyboard-images', true);

-- RLS Policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE shots ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (auth.uid() = user_id);

-- Pages policies
CREATE POLICY "Users can view pages of own projects" ON pages FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = pages.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can create pages for own projects" ON pages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = pages.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can update pages of own projects" ON pages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = pages.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can delete pages of own projects" ON pages FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = pages.project_id AND projects.user_id = auth.uid())
);

-- Shots policies
CREATE POLICY "Users can view shots of own projects" ON shots FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pages 
    JOIN projects ON projects.id = pages.project_id 
    WHERE pages.id = shots.page_id AND projects.user_id = auth.uid()
  )
);
CREATE POLICY "Users can create shots for own projects" ON shots FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM pages 
    JOIN projects ON projects.id = pages.project_id 
    WHERE pages.id = shots.page_id AND projects.user_id = auth.uid()
  )
);
CREATE POLICY "Users can update shots of own projects" ON shots FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM pages 
    JOIN projects ON projects.id = pages.project_id 
    WHERE pages.id = shots.page_id AND projects.user_id = auth.uid()
  )
);
CREATE POLICY "Users can delete shots of own projects" ON shots FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM pages 
    JOIN projects ON projects.id = pages.project_id 
    WHERE pages.id = shots.page_id AND projects.user_id = auth.uid()
  )
);

-- Storage policies
CREATE POLICY "Users can upload images" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'storyboard-images' AND auth.role() = 'authenticated'
);
CREATE POLICY "Users can view images" ON storage.objects FOR SELECT USING (
  bucket_id = 'storyboard-images'
);
CREATE POLICY "Users can delete own images" ON storage.objects FOR DELETE USING (
  bucket_id = 'storyboard-images' AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## 8. Migration Strategy

```typescript
// src/lib/utils/persistence.ts
import { supabase } from '@/lib/supabase/client';
import { useStoryboardStore } from '@/lib/store/storyboard-store';
import { Project } from '@/lib/types/storyboard';

export class PersistenceService {
  static async migrateFromLocalStorage(userId: string): Promise<void> {
    const localData = localStorage.getItem('storyboarder-storage');
    if (!localData) return;
    
    try {
      const parsed = JSON.parse(localData);
      const project = parsed.state?.currentProject;
      
      if (project) {
        // Upload project to Supabase
        await this.uploadProject({ ...project, userId });
        
        // Clear localStorage after successful migration
        localStorage.removeItem('storyboarder-storage');
      }
    } catch (error) {
      console.error('Migration failed:', error);
    }
  }
  
  static async uploadProject(project: Project): Promise<void> {
    // Upload images first
    for (const page of project.pages) {
      for (const shot of page.shots) {
        if (shot.imageFile) {
          const imageUrl = await this.uploadImage(shot.imageFile, project.userId!);
          shot.imageUrl = imageUrl;
          delete shot.imageFile;
        }
      }
    }
    
    // Save to database
    const { error } = await supabase
      .from('projects')
      .upsert({
        id: project.id,
        name: project.name,
        user_id: project.userId,
        default_grid_cols: project.defaultGridCols,
        default_grid_rows: project.defaultGridRows,
        created_at: project.createdAt,
        updated_at: project.updatedAt
      });
    
    if (error) throw error;
    
    // Save pages and shots...
  }
  
  private static async uploadImage(file: File, userId: string): Promise<string> {
    const fileName = `${userId}/${Date.now()}-${file.name}`;
    
    const { data, error } = await supabase.storage
      .from('storyboard-images')
      .upload(fileName, file);
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('storyboard-images')
      .getPublicUrl(fileName);
    
    return publicUrl;
  }
}
```

## 9. Key Considerations & Edge Cases

### Performance Optimizations
- **Image thumbnails**: Generate lower-res versions for grid display
- **Virtual scrolling**: Implement if grid gets large (>50 shots)
- **Debounced auto-save**: Prevent excessive API calls during editing
- **Lazy loading**: Load images only when visible

### Edge Cases to Handle
1. **Concurrent editing**: Implement optimistic updates with conflict resolution
2. **Large file uploads**: Add progress indicators and size limits
3. **Export failures**: Retry mechanism and fallback options
4. **Offline mode**: Queue operations when offline, sync when online
5. **Browser compatibility**: Test drag-and-drop on mobile devices
6. **Memory management**: Cleanup object URLs and large images

### Mobile Considerations
- **Touch interactions**: Ensure drag-and-drop works on mobile
- **Responsive grid**: Adjust columns based on screen size
- **Gesture conflicts**: Prevent scroll interference with drag operations

### Testing Strategy
- **Unit tests**: Core logic (store actions, utils)
- **Integration tests**: Component interactions
- **E2E tests**: Complete user workflows
- **Performance tests**: Large project handling
- **Cross-browser tests**: Drag-and-drop compatibility

This implementation plan provides a solid foundation for your Storyboarder app with room for growth and optimization.