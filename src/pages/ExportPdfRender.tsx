import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  type ExportTemplateVisibility,
  type NormalizedExportImageSource,
  type ServerPDFExportPayload,
} from '@/utils/types/exportTypes';
import type { StoryboardTheme } from '@/styles/storyboardTheme';
import type { Shot as AppShot, StoryboardPage as AppStoryboardPage } from '@/store';
import { ExportStoryboardPageContent } from '@/components/export/ExportStoryboardPageContent';
import { RENDERED_PAGE_WIDTH_PX } from '@/utils/pageSize';

const EXPORT_ROUTE_PATH = '/export/pdf/render';
const PAYLOAD_WAIT_TIMEOUT_MS = 2000;
const READY_EVENT_NAME = 'server-pdf-export-ready';
const ERROR_EVENT_NAME = 'server-pdf-export-error';
const IMAGE_READY_TIMEOUT_MS = 10000;
const FONT_CHECK_SAMPLE = 'AaBbCcDdEeFfGgHhIiJjKkLlMmNn0123456789';
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
    __SERVER_PDF_EXPORT_PAYLOAD__?: unknown;
    __SERVER_PDF_EXPORT_SET_PAYLOAD__?: (payload: unknown) => void;
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
  if (
    input.paperSize !== 'letter' &&
    input.paperSize !== 'canvas' &&
    input.paperSize !== 'letter-portrait' &&
    input.paperSize !== 'letter-landscape'
  ) {
    return false;
  }
  if (!validateTemplate(input.template)) return false;

  if (!validateTheme(input.theme)) return false;
  if (!isRecord(input.project)) return false;
  if (!isRecord(input.page)) return false;

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

function toShotImageFields(image: NormalizedExportImageSource | null): Pick<AppShot, 'imageData' | 'imageUrl'> {
  if (!image) {
    return {
      imageData: undefined,
      imageUrl: undefined,
    };
  }

  if (image.kind === 'dataUrl') {
    return {
      imageData: image.dataUrl,
      imageUrl: undefined,
    };
  }

  return {
    imageData: undefined,
    imageUrl: image.url,
  };
}

function buildExportPage(payload: ServerPDFExportPayload): AppStoryboardPage {
  return {
    id: payload.page.id,
    name: payload.page.name,
    shots: payload.page.shots.map((shot) => shot.id),
    gridRows: payload.page.gridRows,
    gridCols: payload.page.gridCols,
    aspectRatio: payload.page.aspectRatio,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

function buildExportShots(payload: ServerPDFExportPayload): AppShot[] {
  return payload.page.shots.map((shot) => ({
    id: shot.id,
    number: shot.number,
    subShotGroupId: null,
    imageFile: null,
    ...toShotImageFields(shot.image),
    imageScale: shot.imageScale,
    imageOffsetX: shot.imageOffsetX,
    imageOffsetY: shot.imageOffsetY,
    actionText: shot.actionText,
    scriptText: shot.scriptText,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  }));
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

const shellStyles = {
  minHeight: '100vh',
  margin: 0,
};

const contentShellStyles = {
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
};

function SharedExportPage({
  payload,
  exportRootRef,
}: {
  payload: ServerPDFExportPayload;
  exportRootRef: React.RefObject<HTMLDivElement>;
}) {
  const exportPage = useMemo(() => buildExportPage(payload), [payload]);
  const exportShots = useMemo(() => buildExportShots(payload), [payload]);

  return (
    <div style={shellStyles}>
      <div style={contentShellStyles}>
        <div
          ref={exportRootRef}
          data-export-root
          data-paper-size={payload.paperSize}
          style={{
            fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            width: `${RENDERED_PAGE_WIDTH_PX}px`,
            minWidth: `${RENDERED_PAGE_WIDTH_PX}px`,
            overflow: 'visible',
          }}
        >
          <ExportStoryboardPageContent
            page={exportPage}
            pageShots={exportShots}
            storyboardTheme={payload.theme}
            pageId={payload.page.id}
            pageNumber={payload.page.pageNumber}
            pageElementId={`server-export-page-${payload.page.id}`}
            hideEmptySlots
            exportPayload={payload}
          />
        </div>
      </div>
    </div>
  );
}

function ExportErrorScreen({ message }: { message: string }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: '#111827',
        color: '#f9fafb',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          borderRadius: '12px',
          backgroundColor: '#1f2937',
          border: '1px solid #374151',
          padding: '24px',
        }}
      >
        <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
          Export Route Error
        </div>
        <div style={{ fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
          {message}
        </div>
      </div>
    </div>
  );
}

const ExportPdfRender: React.FC = () => {
  const [payload, setPayload] = useState<ServerPDFExportPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const exportRootRef = useRef<HTMLDivElement>(null);
  const hasPayloadRef = useRef(false);

  useEffect(() => {
    updateRuntime({
      status: 'waiting_for_payload',
      routePath: EXPORT_ROUTE_PATH,
    });

    const applyPayload = (incoming: unknown) => {
      if (!validatePayload(incoming)) {
        const message =
          'EXPORT_PAYLOAD_INVALID: Export route received an invalid payload. This route is payload-only and does not fall back to live app state.';
        setError(message);
        emitError(message);
        return;
      }

      setError(null);
      hasPayloadRef.current = true;
      setPayload(incoming);
      updateRuntime({
        status: 'rendering',
        routePath: EXPORT_ROUTE_PATH,
        paperSize: incoming.paperSize,
      });
    };

    window.__SERVER_PDF_EXPORT_SET_PAYLOAD__ = applyPayload;

    if (typeof window.__SERVER_PDF_EXPORT_PAYLOAD__ !== 'undefined') {
      applyPayload(window.__SERVER_PDF_EXPORT_PAYLOAD__);
    }

    const timeoutId = window.setTimeout(() => {
      setError((currentError) => {
        if (currentError || hasPayloadRef.current) return currentError;

        const message =
          'EXPORT_PAYLOAD_MISSING: Export route did not receive a payload. This route is deterministic and will not read live app state as a fallback.';
        emitError(message);
        return message;
      });
    }, PAYLOAD_WAIT_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
      delete window.__SERVER_PDF_EXPORT_SET_PAYLOAD__;
    };
  }, []);

  useEffect(() => {
    if (!payload || !exportRootRef.current) return;

    let cancelled = false;

    const runReadyContract = async () => {
      try {
        await waitForAnimationFrame();
        await waitForFonts(exportRootRef.current!);
        await waitForImages(exportRootRef.current!);
        const stableLayout = await waitForStableLayout(exportRootRef.current!);

        if (cancelled) return;

        emitReady({
          status: 'ready',
          routePath: EXPORT_ROUTE_PATH,
          paperSize: payload.paperSize,
          exportRootWidthPx: stableLayout.width,
          exportRootHeightPx: stableLayout.height,
        });
      } catch (readyError) {
        if (cancelled) return;

        const message = `EXPORT_READY_CONTRACT_FAILED: ${
          readyError instanceof Error ? readyError.message : 'Unknown error'
        }`;
        setError(message);
        emitError(message);
      }
    };

    runReadyContract();

    return () => {
      cancelled = true;
    };
  }, [payload]);

  if (error) {
    return <ExportErrorScreen message={error} />;
  }

  if (!payload) {
    return <ExportErrorScreen message="Waiting for export payload..." />;
  }

  return <SharedExportPage payload={payload} exportRootRef={exportRootRef} />;
};

export default ExportPdfRender;
