import './export-pdf-static.css';
import { calculatePreviewDimensions } from './utils/export/previewDimensions';
import type {
  ExportTemplateVisibility,
  NormalizedExportImageSource,
  ServerPDFExportPayload,
} from './utils/types/exportTypes';
import type { StoryboardTheme } from './styles/storyboardTheme';

const EXPORT_ROUTE_PATH = '/export/pdf/render-static';
const READY_EVENT_NAME = 'server-pdf-export-ready';
const ERROR_EVENT_NAME = 'server-pdf-export-error';
const FONT_CHECK_SAMPLE = 'AaBbCcDdEeFfGgHhIiJjKkLlMmNn0123456789';
const IMAGE_READY_TIMEOUT_MS = 10000;
const EXPORT_FONT_FAMILY =
  '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const LIGHTER_BACKGROUND = 'rgba(255, 255, 255, 0.03)';
const EMPTY_EXPORT_SLOT_EXTRA_HEIGHT_PX = 80;
const REQUIRED_FONT_LOADS = [
  { descriptor: '400 16px "Inter"', label: 'Inter 400' },
  { descriptor: '600 16px "Inter"', label: 'Inter 600' },
  { descriptor: '700 16px "Inter"', label: 'Inter 700' },
] as const;

type ExportRuntimeStatus = 'waiting_for_payload' | 'rendering' | 'ready' | 'error';

type ExportRuntimeMeta = {
  status: ExportRuntimeStatus;
  paperSize?: ServerPDFExportPayload['paperSize'];
  exportRootWidthPx?: number;
  exportRootHeightPx?: number;
  routePath: string;
  error?: string;
};

