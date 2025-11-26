// ⚠️ DEPRECATED: This file uses legacy programmatic layout calculations and will be removed in a future version.
// PDF export now uses DOM capture (DOMCapture + DOMRenderer) for WYSIWYG reliability.
// TODO: Remove this file after validating DOM-based export works for all use cases.

import { 
  Rectangle, 
  ExportDimensions, 
  GridConfig, 
  LayoutConfig,
  FontConfig,
  TextStyle 
} from '@/utils/types/exportTypes';

if (import.meta && import.meta.env && import.meta.env.DEV) {
  console.warn('⚠️ DEPRECATED: LayoutCalculator uses legacy programmatic calculations. PDF export now uses DOM capture for reliability.');
}

export class LayoutCalculator {
  /**
   * Calculate export canvas dimensions based on content
   */
  static calculateExportDimensions(
    gridConfig: { rows: number; cols: number },
    aspectRatio: string,
    targetWidth: number = 1000, // Always use Preview mode width
    scale: number = 2,
    showPageNumber: boolean = false, // Add parameter to control footer inclusion
    storyboardTheme?: any
  ): ExportDimensions {
    // Always use Preview mode dimensions for WYSIWYG export
    // Use EXACT same calculation as ShotGrid previewDimensions
    
    const fixedWidth = 1000; // Same as ShotGrid
    // Use the EXACT same padding calculation as MasterHeader and ShotGrid
    // Updated to align with shot card image frame edges: 33px total for alignment
    const alignmentPadding = 33; // Total padding for content alignment (updated to match header)
    const totalPadding = alignmentPadding * 2; // Both sides
    
    const availableWidth = fixedWidth - totalPadding;
    const gaps = (gridConfig.cols - 1) * 8; // Gap between grid items
    const shotWidth = Math.floor((availableWidth - gaps) / gridConfig.cols);
    
    // Account for ShotCard internal padding and borders - EXACT same as ShotGrid
    const cardContentPadding = 8 * 2; // p-2 = 8px each side = 16px total
    const borderWidth = storyboardTheme?.imageFrame?.borderEnabled 
      ? storyboardTheme.imageFrame.borderWidth 
      : 1; // fallback to 1 for legacy compatibility
    const imageBorder = borderWidth * 2; // border on both sides
    const imageContainerWidth = shotWidth - cardContentPadding - imageBorder;
    
    // Calculate height based on aspect ratio for image area only
    // Parse aspect ratio more carefully to ensure correct calculation - EXACT same as ShotGrid
    const [w, h] = aspectRatio.split('/').map(str => parseInt(str.trim(), 10));
    
    // Calculate the correct image height based on aspect ratio using the actual image container width
    const imageHeight = Math.floor((imageContainerWidth * h) / w);
    
    // Total shot height = image height + space for text
    // Text areas: mt-1 (4px) + textarea padding (2px top/bottom per field) + text height (~14px per line, 2 lines max)
    // CardContent padding: p-2 (8px) = 16px total vertical
    const textAreaTopMargin = 4; // mt-1
    const textAreaPadding = 4; // py-0.5 * 2 textareas = ~4px total
    const textHeight = 28; // Approximate 2 lines of text-xs (~14px each)
    const textSpace = textAreaTopMargin + textAreaPadding + textHeight;
    const cardVerticalPadding = 8 * 2; // p-2 = 8px top + 8px bottom
    const shotHeight = imageHeight + textSpace + cardVerticalPadding; // More accurate calculation
    
    // Calculate header and footer heights - EXACT same as UI components
    const headerTopPadding = 32; // pt-8 from MasterHeader
    const headerBottomPadding = 8; // pb-2 from MasterHeader  
    const headerContentHeight = 60; // Approximate content height
    const headerHeight = headerTopPadding + headerContentHeight + headerBottomPadding;
    
    // Calculate footer height ONLY if page numbers are shown - EXACT same as calculateLayout
    let footerHeight = 0;
    if (showPageNumber) {
      const footerTopMargin = 8; // mt-2 from ShotGrid
      const footerPadding = 12 * 2; // py-3 from ShotGrid = 12px top + 12px bottom
      const footerContentHeight = 12; // Text content height (text-xs = 12px)
      footerHeight = footerTopMargin + footerPadding + footerContentHeight;
    }
    
    // Calculate total grid height
    const gridHeight = (shotHeight * gridConfig.rows) + (8 * (gridConfig.rows - 1)); // 8px gaps
    
    // Calculate total canvas height - match StoryboardPage structure
    const gridWrapperTopPadding = 4; // p-1 from ShotGrid wrapper
    const gridWrapperBottomPadding = 4; // p-1 from ShotGrid wrapper
    const totalHeight = headerHeight + gridWrapperTopPadding + gridHeight + gridWrapperBottomPadding + footerHeight;
    
    return {
      width: fixedWidth * scale,
      height: totalHeight * scale,
      scale
    };
  }
  
