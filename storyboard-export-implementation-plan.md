# Storyboard Export Implementation Plan

## Current Issues Analysis

### Why html2canvas Approach is Failing
1. **Dynamic Content Issues**: html2canvas captures a snapshot but struggles with:
   - Auto-resizing textareas (dynamic height calculation)
   - CSS effects like `backdrop-blur-sm` 
   - Semi-transparent backgrounds (`bg-white/90`)
   - Complex absolute positioning overlays

2. **Rendering Inconsistencies**: 
   - Shot numbers appearing misaligned/bottom-anchored
   - Header sections getting cut off
   - Interactive elements affecting layout during capture

3. **Fundamental Limitation**: html2canvas reverse-engineers already-rendered DOM, which loses the precise control we need for export-quality output.

## Recommended Solution Architecture

### Approach: Dedicated Export Rendering System
Instead of trying to capture the interactive UI, we'll create a **parallel export-specific rendering system** that:
- Uses the same data but renders it optimized for static export
- Leverages Canvas API for pixel-perfect control
- Maintains visual consistency with the UI without compromising interactive features

## Implementation Plan

### Phase 1: Canvas-Based Export Renderer

#### 1.1 Create Export Canvas System
```typescript
// New file: src/utils/exportRenderer.ts
class StoryboardExportRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scale: number;
  
  constructor(width: number, height: number, scale = 2) {
    // Initialize canvas with proper dimensions
  }
  
  async renderStoryboardPage(pageData: StoryboardPage, settings: ExportSettings): Promise<HTMLCanvasElement> {
    // Render complete storyboard page to canvas
  }
  
  private async renderHeader(headerData: HeaderData): Promise<void> {
    // Render header section with proper text measurement
  }
  
  private async renderShotGrid(shots: Shot[], gridConfig: GridConfig): Promise<void> {
    // Render shot grid with precise positioning
  }
  
  private async renderShotCard(shot: Shot, bounds: Rectangle): Promise<void> {
    // Render individual shot card with image and text
  }
}
```

#### 1.2 Text Rendering System
```typescript
// Handle text rendering with proper font loading and measurement
class TextRenderer {
  static async measureText(text: string, font: FontConfig): Promise<TextMetrics> {
    // Accurate text measurement for layout
  }
  
  static renderMultilineText(ctx: CanvasRenderingContext2D, text: string, bounds: Rectangle, style: TextStyle): void {
    // Handle word wrapping and line breaks
  }
}
```

#### 1.3 Image Handling System
```typescript
// Proper image loading and rendering
class ImageRenderer {
  static async loadImage(src: string | File): Promise<HTMLImageElement> {
    // Reliable image loading with error handling
  }
  
  static renderImageWithAspectRatio(ctx: CanvasRenderingContext2D, img: HTMLImageElement, bounds: Rectangle, aspectRatio: string): void {
    // Render images maintaining aspect ratio
  }
}
```

### Phase 2: Export Data Transformation

#### 2.1 Create Export Data Models
```typescript
// Pure data structures optimized for export
interface ExportStoryboardPage {
  header: ExportHeader;
  grid: ExportGrid;
  shots: ExportShot[];
  layout: LayoutConfig;
}

interface ExportHeader {
  projectName: string;
  projectInfo: string;
  clientAgency: string;
  jobInfo: string;
  logoImageData?: ImageData;
  templateSettings: TemplateSettings;
}

interface ExportShot {
  number: string;
  imageData?: ImageData;
  actionText: string;
  scriptText: string;
  bounds: Rectangle;
}
```

#### 2.2 Data Transformation Layer
```typescript
// src/utils/exportDataTransformer.ts
export class ExportDataTransformer {
  static async transformPageForExport(
    page: StoryboardPage, 
    storeData: StoryboardState
  ): Promise<ExportStoryboardPage> {
    // Transform reactive store data into static export data
    // Handle image file conversion to ImageData
    // Calculate precise layout measurements
  }
}
```

### Phase 3: Layout Calculation Engine

#### 3.1 Responsive-to-Fixed Layout Converter
```typescript
// src/utils/layoutCalculator.ts
export class LayoutCalculator {
  static calculateExportDimensions(
    gridConfig: { rows: number; cols: number },
    aspectRatio: string,
    targetWidth: number
  ): ExportDimensions {
    // Convert responsive grid to fixed pixel dimensions
  }
  
  static calculateShotBounds(
    shotIndex: number,
    gridConfig: GridConfig,
    dimensions: ExportDimensions
  ): Rectangle {
    // Calculate exact pixel bounds for each shot
  }
  
  static calculateTextBounds(
    text: string,
    font: FontConfig,
    maxWidth: number
  ): Rectangle {
    // Calculate text layout with proper wrapping
  }
}
```

### Phase 4: Font and Asset Management