declare global {
  interface Window {
    __SERVER_PDF_EXPORT__?: unknown;
    __SERVER_PDF_EXPORT_PAYLOAD__?: unknown;
    __SERVER_PDF_EXPORT_RUNTIME__?: ExportRuntimeMeta;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function isPositiveNumber(value: unknown): value is number {
  return isNumber(value) && value > 0;
}

function isAspectRatio(value: unknown): value is string {
  if (!isString(value)) return false;
  return /^\s*\d+\s*\/\s*\d+\s*$/.test(value);
}

function validateTemplate(template: unknown): template is ExportTemplateVisibility {
  if (!isRecord(template)) return false;

  return (
    isBoolean(template.showLogo) &&
    isBoolean(template.showProjectName) &&
    isBoolean(template.showProjectInfo) &&
    isBoolean(template.showClientAgency) &&
    isBoolean(template.showJobInfo) &&
    isBoolean(template.showActionText) &&
    isBoolean(template.showScriptText) &&
    isBoolean(template.showPageNumber)
  );
}

function validateImageSource(image: unknown): image is NormalizedExportImageSource {
  if (!isRecord(image) || !isString(image.kind)) return false;

  if (image.kind === 'dataUrl') {
    return isString(image.dataUrl);
  }

  if (image.kind === 'url') {
    return isString(image.url);
  }

  return false;
}

function validateTheme(theme: unknown): theme is StoryboardTheme {
  if (!isRecord(theme)) return false;

  return (
    isString(theme.id) &&
    isString(theme.name) &&
    isBoolean(theme.isPreset) &&
    isString(theme.contentBackground) &&
    isRecord(theme.header) &&
    isString(theme.header.text) &&
    isRecord(theme.shotCard) &&
    isString(theme.shotCard.background) &&
    isBoolean(theme.shotCard.backgroundEnabled) &&
    isString(theme.shotCard.border) &&
    isBoolean(theme.shotCard.borderEnabled) &&
    isNumber(theme.shotCard.borderWidth) &&
    isNumber(theme.shotCard.borderRadius) &&
    isRecord(theme.imageFrame) &&
    isString(theme.imageFrame.border) &&
    isBoolean(theme.imageFrame.borderEnabled) &&
    isNumber(theme.imageFrame.borderWidth) &&
    isRecord(theme.shotNumber) &&
    isString(theme.shotNumber.text) &&
    isString(theme.shotNumber.background) &&
    isString(theme.shotNumber.border) &&
    isBoolean(theme.shotNumber.borderEnabled) &&
    isNumber(theme.shotNumber.borderWidth) &&
    isNumber(theme.shotNumber.borderRadius) &&
    isRecord(theme.actionText) &&
    isString(theme.actionText.text) &&
    isRecord(theme.scriptText) &&
    isString(theme.scriptText.text)
  );
}

function validatePayload(input: unknown): input is ServerPDFExportPayload {
  if (!isRecord(input)) return false;
  if (input.schemaVersion !== 1) return false;
  if (!isString(input.filename)) return false;
  if (input.paperSize !== 'letter' && input.paperSize !== 'canvas') return false;
  if (!validateTemplate(input.template)) return false;
  if (!validateTheme(input.theme)) return false;
  if (!isRecord(input.project) || !isRecord(input.page)) return false;

  const project = input.project;
  if (
    !isString(project.projectName) ||
    !isString(project.projectInfo) ||
    !isString(project.clientAgency) ||
    !isString(project.jobInfo) ||
    !(project.projectLogo === null || validateImageSource(project.projectLogo))
  ) {
    return false;
  }

  const page = input.page;
  if (
    !isString(page.id) ||
    !isString(page.name) ||
    !isPositiveInteger(page.pageNumber) ||
    !isPositiveInteger(page.gridRows) ||
    !isPositiveInteger(page.gridCols) ||
    !isAspectRatio(page.aspectRatio) ||
    !Array.isArray(page.shots)
  ) {
    return false;
  }

  return page.shots.every((shot) => {
    if (!isRecord(shot)) return false;

    return (
      isString(shot.id) &&
      isString(shot.number) &&
      isString(shot.actionText) &&
      isString(shot.scriptText) &&
      (shot.image === null || validateImageSource(shot.image)) &&
      isPositiveNumber(shot.imageScale) &&
      isNumber(shot.imageOffsetX) &&
      isNumber(shot.imageOffsetY)
    );
  });
}

function waitForAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

async function waitForFonts(root: HTMLElement): Promise<void> {
  const rootFontFamily = window.getComputedStyle(root).fontFamily;
  if (!/inter/i.test(rootFontFamily)) {
    throw new Error(`Export font family is not pinned to Inter: ${rootFontFamily}`);
  }

  const fonts = document.fonts;
  if (fonts?.ready) {
    await fonts.ready;
  }

  if (!fonts) {
    return;
  }

  await Promise.all(
    REQUIRED_FONT_LOADS.map(async (requiredFont) => {
      await fonts.load(requiredFont.descriptor, FONT_CHECK_SAMPLE);
      if (!fonts.check(requiredFont.descriptor, FONT_CHECK_SAMPLE)) {
        throw new Error(`Required font unavailable: ${requiredFont.label}`);
      }
    })
  );
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

function getImageSetSignature(images: HTMLImageElement[]): string {
  return images
    .map((img) => {
      const source = img.currentSrc || img.src || '';
      const sourceIdentity = `${source.slice(0, 160)}#${source.length}`;
      const alt = img.getAttribute('alt') || '';
      return `${sourceIdentity}::${alt}`;
    })
    .sort()
    .join('|');
}

async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll('img')) as HTMLImageElement[];
  const initialImageSetSignature = getImageSetSignature(images);

  await Promise.all(
    images.map(async (img, index) => {
      let source = img.currentSrc || img.src;
      if (!source) {
        throw new Error(`Image source missing before load/decode (index ${index}).`);
      }

      if (!img.complete) {
        await withTimeout(
          new Promise<void>((resolve, reject) => {
            const handleLoad = () => {
              img.removeEventListener('load', handleLoad);
              img.removeEventListener('error', handleError);
              resolve();
            };

            const handleError = () => {
              img.removeEventListener('load', handleLoad);
              img.removeEventListener('error', handleError);
              reject(new Error(`Image failed to load: ${img.currentSrc || img.src || 'unknown source'}`));
            };

            img.addEventListener('load', handleLoad);
            img.addEventListener('error', handleError);
          }),
          IMAGE_READY_TIMEOUT_MS,
          `Image load timed out: ${source}`
        );
      }

      source = img.currentSrc || img.src;
      if (!source) {
        throw new Error(`Image source missing after load/decode (index ${index}).`);
      }

      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
        throw new Error(`Image is not renderable: ${source}`);
      }

      if (typeof img.decode === 'function') {
        try {
          await withTimeout(
            img.decode(),
            IMAGE_READY_TIMEOUT_MS,
            `Image decode timed out: ${source}`
          );
        } catch (error) {
          if (error instanceof Error && /timed out/i.test(error.message)) {
            throw error;
          }
          throw new Error(`Image decode failed: ${source}`);
        }
      }
    })
  );

  const finalImages = Array.from(root.querySelectorAll('img')) as HTMLImageElement[];
  const finalImageSetSignature = getImageSetSignature(finalImages);
  if (initialImageSetSignature !== finalImageSetSignature) {
    throw new Error('Image set changed during readiness contract.');
  }
}

