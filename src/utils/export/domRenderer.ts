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
      const { layout, header, grid, backgroundColor } = captureResult;
      
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
    
    await this.renderImage(header.logoImageData, logoBounds);
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
      const style: TextStyle = {
        family: computedStyle.fontFamily,
        size: parseFloat(computedStyle.fontSize) * scale,
        weight: computedStyle.fontWeight as any,
        color: computedStyle.color,
        lineHeight: parseFloat(computedStyle.lineHeight) / parseFloat(computedStyle.fontSize) || 1.2,
        textAlign: computedStyle.textAlign as any
      };
      
      // Render text
      const text = textElement.value || textElement.placeholder || '';
      if (text) {
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
    
    if (shot.imageData) {
      await this.renderImage(shot.imageData, imageBounds);
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
    this.ctx.fillStyle = computedStyle.color || '#374151';
    this.ctx.font = `${computedStyle.fontWeight} ${parseFloat(computedStyle.fontSize) * scale}px ${computedStyle.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
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
      const style: TextStyle = {
        family: computedStyle.fontFamily,
        size: parseFloat(computedStyle.fontSize) * scale,
        weight: computedStyle.fontWeight as any,
        color: computedStyle.color,
        lineHeight: parseFloat(computedStyle.lineHeight) / parseFloat(computedStyle.fontSize) || 1.2,
        textAlign: computedStyle.textAlign as any
      };
      
      // Render text
      const text = textElement.value || '';
      if (text) {
        this.renderTextFromDOM(text, contentX, contentY, contentWidth, style);
      }
    });
  }
  
  /**
   * Render image with proper aspect ratio preservation
   */
  private async renderImage(
    imageData: ImageData | HTMLImageElement,
    bounds: Rectangle
  ): Promise<void> {
    if (imageData instanceof HTMLImageElement) {
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
      
      // Draw the image (this will crop to fit the bounds)
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
      this.ctx.clip();
      this.ctx.drawImage(imageData, drawX, drawY, drawWidth, drawHeight);
      this.ctx.restore();
      
      // Add border around image container
      this.ctx.strokeStyle = '#e5e7eb';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
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
   * Render text with DOM-captured styling
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
    
    // Handle line breaks
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    
    // Calculate line height
    const lineHeight = style.size * style.lineHeight;
    
    // Render each line
    let currentY = y;
    for (const line of lines) {
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