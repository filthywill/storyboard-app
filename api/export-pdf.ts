import chromium from '@sparticuz/chromium';
import { PDFDocument } from 'pdf-lib';
import puppeteer, { type Page } from 'puppeteer-core';
import type { ServerPDFExportPayload } from '../src/utils/types/exportTypes';

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

type VercelRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  end: (body?: string | Buffer) => void;
};

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
    __SERVER_PDF_EXPORT_SET_PAYLOAD__?: (payload: unknown) => void;
    __SERVER_PDF_EXPORT_RUNTIME__?: ExportRuntimeMeta;
  }
}

const EXPORT_ROUTE_PATH = '/export/pdf/render-static';
const READY_TIMEOUT_MS = 30000;
const NAVIGATION_TIMEOUT_MS = 30000;
const DEFAULT_VIEWPORT = {
  width: 1280,
  height: 2400,
  deviceScaleFactor: 1,
};

type TimingMarkName =
  | 'request_received'
  | 'chromium_launch_start'
  | 'chromium_launch_end'
  | 'payload_injection'
  | 'page_goto_start'
  | 'page_goto_end'
  | 'export_ready_detected'
  | 'final_paint_start'
  | 'final_paint_end'
  | 'pdf_start'
  | 'pdf_end'
  | 'response_sent';

function formatDurationMs(durationMs: number): string {
  return `${Math.round(durationMs)} ms`;
}

async function ensureFinalPaintReady(
  page: Page
): Promise<void> {
  await page.evaluate(async () => {
    const exportRoot = document.querySelector('[data-export-root]');
    if (!(exportRoot instanceof HTMLElement)) {
      throw new Error('Export root missing before PDF capture.');
    }

    const images = Array.from(exportRoot.querySelectorAll('img')) as HTMLImageElement[];
    for (const image of images) {
      const source = image.currentSrc || image.src;
      if (!source) {
        throw new Error('Image source missing during final paint preparation.');
      }

      if (typeof image.decode === 'function') {
        await image.decode().catch(() => {
          throw new Error(`Image decode failed during final paint preparation: ${source}`);
        });
      }

      image.getBoundingClientRect();
    }

    exportRoot.getBoundingClientRect();
    void exportRoot.offsetHeight;
    void document.body.offsetHeight;

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    exportRoot.getBoundingClientRect();
  });
}

function setCommonHeaders(res: VercelResponse): void {
  res.setHeader('Cache-Control', 'no-store');
}

function buildTimingDurations(
  timingMarks: Partial<Record<TimingMarkName, number>>,
  requestStartedAt: number
): Partial<Record<'chromiumLaunch' | 'navigation' | 'readinessWait' | 'finalPaint' | 'pdfGeneration' | 'total', number>> {
  const getDuration = (start: TimingMarkName, end: TimingMarkName): number | null => {
    const startAt = timingMarks[start];
    const endAt = timingMarks[end];
    if (typeof startAt !== 'number' || typeof endAt !== 'number') {
      return null;
    }
    return endAt - startAt;
  };

  return {
    chromiumLaunch: getDuration('chromium_launch_start', 'chromium_launch_end') ?? undefined,
    navigation: getDuration('page_goto_start', 'page_goto_end') ?? undefined,
    readinessWait: getDuration('page_goto_end', 'export_ready_detected') ?? undefined,
    finalPaint: getDuration('final_paint_start', 'final_paint_end') ?? undefined,
    pdfGeneration: getDuration('pdf_start', 'pdf_end') ?? undefined,
    total: (timingMarks.response_sent ?? Date.now()) - requestStartedAt,
  };
}