async function waitForStableLayout(root: HTMLElement): Promise<{ width: number; height: number }> {
  let stableFrames = 0;
  let previous = { width: -1, height: -1 };

  for (let attempt = 0; attempt < 12; attempt += 1) {
    await waitForAnimationFrame();
    const rect = root.getBoundingClientRect();
    const current = {
      width: Math.ceil(rect.width),
      height: Math.ceil(rect.height),
    };

    if (current.width === previous.width && current.height === previous.height) {
      stableFrames += 1;
      if (stableFrames >= 2) {
        return current;
      }
    } else {
      stableFrames = 0;
      previous = current;
    }
  }

  const finalRect = root.getBoundingClientRect();
  return {
    width: Math.ceil(finalRect.width),
    height: Math.ceil(finalRect.height),
  };
}

function updateRuntime(meta: ExportRuntimeMeta): void {
  window.__SERVER_PDF_EXPORT_RUNTIME__ = meta;
}

function emitReady(meta: ExportRuntimeMeta): void {
  updateRuntime(meta);
  window.dispatchEvent(new CustomEvent(READY_EVENT_NAME, { detail: meta }));
}

function emitError(message: string): void {
  const meta: ExportRuntimeMeta = {
    status: 'error',
    routePath: EXPORT_ROUTE_PATH,
    error: message,
  };
  updateRuntime(meta);
  window.dispatchEvent(new CustomEvent(ERROR_EVENT_NAME, { detail: meta }));
}

function getInjectedPayload(): unknown {
  if (typeof window.__SERVER_PDF_EXPORT__ !== 'undefined') {
    return window.__SERVER_PDF_EXPORT__;
  }

  return window.__SERVER_PDF_EXPORT_PAYLOAD__;
}

function setStyleProperties(
  element: HTMLElement,
  styles: Partial<CSSStyleDeclaration>,
  cssVariables: Record<string, string> = {}
): void {
  Object.assign(element.style, styles);
  for (const [name, value] of Object.entries(cssVariables)) {
    element.style.setProperty(name, value);
  }
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: {
    className?: string;
    textContent?: string;
    style?: Partial<CSSStyleDeclaration>;
    cssVariables?: Record<string, string>;
    attrs?: Record<string, string>;
  } = {}
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (options.className) {
    element.className = options.className;
  }
  if (typeof options.textContent === 'string') {
    element.textContent = options.textContent;
  }
  if (options.style || options.cssVariables) {
    setStyleProperties(element, options.style ?? {}, options.cssVariables);
  }
  if (options.attrs) {
    for (const [name, value] of Object.entries(options.attrs)) {
      element.setAttribute(name, value);
    }
  }
  return element;
}

function getImageSource(image: NormalizedExportImageSource | null): string | null {
  if (!image) {
    return null;
  }

  return image.kind === 'dataUrl' ? image.dataUrl : image.url;
}

