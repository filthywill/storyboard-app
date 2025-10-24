# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Storyboard Creator - Claude Code Documentation

## Project Overview
This is a React-based storyboard creation application that allows users to create, organize, and export professional storyboards with drag-and-drop functionality. The application features a modular architecture with sophisticated state management and export capabilities.

## Tech Stack & Architecture

### Core Technologies
- **Frontend Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.1 with SWC for fast compilation
- **State Management**: Zustand 5.0.5 with persistence and Immer middleware
- **Routing**: React Router DOM 6.26.2
- **Styling**: Tailwind CSS 3.4.11 with CSS variables
- **UI Components**: Shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React
- **Drag & Drop**: @dnd-kit/core, @dnd-kit/sortable
- **Export**: jsPDF, html2canvas, html-to-image
- **Form Handling**: React Hook Form with Zod validation
- **Data Fetching**: TanStack Query (React Query)

### Development Tools
- **Package Manager**: npm (with Bun lockfile present)
- **TypeScript**: 5.5.3 with relaxed strictness settings
- **ESLint**: 9.9.0 with TypeScript ESLint
- **PostCSS**: 8.4.47 with Autoprefixer
- **Lovable Tagger**: Development component tagging

## Project Structure

```
shot-flow-builder/
├── public/                 # Static assets
├── src/
│   ├── components/         # React components
│   │   ├── ui/            # Shadcn/ui components
│   │   ├── shot-card/     # Shot-specific components
│   │   └── *.tsx          # Main app components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   ├── pages/             # Route components
│   ├── store/             # Zustand stores (modular architecture)
│   ├── styles/            # Additional styles
│   └── utils/             # Business logic utilities
│       └── export/        # Export-related utilities
├── dist/                  # Build output
└── node_modules/          # Dependencies
```

## State Management Architecture

The application uses a **modular Zustand store architecture** with four main stores:

### 1. Page Store (`pageStore.ts`)
- Manages storyboard pages
- Handles grid settings (rows, cols, aspect ratio)
- Manages shot relationships within pages
- Provides page CRUD operations

### 2. Shot Store (`shotStore.ts`)
- Manages individual shots with full CRUD operations
- Handles shot numbering and renumbering
- Supports sub-shot groups
- Maintains global shot order

### 3. Project Store (`projectStore.ts`)
- Manages project metadata (name, info, logo)
- Handles template settings
- Stores client/agency information
- Manages job information

### 4. UI Store (`uiStore.ts`)
- Manages application UI state
- Handles dragging, exporting, and modal states
- Provides UI state reset functionality

### Unified App Store (`src/store/index.ts`)
The `useAppStore()` hook combines all modular stores into a single interface, providing:
- **Cross-store operations**: Complex operations like `deleteShot()` that require coordination between stores
- **Unified state access**: Single import for all store functionality
- **Auto-redistribution**: Methods like `redistributeShotsAcrossPages()` that maintain data consistency
- **Performance optimizations**: Built-in shallow selectors and batch operations

**Key cross-store methods:**
- `addShot(pageId, position?)` - Creates shot and handles global positioning
- `deleteShot(shotId)` - Removes from all pages and updates global order
- `redistributeShotsAcrossPages()` - Maintains shot distribution across page grid capacity

## Key Features & Components

### Core Components
- **StoryboardPage**: Main page container with export functionality
- **ShotGrid**: Draggable grid of shots with DnD support
- **ShotCard**: Individual shot with image, action text, and script
- **PageTabs**: Tab navigation between multiple pages with glassmorphism styling
- **MasterHeader**: Project-wide header with logo and metadata
- **TemplateSettings**: Configurable template options
- **PDFExportModal**: Advanced export configuration

