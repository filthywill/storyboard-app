import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { StoryboardPage, StoryboardState } from '@/store/storyboardStore';
import type { Shot, StoryboardPage as AppStoryboardPage } from '@/store';
import { PDFExportOptions } from '@/components/PDFExportModal';
import { ExportError } from '@/utils/types/exportTypes';
import { ExportStoryboardPageContent } from '@/components/export/ExportStoryboardPageContent';
import { RENDERED_PAGE_WIDTH_PX } from '@/utils/pageSize';

const PRINT_EXPORT_PAGE_ID_PREFIX = 'print-storyboard-page-';

const getPrintExportPageElementId = (pageId: string): string =>
  `${PRINT_EXPORT_PAGE_ID_PREFIX}${pageId}`;

interface PrintDocumentContentProps {
  pages: StoryboardPage[];
  storyboardTheme: {
    contentBackground: string;
  };
}

const PrintDocumentContent: React.FC<PrintDocumentContentProps> = ({ pages, storyboardTheme }) => {
  return React.createElement(
    'div',
    { 'data-print-export-surface': true },
    pages.map((page, index) =>
      React.createElement(
        'div',
        { key: page.id, className: 'print-page' },
        React.createElement(
          'div',
          {
            className: 'w-full flex justify-center',
            style: { width: '100%', display: 'flex', justifyContent: 'center' }
          },
          React.createElement(
            'div',
            { style: { width: `${RENDERED_PAGE_WIDTH_PX}px` } },
            React.createElement(ExportStoryboardPageContent, {
              page: {
                id: page.id,
                name: page.name,
                shots: page.shots.map((shot) => shot.id),
                gridRows: page.gridRows,
                gridCols: page.gridCols,
                aspectRatio: page.aspectRatio,
                createdAt: page.createdAt,
                updatedAt: page.updatedAt
              } as AppStoryboardPage,
              pageShots: page.shots as Shot[],
              storyboardTheme,
              pageId: page.id,
              pageNumber: index + 1,
              pageElementId: getPrintExportPageElementId(page.id),
              hideEmptySlots: true
            })
          )
        )
      )
    )
  );
};

export class PrintRenderer {
  private activePrintWindow: Window | null = null;
  private printReactRoot: Root | null = null;
  private static readonly AFTER_PRINT_TIMEOUT_MS = 15000;
  private static readonly FRAME_WAIT_FALLBACK_MS = 500;

