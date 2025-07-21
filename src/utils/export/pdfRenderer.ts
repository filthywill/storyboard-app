import jsPDF from 'jspdf';
import { StoryboardPage, StoryboardState } from '@/store/storyboardStore';
import { PDFExportOptions } from '@/components/PDFExportModal';
import { DataTransformer } from './dataTransformer';
import { CanvasRenderer } from './canvasRenderer';
import { ExportError } from '@/utils/types/exportTypes';

export interface PDFPageDimensions {
  width: number;
  height: number;
  margin: number;
  contentWidth: number;
  contentHeight: number;
}

export class PDFRenderer {
  private doc: jsPDF;
  private options: PDFExportOptions;

  constructor(options: PDFExportOptions) {
    this.options = options;
    
    // Initialize jsPDF with the specified options
    const { width, height } = this.getPaperDimensions();
    this.doc = new jsPDF({
      orientation: options.orientation,
      unit: 'pt',
      format: [width, height],
      compress: true
    });
  }

  /**
   * Export multiple pages to PDF
   */
  async exportPages(
    pages: StoryboardPage[],
    storyboardState: StoryboardState
  ): Promise<Blob> {
    try {
      if (pages.length === 0) {
        throw new ExportError('No pages to export', 'NO_PAGES');
      }

      // Calculate dimensions for content fitting
      const pageDimensions = this.getPageDimensions();
      
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        
        // Add new page if not the first one
        if (i > 0) {
          this.doc.addPage();
        }
        
        await this.renderPageToPDF(page, storyboardState, pageDimensions, i + 1, pages.length);
      }

      // Return as blob
      return new Blob([this.doc.output('arraybuffer')], { type: 'application/pdf' });
      
    } catch (error) {
      throw new ExportError(
        `PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PDF_EXPORT_ERROR'
      );
    }
  }

  /**
   * Render a single storyboard page to PDF
   */
  private async renderPageToPDF(
    page: StoryboardPage,
    storyboardState: StoryboardState,
    pageDimensions: PDFPageDimensions,
    pageNumber: number,
    totalPages: number
  ): Promise<void> {
    try {
      // Get the scale factor based on quality setting
      const scale = this.getQualityScale();
      
      // 1. Transform page data into a renderable format. This is DOM-independent.
      const exportPageData = await DataTransformer.transformStoryboardPage(
        page,
        storyboardState,
        1000, // Fixed width
        scale
      );

      // 2. Create a fresh, temporary canvas for this page to prevent state leakage.
      const tempCanvas = document.createElement('canvas');
      const renderer = new CanvasRenderer(tempCanvas);

      // 3. Render the data to the temporary canvas.
      await renderer.renderStoryboardPage(exportPageData, pageNumber);

      // 4. Get the result as a data URL.
      const dataUrl = renderer.exportAsDataURL('image/png', 0.95);
      
      // 5. Use the dimensions from the transformation, which are the source of truth.
      const canvasWidth = exportPageData.layout.canvas.width / scale;
      const canvasHeight = exportPageData.layout.canvas.height / scale;
      const canvasAspectRatio = canvasWidth / canvasHeight;
      
      let imageWidth: number;
      let imageHeight: number;
      let x: number;
      let y: number;
      
      if (this.options.paperSize === 'canvas') {
        // Canvas mode: PDF page size matches canvas exactly
        // Convert pixels to points (72 DPI: 1 point = 1 pixel at 72 DPI)
        const pointsWidth = canvasWidth * 72 / 96; // Convert from 96 DPI to 72 DPI
        const pointsHeight = canvasHeight * 72 / 96;
        
        // For canvas mode, we need to set the page size correctly
        if (pageNumber === 1) {
          // For the first page, delete the default page and add a new one with correct size
          this.doc.deletePage(1);
          this.doc.addPage([pointsWidth, pointsHeight], pointsWidth > pointsHeight ? 'landscape' : 'portrait');
        } else {
          // For subsequent pages, just add a new page with the correct size
          // Note: this.doc.addPage() was already called in exportPages(), so we need to set the size
          this.doc.deletePage(pageNumber); // Remove the blank page that was added
          this.doc.addPage([pointsWidth, pointsHeight], pointsWidth > pointsHeight ? 'landscape' : 'portrait');
        }
        
        // Image fills the entire page with no margins
        imageWidth = pointsWidth;
        imageHeight = pointsHeight;
        x = 0;
        y = 0;
        
        // Update pageDimensions for any subsequent operations
        pageDimensions.width = pointsWidth;
        pageDimensions.height = pointsHeight;
        pageDimensions.margin = 0;
        pageDimensions.contentWidth = pointsWidth;
        pageDimensions.contentHeight = pointsHeight;
        
      } else {
        // Standard mode: fit to paper size
        imageWidth = pageDimensions.contentWidth;
        imageHeight = pageDimensions.contentHeight;
        
        if (this.options.fitToPage) {
          // Calculate dimensions to fit while maintaining aspect ratio
          const pageAspectRatio = pageDimensions.contentWidth / pageDimensions.contentHeight;
          
          if (canvasAspectRatio > pageAspectRatio) {
            // Canvas is wider relative to page - fit to width
            imageWidth = pageDimensions.contentWidth;
            imageHeight = imageWidth / canvasAspectRatio;
          } else {
            // Canvas is taller relative to page - fit to height
            imageHeight = pageDimensions.contentHeight;
            imageWidth = imageHeight * canvasAspectRatio;
          }
        }

        // Center the image on the page
        x = pageDimensions.margin + (pageDimensions.contentWidth - imageWidth) / 2;
        y = pageDimensions.margin + (pageDimensions.contentHeight - imageHeight) / 2;
      }

      // Add the storyboard image to PDF
      this.doc.addImage(
        dataUrl,
        'PNG',
        x,
        y,
        imageWidth,
        imageHeight,
        undefined,
        'FAST' // Use fast compression for better performance
      );

    } catch (error) {
      throw new ExportError(
        `Failed to render page "${page.name}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PAGE_RENDER_ERROR'
      );
    }
  }

  /**
   * Add page title to PDF
   */
  private addPageTitle(
    title: string,
    dimensions: PDFPageDimensions
  ): void {
    const fontSize = 12;
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(50, 50, 50); // Dark gray color
    this.doc.setFont(undefined, 'bold');
    
    // Position at top left
    const x = dimensions.margin;
    const y = dimensions.margin / 2 + fontSize;
    
    this.doc.text(title, x, y);
    
    // Reset font to normal
    this.doc.setFont(undefined, 'normal');
  }

  /**
   * Get paper dimensions in points
   */
  private getPaperDimensions(): { width: number; height: number } {
    const dimensions = {
      letter: { width: 612, height: 792 },
      a4: { width: 595, height: 842 },
      a3: { width: 842, height: 1191 },
      tabloid: { width: 792, height: 1224 }
    };

    // Handle canvas size separately - it will be calculated dynamically
    if (this.options.paperSize === 'canvas') {
      // Return placeholder values - actual dimensions set in renderPageToPDF
      return { width: 0, height: 0 };
    }

    let { width, height } = dimensions[this.options.paperSize];

    // Swap dimensions for landscape
    if (this.options.orientation === 'landscape') {
      [width, height] = [height, width];
    }

    return { width, height };
  }

  /**
   * Get page dimensions including margins
   */
  private getPageDimensions(): PDFPageDimensions {
    if (this.options.paperSize === 'canvas') {
      // For canvas mode, we'll determine dimensions after getting canvas size
      // Return placeholder values that will be updated in renderPageToPDF
      return {
        width: 0,
        height: 0,
        margin: 0,
        contentWidth: 0,
        contentHeight: 0
      };
    }

    const { width, height } = this.getPaperDimensions();
    
    // Convert margin setting to points
    const marginMap = {
      none: 0,
      small: 18, // 0.25 inch
      medium: 36, // 0.5 inch
      large: 72  // 1 inch
    };
    
    const margin = marginMap[this.options.margin];
    
    return {
      width,
      height,
      margin,
      contentWidth: width - (margin * 2),
      contentHeight: height - (margin * 2)
    };
  }

  /**
   * Get scale factor based on quality setting
   */
  private getQualityScale(): number {
    const scaleMap = {
      standard: 1,    // 72 DPI equivalent
      high: 2,        // 150 DPI equivalent  
      print: 4        // 300 DPI equivalent
    };
    
    return scaleMap[this.options.quality];
  }

  /**
   * Get the PDF document (for testing or additional manipulation)
   */
  getDocument(): jsPDF {
    return this.doc;
  }

  /**
   * Save PDF to file
   */
  save(filename: string): void {
    this.doc.save(filename);
  }
} 