### PageTabs Component (`src/components/PageTabs.tsx`)
**Features**: Multi-page navigation with glassmorphism styling and perfect alignment
- **Tab Management**: Create, duplicate, delete pages with confirmation dialogs
- **Visual Hierarchy**: Active tabs (full opacity) vs inactive tabs (50% opacity)
- **Asymmetric Padding**: More bottom space than top for visual balance
- **Glassmorphism Styling**: Purple/pink theme matching app palette
- **Perfect Alignment**: Single-container scaling pattern for drift-free positioning
- **Icon Styling**: Bold Lucide icons with proper strokeWidth props

**Key Styling Patterns**:
- Container height: `h-8` for consistent sizing
- Asymmetric padding: `pt-0.5 pb-2` (2px top, 8px bottom)
- Inactive opacity: `opacity-50` for visual hierarchy
- Glassmorphism: `bg-purple-500/20 hover:bg-purple-500/30`
- Icon boldness: `strokeWidth={3}` for Plus icon

### Export System (`src/utils/export/`)
**Architecture**: Strategy pattern with automatic fallback system
- **ExportManager**: Central export coordinator with singleton pattern (`exportManager`)
- **DOM Capture**: Primary high-quality export using `html-to-image` 
- **Canvas Renderer**: Fallback renderer for programmatic drawing
- **PDF Renderer**: Multi-page PDF generation with `jsPDF`
- **Data Transformer**: Prepares storyboard data for export renderers

**Export Flow**: DOM capture → Canvas fallback → PDF assembly → Download/Blob generation

### Performance Optimizations
- **Renumbering Optimizer**: Efficient shot renumbering
- **Batch Operations**: Bulk shot operations
- **Memory Monitor**: Resource usage tracking
- **Object URL Manager**: Automatic cleanup of blob URLs

## Development Commands

```bash
# Development server
npm run dev          # Start development server on port 8080
npm run preview      # Preview production build locally

# Build commands  
npm run build        # Production build (outputs to dist/)
npm run build:dev    # Development build with source maps

# Code quality
npm run lint         # Run ESLint on all TypeScript/React files
```

**Note**: No test suite is currently configured in this project.

## Development Workflow

### 1. Local Development
```bash
git clone <repository-url>
cd shot-flow-builder
npm install
npm run dev
```

### 2. Build Process
- Vite handles bundling with SWC for fast TypeScript compilation
- Automatic path alias resolution (`@/` → `./src/`)
- Component tagging in development mode via Lovable

### 3. Code Quality
- ESLint with TypeScript support
- Relaxed TypeScript settings for rapid development
- Automatic formatting with Prettier-compatible setup

## Key Configuration Files

### TypeScript (`tsconfig.json`)
- Relaxed strictness settings
- Path aliases configured
- Separate app and node configs

### Tailwind (`tailwind.config.ts`)
- Custom CSS variables for theming
- Shadcn/ui integration
- Extended color palette and animations

### Vite (`vite.config.ts`)
- React SWC plugin for fast compilation
- Path alias resolution
- Development server on port 8080

## Architecture Patterns

### 1. Modular Store Design
- Domain-separated stores for better maintainability
- Immutable updates with Immer
- Persistent state with localStorage

### 2. Component Composition
- Shadcn/ui for consistent design system
- Compound components for complex UI
- Error boundaries for fault tolerance

### 3. Performance Optimizations
- Lazy loading with React.lazy
- Memoization for expensive operations
- Efficient re-rendering with shallow comparisons

### 4. Export Architecture
- Strategy pattern for different export types
- Modular renderer system
- Automatic resource cleanup

## Development Guidelines

### Working with State Management
- **Always use `useAppStore()`** for any operations that affect multiple stores
- **Shot operations**: Use cross-store methods (`addShot`, `deleteShot`) to maintain data consistency
- **Page capacity**: Each page has `gridRows × gridCols` capacity that determines shot distribution
- **Global shot order**: Maintained in `shotStore.shotOrder` and synchronized across all pages