function buildMasterHeader(payload: ServerPDFExportPayload): HTMLElement {
  const { template, project, theme } = payload;
  const logoSource = getImageSource(project.projectLogo);

  const root = createElement('div', {
    className: 'flex items-end justify-between w-full max-w-5xl mx-auto pt-8 pb-2 gap-6 flex-shrink-0 master-header',
    style: {
      minWidth: '1000px',
      maxWidth: '1000px',
      width: '1000px',
      paddingLeft: '33px',
      paddingRight: '33px',
      color: theme.header.text,
    },
  });

  const left = createElement('div', {
    className: 'flex items-end gap-4',
    style: {
      width: '500px',
      flexShrink: '0',
    },
  });

  if (template.showLogo && logoSource) {
    const logoWrapper = createElement('div', {
      className: 'relative flex-shrink-0 h-16',
      style: {
        minWidth: '60px',
        maxWidth: '200px',
        height: '60px',
        minHeight: '60px',
      },
    });

    const logo = createElement('img', {
      className: 'w-full h-full object-contain rounded-md',
      attrs: {
        src: logoSource,
        alt: 'Project Logo',
      },
    });
    logoWrapper.appendChild(logo);
    left.appendChild(logoWrapper);
  }

  const leftText = createElement('div', {
    className: 'flex-grow',
    style: {
      width: '388px',
      flexShrink: '0',
    },
  });

  if (template.showProjectName) {
    leftText.appendChild(
      createElement('div', {
        className: 'w-full font-bold p-0 pr-6 text-lg whitespace-pre-wrap',
        textContent: project.projectName || 'Project Name',
        style: {
          fontSize: '22px',
          lineHeight: '1.2',
          minHeight: '26px',
          backgroundColor: 'transparent',
        },
      })
    );
  }

  if (template.showProjectInfo) {
    leftText.appendChild(
      createElement('div', {
        className: 'w-full p-0 mt-1 pr-6 text-xs whitespace-pre-wrap',
        textContent: project.projectInfo || 'Project Info',
        style: {
          fontSize: '14px',
          lineHeight: '1.4',
          minHeight: '20px',
          marginTop: '4px',
          backgroundColor: 'transparent',
          color: theme.header.text,
        },
      })
    );
  }

  left.appendChild(leftText);

  const right = createElement('div', {
    className: 'flex-shrink-0 text-right',
    style: {
      width: '250px',
      flexShrink: '0',
    },
  });

  if (template.showClientAgency) {
    right.appendChild(
      createElement('div', {
        className: 'w-full font-semibold p-0 text-right pl-6 text-base whitespace-pre-wrap',
        textContent: project.clientAgency || 'Client/Agency',
        style: {
          fontSize: '18px',
          lineHeight: '1.2',
          minHeight: '22px',
          backgroundColor: 'transparent',
        },
      })
    );
  }

  if (template.showJobInfo) {
    right.appendChild(
      createElement('div', {
        className: 'w-full p-0 mt-1 text-right pl-6 text-xs whitespace-pre-wrap',
        textContent: project.jobInfo || 'Job Info',
        style: {
          fontSize: '14px',
          lineHeight: '1.4',
          minHeight: '20px',
          marginTop: '4px',
          backgroundColor: 'transparent',
          color: theme.header.text,
        },
      })
    );
  }

  root.appendChild(left);
  root.appendChild(right);
  return root;
}