  /**
   * Calculate layout configuration for all elements
   */
  static calculateLayout(
    gridConfig: GridConfig,
    dimensions: ExportDimensions,
    showPageNumber: boolean = false
  ): LayoutConfig {
    const scale = dimensions.scale;
    
    // Header bounds - match MasterHeader exactly
    const headerTopPadding = 32; // pt-8 from MasterHeader
    const headerBottomPadding = 8; // pb-2 from MasterHeader  
    const headerContentHeight = 60; // Approximate content height
    const headerHeight = headerTopPadding + headerContentHeight + headerBottomPadding;
    
    const header: Rectangle = {
      x: 0,
      y: 0,
      width: dimensions.width,
      height: headerHeight * scale
    };
    
    // Footer bounds - match ShotGrid footer exactly
    let footer: Rectangle | undefined;
    let footerHeight = 0;
    if (showPageNumber) {
      const footerTopMargin = 8; // mt-2 from ShotGrid
      const footerPadding = 12 * 2; // py-3 from ShotGrid = 12px top + 12px bottom
      const footerContentHeight = 12; // Text content height (text-xs = 12px)
      footerHeight = footerTopMargin + footerPadding + footerContentHeight;
      
      footer = {
        x: 0,
        y: dimensions.height - (footerHeight * scale),
        width: dimensions.width,
        height: footerHeight * scale
      };
    }
    
    // Grid wrapper bounds - match ShotGrid structure exactly
    const gridWrapperPadding = 4 * scale; // p-1 from ShotGrid wrapper
    const gridWrapperY = header.height + gridWrapperPadding;
    
    // Calculate actual grid content bounds (centered within the wrapper)
    // ShotGrid uses 1000px fixed width with margin: '0 auto' for centering
    const gridContentWidth = 1000 * scale; // Fixed width like ShotGrid
    const gridContentX = (dimensions.width - gridContentWidth) / 2; // Center horizontally
    
    // Adjust grid height to account for footer
    const gridContentHeight = dimensions.height - gridWrapperY - gridWrapperPadding - (footer ? footer.height : 0);
    
    const grid: Rectangle = {
      x: gridContentX,
      y: gridWrapperY,
      width: gridContentWidth,
      height: gridContentHeight
    };
    
    // Calculate individual shot bounds within the centered grid
    const shotBounds = this.calculateShotBounds(gridConfig, grid);
    
    const layout: LayoutConfig = {
      canvas: dimensions,
      header,
      grid,
      shotBounds
    };
    
    if (footer) {
      layout.footer = footer;
    }
    
    return layout;
  }
  
