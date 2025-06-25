
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { StoryboardPage } from '@/store/storyboardStore';

export interface ExportOptions {
  format: 'png' | 'pdf';
  quality: number;
  scale: number;
  includeGrid: boolean;
}

export const defaultExportOptions: ExportOptions = {
  format: 'png',
  quality: 0.95,
  scale: 2,
  includeGrid: true
};

/**
 * Export a single storyboard page as PNG
 */
export const exportPageAsPNG = async (
  elementId: string,
  filename: string,
  options: Partial<ExportOptions> = {}
): Promise<void> => {
  const opts = { ...defaultExportOptions, ...options };
  
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    // Hide grid lines if needed
    if (!opts.includeGrid) {
      element.classList.add('export-mode');
    }

    const canvas = await html2canvas(element, {
      scale: opts.scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      ignoreElements: (element) => {
        return element.classList.contains('export-ignore');
      }
    });

    // Restore grid lines
    if (!opts.includeGrid) {
      element.classList.remove('export-mode');
    }

    // Create download link
    canvas.toBlob((blob) => {
      if (!blob) return;
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = url;
      link.click();
      
      // Cleanup
      URL.revokeObjectURL(url);
    }, 'image/png', opts.quality);
    
  } catch (error) {
    console.error('Error exporting page as PNG:', error);
    throw error;
  }
};

/**
 * Export multiple storyboard pages as PDF
 */
export const exportPagesAsPDF = async (
  pages: StoryboardPage[],
  filename: string,
  options: Partial<ExportOptions> = {}
): Promise<void> => {
  const opts = { ...defaultExportOptions, ...options };
  
  try {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const elementId = `storyboard-page-${page.id}`;
      const element = document.getElementById(elementId);
      
      if (!element) {
        console.warn(`Element for page "${page.name}" not found, skipping`);
        continue;
      }

      // Hide grid lines if needed
      if (!opts.includeGrid) {
        element.classList.add('export-mode');
      }

      const canvas = await html2canvas(element, {
        scale: opts.scale,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        ignoreElements: (element) => {
          return element.classList.contains('export-ignore');
        }
      });

      // Restore grid lines
      if (!opts.includeGrid) {
        element.classList.remove('export-mode');
      }

      // Add page to PDF
      if (i > 0) {
        pdf.addPage();
      }

      // Calculate dimensions to fit page
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasAspectRatio = canvas.width / canvas.height;
      const pdfAspectRatio = pdfWidth / pdfHeight;

      let imgWidth = pdfWidth;
      let imgHeight = pdfHeight;

      if (canvasAspectRatio > pdfAspectRatio) {
        imgHeight = pdfWidth / canvasAspectRatio;
      } else {
        imgWidth = pdfHeight * canvasAspectRatio;
      }

      const x = (pdfWidth - imgWidth) / 2;
      const y = (pdfHeight - imgHeight) / 2;

      pdf.addImage(
        canvas.toDataURL('image/jpeg', opts.quality),
        'JPEG',
        x,
        y,
        imgWidth,
        imgHeight
      );

      // Add page title
      pdf.setFontSize(16);
      pdf.setTextColor(60, 60, 60);
      pdf.text(page.name, 10, 15);
      
      // Add page number
      pdf.setFontSize(10);
      pdf.text(`Page ${i + 1} of ${pages.length}`, pdfWidth - 40, 15);
    }

    // Save PDF
    pdf.save(`${filename}.pdf`);
    
  } catch (error) {
    console.error('Error exporting pages as PDF:', error);
    throw error;
  }
};

/**
 * Export current page based on options
 */
export const exportCurrentPage = async (
  pageId: string,
  pageName: string,
  options: Partial<ExportOptions> = {}
): Promise<void> => {
  const opts = { ...defaultExportOptions, ...options };
  const elementId = `storyboard-page-${pageId}`;
  const sanitizedName = pageName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  
  if (opts.format === 'png') {
    return exportPageAsPNG(elementId, sanitizedName, opts);
  } else {
    // For single page PDF, we still need the page object
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Page element not found`);
    }
    
    const tempPage: StoryboardPage = {
      id: pageId,
      name: pageName,
      shots: [],
      gridRows: 3,
      gridCols: 4,
      aspectRatio: '16/9',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return exportPagesAsPDF([tempPage], sanitizedName, opts);
  }
};

/**
 * Utility to download any blob as file
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
};