  /**
   * Non-integrated scaffold for the browser-native print backend.
   * Integration into exportManager happens in a later step.
   */
  async printPages(
    pages: StoryboardPage[],
    storyboardState: StoryboardState,
    _options: PDFExportOptions,
    _onProgress?: (current: number, total: number, pageName: string) => void,
    ownedPrintWindow?: Window | null
  ): Promise<void> {
    console.log('PRINT_DEBUG_PRINT_PAGES_START', {
      hasOwnedWindow: !!ownedPrintWindow,
      closed: ownedPrintWindow?.closed ?? null
    });

    if (pages.length === 0) {
      throw new ExportError('No pages to print', 'NO_PAGES');
    }

    const printWindow = this.createOwnedPrintWindow(ownedPrintWindow);
    printWindow.addEventListener('error', (event) => {
      console.error('PRINT_DEBUG_PRINT_WINDOW_ERROR', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });
    printWindow.addEventListener('unhandledrejection', (event) => {
      console.error('PRINT_DEBUG_PRINT_WINDOW_UNHANDLED_REJECTION', {
        reason: event.reason
      });
    });

    try {
      console.log('PRINT_DEBUG_WRITE_SHELL');
      this.writePrintDocumentShell(printWindow.document);
      console.log('PRINT_DEBUG_COPY_STYLES');
      this.copyActiveStyles(printWindow.document);
      console.log('PRINT_DEBUG_COPY_THEME');
      this.copyRootThemeContext(printWindow.document);
      this.injectMandatoryPrintCss(printWindow.document);
      console.log('PRINT_DEBUG_MOUNT_ROOT');
      this.mountPrintReactRoot(printWindow.document, pages, {
        contentBackground: storyboardState.storyboardTheme?.contentBackground || '#ffffff'
      });
      console.log('PRINT_DEBUG_PRINT_WINDOW_VISIBILITY', {
        visibilityState: printWindow.document.visibilityState,
        hidden: printWindow.document.hidden,
        hasFocus: printWindow.document.hasFocus()
      });
      console.log('PRINT_DEBUG_BEFORE_FRAME_1');
      await this.waitForAnimationFrame(printWindow);
      console.log('PRINT_DEBUG_AFTER_FRAME_1');
      console.log('PRINT_DEBUG_BEFORE_FONTS_READY');
      await this.waitForFontsReady(printWindow.document);
      console.log('PRINT_DEBUG_AFTER_FONTS_READY');
      console.log('PRINT_DEBUG_BEFORE_FRAME_2');
      await this.waitForAnimationFrame(printWindow);
      console.log('PRINT_DEBUG_AFTER_FRAME_2');
      console.log('PRINT_DEBUG_BEFORE_PRINT_LIFECYCLE');
      await this.runPrintLifecycle(printWindow);
    } catch (error) {
      this.disposeOwnedPrintWindow();
      throw new ExportError(
        `Print export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PRINT_RENDERER_ERROR'
      );
    }
  }

  private createOwnedPrintWindow(ownedPrintWindow?: Window | null): Window {
    this.disposeOwnedPrintWindow();

    if (ownedPrintWindow) {
      console.log('PRINT_DEBUG_CREATE_WINDOW_USING_OWNED', {
        hasOwnedWindow: !!ownedPrintWindow,
        closed: ownedPrintWindow?.closed ?? null
      });

      if (ownedPrintWindow.closed) {
        throw new ExportError(
          'Provided print window is already closed.',
          'PRINT_WINDOW_CLOSED'
        );
      }
      this.activePrintWindow = ownedPrintWindow;
      return ownedPrintWindow;
    }

    console.log('PRINT_DEBUG_CREATE_WINDOW_FALLBACK_OPEN');
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) {
      throw new ExportError(
        'PRINT_WINDOW_FALLBACK_OPEN_FAILED_IN_RENDERER: Unable to open print window. Please allow pop-ups for export.',
        'PRINT_WINDOW_FALLBACK_OPEN_FAILED_IN_RENDERER'
      );
    }

    this.activePrintWindow = printWindow;
    return printWindow;
  }

  private disposeOwnedPrintWindow(): void {
    if (this.printReactRoot) {
      this.printReactRoot.unmount();
      this.printReactRoot = null;
    }

    if (!this.activePrintWindow) return;

    try {
      this.activePrintWindow.close();
    } catch {
      // Best-effort cleanup only for scaffold stage.
    }

    this.activePrintWindow = null;
  }

  private mountPrintReactRoot(
    printDocument: Document,
    pages: StoryboardPage[],
    storyboardTheme: { contentBackground: string }
  ): void {
    try {
      console.log('PRINT_DEBUG_MOUNTROOT_BEFORE_ROOT_LOOKUP');
      const rootElement = printDocument.getElementById('print-root');
      console.log('PRINT_DEBUG_MOUNTROOT_AFTER_ROOT_LOOKUP', {
        hasRootElement: !!rootElement
      });

      if (!rootElement) {
        throw new ExportError(
          'Print document root element not found',
          'PRINT_ROOT_NOT_FOUND'
        );
      }

      if (this.printReactRoot) {
        this.printReactRoot.unmount();
        this.printReactRoot = null;
      }

      console.log('PRINT_DEBUG_MOUNTROOT_BEFORE_CREATE_ROOT');
      this.printReactRoot = createRoot(rootElement);
      console.log('PRINT_DEBUG_MOUNTROOT_AFTER_CREATE_ROOT');
      console.log('PRINT_DEBUG_MOUNTROOT_BEFORE_RENDER');
      this.printReactRoot.render(
        React.createElement(PrintDocumentContent, { pages, storyboardTheme })
      );
      console.log('PRINT_DEBUG_MOUNTROOT_AFTER_RENDER');
    } catch (error) {
      console.error('PRINT_DEBUG_MOUNTROOT_ERROR', error);
      throw error;
    }
  }

  private writePrintDocumentShell(printDocument: Document): void {
    printDocument.open();
    printDocument.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Storyboard Print Export</title>
  </head>
  <body>
    <div id="print-root"></div>
  </body>
</html>`);
    printDocument.close();
  }

  private copyActiveStyles(printDocument: Document): void {
    const styleTags = Array.from(document.querySelectorAll('style'));
    for (const sourceStyleTag of styleTags) {
      const styleTag = printDocument.createElement('style');
      styleTag.textContent = sourceStyleTag.textContent ?? '';
      printDocument.head.appendChild(styleTag);
    }

    const stylesheetLinks = Array.from(
      document.querySelectorAll('link[rel="stylesheet"]')
    ) as HTMLLinkElement[];

    for (const sourceLink of stylesheetLinks) {
      const linkTag = printDocument.createElement('link');
      linkTag.rel = 'stylesheet';
      linkTag.href = sourceLink.href;

      if (sourceLink.media) linkTag.media = sourceLink.media;
      if (sourceLink.type) linkTag.type = sourceLink.type;
      if (sourceLink.integrity) linkTag.integrity = sourceLink.integrity;
      if (sourceLink.crossOrigin) linkTag.crossOrigin = sourceLink.crossOrigin;
      if (sourceLink.referrerPolicy) linkTag.referrerPolicy = sourceLink.referrerPolicy;

      printDocument.head.appendChild(linkTag);
    }
  }

  private copyRootThemeContext(printDocument: Document): void {
    const sourceRoot = document.documentElement;
    const sourceBody = document.body;
    const targetRoot = printDocument.documentElement;
    const targetBody = printDocument.body;

    targetRoot.className = sourceRoot.className;
    targetBody.className = sourceBody.className;

    const computedRootStyle = window.getComputedStyle(sourceRoot);
    for (let i = 0; i < computedRootStyle.length; i++) {
      const propertyName = computedRootStyle[i];
      if (!propertyName.startsWith('--')) continue;

      const propertyValue = computedRootStyle.getPropertyValue(propertyName);
      if (!propertyValue) continue;

      targetRoot.style.setProperty(propertyName, propertyValue.trim());
    }
  }

  private injectMandatoryPrintCss(printDocument: Document): void {
    const styleTag = printDocument.createElement('style');
    styleTag.setAttribute('data-print-renderer', 'mandatory-print-css');
    styleTag.textContent = `
html, body { margin: 0; padding: 0; }
@page { margin: 0; }
* {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
.print-page {
  break-after: page;
  page-break-after: always;
}
.print-page:last-child {
  break-after: auto;
  page-break-after: auto;
}
`;
    printDocument.head.appendChild(styleTag);
  }

  private async waitForFontsReady(printDocument: Document): Promise<void> {
    const fonts = printDocument.fonts;
    if (fonts?.ready) {
      await fonts.ready;
    }
  }

  private async waitForAnimationFrame(targetWindow: Window): Promise<void> {
    await new Promise<void>((resolve) => {
      let settled = false;
      let timeoutId: number | null = null;
      let rafId: number | null = null;

      const finalize = () => {
        if (settled) return;
        settled = true;

        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
        if (rafId !== null && typeof targetWindow.cancelAnimationFrame === 'function') {
          targetWindow.cancelAnimationFrame(rafId);
        }
        resolve();
      };

      timeoutId = window.setTimeout(() => {
        finalize();
      }, PrintRenderer.FRAME_WAIT_FALLBACK_MS);

      if (typeof targetWindow.requestAnimationFrame === 'function') {
        rafId = targetWindow.requestAnimationFrame(() => {
          finalize();
        });
      }
    });
  }

  private async runPrintLifecycle(printWindow: Window): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      let timeoutId: number | null = null;

      const finalizeSuccess = () => {
        if (settled) return;
        settled = true;
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
        printWindow.removeEventListener('afterprint', handleAfterPrint);
        this.disposeOwnedPrintWindow();
        resolve();
      };

      const finalizeError = (error: unknown) => {
        if (settled) return;
        settled = true;
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
        printWindow.removeEventListener('afterprint', handleAfterPrint);
        this.disposeOwnedPrintWindow();
        reject(error);
      };

      const handleAfterPrint = () => {
        finalizeSuccess();
      };

      printWindow.addEventListener('afterprint', handleAfterPrint);
      timeoutId = window.setTimeout(() => {
        finalizeSuccess();
      }, PrintRenderer.AFTER_PRINT_TIMEOUT_MS);

      try {
        printWindow.focus();
        printWindow.print();
      } catch (error) {
        finalizeError(error);
      }
    });
  }
}