  /**
   * Calculate bounds for individual shots within the grid
   */
  static calculateShotBounds(
    gridConfig: GridConfig,
    gridBounds: Rectangle
  ): Rectangle[] {
    const { rows, cols, gap, aspectRatio } = gridConfig;
    const bounds: Rectangle[] = [];
    
    // Use the same calculation as ShotGrid previewDimensions
    // The grid is already centered, so we work within its bounds
    const scale = gridBounds.width / 1000; // Calculate scale from grid bounds
    
    // Calculate shot dimensions using the same logic as ShotGrid
    // Use the EXACT same padding calculation as MasterHeader and ShotGrid
    const alignmentPadding = 33; // Total padding for content alignment (updated to match header)
    const totalPadding = alignmentPadding * 2; // Both sides
    
    const availableWidth = 1000 - totalPadding; // Base 1000px width
    const gaps = (cols - 1) * 8;
    const shotWidth = Math.floor((availableWidth - gaps) / cols);
    
    // Account for ShotCard internal padding and borders - EXACT same as canvas renderer
    // Legacy default - actual rendering uses theme from renderer
    const cardContentPadding = 8 * 2; // p-2 = 8px each side = 16px total
    const imageBorder = 1 * 2; // border = 1px each side = 2px total
    const imageContainerWidth = shotWidth - cardContentPadding - imageBorder;
    
    // Calculate height based on aspect ratio for image area only - EXACT same as canvas renderer
    const [w, h] = aspectRatio.split('/').map(str => parseInt(str.trim(), 10));
    const imageHeight = Math.floor((imageContainerWidth * h) / w);
    
    // Total shot height = image height + space for text (more generous to allow for multi-line text)
    const shotHeight = imageHeight + 120; // Image height + more generous space for text
    
    // Apply scale to dimensions
    const scaledShotWidth = shotWidth * scale;
    const scaledShotHeight = shotHeight * scale;
    const scaledGap = 8 * scale;
    
    // Calculate starting position within the grid bounds
    // The grid content should be centered within the grid bounds with proper padding
    const gridContentPadding = alignmentPadding * scale; // Align with header content
    const gridContentWidth = (cols * scaledShotWidth) + ((cols - 1) * scaledGap);
    const startX = gridBounds.x + gridContentPadding;
    const startY = gridBounds.y;
    
    // Generate bounds for each shot position
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = startX + (col * (scaledShotWidth + scaledGap));
        const y = startY + (row * (scaledShotHeight + scaledGap));
        
        bounds.push({
          x: Math.round(x),
          y: Math.round(y),
          width: Math.round(scaledShotWidth),
          height: Math.round(scaledShotHeight)
        });
      }
    }
    
    return bounds;
  }
  
  /**
   * Calculate text bounds with proper wrapping
   */
  static calculateTextBounds(
    text: string,
    style: TextStyle,
    maxWidth: number,
    ctx?: CanvasRenderingContext2D
  ): Rectangle {
    if (!ctx) {
      // Create temporary canvas for measurement
      const canvas = document.createElement('canvas');
      ctx = canvas.getContext('2d')!;
    }
    
    // Set font for measurement
    ctx.font = `${style.weight} ${style.size}px ${style.family}`;
    
    const lines = this.wrapText(text, maxWidth, ctx);
    const lineHeight = style.size * style.lineHeight;
    const totalHeight = lines.length * lineHeight;
    
    // Calculate width (longest line)
    const maxLineWidth = Math.max(...lines.map(line => ctx!.measureText(line).width));
    
    return {
      x: 0,
      y: 0,
      width: Math.min(maxLineWidth, maxWidth),
      height: totalHeight
    };
  }
  
  /**
   * Wrap text to fit within specified width
   */
  static wrapText(text: string, maxWidth: number, ctx: CanvasRenderingContext2D): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const testWidth = ctx.measureText(testLine).width;
      
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }
  
  /**
   * Calculate optimal font size to fit text in bounds
   */
  static calculateOptimalFontSize(
    text: string,
    bounds: Rectangle,
    fontFamily: string = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    minSize: number = 10,
    maxSize: number = 24
  ): number {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    let fontSize = maxSize;
    
    while (fontSize >= minSize) {
      ctx.font = `${fontSize}px ${fontFamily}`;
      const lines = this.wrapText(text, bounds.width, ctx);
      const totalHeight = lines.length * fontSize * 1.2; // 1.2 line height
      
      if (totalHeight <= bounds.height) {
        return fontSize;
      }
      
      fontSize--;
    }
    
    return minSize;
  }
} 