function buildShotCard(
  payload: ServerPDFExportPayload,
  shot: ServerPDFExportPayload['page']['shots'][number],
  previewDimensions: { width: number; imageHeight: number }
): HTMLElement {
  const { template, theme } = payload;
  const imageSource = getImageSource(shot.image);
  const actualOffsetX = (shot.imageOffsetX || 0) * previewDimensions.width;
  const actualOffsetY = (shot.imageOffsetY || 0) * previewDimensions.imageHeight;

  const card = createElement('div', {
    className: 'group relative transition-all duration-200 shot-card storyboard-themeable',
    style: {
      width: `${previewDimensions.width}px`,
      flex: 'none',
      overflow: 'visible',
    },
    cssVariables: {
      '--inline-bg-color': theme.shotCard.backgroundEnabled ? theme.shotCard.background : 'transparent',
      '--inline-border-color': theme.shotCard.borderEnabled ? theme.shotCard.border : 'transparent',
      '--inline-border-width': theme.shotCard.borderEnabled ? `${theme.shotCard.borderWidth}px` : '0px',
      '--inline-border-style': theme.shotCard.borderEnabled ? 'solid' : 'none',
      '--inline-border-radius': `${theme.shotCard.borderRadius}px`,
    },
  });

  const shotNumberContainer = createElement('div', { className: 'shot-number-container' });
  shotNumberContainer.appendChild(
    createElement('div', {
      className: 'shot-number storyboard-themeable',
      textContent: shot.number,
      cssVariables: {
        '--inline-text-color': theme.shotNumber.text,
        '--inline-bg-color': theme.shotNumber.background,
        '--inline-border-color': theme.shotNumber.borderEnabled ? theme.shotNumber.border : 'transparent',
        '--inline-border-width': theme.shotNumber.borderEnabled ? `${theme.shotNumber.borderWidth}px` : '0px',
        '--inline-border-style': theme.shotNumber.borderEnabled ? 'solid' : 'none',
        '--inline-border-radius': `${theme.shotNumber.borderRadius}px`,
      },
    })
  );
  card.appendChild(shotNumberContainer);

  const content = createElement('div', { className: 'p-2' });
  const imageFrame = createElement('div', {
    className: 'relative w-full',
    style: {
      height: `${previewDimensions.imageHeight}px`,
      borderRadius: `${theme.shotCard.borderRadius}px`,
      backgroundColor: LIGHTER_BACKGROUND,
    },
  });

  if (imageSource) {
    const imageOverflow = createElement('div', {
      className: 'relative w-full h-full overflow-hidden',
      style: {
        borderRadius: `${theme.shotCard.borderRadius}px`,
      },
    });

    imageOverflow.appendChild(
      createElement('img', {
        className: 'w-full h-full object-cover',
        attrs: {
          src: imageSource,
          alt: `Shot ${shot.number}`,
        },
        style: {
          borderRadius: `${theme.shotCard.borderRadius}px`,
          transform: `scale(${shot.imageScale || 1.0}) translate(${actualOffsetX}px, ${actualOffsetY}px)`,
          transformOrigin: 'center center',
          border: 'none',
          boxShadow: 'none',
          outline: 'none',
        },
      })
    );

    imageFrame.appendChild(imageOverflow);
  }

  imageFrame.appendChild(
    createElement('div', {
      className: 'absolute pointer-events-none',
      style: {
        top: '-0.75px',
        right: '-0.75px',
        bottom: '-0.75px',
        left: '-0.75px',
        borderRadius: `${theme.shotCard.borderRadius}px`,
        border: theme.imageFrame.borderEnabled
          ? `${theme.imageFrame.borderWidth}px solid ${theme.imageFrame.border}`
          : 'none',
      },
    })
  );

  content.appendChild(imageFrame);

  if (template.showActionText || template.showScriptText) {
    const textGroup = createElement('div', { className: 'flex flex-col gap-0 mt-1' });

    if (template.showActionText) {
      textGroup.appendChild(
        createElement('div', {
          className: 'w-full font-semibold border-0 rounded-sm bg-transparent text-xs px-1 py-0.5 action-text whitespace-pre-wrap',
          textContent: shot.actionText || '',
          style: {
            color: theme.actionText.text,
          },
        })
      );
    }

    if (template.showScriptText) {
      textGroup.appendChild(
        createElement('div', {
          className: 'w-full border-0 rounded-sm bg-transparent text-xs px-1 py-0.5 script-text whitespace-pre-wrap',
          textContent: shot.scriptText || '',
          style: {
            color: theme.scriptText.text,
          },
        })
      );
    }

    content.appendChild(textGroup);
  }

  card.appendChild(content);
  return card;
}

function buildEmptySlotPlaceholder(previewDimensions: { width: number; imageHeight: number }): HTMLElement {
  return createElement('div', {
    style: {
      width: `${previewDimensions.width}px`,
      minHeight: `${previewDimensions.imageHeight + EMPTY_EXPORT_SLOT_EXTRA_HEIGHT_PX}px`,
      flex: 'none',
    },
    attrs: {
      'aria-hidden': 'true',
    },
  });
}

