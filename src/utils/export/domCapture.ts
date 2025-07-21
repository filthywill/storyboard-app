import { 
  ExportStoryboardPage,
  ExportHeader,
  ExportGrid,
  ExportShot,
  Rectangle,
  GridConfig,
  LayoutConfig,
  ExportDimensions,
  ExportError
} from '@/utils/types/exportTypes';
import { StoryboardState } from '@/store/storyboardStore';
import { DataTransformer } from './dataTransformer';

export interface DOMCaptureResult {
  layout: LayoutConfig;
  header: ExportHeader;
  grid: ExportGrid;
  backgroundColor: string;
}

export class DOMCapture {
  /**
   * Capture the exact layout from the rendered DOM in Preview mode
   */
  static async captureStoryboardLayout(
    pageId: string,
    storyboardState: StoryboardState,
    scale: number = 2
  ): Promise<DOMCaptureResult> {
    try {
      // Find the storyboard page element
      const pageElement = document.getElementById(`storyboard-page-${pageId}`);
      if (!pageElement) {
        throw new ExportError('Storyboard page element not found', 'DOM_NOT_FOUND');
      }

      // Get the page's bounding rect
      const pageRect = pageElement.getBoundingClientRect();
      
      // Calculate canvas dimensions
      const canvasDimensions: ExportDimensions = {
        width: Math.round(pageRect.width * scale),
        height: Math.round(pageRect.height * scale),
        scale
      };

      // Capture header layout
      const header = await this.captureHeader(pageElement, storyboardState, scale);
      const headerBounds = this.getElementBounds(pageElement.querySelector('.master-header') || pageElement.children[0], pageRect, scale);

      // Capture grid layout
      const { grid, gridBounds } = await this.captureGrid(pageElement, storyboardState, scale, pageRect);

      // Create layout config
      const layout: LayoutConfig = {
        canvas: canvasDimensions,
        header: headerBounds,
        grid: gridBounds,
        shotBounds: grid.shots.map(shot => shot.bounds)
      };

      return {
        layout,
        header,
        grid,
        backgroundColor: '#ffffff'
      };

    } catch (error) {
      console.error('❌ DOM capture failed:', error);
      throw new ExportError(
        `Failed to capture DOM layout: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DOM_CAPTURE_ERROR'
      );
    }
  }

  /**
   * Capture header information and layout
   */
  private static async captureHeader(
    pageElement: Element,
    storyboardState: StoryboardState,
    scale: number
  ): Promise<ExportHeader> {
    let logoImageData: HTMLImageElement | undefined;
    
    // Load logo if available
    if (storyboardState.projectLogoUrl && storyboardState.templateSettings.showLogo) {
      try {
        logoImageData = await DataTransformer.loadImageElement(storyboardState.projectLogoUrl);
      } catch (error) {
        console.warn('Failed to load logo image:', error);
      }
    }
    
    return {
      projectName: storyboardState.projectName,
      projectInfo: storyboardState.projectInfo,
      clientAgency: storyboardState.clientAgency,
      jobInfo: storyboardState.jobInfo,
      logoImageData,
      templateSettings: { ...storyboardState.templateSettings }
    };
  }

  /**
   * Capture grid and shot layouts
   */
  private static async captureGrid(
    pageElement: Element,
    storyboardState: StoryboardState,
    scale: number,
    pageRect: DOMRect
  ): Promise<{ grid: ExportGrid; gridBounds: Rectangle }> {
    // Find the grid container
    const gridElement = pageElement.querySelector('[style*="grid-template-columns"]');
    if (!gridElement) {
      throw new ExportError('Grid element not found', 'GRID_NOT_FOUND');
    }

    const gridRect = gridElement.getBoundingClientRect();
    const gridBounds = this.getElementBounds(gridElement, pageRect, scale);

    // Get grid configuration from computed styles
    const computedStyle = window.getComputedStyle(gridElement);
    const gridTemplateColumns = computedStyle.gridTemplateColumns;
    const gridTemplateRows = computedStyle.gridTemplateRows;
    const gap = computedStyle.gap;

    // Parse grid configuration
    const cols = gridTemplateColumns.split(' ').length;
    const rows = gridTemplateRows === 'none' ? Math.ceil(gridElement.children.length / cols) : gridTemplateRows.split(' ').length;
    const gapValue = parseFloat(gap) || 8;

    // Find the active page to get aspect ratio
    const activePage = storyboardState.pages.find(p => p.id === storyboardState.activePageId);
    const aspectRatio = activePage?.aspectRatio || '16/9';

    const gridConfig: GridConfig = {
      rows,
      cols,
      gap: gapValue,
      aspectRatio
    };

    // Capture individual shots
    const shots: ExportShot[] = [];
    const shotElements = Array.from(gridElement.children).filter(child => 
      child.classList.contains('group') || child.querySelector('.shot-number')
    );

    for (let i = 0; i < shotElements.length; i++) {
      const shotElement = shotElements[i] as HTMLElement;
      const shot = await this.captureShot(shotElement, pageRect, scale, storyboardState, i);
      if (shot) {
        shots.push(shot);
      }
    }

    const grid: ExportGrid = {
      config: gridConfig,
      bounds: gridBounds,
      shots
    };

    return { grid, gridBounds };
  }

  /**
   * Capture individual shot data and layout
   */
  private static async captureShot(
    shotElement: HTMLElement,
    pageRect: DOMRect,
    scale: number,
    storyboardState: StoryboardState,
    index: number
  ): Promise<ExportShot | null> {
    try {
      const shotRect = shotElement.getBoundingClientRect();
      const bounds = this.getElementBounds(shotElement, pageRect, scale);

      // Find shot data from store
      const activePage = storyboardState.pages.find(p => p.id === storyboardState.activePageId);
      const shotData = activePage?.shots[index];

      if (!shotData) {
        return null;
      }

      // Load shot image if available
      let imageData: HTMLImageElement | undefined;
      if (shotData.imageFile) {
        try {
          const url = URL.createObjectURL(shotData.imageFile);
          imageData = await DataTransformer.loadImageElement(url);
          URL.revokeObjectURL(url);
        } catch (error) {
          console.warn('Failed to load shot image from imageFile:', error);
        }
      }

      return {
        id: shotData.id,
        number: shotData.number,
        imageData: imageData,
        actionText: shotData.actionText,
        scriptText: shotData.scriptText,
        bounds: bounds,
        templateSettings: storyboardState.templateSettings
      };
    } catch (error) {
      console.error('❌ Shot capture failed:', error);
      return null;
    }
  }

  private static getElementBounds(element: Element, pageRect: DOMRect, scale: number): Rectangle {
    const rect = element.getBoundingClientRect();
    return {
      x: Math.round((rect.left - pageRect.left) * scale),
      y: Math.round((rect.top - pageRect.top) * scale),
      width: Math.round(rect.width * scale),
      height: Math.round(rect.height * scale)
    };
  }
}