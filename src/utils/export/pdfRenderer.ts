import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { StoryboardPage, StoryboardState } from '@/store/storyboardStore';
import { PDFExportOptions } from '@/components/PDFExportModal';
import { ExportError } from '@/utils/types/exportTypes';

export interface PDFPageDimensions {
  width: number;
  height: number;
  margin: number;
  contentWidth: number;
  contentHeight: number;
}

export type ResolvePageElement = (pageId: string) => HTMLElement | null;

export class PDFRenderer {
  private doc: jsPDF;
  private options: PDFExportOptions;

  constructor(options: PDFExportOptions) {
    this.options = options;
    
    // Initialize jsPDF with the specified options
    const { width, height } = this.getPaperDimensions();
    this.doc = new jsPDF({
      orientation: 'landscape', // Default to landscape for storyboards
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
    storyboardState: StoryboardState,
    onProgress?: (current: number, total: number, pageName: string) => void,
    resolvePageElement?: ResolvePageElement
  ): Promise<Blob> {
    try {
      if (pages.length === 0) {
        throw new ExportError('No pages to export', 'NO_PAGES');
      }
      if (!resolvePageElement) {
        throw new ExportError(
          'PDF export requires explicit offscreen page resolver (no live fallback allowed)',
          'RESOLVER_REQUIRED'
        );
      }

      // Calculate dimensions for content fitting
      const pageDimensions = this.getPageDimensions();
      
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        
        // Report progress before rendering this page
        if (onProgress) {
          onProgress(i + 1, pages.length, page.name);
        }
        
        // Add new page if not the first one
        if (i > 0) {
          this.doc.addPage();
        }
        
        await this.renderPageToPDF(
          page,
          storyboardState,
          pageDimensions,
          i + 1,
          pages.length,
          resolvePageElement
        );
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
   * Render a single storyboard page to PDF using DOM capture
   */
  private async renderPageToPDF(
    page: StoryboardPage,
    _storyboardState: StoryboardState,
    pageDimensions: PDFPageDimensions,
    pageNumber: number,
    totalPages: number,
    resolvePageElement: ResolvePageElement
  ): Promise<void> {
    try {
      // Get the scale factor based on quality setting
      const scale = this.getQualityScale();
      console.log('🔍 PDF Export scale:', scale);

      if (totalPages === 1) {
        console.log('ℹ️ PDF export running in single-page mode');
      }

      // Use explicit resolver only. Do not fallback to live DOM IDs.
      const pageElement = resolvePageElement(page.id);
      if (!pageElement) {
        throw new ExportError(
          `Offscreen element resolution failed for page "${page.name}" (${page.id})`,
          'OFFSCREEN_ELEMENT_NOT_FOUND'
        );
      }

      try {
        console.log(`Capturing resolved offscreen element for page ${page.id}...`);
        const targetRect = pageElement.getBoundingClientRect();
        const targetComputedStyle = window.getComputedStyle(pageElement);
        console.log('🔎 Offscreen capture target debug:', {
          pageId: page.id,
          rect: {
            width: targetRect.width,
            height: targetRect.height,
            x: targetRect.x,
            y: targetRect.y
          },
          clientWidth: pageElement.clientWidth,
          clientHeight: pageElement.clientHeight,
          scrollWidth: pageElement.scrollWidth,
          scrollHeight: pageElement.scrollHeight,
          visibility: targetComputedStyle.visibility,
          opacity: targetComputedStyle.opacity
        });

        const canvas = await html2canvas(pageElement, {
          scale,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false
        });
        console.log('🔎 html2canvas result debug:', {
          pageId: page.id,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height
        });

        const dataUrl = canvas.toDataURL('image/png', 0.95);

        // Convert back to CSS pixel dimensions from scaled canvas.
        const canvasWidth = canvas.width / scale;
        const canvasHeight = canvas.height / scale;
        const canvasAspectRatio = canvasWidth / canvasHeight;
        
        console.log('🔍 PDF Dimensions DEBUG:', {
          canvasWidth,
          canvasHeight,
          scale,
          rawCanvasWidth: canvas.width,
          rawCanvasHeight: canvas.height
        });
      
      let imageWidth: number;
      let imageHeight: number;
      let x: number;
      let y: number;
      
      if (this.options.paperSize === 'canvas') {
        // Canvas mode: PDF page size matches canvas exactly (1:1 mapping)
        // In jsPDF, 1 point at default settings = 1 CSS pixel
        const pointsWidth = canvasWidth;
        const pointsHeight = canvasHeight;
        
        console.log('🔍 PDF Page Size:', {
          pointsWidth,
          pointsHeight,
          ratio: '1:1 (no DPI conversion)'
        });
        
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
        // Standard mode: always fit to paper size
        imageWidth = pageDimensions.contentWidth;
        imageHeight = pageDimensions.contentHeight;
        
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

        // Center the image on the page
        x = pageDimensions.margin + (pageDimensions.contentWidth - imageWidth) / 2;
        y = pageDimensions.margin + (pageDimensions.contentHeight - imageHeight) / 2;
      }

        // Add the storyboard image to PDF
        console.log('🔍 addImage params:', {
          canvasPixelSize: `${canvas.width}x${canvas.height}`,
          pdfPointSize: `${imageWidth}x${imageHeight}`,
          position: `${x},${y}`,
          scale
        });
        
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
          console.error('Export error:', error);
          throw error;
        }

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
      letter: { width: 612, height: 792 }
    };

    // Handle canvas size separately - it will be calculated dynamically
    if (this.options.paperSize === 'canvas') {
      // Return placeholder values - actual dimensions set in renderPageToPDF
      return { width: 0, height: 0 };
    }

    let { width, height } = dimensions[this.options.paperSize];

    // Always use landscape for storyboards
    [width, height] = [height, width];

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
    
    // Use no margins for storyboards (margins are built into the template)
    const margin = 0;
    
    return {
      width,
      height,
      margin,
      contentWidth: width,
      contentHeight: height
    };
  }

  /**
   * Get scale factor based on quality setting
   */
  private getQualityScale(): number {
    // Use high quality (2x scale) for optimal results
    return 2;
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