function buildShotGrid(payload: ServerPDFExportPayload): HTMLElement {
  const previewDimensions = calculatePreviewDimensions(payload.page);
  const root = createElement('div', { className: 'w-full shot-grid' });
  const totalSlots = payload.page.gridRows * payload.page.gridCols;

  const grid = createElement('div', {
    className: 'grid w-full justify-center',
    style: {
      gridTemplateColumns: `repeat(${payload.page.gridCols}, ${previewDimensions.width}px)`,
      gridTemplateRows: `repeat(${payload.page.gridRows}, auto)`,
      gap: `${previewDimensions.gap}px`,
      justifyContent: 'center',
      width: '1000px',
      maxWidth: '1000px',
      minWidth: '1000px',
      margin: '0 auto',
      flexShrink: '0',
    },
  });

  for (let slotIndex = 0; slotIndex < totalSlots; slotIndex += 1) {
    const shot = payload.page.shots[slotIndex];
    grid.appendChild(
      shot
        ? buildShotCard(payload, shot, previewDimensions)
        : buildEmptySlotPlaceholder(previewDimensions)
    );
  }

  root.appendChild(grid);

  if (payload.template.showPageNumber) {
    const footer = createElement('div', {
      className: 'mt-2',
      style: {
        width: '1000px',
        maxWidth: '1000px',
        margin: '8px auto 0',
        flexShrink: '0',
      },
    });

    const footerPadding = createElement('div', {
      className: 'px-6 py-3',
      style: {
        paddingLeft: '33px',
        paddingRight: '33px',
        paddingTop: '12px',
        paddingBottom: '12px',
      },
    });

    const footerText = createElement('div', {
      className: 'flex items-center justify-end text-xs',
      style: {
        fontSize: '10px',
        lineHeight: '1.2',
        color: payload.theme.header.text,
      },
    });

    footerText.appendChild(createElement('div', { textContent: `Page ${payload.page.pageNumber}` }));
    footerPadding.appendChild(footerText);
    footer.appendChild(footerPadding);
    root.appendChild(footer);
  }

  return root;
}

function buildExportDom(payload: ServerPDFExportPayload): HTMLElement {
  const shell = createElement('div', {
    style: {
      minHeight: '100vh',
      margin: '0',
    },
  });

  const contentShell = createElement('div', {
    style: {
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
    },
  });

  const exportRoot = createElement('div', {
    attrs: {
      'data-export-root': '',
      'data-paper-size': payload.paperSize,
    },
    style: {
      fontFamily: EXPORT_FONT_FAMILY,
      width: '1000px',
      minWidth: '1000px',
      overflow: 'visible',
    },
  });

  const pageRoot = createElement('div', {
    className: 'shadow-lg overflow-visible relative z-20 storyboard-themeable',
    attrs: {
      id: `server-export-page-${payload.page.id}`,
    },
    style: {
      height: 'min-content',
      fontFamily: EXPORT_FONT_FAMILY,
    },
    cssVariables: {
      '--inline-bg-color': payload.theme.contentBackground,
      '--inline-border-radius': '6px',
    },
  });

  pageRoot.appendChild(buildMasterHeader(payload));
  const pagePadding = createElement('div', { className: 'p-1' });
  pagePadding.appendChild(buildShotGrid(payload));
  pageRoot.appendChild(pagePadding);
  exportRoot.appendChild(pageRoot);
  contentShell.appendChild(exportRoot);
  shell.appendChild(contentShell);

  return shell;
}

async function bootstrap(): Promise<void> {
  updateRuntime({
    status: 'waiting_for_payload',
    routePath: EXPORT_ROUTE_PATH,
  });

  const payload = getInjectedPayload();
  if (!validatePayload(payload)) {
    emitError(
      'EXPORT_PAYLOAD_INVALID: Export route received an invalid payload. This route is payload-only and does not fall back to live app state.'
    );
    return;
  }

  updateRuntime({
    status: 'rendering',
    routePath: EXPORT_ROUTE_PATH,
    paperSize: payload.paperSize,
  });

  const mountNode = document.getElementById('app');
  if (!mountNode) {
    emitError('EXPORT_STATIC_ROOT_MISSING: Static export root container not found.');
    return;
  }

  mountNode.replaceChildren(buildExportDom(payload));

  const exportRoot = mountNode.querySelector('[data-export-root]');
  if (!(exportRoot instanceof HTMLElement)) {
    emitError('EXPORT_STATIC_ROOT_MISSING: Rendered export root was not found.');
    return;
  }

  try {
    await waitForFonts(exportRoot);
    await waitForImages(exportRoot);
    const stableLayout = await waitForStableLayout(exportRoot);

    emitReady({
      status: 'ready',
      routePath: EXPORT_ROUTE_PATH,
      paperSize: payload.paperSize,
      exportRootWidthPx: stableLayout.width,
      exportRootHeightPx: stableLayout.height,
    });
  } catch (error) {
    emitError(
      `EXPORT_READY_CONTRACT_FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

bootstrap().catch((error) => {
  emitError(
    `EXPORT_STATIC_BOOTSTRAP_FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`
  );
});