#### 4.1 Font Loading System
```typescript
// src/utils/fontManager.ts
export class FontManager {
  private static loadedFonts = new Set<string>();
  
  static async ensureFontsLoaded(fonts: string[]): Promise<void> {
    // Ensure all required fonts are loaded before rendering
  }
  
  static getOptimalFontSize(text: string, bounds: Rectangle, fontFamily: string): number {
    // Calculate optimal font size to fit text in bounds
  }
}
```

#### 4.2 Asset Preloader
```typescript
// src/utils/assetPreloader.ts
export class AssetPreloader {
  static async preloadAllAssets(pageData: ExportStoryboardPage): Promise<Map<string, any>> {
    // Preload all images, fonts, and assets needed for export
  }
}
```

### Phase 5: Export Controller

#### 5.1 Main Export Controller
```typescript
// src/utils/exportController.ts
export class ExportController {
  static async exportPageAsPNG(
    pageId: string,
    filename: string,
    options: ExportOptions = {}
  ): Promise<void> {
    try {
      // 1. Get page data from store
      const pageData = getPageData(pageId);
      
      // 2. Transform to export format
      const exportData = await ExportDataTransformer.transformPageForExport(pageData);
      
      // 3. Preload all assets
      const assets = await AssetPreloader.preloadAllAssets(exportData);
      
      // 4. Calculate layout
      const layout = LayoutCalculator.calculateLayout(exportData, options);
      
      // 5. Render to canvas
      const renderer = new StoryboardExportRenderer(layout.width, layout.height, options.scale);
      const canvas = await renderer.renderStoryboardPage(exportData, layout);
      
      // 6. Download
      downloadCanvasAsPNG(canvas, filename);
      
    } catch (error) {
      throw new ExportError(`Failed to export page: ${error.message}`);
    }
  }
}
```

### Phase 6: Quality Assurance Features

#### 6.1 Export Preview System
```typescript
// Allow users to preview export before downloading
export class ExportPreview {
  static async generatePreview(pageId: string): Promise<string> {
    // Generate smaller preview image for user confirmation
  }
}
```

#### 6.2 Validation System
```typescript
// src/utils/exportValidator.ts
export class ExportValidator {
  static validateExportData(data: ExportStoryboardPage): ValidationResult {
    // Validate all required data is present
    // Check for missing images, empty text fields, etc.
  }
  
  static validateLayout(layout: LayoutConfig): ValidationResult {
    // Ensure layout calculations are valid
  }
}
```

## Implementation Benefits

### ✅ Advantages of This Approach
1. **Pixel-Perfect Control**: Canvas API gives us exact control over every pixel
2. **Consistent Rendering**: Same output regardless of browser or screen size
3. **Preserved UI Features**: Keep all interactive features (blur, animations) without compromise
4. **Better Performance**: Optimized rendering path for export
5. **Extensible**: Easy to add new export formats (SVG, PDF) later
6. **Reliable**: No dependency on DOM rendering quirks

### 🔧 Technical Benefits
1. **Separation of Concerns**: Export logic separate from UI logic
2. **Testable**: Can unit test export rendering independently
3. **Maintainable**: Clear architecture with defined responsibilities
4. **Scalable**: Can handle complex layouts and many shots efficiently

## File Structure
```
src/
├── utils/
│   ├── export/
│   │   ├── exportController.ts          # Main export orchestration
│   │   ├── exportRenderer.ts           # Canvas-based rendering
│   │   ├── exportDataTransformer.ts    # Data transformation
│   │   ├── layoutCalculator.ts         # Layout calculations
│   │   ├── textRenderer.ts             # Text rendering utilities
│   │   ├── imageRenderer.ts            # Image rendering utilities
│   │   ├── fontManager.ts              # Font loading and management
│   │   ├── assetPreloader.ts           # Asset preloading
│   │   ├── exportValidator.ts          # Validation utilities
│   │   └── exportPreview.ts            # Preview generation
│   └── types/
│       └── exportTypes.ts              # TypeScript definitions
```

## Migration Strategy

### Phase 1: Foundation (Week 1)
- Set up new export utility structure
- Implement basic canvas renderer
- Create data transformation layer

### Phase 2: Core Rendering (Week 2)
- Implement header rendering
- Implement shot grid rendering
- Add text and image rendering

### Phase 3: Polish & Integration (Week 3)
- Add validation and error handling
- Implement preview system
- Integration testing
- Replace old export system

### Phase 4: Enhancement (Week 4)
- Performance optimizations
- Additional export formats
- Advanced features (batch export, etc.)

## Testing Strategy

### Unit Tests
- Layout calculations
- Data transformations
- Rendering functions

### Integration Tests
- End-to-end export workflow
- Multiple browser compatibility
- Various content scenarios (empty shots, long text, etc.)

### Visual Regression Tests
- Compare exported images with reference images
- Ensure consistency across updates

This approach will give us a robust, reliable export system that produces professional-quality outputs while maintaining all the interactive features users love about the application. 