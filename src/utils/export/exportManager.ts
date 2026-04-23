import { 
  StoryboardPage, 
  StoryboardState 
} from '@/store/storyboardStore';
import { 
  ExportOptions,
  ExportError,
} from '@/utils/types/exportTypes';
import { DataTransformer } from './dataTransformer';
import { CanvasRenderer } from './canvasRenderer';
import { DOMCapture } from './domCapture';
import { DOMRenderer } from './domRenderer';
import { PDFExportOptions } from '@/components/PDFExportModal';
import { buildServerPdfPayload, type ExportablePage } from './serverPdfPayload';

export class ExportManager {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private domRenderer: DOMRenderer;
  
  constructor() {
    // Create off-screen canvas for rendering
    this.canvas = document.createElement('canvas');
    this.renderer = new CanvasRenderer(this.canvas);
    this.domRenderer = new DOMRenderer(this.canvas);
  }
  
  /**
   * Export a storyboard page as PNG using DOM capture for perfect 1:1 matching
   */
  async exportPageAsPNG(
    page: StoryboardPage,
    storyboardState: StoryboardState,
    options: Partial<ExportOptions> = {}
  ): Promise<Blob> {
    const finalOptions: ExportOptions = {
      format: 'png',
      quality: 0.95,
      scale: 2,
      backgroundColor: '#ffffff',
      includeGrid: true,
      ...options
    };

    try {
      // Try DOM-based export first (higher quality)
      if (this.isDOMCaptureAvailable(page.id)) {
        const captureResult = await DOMCapture.captureStoryboardLayout(
          page.id,
          storyboardState,
          finalOptions.scale
        );
        
        await this.domRenderer.renderFromDOMCapture(captureResult);
        return await this.domRenderer.exportAsBlob('image/png', finalOptions.quality);
      } else {
        return await this.exportPageAsPNGLegacy(page, storyboardState, finalOptions);
      }
    } catch (error) {
      return await this.exportPageAsPNGLegacy(page, storyboardState, finalOptions);
    }
  }
  
