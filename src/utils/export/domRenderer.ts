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
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new ExportError('Failed to get canvas context', 'CANVAS_ERROR');
    }
    this.ctx = ctx;
  }
  
  /**
   * Render storyboard page using DOM-captured data
   */
  async renderFromDOMCapture(captureResult: DOMCaptureResult): Promise<void> {
    try {
      const { layout, header, grid, footer, backgroundColor } = captureResult;
      
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
    // Header background
    this.ctx.fillStyle = '#ffffff';
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
        size: rawFontSize * scale,
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
    
    // Render shot background
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    
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
    // CRITICAL: The image container has left/right borders (2px total) but NO top/bottom borders
    // So we subtract 2px from width but NOT from height
    const borderLeftRight = 2; // 1px border on left + 1px on right
    const containerWidth = (imageWidth / scale) - borderLeftRight; // Unscale and remove left/right borders
    const containerHeight = (imageHeight / scale); // No top/bottom borders to subtract!
    
    const imageOffsetX = imageOffsetXPercent * containerWidth;
    const imageOffsetY = imageOffsetYPercent * containerHeight;
    
    
    if (shot.imageData) {
      await this.renderImage(shot.imageData, imageBounds, imageScale, imageOffsetX, imageOffsetY);
    } else {
      // Render placeholder
      this.renderPlaceholder(imageBounds, scale);
    }
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
    const numberElement = shotElement.querySelector('.shot-number');
    if (!numberElement || !shot.number) return;
    
    const numberRect = numberElement.getBoundingClientRect();
    const shotRect = shotElement.getBoundingClientRect();
    
    // Calculate number position relative to shot
    const numberX = shotBounds.x + ((numberRect.left - shotRect.left) * scale);
    const numberY = shotBounds.y + ((numberRect.top - shotRect.top) * scale);
    const numberWidth = numberRect.width * scale;
    const numberHeight = numberRect.height * scale;
    
    // Get computed styles
    const computedStyle = window.getComputedStyle(numberElement);
    
    // Render background
    this.ctx.fillStyle = computedStyle.backgroundColor || 'rgba(255, 255, 255, 0.95)';
    this.ctx.beginPath();
    this.ctx.roundRect(numberX, numberY, numberWidth, numberHeight, 6 * scale);
    this.ctx.fill();
    
    // Render border if present
    if (computedStyle.border !== 'none') {
      this.ctx.strokeStyle = computedStyle.borderColor || 'rgba(0, 0, 0, 0.1)';
      this.ctx.lineWidth = parseFloat(computedStyle.borderWidth) || 0.5;
      this.ctx.stroke();
    }
    
    // Render text
    const rawFontSize = parseFloat(computedStyle.fontSize);
    this.ctx.fillStyle = computedStyle.color || '#374151';
    this.ctx.font = `${computedStyle.fontWeight} ${rawFontSize * scale}px ${computedStyle.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    console.log('🔍 Shot number DEBUG:', {
      shotNumber: shot.number,
      rawFontSize,
      scale,
      finalSize: rawFontSize * scale,
      numberWidth,
      numberHeight
    });
    
    const textX = numberX + (numberWidth / 2);
    const textY = numberY + (numberHeight / 2);
    
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
      const contentY = shotBounds.y + ((rect.top - shotRect.top + paddingTop) * scale);
      const contentWidth = (rect.width - paddingLeft - paddingRight) * scale;
      
      // Extract styling from DOM
      const rawFontSize = parseFloat(computedStyle.fontSize);
      const style: TextStyle = {
        family: computedStyle.fontFamily,
        size: rawFontSize * scale,
        weight: computedStyle.fontWeight as any,
        color: computedStyle.color,
        lineHeight: parseFloat(computedStyle.lineHeight) / rawFontSize || 1.2,
        textAlign: computedStyle.textAlign as any
      };
      
      // Render text
      const text = textElement.value || '';
      if (text) {
        console.log('🔍 Shot text DEBUG:', {
          shotId: shot.id,
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
      
      // Set up clipping region for container bounds with rounded corners (3px radius = rounded-sm in Tailwind)
      const borderRadius = 3 * (bounds.width / 100); // Scale radius proportionally
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
      
      // Add border around image container with rounded corners
      this.ctx.strokeStyle = '#e5e7eb';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      if (typeof this.ctx.roundRect === 'function') {
        this.ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, borderRadius);
      } else {
        this.ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
      }
      this.ctx.stroke();
    }
  }
  
  /**
   * Render placeholder for empty image slots
   */
  private renderPlaceholder(bounds: Rectangle, scale: number): void {
    // Background
    this.ctx.fillStyle = '#f3f4f6';
    this.ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    
    // Border
    this.ctx.strokeStyle = '#e5e7eb';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    
    // Plus icon
    const centerX = bounds.x + (bounds.width / 2);
    const centerY = bounds.y + (bounds.height / 2);
    
    this.ctx.strokeStyle = '#6b7280';
    this.ctx.lineWidth = 3 * scale;
    const iconSize = 16 * scale;
    
    // Horizontal line
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - iconSize, centerY);
    this.ctx.lineTo(centerX + iconSize, centerY);
    this.ctx.stroke();
    
    // Vertical line
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY - iconSize);
    this.ctx.lineTo(centerX, centerY + iconSize);
    this.ctx.stroke();
    
    // Text
    this.ctx.fillStyle = '#6b7280';
          this.ctx.font = `600 ${14 * scale}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Add Image', centerX, centerY + (24 * scale));
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
    this.ctx.font = `400 ${10 * scale}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    this.ctx.fillStyle = '#6b7280'; // text-gray-500
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