import { 
  ExportStoryboardPage,
  ExportShot,
  Rectangle,
  TextStyle,
  ExportError
} from '@/utils/types/exportTypes';
import { DOMCaptureResult } from './domCapture';

export class DOMRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private storyboardState: any;
  private scale: number = 1;
  private fontsLoaded: boolean = false;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new ExportError('Failed to get canvas context', 'CANVAS_ERROR');
    }
    this.ctx = ctx;
  }
  
  /**
   * Ensure Inter font is loaded before rendering
   */
  private async ensureFontsLoaded(): Promise<void> {
    if (this.fontsLoaded) return;
    
    try {
      // Load various weights/styles of Inter that we use
      await Promise.all([
        document.fonts.load('bold 14px Inter'),      // Shot numbers
        document.fonts.load('600 12px Inter'),       // Action text (font-semibold)
        document.fonts.load('400 12px Inter'),       // Script text
        document.fonts.load('normal 12px Inter'),    // General text
      ]);
      
      // Verify the fonts are loaded
      const isBoldLoaded = document.fonts.check('bold 14px Inter');
      const is600Loaded = document.fonts.check('600 12px Inter');
      
      if (isBoldLoaded && is600Loaded) {
        console.log('✅ Inter font loaded successfully for canvas');
        this.fontsLoaded = true;
      } else {
        console.warn('⚠️ Inter font not fully loaded, will use fallback');
        this.fontsLoaded = false;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load Inter font:', error);
      this.fontsLoaded = false;
    }
  }
  
  /**
   * Global font size multiplier for canvas rendering
   * Canvas renders fonts slightly differently than DOM, so we need a small adjustment
   * This is applied globally to ALL text in the PDF export for consistency
   */
  private readonly FONT_SIZE_MULTIPLIER = 1.12;
  
  /**
   * Get the scaled font size for canvas rendering
   * Apply this globally to all text to ensure consistent sizing
   */
  private getScaledFontSize(rawFontSize: number, scale: number): number {
    return rawFontSize * this.FONT_SIZE_MULTIPLIER * scale;
  }
  
  /**
   * @deprecated Use getScaledFontSize() instead
   * Kept for backward compatibility
   */
  private getCanvasFontMultiplier(): number {
    return this.FONT_SIZE_MULTIPLIER;
  }
  
  /**
   * Render storyboard page using DOM-captured data
   */
  async renderFromDOMCapture(captureResult: DOMCaptureResult): Promise<void> {
    try {
      const { layout, header, grid, footer, backgroundColor, storyboardState } = captureResult;
      this.storyboardState = storyboardState;
      this.scale = layout.canvas.scale;
      
      // Ensure fonts are loaded before rendering
      await this.ensureFontsLoaded();
      
      // Set canvas dimensions
      this.canvas.width = layout.canvas.width;
      this.canvas.height = layout.canvas.height;
      
      // Clear canvas with background color
      this.ctx.fillStyle = backgroundColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Render header using DOM-captured layout
      await this.renderHeaderFromDOM(header, layout.header, layout.canvas.scale);
      
      // Render grid using DOM-captured layout
      await this.renderGridFromDOM(grid, layout.canvas.scale);
      
      // Render footer (page number) if present
      if (footer && footer.text) {
        this.renderFooterFromDOM(footer.bounds, footer.text, footer.justify, layout.canvas.scale);
      }
      
    } catch (error) {
      throw new ExportError(
        `Failed to render from DOM capture: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'RENDER_ERROR'
      );
    }
  }
  
  /**
   * Render header using DOM-captured dimensions and positioning
   */
  private async renderHeaderFromDOM(
    header: any,
    headerBounds: Rectangle,
    scale: number
  ): Promise<void> {
    // Header background - use theme's contentBackground (Page Style > Bg)
    const headerBackground = this.storyboardState?.storyboardTheme?.contentBackground || '#ffffff';
    this.ctx.fillStyle = headerBackground;
    this.ctx.fillRect(headerBounds.x, headerBounds.y, headerBounds.width, headerBounds.height);
    
    // Find and render header elements by querying the actual DOM
    const pageElement = document.querySelector('[id^="storyboard-page-"]');
    if (!pageElement) return;
    
    const headerElement = pageElement.children[0]; // MasterHeader is first child
    if (!headerElement) return;
    
    // Render logo if present
    await this.renderHeaderLogo(headerElement, header, headerBounds, scale);
    
    // Render text elements
    await this.renderHeaderText(headerElement, header, headerBounds, scale);
  }
  
  /**
   * Render logo using actual DOM positioning
   */
  private async renderHeaderLogo(
    headerElement: Element,
    header: any,
    headerBounds: Rectangle,
    scale: number
  ): Promise<void> {
    if (!header.templateSettings.showLogo || !header.logoImageData) return;
    
    // Find logo element in DOM
    const logoElement = headerElement.querySelector('img[alt="Project Logo"]');
    if (!logoElement) return;
    
    const logoRect = logoElement.getBoundingClientRect();
    const headerRect = headerElement.getBoundingClientRect();
    
    // Calculate logo position relative to header
    const logoX = headerBounds.x + ((logoRect.left - headerRect.left) * scale);
    const logoY = headerBounds.y + ((logoRect.top - headerRect.top) * scale);
    const logoWidth = logoRect.width * scale;
    const logoHeight = logoRect.height * scale;
    
    // Render logo
    const logoBounds = {
      x: logoX,
      y: logoY,
      width: logoWidth,
      height: logoHeight
    };
    
    // Logo uses object-contain (not object-cover)
    await this.renderImage(header.logoImageData, logoBounds, 1.0, 0, 0, 'contain');
  }
  
  /**
   * Render header text using actual DOM positioning and styling
   */
  private async renderHeaderText(
    headerElement: Element,
    header: any,
    headerBounds: Rectangle,
    scale: number
  ): Promise<void> {
    const headerRect = headerElement.getBoundingClientRect();
    
    // Find and render each text element
    const textElements = headerElement.querySelectorAll('textarea');
    
    textElements.forEach(textElement => {
      const rect = textElement.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(textElement);

      // Adjust for padding inside the textarea
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
      const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
      
      // Calculate position of the content box, not the border box
      const contentX = headerBounds.x + ((rect.left - headerRect.left + paddingLeft) * scale);
      const contentY = headerBounds.y + ((rect.top - headerRect.top + paddingTop) * scale);
      const contentWidth = (rect.width - paddingLeft - paddingRight) * scale;
      
      // Extract styling from DOM
      const rawFontSize = parseFloat(computedStyle.fontSize);
      const style: TextStyle = {
        family: computedStyle.fontFamily,
        size: this.getScaledFontSize(rawFontSize, scale),
        weight: computedStyle.fontWeight as any,
        color: computedStyle.color,
        lineHeight: parseFloat(computedStyle.lineHeight) / rawFontSize || 1.2,
        textAlign: computedStyle.textAlign as any
      };
      
      // Render text
      const text = textElement.value || textElement.placeholder || '';
      if (text) {
        console.log('🔍 Header text DEBUG:', {
          rawFontSize,
          scale,
          finalSize: style.size,
          textContent: text.substring(0, 20)
        });
        this.renderTextFromDOM(text, contentX, contentY, contentWidth, style);
      }
    });
  }
  
  /**
   * Render grid using DOM-captured layout
   */
  private async renderGridFromDOM(grid: any, scale: number): Promise<void> {
    // Render each shot using its captured bounds
    for (const shot of grid.shots) {
      await this.renderShotFromDOM(shot, scale);
    }
  }
  
  /**
   * Render individual shot using DOM-captured data
   */
  private async renderShotFromDOM(shot: ExportShot, scale: number): Promise<void> {
    const bounds = shot.bounds;
    
    // Find the corresponding shot element in DOM
    const pageElement = document.querySelector('[id^="storyboard-page-"]');
    if (!pageElement) return;
    
    const gridElement = pageElement.querySelector('[style*="grid-template-columns"]');
    if (!gridElement) return;
    
    const shotElements = Array.from(gridElement.children).filter(child => 
      child.classList.contains('group') || child.querySelector('.shot-number')
    );
    
    // Find shot element by matching shot number or position
    let shotElement: Element | null = null;
    for (const element of shotElements) {
      const numberElement = element.querySelector('.shot-number');
      if (numberElement?.textContent === shot.number) {
        shotElement = element;
        break;
      }
    }
    
    if (!shotElement) return;
    
    // Get theme values for shot card
    const theme = this.storyboardState?.storyboardTheme?.shotCard;
    const borderRadius = (theme?.borderRadius ?? 8) * scale;
    
    // Render shot background only if enabled
    if (theme?.backgroundEnabled) {
      const backgroundColor = theme?.background || '#ffffff';
      this.ctx.fillStyle = backgroundColor;
      this.ctx.beginPath();
      if (typeof this.ctx.roundRect === 'function') {
        this.ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, borderRadius);
      } else {
        this.ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
      }
      this.ctx.fill();
    }
    
    // Render shot card border if enabled
    if (theme?.borderEnabled && theme?.borderWidth) {
      const borderWidth = theme.borderWidth * scale;
      this.ctx.strokeStyle = theme.border || '#cccccc';
      this.ctx.lineWidth = borderWidth;
      this.ctx.beginPath();
      
      // Inset the border path by half the border width to draw inside (border-box behavior)
      const inset = borderWidth / 2;
      const innerX = bounds.x + inset;
      const innerY = bounds.y + inset;
      const innerWidth = bounds.width - borderWidth;
      const innerHeight = bounds.height - borderWidth;
      const innerRadius = Math.max(0, borderRadius - inset);
      
      if (typeof this.ctx.roundRect === 'function') {
        this.ctx.roundRect(innerX, innerY, innerWidth, innerHeight, innerRadius);
      } else {
        this.ctx.rect(innerX, innerY, innerWidth, innerHeight);
      }
      this.ctx.stroke();
    }
    
    // Render shot image
    await this.renderShotImage(shot, shotElement, bounds, scale);
    
    // Render shot number
    this.renderShotNumber(shot, shotElement, bounds, scale);
    
    // Render shot text
    this.renderShotText(shot, shotElement, bounds, scale);
  }
  
  /**
   * Render shot image using DOM positioning
   */
  private async renderShotImage(
    shot: ExportShot,
    shotElement: Element,
    shotBounds: Rectangle,
    scale: number
  ): Promise<void> {
    // Find image container in shot element
    const imageContainer = shotElement.querySelector('[style*="aspect-ratio"]') || 
                          shotElement.querySelector('.relative.w-full');
    
    if (!imageContainer) return;
    
    const containerRect = imageContainer.getBoundingClientRect();
    const shotRect = shotElement.getBoundingClientRect();
    
    // Calculate image bounds relative to shot
    const imageX = shotBounds.x + ((containerRect.left - shotRect.left) * scale);
    const imageY = shotBounds.y + ((containerRect.top - shotRect.top) * scale);
    const imageWidth = containerRect.width * scale;
    const imageHeight = containerRect.height * scale;
    
    const imageBounds = {
      x: imageX,
      y: imageY,
      width: imageWidth,
      height: imageHeight
    };
    
    // Get transform data directly from shot (percentage values from store)
    // We MUST use store values, not inline style, because inline style contains
    // pixels calculated for the SCALED view, but PDF captures at UNSCALED size
    const imageScale = shot.imageScale || 1.0;
    const imageOffsetXPercent = shot.imageOffsetX || 0; // Percentage (0.0 to 1.0)
    const imageOffsetYPercent = shot.imageOffsetY || 0; // Percentage (0.0 to 1.0)
    
    // Convert percentage offsets to pixels based on ACTUAL captured container size
    // imageBounds already reflects the correct container size after transform removal
    // CRITICAL: The image container has borders based on theme
    // Subtract border width from container dimensions for accurate positioning
    const borderWidth = this.storyboardState?.storyboardTheme?.imageFrame?.borderEnabled 
      ? this.storyboardState.storyboardTheme.imageFrame.borderWidth 
      : 0;
    const borderLeftRight = borderWidth * 2; // border on left + right
    const containerWidth = (imageWidth / scale) - borderLeftRight;
    const containerHeight = (imageHeight / scale);
    
    // Calculate offsets in unscaled coordinates, then scale for canvas
    // Offsets are percentages of container size, but need to be in scaled canvas coordinates
    const imageOffsetX = imageOffsetXPercent * containerWidth * scale;
    const imageOffsetY = imageOffsetYPercent * containerHeight * scale;
    
    
    if (shot.imageData) {
      await this.renderImage(shot.imageData, imageBounds, imageScale, imageOffsetX, imageOffsetY);
    } else {
      // Render placeholder
      this.renderPlaceholder(imageBounds, scale);
    }
  }
  
  /**
   * Measure actual text rendering size in browser vs canvas
   */
  private measureTextScaleFactor(
    text: string,
    fontWeight: string,
    fontSize: number,
    fontFamily: string
  ): number {
    // Create temporary DOM element to measure actual browser rendering
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = `
      position: absolute;
      top: -10000px;
      left: -10000px;
      font-weight: ${fontWeight};
      font-size: ${fontSize}px;
      font-family: ${fontFamily};
      white-space: nowrap;
      visibility: hidden;
      padding: 0;
      margin: 0;
      border: none;
    `;
    tempDiv.textContent = text;
    document.body.appendChild(tempDiv);
    
    // Measure actual rendered size in DOM
    const domRect = tempDiv.getBoundingClientRect();
    const domTextWidth = domRect.width;
    const domTextHeight = domRect.height;
    
    // Clean up
    document.body.removeChild(tempDiv);
    
    // Measure canvas text size
    this.ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const canvasMetrics = this.ctx.measureText(text);
    const canvasTextWidth = canvasMetrics.width;
    
    // Calculate scale factor needed to make canvas text match DOM text
    // We primarily care about width since that's most noticeable
    const scaleFactor = domTextWidth / canvasTextWidth;
    
    console.log('🔍 Text Scale Factor:', {
      text,
      fontSize,
      domWidth: domTextWidth,
      domHeight: domTextHeight,
      canvasWidth: canvasTextWidth,
      scaleFactor: scaleFactor.toFixed(3)
    });
    
    return scaleFactor;
  }

  /**
   * Render shot number using DOM positioning
   */
  private renderShotNumber(
    shot: ExportShot,
    shotElement: Element,
    shotBounds: Rectangle,
    scale: number
  ): void {
    // Query the container first, then get the actual number div inside
    const numberContainer = shotElement.querySelector('.shot-number-container');
    if (!numberContainer || !shot.number) return;
    
    const numberElement = numberContainer.querySelector('.shot-number');
    if (!numberElement) return;
    
    const numberRect = numberElement.getBoundingClientRect();
    const shotRect = shotElement.getBoundingClientRect();
    
    // Get computed styles
    const computedStyle = window.getComputedStyle(numberElement);
    const rawFontSize = parseFloat(computedStyle.fontSize) || 14;
    const fontWeight = computedStyle.fontWeight || 'bold';
    
    // Use Inter if loaded, otherwise fall back to system fonts
    const fontFamily = this.fontsLoaded 
      ? 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      : 'Arial, Helvetica, sans-serif';
    
    // Use MEASURED dimensions from DOM (browser's actual rendered size with border-box sizing)
    const measuredWidth = numberRect.width;
    const measuredHeight = numberRect.height;
    
    // Calculate number position relative to shot (position from DOM)
    const numberX = shotBounds.x + ((numberRect.left - shotRect.left) * scale);
    const numberY = shotBounds.y + ((numberRect.top - shotRect.top) * scale);
    
    // Use measured dimensions scaled to canvas
    const numberWidth = measuredWidth * scale;
    const numberHeight = measuredHeight * scale;
    
    // Get theme values for shot number (with fallbacks)
    const theme = this.storyboardState?.storyboardTheme?.shotNumber;
    const borderRadius = (theme?.borderRadius ?? 6) * scale;
    const borderWidth = theme?.borderEnabled && theme?.borderWidth 
      ? theme.borderWidth * scale 
      : 0;
    
    // Render background - fill the entire measured box
    this.ctx.fillStyle = theme?.background || 'rgba(255, 255, 255, 0.95)';
    this.ctx.beginPath();
    if (typeof this.ctx.roundRect === 'function') {
      this.ctx.roundRect(numberX, numberY, numberWidth, numberHeight, borderRadius);
    } else {
      this.ctx.rect(numberX, numberY, numberWidth, numberHeight);
    }
    this.ctx.fill();
    
    // Render border if enabled - draw INSIDE the box to match border-box behavior
    if (borderWidth > 0 && theme?.borderEnabled) {
      this.ctx.strokeStyle = theme.border || 'rgba(0, 0, 0, 0.1)';
      this.ctx.lineWidth = borderWidth;
      this.ctx.beginPath();
      
      // Inset the border path by half the border width to draw inside
      const inset = borderWidth / 2;
      const innerX = numberX + inset;
      const innerY = numberY + inset;
      const innerWidth = numberWidth - borderWidth;
      const innerHeight = numberHeight - borderWidth;
      const innerRadius = Math.max(0, borderRadius - inset);
      
      if (typeof this.ctx.roundRect === 'function') {
        this.ctx.roundRect(innerX, innerY, innerWidth, innerHeight, innerRadius);
      } else {
        this.ctx.rect(innerX, innerY, innerWidth, innerHeight);
      }
      this.ctx.stroke();
    }
    
    // Render text - use global font size scaling for consistency
    this.ctx.fillStyle = theme?.text || '#374151';
    const scaledFontSize = this.getScaledFontSize(rawFontSize, scale);
    this.ctx.font = `${fontWeight} ${scaledFontSize}px ${fontFamily}`;
    this.ctx.textAlign = 'center';
    
    // Use 'alphabetic' baseline for better vertical centering
    // Position the baseline at 65% down the box height for optimal visual centering
    // This accounts for the descender space and matches how CSS centers text
    // Higher percentage moves text down, making it appear more centered visually
    this.ctx.textBaseline = 'alphabetic';
    
    const textX = numberX + (numberWidth / 2);
    const textY = numberY + (numberHeight * 0.68); // Adjusted to match browser visual center
    
    this.ctx.fillText(shot.number, textX, textY);
  }
  
  /**
   * Render shot text using DOM positioning
   */
  private renderShotText(
    shot: ExportShot,
    shotElement: Element,
    shotBounds: Rectangle,
    scale: number
  ): void {
    const textElements = shotElement.querySelectorAll('textarea');
    const shotRect = shotElement.getBoundingClientRect();
    
    textElements.forEach(textElement => {
      const rect = textElement.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(textElement);
      
      // Adjust for padding inside the textarea
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
      const paddingRight = parseFloat(computedStyle.paddingRight) || 0;

      // Calculate position of the content box, not the border box
      const contentX = shotBounds.x + ((rect.left - shotRect.left + paddingLeft) * scale);
      
      // CRITICAL FIX for spacing: Add extra spacing to match browser rendering
      // Canvas doesn't account for CSS "half-leading" space above text lines
      // Adding ~6px compensates for the visual gap that CSS line-height creates
      const extraSpacing = 6; // Additional pixels to match browser visual spacing
      const contentY = shotBounds.y + ((rect.top - shotRect.top + extraSpacing) * scale);
      const contentWidth = (rect.width - paddingLeft - paddingRight) * scale;
      
      // Extract styling from DOM
      const rawFontSize = parseFloat(computedStyle.fontSize);
      const fontWeight = computedStyle.fontWeight || 'normal';
      
      // Use Inter if loaded, otherwise fall back to system fonts
      const fontFamily = this.fontsLoaded 
        ? 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        : 'Arial, Helvetica, sans-serif';
      
      // Get actual line height from computed style (may be "normal" or a pixel value)
      const computedLineHeight = computedStyle.lineHeight;
      let lineHeightRatio: number;
      if (computedLineHeight === 'normal') {
        // Browser default is typically 1.2 for normal
        lineHeightRatio = 1.2;
      } else {
        // Parse pixel value and convert to ratio based on RAW font size
        const lineHeightPx = parseFloat(computedLineHeight);
        lineHeightRatio = lineHeightPx / rawFontSize;
      }
      
      const style: TextStyle = {
        family: fontFamily,
        size: this.getScaledFontSize(rawFontSize, scale),
        weight: fontWeight as any,
        color: computedStyle.color,
        lineHeight: lineHeightRatio,
        textAlign: computedStyle.textAlign as any
      };
      
      // Render text
      const text = textElement.value || '';
      if (text) {
        console.log('🔍 Shot text DEBUG:', {
          shotId: shot.id,
          rawFontSize,
          multiplier: this.FONT_SIZE_MULTIPLIER,
          scaledFontSize: style.size.toFixed(2),
          scale,
          lineHeightRatio: lineHeightRatio.toFixed(3),
          computedLineHeight,
          textContent: text.substring(0, 20)
        });
        this.renderTextFromDOM(text, contentX, contentY, contentWidth, style);
      }
    });
  }
  
  /**
   * Render image with proper aspect ratio preservation and CSS transforms
   */
  private async renderImage(
    imageData: ImageData | HTMLImageElement,
    bounds: Rectangle,
    imageScale: number = 1.0,
    imageOffsetX: number = 0,
    imageOffsetY: number = 0,
    objectFit: 'cover' | 'contain' = 'cover'
  ): Promise<void> {
    if (imageData instanceof HTMLImageElement) {
      // Calculate aspect ratio preserving fit
      const imgAspect = imageData.naturalWidth / imageData.naturalHeight;
      const boundsAspect = bounds.width / bounds.height;
      
      let drawWidth = bounds.width;
      let drawHeight = bounds.height;
      
      if (objectFit === 'cover') {
        // object-cover: fill container, crop overflow
        if (imgAspect > boundsAspect) {
          // Image is wider - fit to height (crop sides)
          drawWidth = bounds.height * imgAspect;
        } else {
          // Image is taller - fit to width (crop top/bottom)
          drawHeight = bounds.width / imgAspect;
        }
      } else {
        // object-contain: show full image, add letterboxing
        if (imgAspect > boundsAspect) {
          // Image is wider - fit to width (letterbox top/bottom)
          drawHeight = bounds.width / imgAspect;
        } else {
          // Image is taller - fit to height (letterbox sides)
          drawWidth = bounds.height * imgAspect;
        }
      }
      
      // Draw the image with CSS-like transforms applied
      this.ctx.save();
      
      // Set up clipping region for container bounds with rounded corners (use theme border radius, scaled)
      const borderRadius = (this.storyboardState?.storyboardTheme?.shotCard?.borderRadius ?? 3) * this.scale;
      this.ctx.beginPath();
      if (typeof this.ctx.roundRect === 'function') {
        this.ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, borderRadius);
      } else {
        // Fallback for browsers without roundRect support
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
      
      // 3. Apply translate
      // SIMPLIFIED APPROACH: Don't divide or multiply - just use the values directly
      // The offsets are already calculated correctly as pixels in the container
      // CSS transform order: scale() translate() applies in the SCALED coordinate system
      // Canvas: after scale(), translate() ALSO applies in the scaled coordinate system
      // So they should match if we use the same values!
      this.ctx.translate(imageOffsetX, imageOffsetY);
      
      // 4. Draw image centered at origin (since object-cover centers by default)
      // The image is drawn such that its center is at the current transform origin
      this.ctx.drawImage(
        imageData,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      );
      
      this.ctx.restore();
      
      // Add border around image container with rounded corners (theme-aware)
      if (this.storyboardState?.storyboardTheme?.imageFrame?.borderEnabled) {
        this.ctx.strokeStyle = this.storyboardState.storyboardTheme.imageFrame.border;
        this.ctx.lineWidth = this.storyboardState.storyboardTheme.imageFrame.borderWidth * this.scale;
        this.ctx.beginPath();
        if (typeof this.ctx.roundRect === 'function') {
          this.ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, borderRadius);
        } else {
          this.ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
        }
        this.ctx.stroke();
      }
    }
  }
  
  /**
   * Render placeholder for empty image slots
   * Clean background only - no icons or text for professional PDF exports
   */
  private renderPlaceholder(bounds: Rectangle, scale: number): void {
    // Background (light gray to indicate empty state)
    this.ctx.fillStyle = '#f3f4f6';
    this.ctx.beginPath();
    
    // Use same border radius as shot card (image container uses shot card radius)
    const borderRadius = (this.storyboardState?.storyboardTheme?.shotCard?.borderRadius ?? 3) * scale;
    
    if (typeof this.ctx.roundRect === 'function') {
      this.ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, borderRadius);
    } else {
      this.ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
    }
    this.ctx.fill();
    
    // Border (theme-aware with rounded corners)
    if (this.storyboardState?.storyboardTheme?.imageFrame?.borderEnabled) {
      this.ctx.strokeStyle = this.storyboardState.storyboardTheme.imageFrame.border;
      this.ctx.lineWidth = this.storyboardState.storyboardTheme.imageFrame.borderWidth * scale;
      this.ctx.beginPath();
      if (typeof this.ctx.roundRect === 'function') {
        this.ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, borderRadius);
      } else {
        this.ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
      }
      this.ctx.stroke();
    }
    
    // No placeholder icons or text in PDF exports - keeps it clean and professional
  }
  
  /**
   * Render footer (page number) using DOM-captured positioning
   */
  private renderFooterFromDOM(
    bounds: Rectangle,
    text: string,
    justify: 'start' | 'center' | 'end',
    scale: number
  ): void {
    // Set font for page number (match the styling from ShotGrid footer)
    // Apply global font size multiplier for consistency
    const rawFontSize = 10; // text-xs = 10px
    const scaledFontSize = this.getScaledFontSize(rawFontSize, scale);
    this.ctx.font = `400 ${scaledFontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    this.ctx.fillStyle = this.storyboardState?.storyboardTheme?.header?.text || '#6b7280'; // Use Header color from theme, fallback to gray
    this.ctx.textBaseline = 'top';
    
    // Calculate text position and alignment based on flex justify
    let textX = bounds.x;
    if (justify === 'end') {
      this.ctx.textAlign = 'right';
      textX = bounds.x + bounds.width;
    } else if (justify === 'center') {
      this.ctx.textAlign = 'center';
      textX = bounds.x + (bounds.width / 2);
    } else {
      this.ctx.textAlign = 'left';
      textX = bounds.x;
    }
    
    console.log('🔍 Rendering footer:', {
      text,
      justify,
      textX,
      boundsX: bounds.x,
      boundsWidth: bounds.width,
      textAlign: this.ctx.textAlign
    });
    
    // Render the page number text
    this.ctx.fillText(text, textX, bounds.y);
  }
  
  /**
   * Render text with DOM-captured styling and proper word wrapping
   */
  private renderTextFromDOM(
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    style: TextStyle
  ): void {
    // Set font
    this.ctx.font = `${style.weight} ${style.size}px ${style.family}`;
    this.ctx.fillStyle = style.color;
    this.ctx.textAlign = style.textAlign;
    this.ctx.textBaseline = 'top';
    
    // Calculate line height
    const lineHeight = style.size * style.lineHeight;
    
    // Split by explicit line breaks first
    const paragraphs = text.split(/\r?\n/);
    const wrappedLines: string[] = [];
    
    // Word wrap each paragraph
    for (const paragraph of paragraphs) {
      if (paragraph.trim() === '') {
        wrappedLines.push(''); // Preserve empty lines
        continue;
      }
      
      // Word wrap logic
      const words = paragraph.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = this.ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && currentLine) {
          // Line is too long, push current line and start new one
          wrappedLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        wrappedLines.push(currentLine);
      }
    }
    
    // Render each line
    let currentY = y;
    for (const line of wrappedLines) {
      let lineX = x;
      
      if (style.textAlign === 'center') {
        lineX = x + (maxWidth / 2);
      } else if (style.textAlign === 'right') {
        lineX = x + maxWidth;
      }
      
      this.ctx.fillText(line, lineX, currentY);
      currentY += lineHeight;
    }
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
} 