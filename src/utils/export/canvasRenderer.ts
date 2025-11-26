import { 
  ExportStoryboardPage,
  ExportShot,
  Rectangle,
  TextStyle,
  ExportError
} from '@/utils/types/exportTypes';
import { LayoutCalculator } from './layoutCalculator';

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private fontsLoaded: boolean = false;
  private storyboardTheme: any;
  private scale: number = 1;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new ExportError('Failed to get canvas context', 'CANVAS_ERROR');
    }
    this.ctx = ctx;
  }
  
  /**
   * Ensure fonts are loaded before rendering
   */
  private async ensureFontsLoaded(): Promise<void> {
    if (this.fontsLoaded) return;
    
    try {
      // Check if fonts API is available
      if ('fonts' in document) {
        // Load all Inter font weights used in the export - comprehensive loading
        const fontVariants = [
          // Critical variants for shot numbers (bold is most important)
          'bold 14px "Inter"',
          '700 14px "Inter"',
          'bold 14px Inter',
          '700 14px Inter',
          // Other common sizes and weights
          '400 14px "Inter"',
          '500 14px "Inter"',
          '600 14px "Inter"',
          'normal 14px "Inter"',
          // 16px - medium text
          '400 16px "Inter"',
          '500 16px "Inter"',
          '600 16px "Inter"', 
          '700 16px "Inter"',
          'bold 16px "Inter"',
          // 18px - client agency text
          '400 18px "Inter"',
          '600 18px "Inter"',
          '700 18px "Inter"',
          'bold 18px "Inter"',
          // 22px - project name
          '400 22px "Inter"',
          '600 22px "Inter"',
          '700 22px "Inter"',
          'bold 22px "Inter"',
          // 12px - small text like action/script
          '400 12px "Inter"',
          '600 12px "Inter"',
          '700 12px "Inter"',
          // 10px - footer text
          '400 10px "Inter"',
          '600 10px "Inter"',
          '700 10px "Inter"',
        ];
        
        // Load all font variants
        const fontLoads = fontVariants.map(variant => document.fonts.load(variant));
        
        // Wait for all fonts to load with timeout
        await Promise.race([
          Promise.allSettled(fontLoads),
          new Promise(resolve => setTimeout(resolve, 3000)) // 3 second timeout
        ]);
        
        // Wait for document fonts to be ready with timeout
        await Promise.race([
          document.fonts.ready,
          new Promise(resolve => setTimeout(resolve, 2000)) // 2 second timeout
        ]);
        
        // Additional verification - test that Inter is actually loaded
        const testCanvas = document.createElement('canvas');
        const testCtx = testCanvas.getContext('2d');
        if (testCtx) {
          // Test different weights to ensure they're loaded
          testCtx.font = '400 16px Inter';
          testCtx.font = '600 16px Inter';
          testCtx.font = '700 16px Inter';
        }
        
        // Give extra time for font rendering to stabilize
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } else {
        // Fallback: wait longer for fonts to load
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      this.fontsLoaded = true;
    } catch (error) {
      this.fontsLoaded = true; // Continue anyway
    }
  }
  
  /**
   * Set font with consistent family and ensure proper loading
   * Uses system fonts that are guaranteed to be available and render consistently
   */
  private setFont(weight: string, size: number, family: string = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'): void {
    // Use system fonts for maximum consistency between browser and canvas
    // Avoid Inter as it may render differently in canvas vs CSS
    this.ctx.font = `${weight} ${size}px ${family}`;
  }
  
  /**
   * Render complete storyboard page to canvas
   */
  async renderStoryboardPage(exportPage: ExportStoryboardPage, pageNumber: number = 1): Promise<void> {
    try {
      // Store theme and scale for border rendering
      this.storyboardTheme = (exportPage as any).storyboardTheme;
      this.scale = exportPage.layout.canvas.scale;
      
      // Ensure fonts are loaded before rendering
      await this.ensureFontsLoaded();
      
      // Set canvas dimensions
      this.canvas.width = exportPage.layout.canvas.width;
      this.canvas.height = exportPage.layout.canvas.height;
      
      // Clear canvas with background color
      this.ctx.fillStyle = exportPage.backgroundColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Render header
      await this.renderHeader(exportPage);
      
      // Render grid
      await this.renderGrid(exportPage);
      
      // Render footer (if present)
      if (exportPage.layout.footer) {
        await this.renderFooter(exportPage, pageNumber);
      }
      
    } catch (error) {
      throw new ExportError(
        `Failed to render page: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'RENDER_ERROR'
      );
    }
  }
  
  /**
   * Render header section
   */
  private async renderHeader(exportPage: ExportStoryboardPage): Promise<void> {
    const { header, layout } = exportPage;
    const { header: headerBounds } = layout;
    const scale = layout.canvas.scale;
    
    // Always use Preview mode styling for WYSIWYG export
    
    // Header background
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(headerBounds.x, headerBounds.y, headerBounds.width, headerBounds.height);
    
    // Use the EXACT same padding calculation as MasterHeader and ShotGrid
    // Updated to align with shot card image frame edges: 33px total for alignment
    const alignmentPadding = 33 * scale; // Align with shot card image frame edges
    const gap = 24 * scale; // Preview mode gap
    
    // Calculate layout sections to match MasterHeader
    const leftSectionWidth = 500 * scale; // Left section width in preview mode
    const rightSectionWidth = 250 * scale; // Right section width in preview mode
    const textSectionWidth = 388 * scale; // Text section width in preview mode - adjusted for larger logo
    
    let leftX = headerBounds.x + alignmentPadding; // Align with grid content
    let rightX = headerBounds.x + headerBounds.width - alignmentPadding - rightSectionWidth; // Align with grid content
    let currentY = headerBounds.y + (32 * scale); // Top padding (pt-8)
    
    // Logo section (if enabled and available)
    if (header.templateSettings.showLogo && header.logoImageData) {
      // Dynamic logo sizing - EXACT same logic as MasterHeader.tsx
      const logoHeight = 60 * scale; // Fixed height (h-16 = 64px, but actual container is 60px)
      
      // Calculate dynamic width based on aspect ratio (same as MasterHeader)
      const logoAspectRatio = header.logoImageData.naturalWidth / header.logoImageData.naturalHeight;
      const calculatedWidth = 60 * logoAspectRatio; // Base calculation
      const constrainedWidth = Math.max(60, Math.min(calculatedWidth, 200)); // Min 60px, Max 200px
      const logoWidth = constrainedWidth * scale;
      
      // Render actual logo image with rounded corners (rounded-md = 6px)
      const logoBounds = {
        x: leftX,
        y: currentY,
        width: logoWidth,
        height: logoHeight
      };
      
      // Use object-contain behavior for logo (not object-cover)
      await this.renderImageWithObjectContain(header.logoImageData, logoBounds, 6 * scale);
      
      leftX += logoWidth + (16 * scale); // Add gap after logo
    }
    
    // Left section: Project Name and Info
    let leftTextY = currentY;
    
    if (header.templateSettings.showProjectName && header.projectName) {
      const style: TextStyle = {
        family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        size: 22 * scale, // Preview mode font size - increased
        weight: '700', // font-bold in CSS
        color: '#111827',
        lineHeight: 1.2,
        textAlign: 'left'
      };
      
      leftTextY = this.renderText(
        header.projectName,
        leftX,
        leftTextY,
        textSectionWidth,
        style
      );
      leftTextY += 4 * scale; // Preview mode spacing
    }
    
    if (header.templateSettings.showProjectInfo && header.projectInfo) {
      const style: TextStyle = {
        family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        size: 14 * scale, // Preview mode font size - increased
        weight: 'normal',
        color: '#6b7280',
        lineHeight: 1.4,
        textAlign: 'left'
      };
      
      this.renderText(
        header.projectInfo,
        leftX,
        leftTextY,
        textSectionWidth,
        style
      );
    }
    
    // Right section: Client/Agency and Job Info
    let rightTextY = currentY;
    
    if (header.templateSettings.showClientAgency && header.clientAgency) {
      const style: TextStyle = {
        family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        size: 18 * scale, // Preview mode font size - increased
        weight: '600', // font-semibold in CSS
        color: '#111827',
        lineHeight: 1.2,
        textAlign: 'right'
      };
      
      rightTextY = this.renderText(
        header.clientAgency,
        rightX,
        rightTextY,
        rightSectionWidth,
        style
      );
      rightTextY += 4 * scale; // Preview mode spacing
    }
    
    if (header.templateSettings.showJobInfo && header.jobInfo) {
      const style: TextStyle = {
        family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        size: 14 * scale, // Preview mode font size - increased
        weight: 'normal',
        color: '#6b7280',
        lineHeight: 1.4,
        textAlign: 'right'
      };
      
      this.renderText(
        header.jobInfo,
        rightX,
        rightTextY,
        rightSectionWidth,
        style
      );
    }
  }
  
  /**
   * Render grid section with shots
   */
  private async renderGrid(exportPage: ExportStoryboardPage): Promise<void> {
    const { grid, layout } = exportPage;
    const scale = layout.canvas.scale;
    
    // Render each shot with the grid's aspect ratio
    for (const shot of grid.shots) {
      await this.renderShot(shot, shot.bounds, scale, grid.config.aspectRatio);
    }
  }
  
  /**
   * Render individual shot
   */
  private async renderShot(shot: ExportShot, bounds: Rectangle, scale: number, aspectRatio: string = '16/9'): Promise<void> {
    // Always use Preview mode styling for WYSIWYG export
    
    // Shot background (no border - ShotCard uses border-0)
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    
    // NO shot border - ShotCard uses border-0 in both modes
    
    // CardContent padding: p-2 in preview mode = 8px
    const cardPadding = 8 * scale;
    
    // Calculate the EXACT same dimensions as ShotGrid previewDimensions
    const shotWidth = bounds.width / scale; // Convert back to unscaled
    const cardContentPadding = 8 * 2; // p-2 = 8px each side = 16px total
    const borderWidth = this.storyboardTheme?.imageFrame?.borderEnabled 
      ? this.storyboardTheme.imageFrame.borderWidth 
      : 0;
    const imageBorder = borderWidth * 2; // border on both sides
    const imageContainerWidth = shotWidth - cardContentPadding - imageBorder;
    
    // Parse aspect ratio exactly like ShotGrid
    const [w, h] = aspectRatio.split('/').map(str => parseInt(str.trim(), 10));
    const imageHeight = Math.floor((imageContainerWidth * h) / w);
    
    // Apply scale to get actual pixel dimensions
    const scaledImageContainerWidth = imageContainerWidth * scale;
    const scaledImageHeight = imageHeight * scale;
    
    // Image area bounds (inside CardContent, with border)
    const imageX = bounds.x + cardPadding;
    const imageY = bounds.y + cardPadding;
    
    // Render image container with background and border (matches ShotCard)
    const imageBounds = {
      x: imageX,
      y: imageY,
      width: scaledImageContainerWidth,
      height: scaledImageHeight
    };
    
    if (shot.imageData) {
      await this.renderShotImage(
        shot.imageData, 
        imageBounds, 
        shot.imageScale, 
        shot.imageOffsetX, 
        shot.imageOffsetY
      );
    } else {
      // Empty shot placeholder - clean background only for export
      this.ctx.fillStyle = '#f9fafb'; // Very light background
      this.ctx.fillRect(imageBounds.x, imageBounds.y, imageBounds.width, imageBounds.height);
      
      // Subtle border for definition (theme-aware)
      const borderStyles = this.getImageFrameBorderStyles();
      if (borderStyles) {
        this.ctx.strokeStyle = borderStyles.color;
        this.ctx.lineWidth = borderStyles.width;
        this.ctx.strokeRect(imageBounds.x, imageBounds.y, imageBounds.width, imageBounds.height);
      }
      
      // No placeholder text or icons in export - keeps it clean and professional
    }
    
    // Shot number - render using DOM-like approach for consistency
    if (shot.number) {
      await this.renderShotNumberPrecise(shot.number, bounds, scale);
    }
    
    // Text areas (positioned below image with exact spacing from ShotCard)
    const showActionText = shot.templateSettings?.showActionText ?? true;
    const showScriptText = shot.templateSettings?.showScriptText ?? true;
    
    if ((shot.actionText && showActionText) || (shot.scriptText && showScriptText)) {
      // Text container starts after image with mt-1 spacing (6px to match visual spacing)
      let textY = imageY + scaledImageHeight + (6 * scale); // mt-1 = 4px + extra visual spacing
      const textPaddingX = 4 * scale; // px-1 = 4px horizontal padding
      const textPaddingY = 2 * scale; // py-0.5 = 2px vertical padding
      
      const textX = imageX + textPaddingX; // Account for px-1 padding
      const textWidth = scaledImageContainerWidth - (textPaddingX * 2); // Account for px-1 padding on both sides
      
      // Action text (if present and enabled)
      if (shot.actionText && showActionText) {
        // Add vertical padding to Y position
        const actionTextY = textY + textPaddingY;
        
        const actionStyle: TextStyle = {
          family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          size: 12 * scale, // text-xs in preview mode
          weight: '600', // font-semibold in CSS
          color: '#111827', // text-gray-900
          lineHeight: 1.3,
          textAlign: 'left'
        };
        
        // Handle line breaks in text - NO max lines constraint (ShotCard auto-expands)
        const actionLines = this.processTextWithLineBreaks(shot.actionText);
        const actionTextEndY = this.renderTextLines(
          actionLines,
          textX,
          actionTextY,
          textWidth,
          actionStyle
          // No maxLines parameter - let it show all lines
        );
        
        // Update textY for next element (add bottom padding)
        textY = actionTextEndY + textPaddingY;
        
        // Small gap between action and script text (if both present)
        if (shot.scriptText && showScriptText) {
          textY += 0; // No extra gap - they're directly adjacent in ShotCard
        }
      }
      
      // Script text (if present and enabled)
      if (shot.scriptText && showScriptText) {
        // Add vertical padding to Y position
        const scriptTextY = textY + textPaddingY;
        
        const scriptStyle: TextStyle = {
          family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          size: 12 * scale, // text-xs in preview mode
          weight: 'normal', // normal weight
          color: '#6b7280', // text-gray-500
          lineHeight: 1.4,
          textAlign: 'left'
        };
        
        // Handle line breaks in text - NO max lines constraint (ShotCard auto-expands)
        const scriptLines = this.processTextWithLineBreaks(shot.scriptText);
        this.renderTextLines(
          scriptLines,
          textX,
          scriptTextY,
          textWidth,
          scriptStyle
          // No maxLines parameter - let it show all lines
        );
      }
    }
  }
  
  /**
   * Render shot image with rounded corners (uses object-cover)
   */
  private async renderShotImage(
    imageData: ImageData | HTMLImageElement,
    bounds: Rectangle,
    imageScale: number = 1.0,
    imageOffsetX: number = 0,
    imageOffsetY: number = 0
  ): Promise<void> {
    // Shot images use rounded-md (6px) in ShotImage component
    const borderRadius = 6;
    await this.renderImageWithRoundedCorners(
      imageData, 
      bounds, 
      borderRadius,
      imageScale,
      imageOffsetX,
      imageOffsetY
    );
  }

  /**
   * Get border styles from theme
   */
  private getImageFrameBorderStyles() {
    if (!this.storyboardTheme?.imageFrame?.borderEnabled) return null;
    return {
      color: this.storyboardTheme.imageFrame.border,
      width: this.storyboardTheme.imageFrame.borderWidth * this.scale,
      radius: (this.storyboardTheme.shotCard?.borderRadius ?? 3) * this.scale
    };
  }

  /**
   * Render image with object-contain behavior (shows full image, no cropping)
   */
  private async renderImageWithObjectContain(
    imageData: ImageData | HTMLImageElement,
    bounds: Rectangle,
    borderRadius: number
  ): Promise<void> {
    if (imageData instanceof HTMLImageElement) {
      // Fill background
      this.ctx.fillStyle = '#f3f4f6';
      this.ctx.save();
      this.ctx.beginPath();
      if (typeof this.ctx.roundRect === 'function') {
        this.ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, borderRadius);
      } else {
        this.ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
      }
      this.ctx.fill();
      this.ctx.restore();
      
      // Calculate dimensions to fit entire image (object-contain)
      const imgAspect = imageData.naturalWidth / imageData.naturalHeight;
      const boundsAspect = bounds.width / bounds.height;
      
      let drawWidth = bounds.width;
      let drawHeight = bounds.height;
      let drawX = bounds.x;
      let drawY = bounds.y;
      
      if (imgAspect > boundsAspect) {
        // Image is wider - fit to width (letterbox top/bottom)
        drawHeight = bounds.width / imgAspect;
        drawY = bounds.y + (bounds.height - drawHeight) / 2;
      } else {
        // Image is taller - fit to height (pillarbox left/right)
        drawWidth = bounds.height * imgAspect;
        drawX = bounds.x + (bounds.width - drawWidth) / 2;
      }
      
      // Draw the image with rounded corners (no clipping needed, shows full image)
      this.ctx.save();
      this.ctx.beginPath();
      if (typeof this.ctx.roundRect === 'function') {
        this.ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, borderRadius);
      } else {
        this.ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
      }
      this.ctx.clip();
      this.ctx.drawImage(imageData, drawX, drawY, drawWidth, drawHeight);
      this.ctx.restore();
      
      // Add border (theme-aware)
      const borderStyles = this.getImageFrameBorderStyles();
      if (borderStyles) {
        this.ctx.strokeStyle = borderStyles.color;
        this.ctx.lineWidth = borderStyles.width;
        this.ctx.save();
        this.ctx.beginPath();
        if (typeof this.ctx.roundRect === 'function') {
          this.ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, borderStyles.radius);
        } else {
          this.ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
        }
        this.ctx.stroke();
        this.ctx.restore();
      }
      
    } else if (imageData instanceof ImageData) {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;
      
      tempCanvas.width = imageData.width;
      tempCanvas.height = imageData.height;
      tempCtx.putImageData(imageData, 0, 0);
      
      await this.renderImageWithObjectContain(tempCanvas as any, bounds, borderRadius);
    }
  }

  /**
   * Render image with rounded corners and border (uses object-cover with CSS-like transforms)
   */
  private async renderImageWithRoundedCorners(
    imageData: ImageData | HTMLImageElement,
    bounds: Rectangle,
    borderRadius: number,
    imageScale: number = 1.0,
    imageOffsetX: number = 0,
    imageOffsetY: number = 0
  ): Promise<void> {
    if (imageData instanceof HTMLImageElement) {
      // First, fill the container background - matches ShotCard bg-gray-100
      this.ctx.fillStyle = '#f3f4f6';
      this.ctx.save();
      this.ctx.beginPath();
      if (typeof this.ctx.roundRect === 'function') {
        this.ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, borderRadius);
      } else {
        this.ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
      }
      this.ctx.fill();
      this.ctx.restore();
      
      // Calculate aspect ratio preserving fit (object-cover behavior)
      const imgAspect = imageData.naturalWidth / imageData.naturalHeight;
      const boundsAspect = bounds.width / bounds.height;
      
      let drawWidth = bounds.width;
      let drawHeight = bounds.height;
      let drawX = bounds.x;
      let drawY = bounds.y;
      
      if (imgAspect > boundsAspect) {
        // Image is wider - fit to height (crop sides)
        drawWidth = bounds.height * imgAspect;
        drawX = bounds.x + (bounds.width - drawWidth) / 2;
      } else {
        // Image is taller - fit to width (crop top/bottom)
        drawHeight = bounds.width / imgAspect;
        drawY = bounds.y + (bounds.height - drawHeight) / 2;
      }
      
      // Draw the image with rounded corners and CSS-like transforms
      this.ctx.save();
      
      // Set up clipping region
      this.ctx.beginPath();
      if (typeof this.ctx.roundRect === 'function') {
        this.ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, borderRadius);
      } else {
        this.ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
      }
      this.ctx.clip();
      
      // Apply CSS-like transforms: scale() translate()
      // CSS: transform: scale(X) translate(Ypx, Zpx)
      // Transform origin is center of the bounds (transformOrigin: 'center center')
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      
      // 1. Translate to transform origin (center)
      this.ctx.translate(centerX, centerY);
      
      // 2. Apply scale
      this.ctx.scale(imageScale, imageScale);
      
      // 3. Apply translate (in scaled space - CSS translate is applied AFTER scale)
      this.ctx.translate(imageOffsetX, imageOffsetY);
      
      // 4. Translate back so the image center is at origin, then draw
      // The image needs to be centered relative to the transform origin
      const imageCenterOffsetX = (drawX + drawWidth / 2) - centerX;
      const imageCenterOffsetY = (drawY + drawHeight / 2) - centerY;
      
      this.ctx.drawImage(
        imageData,
        imageCenterOffsetX - drawWidth / 2,
        imageCenterOffsetY - drawHeight / 2,
        drawWidth,
        drawHeight
      );
      
      this.ctx.restore();
      
      // Add border around image container (theme-aware)
      const borderStyles = this.getImageFrameBorderStyles();
      if (borderStyles) {
        this.ctx.strokeStyle = borderStyles.color;
        this.ctx.lineWidth = borderStyles.width;
        this.ctx.save();
        this.ctx.beginPath();
        if (typeof this.ctx.roundRect === 'function') {
          this.ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, borderStyles.radius);
        } else {
          this.ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
        }
        this.ctx.stroke();
        this.ctx.restore();
      }
      
    } else if (imageData instanceof ImageData) {
      // Create temporary canvas to draw ImageData
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;
      
      tempCanvas.width = imageData.width;
      tempCanvas.height = imageData.height;
      tempCtx.putImageData(imageData, 0, 0);
      
      // Draw as if it were an image element
      await this.renderImageWithRoundedCorners(
        tempCanvas as any, 
        bounds, 
        borderRadius,
        imageScale,
        imageOffsetX,
        imageOffsetY
      );
    }
  }
  
  /**
   * Render shot number with precise DOM-like styling for consistency
   */
  private async renderShotNumberPrecise(number: string, bounds: Rectangle, scale: number): Promise<void> {
    // Use fixed dimensions from CSS (.shot-number-container > div)
    // CSS: width: 36px, height: 28px, font-size: 14px
    const fixedWidth = 36; // Fixed width from CSS
    const fixedHeight = 28; // Fixed height from CSS
    const fontSize = 14; // Fixed font size from CSS
    
    // Scale the dimensions
    const numberWidth = fixedWidth * scale;
    const numberHeight = fixedHeight * scale;
    const numberX = bounds.x - (2 * scale); // top: -2px left: -2px from CSS
    const numberY = bounds.y - (2 * scale);
    
    // Get theme values for shot number (with fallbacks)
    const theme = this.storyboardTheme?.shotNumber;
    const borderRadius = (theme?.borderRadius ?? 6) * scale;
    const borderWidth = theme?.borderEnabled && theme?.borderWidth 
      ? theme.borderWidth * scale 
      : 0;
    
    // Background - use theme value
    this.ctx.fillStyle = theme?.background || 'rgba(255, 255, 255, 0.95)';
    this.ctx.beginPath();
    
    // Use roundRect if available, otherwise fallback to regular rect
    if (typeof this.ctx.roundRect === 'function') {
      this.ctx.roundRect(numberX, numberY, numberWidth, numberHeight, borderRadius);
    } else {
      this.ctx.rect(numberX, numberY, numberWidth, numberHeight);
    }
    this.ctx.fill();
    
    // Border - use theme values if enabled
    if (borderWidth > 0 && theme?.borderEnabled) {
      this.ctx.strokeStyle = theme.border || 'rgba(0, 0, 0, 0.1)';
      this.ctx.lineWidth = borderWidth;
      this.ctx.beginPath();
      if (typeof this.ctx.roundRect === 'function') {
        this.ctx.roundRect(numberX, numberY, numberWidth, numberHeight, borderRadius);
      } else {
        this.ctx.rect(numberX, numberY, numberWidth, numberHeight);
      }
      this.ctx.stroke();
    }
    
    // Text - use theme text color (theme already declared above)
    this.ctx.fillStyle = theme?.text || '#374151';
    this.setFont('bold', fontSize * scale);
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const textX = numberX + (numberWidth / 2);
    const textY = numberY + (numberHeight / 2);
    
    this.ctx.fillText(number, textX, textY);
  }

  /**
   * Render shot number (legacy method)
   */
  private renderShotNumber(number: string, bounds: Rectangle, scale: number): void {
    // Shot number styling - match UI exactly (from index.css)
    // UI uses: font-size: 10px, font-bold, bg-blue-500, text-white, rounded, top-2 left-2
    const fontSize = 10 * scale; // Match UI font-size: 10px
    const containerPadding = 6 * scale; // px-1.5 = 6px horizontal padding
    const verticalPadding = 2 * scale; // py-0.5 = 2px vertical padding
    const margin = 8 * scale; // top-2 left-2 = 8px margin
    const borderRadius = 4 * scale; // rounded corners
    
    // Calculate container size - match UI min-width: 24px
    this.setFont('bold', fontSize);
    const textMetrics = this.ctx.measureText(number);
    const textWidth = textMetrics.width;
    const containerWidth = Math.max(24 * scale, textWidth + (containerPadding * 2));
    const containerHeight = fontSize + (verticalPadding * 2);
    
    // Position: top-left with margin (top-2 left-2)
    const containerX = bounds.x + margin;
    const containerY = bounds.y + margin;
    
    // Draw rounded background - bg-blue-500 (#3b82f6)
    this.ctx.fillStyle = '#3b82f6';
    this.ctx.beginPath();
    
    // Use roundRect if available, otherwise fallback to regular rect
    if (typeof this.ctx.roundRect === 'function') {
      this.ctx.roundRect(containerX, containerY, containerWidth, containerHeight, borderRadius);
    } else {
      // Fallback for browsers without roundRect support
      this.ctx.rect(containerX, containerY, containerWidth, containerHeight);
    }
    this.ctx.fill();
    
    // Draw text - text-white, font-bold, text-center
    this.ctx.fillStyle = '#ffffff';
    this.setFont('bold', fontSize);
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const textX = containerX + (containerWidth / 2);
    const textY = containerY + (containerHeight / 2);
    
    this.ctx.fillText(number, textX, textY);
  }
  
  /**
   * Render shot text (action or script)
   */
  private renderShotText(
    text: string,
    bounds: Rectangle,
    type: 'action' | 'script',
    scale: number
  ): void {
    const padding = 8 * scale;
    const textAreaHeight = 30 * scale;
    
    let textY: number;
    if (type === 'action') {
      textY = bounds.y + bounds.height - textAreaHeight - padding;
    } else {
      textY = bounds.y + bounds.height - padding;
    }
    
    const style: TextStyle = {
      family: 'Inter, system-ui, sans-serif',
      size: 10 * scale,
      weight: 'normal',
      color: '#374151',
      lineHeight: 1.2,
      textAlign: 'left'
    };
    
    this.renderText(
      text,
      bounds.x + padding,
      textY,
      bounds.width - (padding * 2),
      style,
      2 // Max lines
    );
  }
  
  /**
   * Render text with wrapping and styling
   */
  private renderText(
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    style: TextStyle,
    maxLines?: number
  ): number {
    // Set font using helper
    this.setFont(style.weight, style.size, style.family);
    this.ctx.fillStyle = style.color;
    this.ctx.textAlign = style.textAlign;
    this.ctx.textBaseline = 'top';
    
    // Wrap text
    const lines = LayoutCalculator.wrapText(text, maxWidth, this.ctx);
    
    // Limit lines if specified
    const renderLines = maxLines ? lines.slice(0, maxLines) : lines;
    
    // Calculate line height
    const lineHeight = style.size * style.lineHeight;
    
    // Render each line
    let currentY = y;
    for (const line of renderLines) {
      let lineX = x;
      
      if (style.textAlign === 'center') {
        lineX = x + (maxWidth / 2);
      } else if (style.textAlign === 'right') {
        lineX = x + maxWidth;
      }
      
      this.ctx.fillText(line, lineX, currentY);
      currentY += lineHeight;
    }
    
    return currentY;
  }
  
  /**
   * Export canvas as blob
   */
  async exportAsBlob(type: string = 'image/png', quality: number = 0.95): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new ExportError('Failed to create blob from canvas', 'EXPORT_ERROR'));
          }
        },
        type,
        quality
      );
    });
  }
  
  /**
   * Export canvas as data URL
   */
  exportAsDataURL(type: string = 'image/png', quality: number = 0.95): string {
    return this.canvas.toDataURL(type, quality);
  }
  
  /**
   * Process text with line breaks, splitting on \n and \r\n
   */
  private processTextWithLineBreaks(text: string): string[] {
    if (!text) return [];
    
    // Split on both \n and \r\n, then filter out empty lines
    return text.split(/\r?\n/).filter(line => line.trim() !== '');
  }
  
  /**
   * Render multiple lines of text with proper spacing
   */
  private renderTextLines(
    lines: string[],
    x: number,
    y: number,
    maxWidth: number,
    style: TextStyle,
    maxLines?: number
  ): number {
    if (!lines.length) return y;
    
    // Set font using helper
    this.setFont(style.weight, style.size, style.family);
    this.ctx.fillStyle = style.color;
    this.ctx.textAlign = style.textAlign;
    this.ctx.textBaseline = 'top';
    
    // Calculate line height
    const lineHeight = style.size * style.lineHeight;
    
    // Render each line, wrapping if necessary
    let currentY = y;
    let renderedLines = 0;
    
    for (const line of lines) {
      // Stop if we've reached max lines
      if (maxLines && renderedLines >= maxLines) {
        break;
      }
      
      // Wrap individual lines if they're too long
      const wrappedLines = LayoutCalculator.wrapText(line, maxWidth, this.ctx);
      
      for (const wrappedLine of wrappedLines) {
        // Stop if we've reached max lines after wrapping
        if (maxLines && renderedLines >= maxLines) {
          break;
        }
        
        let lineX = x;
        
        if (style.textAlign === 'center') {
          lineX = x + (maxWidth / 2);
        } else if (style.textAlign === 'right') {
          lineX = x + maxWidth;
        }
        
        this.ctx.fillText(wrappedLine, lineX, currentY);
        currentY += lineHeight;
        renderedLines++;
      }
    }
    
    return currentY;
  }
  
  /**
   * Render footer section with page numbers
   */
  private async renderFooter(exportPage: ExportStoryboardPage, pageNumber: number): Promise<void> {
    const { layout, header } = exportPage;
    const { footer } = layout;
    
    if (!footer || !header.templateSettings.showPageNumber) {
      return;
    }
    
    const scale = layout.canvas.scale;
    
    // Footer background
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(footer.x, footer.y, footer.width, footer.height);
    
    // Use the EXACT same padding calculation as ShotGrid footer
    const alignmentPadding = 33 * scale; // Align with header and shot card image frame edges
    const rightPadding = 24 * scale; // px-6 from ShotGrid footer
    const topPadding = 12 * scale; // py-3 from ShotGrid footer
    
    // Render page number text to match ShotGrid exactly
    const pageNumberText = `Page ${pageNumber}`;
    
    const style: TextStyle = {
      family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      size: 10 * scale, // text-xs in preview mode
      weight: 'normal',
      color: this.storyboardTheme?.header?.text || '#6b7280', // Use Header color from theme, fallback to gray
      lineHeight: 1.2,
      textAlign: 'right'
    };
    
    // Set font to measure text width
    this.setFont(style.weight, style.size, style.family);
    const textMetrics = this.ctx.measureText(pageNumberText);
    const actualTextWidth = textMetrics.width;
    
    // Use a larger width to ensure the text fits on one line, minimum 100px scaled
    const textWidth = Math.max(actualTextWidth + (20 * scale), 100 * scale); // Add some padding
    
    // Position text in bottom right, aligned with grid content
    const textX = footer.x + footer.width - alignmentPadding - textWidth;
    const textY = footer.y + topPadding;
    
    this.renderText(
      pageNumberText,
      textX,
      textY,
      textWidth,
      style
    );
  }
} 