  /**
   * Export storyboard pages as PDF
   */
  async exportPageAsPDF(
    pages: ExportablePage[],
    storyboardState: StoryboardState,
    filename: string,
    pdfOptions: PDFExportOptions,
    onProgress?: (current: number, total: number, pageName: string) => void
  ): Promise<void> {
    try {
      if (pages.length === 0) {
        throw new ExportError('No pages to export', 'NO_PAGES');
      }

      onProgress?.(1, pages.length, pages[0].name);

      const payload = await buildServerPdfPayload(pages, storyboardState, {
        filename,
        paperSize: pdfOptions.paperSize,
      });

      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw await this.createBackendExportError(response);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/pdf')) {
        const unexpectedBody = await response.text();
        throw new ExportError(
          `Export backend returned unexpected content type "${contentType || 'unknown'}": ${unexpectedBody.slice(0, 200)}`,
          'INVALID_PDF_RESPONSE'
        );
      }

      const pdfBlob = await response.blob();
      if (pdfBlob.size === 0) {
        throw new ExportError('Export backend returned an empty PDF response.', 'EMPTY_PDF_RESPONSE');
      }

      const downloadFilename =
        this.getFilenameFromContentDisposition(response.headers.get('content-disposition')) ||
        filename;

      this.downloadBlob(pdfBlob, downloadFilename);
    } catch (error) {
      throw new ExportError(
        `PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PDF_EXPORT_ERROR'
      );
    }
  }
  
  /**
   * Download PDF with specified pages
   */
  async downloadPDF(
    pages: ExportablePage[],
    storyboardState: StoryboardState,
    filename: string,
    pdfOptions: PDFExportOptions,
    onProgress?: (current: number, total: number, pageName: string) => void
  ): Promise<void> {
    try {
      await this.exportPageAsPDF(
        pages,
        storyboardState,
        filename,
        pdfOptions,
        onProgress
      );
    } catch (error) {
      throw new ExportError(
        `Failed to download PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DOWNLOAD_ERROR'
      );
    }
  }

  private async createBackendExportError(response: Response): Promise<ExportError> {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const errorBody = (await response.json().catch(() => null)) as
        | { error?: string; code?: string }
        | null;

      if (errorBody?.error) {
        return new ExportError(
          errorBody.error,
          errorBody.code || `EXPORT_HTTP_${response.status}`
        );
      }
    }

    const textBody = await response.text().catch(() => '');
    return new ExportError(
      `Export backend request failed with status ${response.status}${textBody ? `: ${textBody.slice(0, 200)}` : '.'}`,
      `EXPORT_HTTP_${response.status}`
    );
  }

  private getFilenameFromContentDisposition(contentDisposition: string | null): string | null {
    if (!contentDisposition) {
      return null;
    }

    const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1]);
    }

    const basicMatch = contentDisposition.match(/filename\s*=\s*"([^"]+)"|filename\s*=\s*([^;]+)/i);
    const filename = basicMatch?.[1] || basicMatch?.[2];
    return filename ? filename.trim() : null;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  }
  
  /**
   * Legacy export method (fallback when DOM capture is not available)
   */
  private async exportPageAsPNGLegacy(
    page: StoryboardPage,
    storyboardState: StoryboardState,
    options: Partial<ExportOptions> = {}
  ): Promise<Blob> {
    const finalOptions: ExportOptions = {
      format: 'png',
      quality: 0.95,
      scale: 2,
      width: 1000,
      backgroundColor: '#ffffff',
      includeGrid: true,
      ...options
    };

    try {
      // Transform page data for export
      const exportPage = await DataTransformer.transformStoryboardPage(
        page,
        storyboardState,
        finalOptions.width,
        finalOptions.scale
      );

      // Find the page index for page numbering
      const pageIndex = storyboardState.pages.findIndex(p => p.id === page.id);
      const pageNumber = pageIndex >= 0 ? pageIndex + 1 : 1;

      // Render to canvas
      await this.renderer.renderStoryboardPage(exportPage, pageNumber);

      // Export as blob
      return await this.renderer.exportAsBlob('image/png', finalOptions.quality);
    } catch (error) {
      throw new ExportError(
        `Legacy export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'LEGACY_EXPORT_ERROR'
      );
    }
  }
  
  /**
   * Export a storyboard page as data URL (for preview)
   */
  async exportPageAsDataURL(
    page: StoryboardPage,
    storyboardState: StoryboardState,
    options: Partial<ExportOptions> = {}
  ): Promise<string> {
    const finalOptions: ExportOptions = {
      format: 'png',
      quality: 0.95,
      scale: 2,
      backgroundColor: '#ffffff',
      includeGrid: true,
      ...options
    };

    try {
      // Try DOM-based export first
      if (this.isDOMCaptureAvailable(page.id)) {
        const captureResult = await DOMCapture.captureStoryboardLayout(
          page.id,
          storyboardState,
          finalOptions.scale
        );
        
        await this.domRenderer.renderFromDOMCapture(captureResult);
        return this.domRenderer.exportAsDataURL('image/png', finalOptions.quality);
      } else {
        // Fall back to legacy export
        const exportPage = await DataTransformer.transformStoryboardPage(
          page,
          storyboardState,
          finalOptions.width,
          finalOptions.scale
        );

        // Find the page index for page numbering
        const pageIndex = storyboardState.pages.findIndex(p => p.id === page.id);
        const pageNumber = pageIndex >= 0 ? pageIndex + 1 : 1;

        await this.renderer.renderStoryboardPage(exportPage, pageNumber);
        return this.renderer.exportAsDataURL('image/png', finalOptions.quality);
      }
    } catch (error) {
      throw new ExportError(
        `Data URL export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATA_URL_EXPORT_ERROR'
      );
    }
  }
  
  /**
   * Download exported page
   */
  async downloadPage(
    page: StoryboardPage,
    storyboardState: StoryboardState,
    filename?: string,
    options: Partial<ExportOptions> = {}
  ): Promise<void> {
    try {
      const blob = await this.exportPageAsPNG(page, storyboardState, options);
      
      const finalFilename = filename || `${page.name}_export_${Date.now()}.png`;
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = finalFilename.endsWith('.png') ? finalFilename : `${finalFilename}.png`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
      
    } catch (error) {
      throw new ExportError(
        `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DOWNLOAD_ERROR'
      );
    }
  }
  
  /**
   * Get canvas for debugging/preview
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
  
  /**
   * Check if DOM capture is available
   */
  isDOMCaptureAvailable(pageId: string): boolean {
    // DOM capture is available if the storyboard page element exists in the DOM
    return !!document.getElementById(`storyboard-page-${pageId}`);
  }
  
  /**
   * Get export system status
   */
  getExportSystemStatus(pageId: string, storyboardState: StoryboardState): {
    domCaptureAvailable: boolean;
    recommendedMode: 'dom' | 'legacy';
    warnings: string[];
  } {
    const domCaptureAvailable = this.isDOMCaptureAvailable(pageId);
    const warnings: string[] = [];

    if (!domCaptureAvailable) {
      warnings.push('DOM capture unavailable - using legacy export method');
    }

    const recommendedMode = domCaptureAvailable ? 'dom' : 'legacy';

    return {
      domCaptureAvailable,
      recommendedMode,
      warnings
    };
  }
  
  /**
   * Cleanup resources
   */
  dispose(): void {
    // Clean up canvas properly
    if (this.canvas) {
      // Clear canvas content
      const ctx = this.canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
      
      // Reset to minimal size to help browser release memory
      this.canvas.width = 1;
      this.canvas.height = 1;
    }
    
    // Release references to help garbage collection
    this.renderer = null;
    this.domRenderer = null;
  }
}

// Singleton instance for global use
export const exportManager = new ExportManager(); 