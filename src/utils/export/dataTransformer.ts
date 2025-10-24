// ⚠️ DEPRECATED: This file uses legacy programmatic layout calculations and will be removed in a future version.
// PDF export now uses DOM capture (DOMCapture + DOMRenderer) for WYSIWYG reliability.
// TODO: Remove this file after validating DOM-based export works for all use cases.

import { 
  StoryboardPage, 
  Shot,
  StoryboardState
} from '@/store/storyboardStore';
import { 
  ExportStoryboardPage,
  ExportHeader,
  ExportGrid,
  ExportShot,
  Rectangle,
  GridConfig,
  LayoutConfig,
  ExportError
} from '@/utils/types/exportTypes';
import { LayoutCalculator } from './layoutCalculator';

console.warn('⚠️ DEPRECATED: DataTransformer uses legacy programmatic calculations. PDF export now uses DOM capture for reliability.');

export class DataTransformer {
  /**
   * Transform UI page data into export-ready format
   */
  static async transformStoryboardPage(
    page: StoryboardPage,
    storyboardState: StoryboardState,
    targetWidth: number = 1000, // Always use Preview mode width
    scale: number = 2
  ): Promise<ExportStoryboardPage> {
    try {
      // Always use Preview mode dimensions for WYSIWYG export
      const baseWidth = 1000; // Same as ShotGrid preview mode
      const padding = 32; // Account for container padding
      const gaps = (page.gridCols - 1) * 8; // Same gap as preview mode
      const availableWidth = baseWidth - padding - gaps;
      
      const finalTargetWidth = baseWidth;
      const finalGap = 8; // Match preview mode gap
      
      // Create grid configuration
      const gridConfig: GridConfig = {
        rows: page.gridRows,
        cols: page.gridCols,
        gap: finalGap,
        aspectRatio: page.aspectRatio
      };
      
      // Calculate dimensions and layout (include page number footer if enabled)
      const showPageNumber = storyboardState.templateSettings.showPageNumber;
      const dimensions = LayoutCalculator.calculateExportDimensions(
        { rows: page.gridRows, cols: page.gridCols },
        page.aspectRatio,
        finalTargetWidth,
        scale,
        showPageNumber
      );
      
      const layout = LayoutCalculator.calculateLayout(gridConfig, dimensions, showPageNumber);
      
      // Transform header data
      const header = await this.transformHeader(storyboardState, layout.header);
      
      // Transform grid data
      const grid = await this.transformGrid(page, gridConfig, layout, storyboardState.templateSettings);
      
      const result = {
        id: page.id,
        name: page.name,
        header,
        grid,
        layout,
        backgroundColor: '#ffffff'
      };
      
      return result;
      
    } catch (error) {
      console.error('❌ Data transformation failed:', error);
      throw new ExportError(
        `Failed to transform page "${page.name}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TRANSFORM_ERROR'
      );
    }
  }
  
  /**
   * Transform header information
   */
  static async transformHeader(
    state: StoryboardState,
    headerBounds: Rectangle
  ): Promise<ExportHeader> {
    let logoImageData: HTMLImageElement | undefined;
    
    // Load logo if available - use HTMLImageElement for better quality
    if (state.projectLogoUrl && state.templateSettings.showLogo) {
      try {
        logoImageData = await this.loadImageElement(state.projectLogoUrl);
      } catch (error) {
        console.warn('Failed to load logo image:', error);
      }
    }
    
    return {
      projectName: state.projectName,
      projectInfo: state.projectInfo,
      clientAgency: state.clientAgency,
      jobInfo: state.jobInfo,
      logoImageData,
      templateSettings: { ...state.templateSettings }
    };
  }
  
  /**
   * Transform grid and shots data
   */
  static async transformGrid(
    page: StoryboardPage,
    gridConfig: GridConfig,
    layout: LayoutConfig,
    templateSettings: any
  ): Promise<ExportGrid> {
    const shots: ExportShot[] = [];
    
    for (let i = 0; i < page.shots.length; i++) {
      const shot = page.shots[i];
      const bounds = layout.shotBounds[i];
      
      if (bounds) {
        const exportShot = await this.transformShot(shot, bounds, templateSettings);
        shots.push(exportShot);
      }
    }
    
    return {
      config: gridConfig,
      bounds: layout.grid,
      shots
    };
  }
  
  /**
   * Transform individual shot data
   */
  static async transformShot(
    shot: Shot,
    bounds: Rectangle,
    templateSettings?: any
  ): Promise<ExportShot> {
    let imageData: ImageData | HTMLImageElement | undefined;
    
    // Load shot image from available sources (priority order)
    // 1. imageFile (active session - highest priority)
    // 2. imageData (base64 - local/current work)
    // 3. imageUrl (Supabase cloud storage - older version)
    
    if (shot.imageFile) {
      try {
        const url = URL.createObjectURL(shot.imageFile);
        const img = await this.loadImageElement(url);
        imageData = img;
        URL.revokeObjectURL(url);
      } catch (error) {
        console.warn(`Failed to load image from imageFile for shot ${shot.number}:`, error);
      }
    } else if (shot.imageData) {
      try {
        // imageData is base64 string - prioritize local work over cloud
        const img = await this.loadImageElement(shot.imageData);
        imageData = img;
      } catch (error) {
        console.warn(`Failed to load image from imageData for shot ${shot.number}:`, error);
      }
    } else if (shot.imageUrl) {
      try {
        const img = await this.loadImageElement(shot.imageUrl);
        imageData = img;
      } catch (error) {
        console.warn(`Failed to load image from imageUrl for shot ${shot.number}:`, error);
      }
    }
    
    return {
      id: shot.id,
      number: shot.number,
      imageData,
      actionText: shot.actionText,
      scriptText: shot.scriptText,
      bounds,
      imageScale: shot.imageScale,
      imageOffsetX: shot.imageOffsetX,
      imageOffsetY: shot.imageOffsetY,
      templateSettings // Pass template settings to renderer
    };
  }
  
  /**
   * Load image data from URL
   */
  static async loadImageData(url: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          resolve(imageData);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.crossOrigin = 'anonymous';
      img.src = url;
    });
  }
  
  /**
   * Load image element (preserves quality better than ImageData)
   */
  static async loadImageElement(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.crossOrigin = 'anonymous';
      img.src = url;
    });
  }
  
  /**
   * Validate page data before transformation
   */
  static validatePageData(
    page: StoryboardPage,
    state: StoryboardState
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!page.id) {
      errors.push('Page ID is required');
    }
    
    if (!page.name) {
      errors.push('Page name is required');
    }
    
    if (page.gridRows < 1 || page.gridRows > 10) {
      errors.push('Grid rows must be between 1 and 10');
    }
    
    if (page.gridCols < 1 || page.gridCols > 10) {
      errors.push('Grid columns must be between 1 and 10');
    }
    
    if (!page.aspectRatio || !page.aspectRatio.includes('/')) {
      errors.push('Valid aspect ratio is required');
    }
    
    // Validate shots
    page.shots.forEach((shot, index) => {
      if (!shot.id) {
        errors.push(`Shot ${index + 1} missing ID`);
      }
      if (!shot.number) {
        errors.push(`Shot ${index + 1} missing number`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Calculate shot numbering based on start number
   */
  static calculateShotNumbers(
    shotCount: number,
    startNumber: string = '1'
  ): string[] {
    const numbers: string[] = [];
    
    // Parse start number (could be '1', '1A', etc.)
    const match = startNumber.match(/^(\d+)([a-zA-Z]?)$/);
    if (!match) {
      // Fallback to simple numbering
      for (let i = 0; i < shotCount; i++) {
        numbers.push(String(i + 1));
      }
      return numbers;
    }
    
    let numericPart = parseInt(match[1]);
    const letterPart = match[2].toLowerCase();
    
    for (let i = 0; i < shotCount; i++) {
      if (letterPart) {
        // Handle alphanumeric numbering like 1A, 1B, etc.
        const letterCode = letterPart.charCodeAt(0) - 97 + i;
        if (letterCode < 26) {
          numbers.push(`${numericPart}${String.fromCharCode(97 + letterCode).toUpperCase()}`);
        } else {
          // Overflow to next number
          numericPart++;
          numbers.push(`${numericPart}A`);
        }
      } else {
        // Simple numeric numbering
        numbers.push(String(numericPart + i));
      }
    }
    
    return numbers;
  }
} 