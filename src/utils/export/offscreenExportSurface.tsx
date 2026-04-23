import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { StoryboardPage as LegacyStoryboardPage } from '@/store/storyboardStore';
import type { Shot, StoryboardPage } from '@/store';
import { ExportError } from '@/utils/types/exportTypes';
import { ExportStoryboardPageContent } from '@/components/export/ExportStoryboardPageContent';

const OFFSCREEN_EXPORT_PAGE_ID_PREFIX = 'offscreen-storyboard-page-';

export const getOffscreenExportPageElementId = (pageId: string): string =>
  `${OFFSCREEN_EXPORT_PAGE_ID_PREFIX}${pageId}`;

interface OffscreenExportSurfaceProps {
  pages: LegacyStoryboardPage[];
  storyboardTheme: {
    contentBackground: string;
  };
}

const OffscreenExportSurfaceContent: React.FC<OffscreenExportSurfaceProps> = ({ pages, storyboardTheme }) => {
  return (
    <div data-offscreen-export-surface>
      {pages.map((page, index) => (
        <div key={page.id} className="w-full flex justify-center">
          <div style={{ width: '1000px' }}>
            <ExportStoryboardPageContent
              page={{
                id: page.id,
                name: page.name,
                shots: page.shots.map(shot => shot.id),
                gridRows: page.gridRows,
                gridCols: page.gridCols,
                aspectRatio: page.aspectRatio,
                createdAt: page.createdAt,
                updatedAt: page.updatedAt
              } as StoryboardPage}
              pageShots={page.shots as Shot[]}
              storyboardTheme={storyboardTheme}
              pageId={page.id}
              pageNumber={index + 1}
              pageElementId={getOffscreenExportPageElementId(page.id)}
              hideEmptySlots
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export class OffscreenExportSurface {
  private rootContainer: HTMLDivElement | null = null;
  private reactRoot: Root | null = null;
  private pageIds: string[] = [];

  mount(
    pages: LegacyStoryboardPage[],
    storyboardTheme: { contentBackground: string } = { contentBackground: '#ffffff' }
  ): void {
    if (pages.length === 0) {
      throw new ExportError('No pages provided for offscreen export surface', 'NO_PAGES');
    }

    this.cleanup();
    this.pageIds = pages.map(page => page.id);

    const container = document.createElement('div');
    container.setAttribute('data-offscreen-export-root', 'true');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.visibility = 'visible';
    container.style.pointerEvents = 'none';
    container.style.width = '1000px';
    container.style.zIndex = '-1';
    container.style.transform = 'none';

    // Required contract: mounted in document and not display:none.
    container.style.display = 'block';

    document.body.appendChild(container);
    this.rootContainer = container;

    this.reactRoot = createRoot(container);
    this.reactRoot.render(
      <OffscreenExportSurfaceContent pages={pages} storyboardTheme={storyboardTheme} />
    );
  }

  resolvePageElement(pageId: string): HTMLElement | null {
    const elementId = getOffscreenExportPageElementId(pageId);
    return document.getElementById(elementId) as HTMLElement | null;
  }

  resolvePageElementOrThrow(pageId: string): HTMLElement {
    const element = this.resolvePageElement(pageId);
    if (!element) {
      throw new ExportError(
        `Offscreen export element resolution failed for page: ${pageId}`,
        'OFFSCREEN_ELEMENT_NOT_FOUND'
      );
    }
    return element;
  }

  cleanup(): void {
    if (this.reactRoot) {
      this.reactRoot.unmount();
      this.reactRoot = null;
    }

    if (this.rootContainer?.parentNode) {
      this.rootContainer.parentNode.removeChild(this.rootContainer);
    }

    this.rootContainer = null;
    this.pageIds = [];
  }

  async waitForReadiness(): Promise<void> {
    if (!this.rootContainer) {
      throw new ExportError('Offscreen export surface is not mounted', 'OFFSCREEN_NOT_MOUNTED');
    }

    await this.waitForFonts();
    await this.waitForImages();
    await this.waitForAnimationFrames(2);
    this.forceTextareaAutoSize();
    await this.waitForAnimationFrames(1);
  }

  private async waitForFonts(): Promise<void> {
    const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
    if (fonts?.ready) {
      await fonts.ready;
    }
  }

  private async waitForImages(): Promise<void> {
    if (!this.rootContainer) return;

    const images = Array.from(this.rootContainer.querySelectorAll('img'));
    if (images.length === 0) return;

    await Promise.allSettled(images.map((image) => this.waitForSingleImage(image)));
  }

  private async waitForSingleImage(image: HTMLImageElement): Promise<void> {
    if (image.complete && image.naturalWidth > 0) {
      if (typeof image.decode === 'function') {
        await image.decode();
      }
      return;
    }

    await new Promise<void>((resolve) => {
      const onDone = () => {
        image.removeEventListener('load', onDone);
        image.removeEventListener('error', onDone);
        resolve();
      };

      image.addEventListener('load', onDone);
      image.addEventListener('error', onDone);
    });

    if (typeof image.decode === 'function') {
      try {
        await image.decode();
      } catch {
        // Best-effort decode after load/error event.
      }
    }
  }

  private async waitForAnimationFrames(frameCount: number): Promise<void> {
    for (let i = 0; i < frameCount; i++) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    }
  }

  private forceTextareaAutoSize(): void {
    if (!this.rootContainer) return;

    const textareas = Array.from(this.rootContainer.querySelectorAll('textarea'));
    for (const textarea of textareas) {
      const el = textarea as HTMLTextAreaElement;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }

  assertPageElementsResolvable(pageIds: string[] = this.pageIds): void {
    if (!this.rootContainer) {
      throw new ExportError('Offscreen export surface is not mounted', 'OFFSCREEN_NOT_MOUNTED');
    }

    for (const pageId of pageIds) {
      this.resolvePageElementOrThrow(pageId);
    }
  }
}

