> **Note:** `shot-flow-builder/` was removed/merged (Feb 2026). Paths in this doc are historical; current equivalents are under repo root (e.g., `src/`, `docs/`).

 - we are going to create an independant and user customizable color system specifically for the ShotGrid.tsx (including ShotCard.tsx), PageTabs.tsx, and MasterHeader.tsx which will manage the appearance of those componenets and everything they contain.

Start with Phase 1. Once finished, we will proceed with Phase 2 (excluding any changes to ShotCard.tsx). We will skip Phase 3 entirely as we don't user the SyncStatusIndicator anymore and we will develop the independant customizable color system for the remaining components.

What 

# StoryboardPage Layout Hierarchy

## Overview
This document outlines the complete component hierarchy and structure of the StoryboardPage component in the storyboard application.

<details>
<summary><strong>📋 Complete Component Hierarchy (Click to expand)</strong></summary>

```
StoryboardPage.tsx (Main Container)
├── Toolbar Section (Top)
│   ├── GridSizeSelector
│   ├── AspectRatioSelector  
│   ├── StartNumberSelector
│   ├── TemplateSettings
│   ├── ProjectDropdown
│   ├── Batch Load Button
│   ├── Load Shot List Button
│   └── Export Dropdown (PNG/PDF)
│
├── Main Content Container (Glassmorphism Background)
│   └── Scaling Container (1000px width)
│       ├── PageTabs.tsx
│       │   ├── Individual Page Tabs
│       │   └── Add Page Button (+)
│       │
│       └── Storyboard Content Container
│           ├── MasterHeader.tsx
│           │   ├── Logo Section (Left)
│           │   ├── Project Info Section (Center-Left)
│           │   │   ├── Project Name
│           │   │   └── Project Info
│           │   └── Client/Job Info Section (Right)
│           │       ├── Client/Agency
│           │       └── Job Info
│           │
│           └── ShotGrid.tsx
│               ├── Grid Container (CSS Grid)
│               │   ├── ShotCard.tsx (Individual Shots)
│               │   │   ├── Drag Handle (Move icon)
│               │   │   ├── Shot Number
│               │   │   ├── Delete Button
│               │   │   ├── Insert Batch Button
│               │   │   ├── Insert Shot Button
│               │   │   ├── Add Sub-Shot Button
│               │   │   ├── Image Container
│               │   │   │   ├── Image (with scale/offset controls)
│               │   │   │   ├── Edit Image Button (hover)
│               │   │   │   ├── Upload/Remove Buttons (hover)
│               │   │   │   └── Inline Image Editor (when editing)
│               │   │   ├── Action Text Field
│               │   │   └── Script Text Field
│               │   │
│               │   └── Empty Slot Placeholders
│               │       └── "Add Shot" Button
│               │
│               └── Page Number Footer
│                   └── "Page X" Label (bottom-right)
│
└── Modals (Overlays)
    ├── PDFExportModal
    ├── BatchLoadModal
    ├── ShotListLoadModal
    ├── ImageEditorModal
    └── Create Project Dialog
```
</details>

<details>
<summary><strong>🔧 Component Details (Click to expand)</strong></summary>

### StoryboardPage.tsx
- **Purpose**: Main workspace component where users create and edit storyboards
- **Key Features**:
  - Drag and drop functionality for shots
  - Export capabilities (PNG/PDF)
  - Project management
  - Responsive scaling

### PageTabs.tsx
- **Purpose**: Page switching interface
- **Features**:
  - Display page names as tabs
  - Add new pages
  - Duplicate/delete pages
  - Page navigation

### MasterHeader.tsx
- **Purpose**: Project information display
- **Sections**:
  - **Left**: Logo upload/display
  - **Center-Left**: Project name and info
  - **Right**: Client/agency and job information
- **Note**: Does NOT contain page numbers

### ShotGrid.tsx
- **Purpose**: CSS Grid layout for storyboard shots
- **Features**:
  - Responsive grid layout
  - Empty slot placeholders
  - **Page Number Footer**: Displays "Page X" in bottom-right corner
- **Location of Page Number**: Lines 187-221 in ShotGrid.tsx

### ShotCard.tsx
- **Purpose**: Individual storyboard frame component
- **Features**:
  - Image display with aspect ratio controls
  - Drag and drop handles
  - Text fields (action/script)
  - Action buttons (delete, insert, add sub-shot)
  - Image editing capabilities
  - Hover overlays for editing

</details>

<details>
<summary><strong>🎨 Visual Container Structure (Click to expand)</strong></summary>

The main visual container is created by the glassmorphism-styled wrapper in StoryboardPage.tsx:

```typescript
className={cn(
  "w-full flex flex-col items-start p-4 rounded-lg"
)}
style={{ 
  transition: 'height 0.2s ease-out',
  ...getGlassmorphismStyles('background')
}}
```

This container wraps around:
- PageTabs
- MasterHeader  
- ShotGrid
- All storyboard content

</details>

<details>
<summary><strong>📍 Page Number Location (Click to expand)</strong></summary>

**File**: `src/components/ShotGrid.tsx`  
**Lines**: 187-221  
**Display**: "Page X" in bottom-right corner  
**Control**: `templateSettings.showPageNumber` setting

</details>

<details>
<summary><strong>🔗 Key Relationships (Click to expand)</strong></summary>

- **StoryboardPage** receives `pageId` from parent router
- **ShotGrid** contains the page number footer
- **ShotCard** components are arranged in a CSS Grid within ShotGrid
- **MasterHeader** displays project-level information (no page numbers)
- **PageTabs** handles page switching (shows page names, not numbers)

</details>

<details>
<summary><strong>📱 Responsive Design (Click to expand)</strong></summary>

- Main content is scaled to fit available width (minimum 0.2x scale)
- Fixed 1000px width for storyboard content
- Responsive grid layout for shots
- Dynamic height adjustment based on content

</details>