function setTimingHeaders(
  res: VercelResponse,
  timingMarks: Partial<Record<TimingMarkName, number>>,
  requestStartedAt: number
): void {
  const durations = buildTimingDurations(timingMarks, requestStartedAt);
  const serverTiming = [
    durations.chromiumLaunch != null ? `chromium-launch;dur=${durations.chromiumLaunch}` : null,
    durations.navigation != null ? `navigation;dur=${durations.navigation}` : null,
    durations.readinessWait != null ? `readiness-wait;dur=${durations.readinessWait}` : null,
    durations.finalPaint != null ? `final-paint;dur=${durations.finalPaint}` : null,
    durations.pdfGeneration != null ? `pdf-generation;dur=${durations.pdfGeneration}` : null,
    durations.total != null ? `total;dur=${durations.total}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  if (serverTiming) {
    res.setHeader('Server-Timing', serverTiming);
  }

  if (durations.chromiumLaunch != null) {
    res.setHeader('X-Export-Timing-Chromium-Launch-Ms', String(durations.chromiumLaunch));
  }
  if (durations.navigation != null) {
    res.setHeader('X-Export-Timing-Navigation-Ms', String(durations.navigation));
  }
  if (durations.readinessWait != null) {
    res.setHeader('X-Export-Timing-Readiness-Wait-Ms', String(durations.readinessWait));
  }
  if (durations.finalPaint != null) {
    res.setHeader('X-Export-Timing-Final-Paint-Ms', String(durations.finalPaint));
  }
  if (durations.pdfGeneration != null) {
    res.setHeader('X-Export-Timing-Pdf-Generation-Ms', String(durations.pdfGeneration));
  }
  if (durations.total != null) {
    res.setHeader('X-Export-Timing-Total-Ms', String(durations.total));
  }
}

function getHeader(
  headers: VercelRequest['headers'],
  name: string
): string | undefined {
  const value = headers?.[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function parseJsonBody(body: unknown): unknown {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      throw new Error('Request body must be valid JSON.');
    }
  }

  return body;
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
  return isString(value) && /^\s*\d+\s*\/\s*\d+\s*$/.test(value);
}

function validateImageSource(image: unknown): boolean {
  if (!isRecord(image) || !isString(image.kind)) return false;

  if (image.kind === 'dataUrl') {
    return isString(image.dataUrl);
  }

  if (image.kind === 'url') {
    return isString(image.url);
  }

  return false;
}

function validatePageContent(page: unknown): page is ServerPDFExportPayload['page'] {
  if (
    !isRecord(page) ||
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

  const template = input.template;
  if (
    !isRecord(template) ||
    !isBoolean(template.showLogo) ||
    !isBoolean(template.showProjectName) ||
    !isBoolean(template.showProjectInfo) ||
    !isBoolean(template.showClientAgency) ||
    !isBoolean(template.showJobInfo) ||
    !isBoolean(template.showActionText) ||
    !isBoolean(template.showScriptText) ||
    !isBoolean(template.showPageNumber)
  ) {
    return false;
  }

  const theme = input.theme;
  if (
    !isRecord(theme) ||
    !isString(theme.id) ||
    !isString(theme.name) ||
    !isBoolean(theme.isPreset) ||
    !isString(theme.contentBackground) ||
    !isRecord(theme.header) ||
    !isString(theme.header.text) ||
    !isRecord(theme.shotCard) ||
    !isString(theme.shotCard.background) ||
    !isBoolean(theme.shotCard.backgroundEnabled) ||
    !isString(theme.shotCard.border) ||
    !isBoolean(theme.shotCard.borderEnabled) ||
    !isNumber(theme.shotCard.borderWidth) ||
    !isNumber(theme.shotCard.borderRadius) ||
    !isRecord(theme.imageFrame) ||
    !isString(theme.imageFrame.border) ||
    !isBoolean(theme.imageFrame.borderEnabled) ||
    !isNumber(theme.imageFrame.borderWidth) ||
    !isRecord(theme.shotNumber) ||
    !isString(theme.shotNumber.text) ||
    !isString(theme.shotNumber.background) ||
    !isString(theme.shotNumber.border) ||
    !isBoolean(theme.shotNumber.borderEnabled) ||
    !isNumber(theme.shotNumber.borderWidth) ||
    !isNumber(theme.shotNumber.borderRadius) ||
    !isRecord(theme.actionText) ||
    !isString(theme.actionText.text) ||
    !isRecord(theme.scriptText) ||
    !isString(theme.scriptText.text)
  ) {
    return false;
  }

  const project = input.project;
  if (
    !isRecord(project) ||
    !isString(project.projectName) ||
    !isString(project.projectInfo) ||
    !isString(project.clientAgency) ||
    !isString(project.jobInfo) ||
    !(project.projectLogo === null || validateImageSource(project.projectLogo))
  ) {
    return false;
  }

  if (!validatePageContent(input.page)) {
    return false;
  }

  if (typeof input.pages === 'undefined') {
    return true;
  }

  return Array.isArray(input.pages) && input.pages.length > 0 && input.pages.every((page) => validatePageContent(page));
}

function sanitizeFilename(filename: string): string {
  const base = filename.trim().replace(/[^a-zA-Z0-9._-]+/g, '_') || 'storyboard_export';
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
}

function getBaseUrl(req: VercelRequest): string {
  const proto =
    getHeader(req.headers, 'x-forwarded-proto') ||
    (process.env.NODE_ENV === 'development' ? 'http' : 'https');

  const host =
    getHeader(req.headers, 'x-forwarded-host') ||
    getHeader(req.headers, 'host') ||
    process.env.VERCEL_URL ||
    process.env.SITE_URL?.replace(/^https?:\/\//, '');

  if (!host) {
    throw new Error('Unable to resolve application base URL for export render route.');
  }

  return `${proto}://${host}`;
}

async function resolveChromiumExecutablePath(): Promise<string> {
  const source = process.env.CHROMIUM_PACK_URL || process.env.CHROMIUM_PACK_PATH;

  try {
    return source ? await chromium.executablePath(source) : await chromium.executablePath();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown executable path resolution error';
    console.error('[server-pdf][chromium] Failed to resolve executable path', {
      runtime: process.env.VERCEL ? 'vercel' : process.env.NODE_ENV || 'unknown',
      hasPackUrl: Boolean(process.env.CHROMIUM_PACK_URL),
      hasPackPath: Boolean(process.env.CHROMIUM_PACK_PATH),
      error: message,
    });
    throw new Error('Unable to resolve Chromium executable for PDF export runtime.');
  }
}

function getInternalNavigationHeaders(req: VercelRequest): Record<string, string> {
  const forwardedHeaders: Record<string, string> = {};

  const bypassHeader = getHeader(req.headers, 'x-vercel-protection-bypass');
  if (bypassHeader) {
    forwardedHeaders['x-vercel-protection-bypass'] = bypassHeader;
    forwardedHeaders['x-vercel-set-bypass-cookie'] = 'true';
  }

  const cookieHeader = getHeader(req.headers, 'cookie');
  if (cookieHeader) {
    forwardedHeaders.cookie = cookieHeader;
  }

  return forwardedHeaders;
}

function buildPdfOptions(runtime: ExportRuntimeMeta) {
  const margin = {
    top: '0px',
    right: '0px',
    bottom: '0px',
    left: '0px',
  };

  if (runtime.paperSize === 'canvas') {
    if (!runtime.exportRootWidthPx || !runtime.exportRootHeightPx) {
      throw new Error('Canvas export route did not provide measured export root dimensions.');
    }

    return {
      printBackground: true,
      preferCSSPageSize: false,
      width: `${runtime.exportRootWidthPx}px`,
      height: `${runtime.exportRootHeightPx}px`,
      margin,
      pageRanges: '1',
    };
  }

  const isLandscape = runtime.paperSize === 'letter-landscape' || runtime.paperSize === 'letter';

  return {
    printBackground: true,
    preferCSSPageSize: false,
    format: 'Letter' as const,
    landscape: isLandscape,
    margin,
    pageRanges: '1',
  };
}

function buildRenderPayload(
  payload: ServerPDFExportPayload,
  page: ServerPDFExportPayload['page']
): ServerPDFExportPayload {
  const { pages: _pages, ...sharedPayload } = payload;
  return {
    ...sharedPayload,
    page,
  };
}

function summarizePayloadImageSources(payload: ServerPDFExportPayload) {
  const pages = payload.pages && payload.pages.length > 0 ? payload.pages : [payload.page];

  return pages.flatMap((page) =>
    page.shots.map((shot) => {
      const source = shot.image
        ? shot.image.kind === 'dataUrl'
          ? shot.image.dataUrl
          : shot.image.url
        : null;

      return {
        pageId: page.id,
        pageNumber: page.pageNumber,
        shotId: shot.id,
        shotNumber: shot.number,
        imageKind: shot.image?.kind ?? null,
        sourcePrefix: source ? source.slice(0, 40) : null,
        sourceLength: source?.length ?? 0,
      };
    })
  );
}

async function mergePdfBuffers(pdfBuffers: Buffer[]): Promise<Buffer> {
  if (pdfBuffers.length === 0) {
    throw new Error('No rendered PDF pages were available to merge.');
  }

  if (pdfBuffers.length === 1) {
    return pdfBuffers[0];
  }

  const mergedPdf = await PDFDocument.create();

  for (const pdfBuffer of pdfBuffers) {
    const sourcePdf = await PDFDocument.load(pdfBuffer);
    const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
    for (const copiedPage of copiedPages) {
      mergedPdf.addPage(copiedPage);
    }
  }

  const mergedBytes = await mergedPdf.save();
  return Buffer.from(mergedBytes);
}

async function renderSinglePagePdf({
  browser,
  req,
  renderUrl,
  payload,
  mark,
}: {
  browser: Awaited<ReturnType<typeof puppeteer.launch>>;
  req: VercelRequest;
  renderUrl: string;
  payload: ServerPDFExportPayload;
  mark: (name: TimingMarkName) => void;
}): Promise<Buffer> {
  const page = await browser.newPage();

  try {
    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
    page.setDefaultTimeout(READY_TIMEOUT_MS);
    await page.emulateMediaType('screen');
    const navigationHeaders = getInternalNavigationHeaders(req);
    if (Object.keys(navigationHeaders).length > 0) {
      await page.setExtraHTTPHeaders(navigationHeaders);
    }

    await page.evaluateOnNewDocument((injectedPayload: ServerPDFExportPayload) => {
      window.__SERVER_PDF_EXPORT__ = injectedPayload;
      window.__SERVER_PDF_EXPORT_PAYLOAD__ = injectedPayload;
    }, payload);
    mark('payload_injection');

    mark('page_goto_start');
    await page.goto(renderUrl, {
      waitUntil: 'load',
      timeout: NAVIGATION_TIMEOUT_MS,
    });
    mark('page_goto_end');

    await page.waitForFunction(
      () => {
        const runtime = window.__SERVER_PDF_EXPORT_RUNTIME__;
        return runtime?.status === 'ready' || runtime?.status === 'error';
      },
      {
        timeout: READY_TIMEOUT_MS,
      }
    );
    mark('export_ready_detected');

    const runtime = (await page.evaluate(() => {
      return window.__SERVER_PDF_EXPORT_RUNTIME__ ?? null;
    })) as ExportRuntimeMeta | null;

    if (!runtime) {
      throw new Error('Export render route never published runtime state.');
    }

    if (runtime.status === 'error') {
      throw new Error(runtime.error || 'Export render route reported an unknown error.');
    }

    if (runtime.status !== 'ready') {
      throw new Error(`Unexpected export render route status: ${runtime.status}`);
    }

    mark('final_paint_start');
    await ensureFinalPaintReady(page);
    mark('final_paint_end');

    mark('pdf_start');
    const pdfBytes = await page.pdf(buildPdfOptions(runtime));
    mark('pdf_end');

    return Buffer.from(pdfBytes);
  } finally {
    await page.close().catch(() => undefined);
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  setCommonHeaders(res);
  const requestStartedAt = Date.now();
  const timingMarks: Partial<Record<TimingMarkName, number>> = {
    request_received: requestStartedAt,
  };

  const mark = (name: TimingMarkName): void => {
    timingMarks[name] = Date.now();
    console.log(`[server-pdf][timing] ${name}: ${timingMarks[name]! - requestStartedAt} ms`);
  };

  const logTimingSummary = (): void => {
    const durations = buildTimingDurations(timingMarks, requestStartedAt);
    console.log('[server-pdf][timing][summary]', {
      chromiumLaunch: durations.chromiumLaunch,
      navigation: durations.navigation,
      readinessWait: durations.readinessWait,
      finalPaint: durations.finalPaint,
      pdfGeneration: durations.pdfGeneration,
      total: durations.total,
    });
  };

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    res.status(405).json({
      error: 'Method not allowed.',
      code: 'METHOD_NOT_ALLOWED',
    });
    return;
  }

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

  try {
    const parsedBody = parseJsonBody(req.body);
    if (!validatePayload(parsedBody)) {
      res.status(400).json({
        error: 'Invalid export payload.',
        code: 'INVALID_EXPORT_PAYLOAD',
      });
      return;
    }

    const payload = parsedBody;
    if (process.env.NODE_ENV === 'development' && payload.debug) {
      console.debug('[server-pdf][api][received-debug]', payload.debug ?? null);
      console.debug('[server-pdf][api][received-shot-sources]', summarizePayloadImageSources(payload));
    }

    const renderUrl = new URL(EXPORT_ROUTE_PATH, getBaseUrl(req)).toString();
    mark('chromium_launch_start');
    const executablePath = await resolveChromiumExecutablePath();

    browser = await puppeteer.launch({
      args: puppeteer.defaultArgs({
        args: chromium.args,
        headless: 'shell',
      }),
      defaultViewport: DEFAULT_VIEWPORT,
      executablePath,
      headless: 'shell',
    });
    mark('chromium_launch_end');

    const pagesToRender =
      payload.pages && payload.pages.length > 0 ? payload.pages : [payload.page];
    const renderedPdfBuffers: Buffer[] = [];

    for (const exportPage of pagesToRender) {
      const renderPayload = buildRenderPayload(payload, exportPage);
      const pdfBuffer = await renderSinglePagePdf({
        browser,
        req,
        renderUrl,
        payload: renderPayload,
        mark,
      });
      renderedPdfBuffers.push(pdfBuffer);
    }

    const pdfBuffer = await mergePdfBuffers(renderedPdfBuffers);
    const filename = sanitizeFilename(payload.filename);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(pdfBuffer.byteLength));
    mark('response_sent');
    setTimingHeaders(res, timingMarks, requestStartedAt);
    console.log('[server-pdf][timing][breakdown]', {
      chromiumLaunch: formatDurationMs(timingMarks.chromium_launch_end! - timingMarks.chromium_launch_start!),
      navigation: formatDurationMs(timingMarks.page_goto_end! - timingMarks.page_goto_start!),
      readinessWait: formatDurationMs(timingMarks.export_ready_detected! - timingMarks.page_goto_end!),
      finalPaint: formatDurationMs(timingMarks.final_paint_end! - timingMarks.final_paint_start!),
      pdfGeneration: formatDurationMs(timingMarks.pdf_end! - timingMarks.pdf_start!),
      total: formatDurationMs(timingMarks.response_sent! - requestStartedAt),
    });
    logTimingSummary();
    res.status(200).end(pdfBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown export error';
    const isTimeout = /timeout/i.test(message);
    const isInvalidPayload = /invalid export payload|valid json/i.test(message);
    const statusCode = isInvalidPayload ? 400 : isTimeout ? 504 : 500;
    mark('response_sent');
    setTimingHeaders(res, timingMarks, requestStartedAt);
    logTimingSummary();

    res.status(statusCode).json({
      error: message,
      code: isTimeout
        ? 'EXPORT_TIMEOUT'
        : isInvalidPayload
          ? 'INVALID_EXPORT_PAYLOAD'
          : 'PDF_EXPORT_ERROR',
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