### Working with Export System
- **Use singleton**: Import and use `exportManager` for all export operations
- **DOM dependency**: Exports require storyboard elements to be rendered in DOM
- **Memory management**: Export operations auto-cleanup canvas and blob URLs
- **Fallback system**: DOM capture automatically falls back to canvas rendering if needed

### Component Patterns
- **Shadcn/ui**: All UI components use this design system - check existing components before creating new ones
- **Error boundaries**: Use `ErrorBoundary` component for fault tolerance
- **Path aliases**: Use `@/` imports (resolves to `./src/`) - configured in `vite.config.ts`

## Important Project Context

### Lovable Platform Integration
- This project is deployed on Lovable.dev platform (component tagging enabled in dev mode)
- Changes via Lovable automatically commit to this repository
- Dev server runs on port 8080 for Lovable compatibility

### Shot Numbering System
- Shots have both **display numbers** (auto-calculated from position + startNumber) and **internal IDs**
- Sub-shots inherit parent numbering (e.g., shot 5A, 5B)
- Shot renumbering is optimized and handled through `renumberingOptimizer`

### Memory Management Considerations
- Heavy use of image blobs and canvas operations
- Object URLs are auto-managed through `objectURLManager`
- Export operations include automatic resource cleanup
- `memoryMonitor` tracks resource usage for performance optimization

## Common Development Patterns

### Adding New Components
1. Check `src/components/ui/` for existing Shadcn/ui components
2. Use `@/` path aliases for imports
3. Follow existing naming conventions (PascalCase for components)
4. Add error boundaries for complex components

### Modifying State
1. Import from `src/store/index.ts` using `useAppStore()`
2. Use cross-store methods for operations affecting multiple stores
3. Call `redistributeShotsAcrossPages()` after shot order changes
4. Leverage Immer for immutable updates (built into stores)

### Working with Exports
1. Use the singleton `exportManager` instance
2. Ensure DOM elements exist before export (check `isDOMCaptureAvailable`)
3. Handle `ExportError` types for proper error messaging
4. Memory cleanup is automatic but can call `dispose()` if needed

### Performance Considerations
- Shot operations are batched where possible (`batchUtils`)
- Canvas operations include automatic cleanup
- Use React.memo for expensive re-renders
- Leverage built-in optimization utilities in `src/utils/`

---

## 📚 Critical Documentation References

**MUST READ before making changes:**

### Core Principles & Rules
- **`../.cursorrules`** - Mandatory rules for AI assistants (auto-loaded by Cursor)
  - Never show 404 to users
  - State-driven UI patterns
  - Auth/project state handling
  - Offline/online behavior
  - Critical "never do" rules

- **`../ARCHITECTURE_PRINCIPLES.md`** - Design philosophy and patterns
  - State-first architecture
  - No user-facing errors without context
  - Graceful degradation
  - File responsibilities
  - Critical paths to protect

- **`../UI_STATE_HANDLING.md`** - Complete state matrix
  - Every UI state combination
  - State transition flows
  - Common mistakes and fixes
  - Testing checklist
  - Debugging guide

### Historical Context
- **`../CRITICAL-BUG-REPORT.md`** - Data corruption issues and fixes
- **`../TIMESTAMP_SYNC_IMPLEMENTATION.md`** - Conflict resolution
- **`../DATA_LOSS_FIX_SUMMARY.md`** - Validation layers

### UI Patterns & Styling
- **`../SCALING_ALIGNMENT_PATTERNS.md`** - Scaling and alignment patterns
  - Single container scaling pattern
  - Asymmetric padding techniques
  - Lucide icon styling
  - Glassmorphism implementation

### Before Making Changes:
1. ✅ Review `.cursorrules` for critical rules
2. ✅ Check `UI_STATE_HANDLING.md` for affected states
3. ✅ Verify changes don't violate architecture principles
4. ✅ Test all authentication and project states
5. ✅ Ensure users never see 404 during normal operation

---

*This documentation is maintained for Claude Code instances working on the Storyboard Creator project. Always refer to the latest version of this file for current architecture and development patterns.*