import type { NormalizedExportImageSource } from '@/utils/types/exportTypes';

export interface PdfExportImageOptimizationOptions {
  maxWidth?: number;
  jpegQuality?: number;
}

export type PdfExportImageOptimizationOutcome =
  | 'optimized'
  | 'skipped_already_small'
  | 'skipped_already_small_jpeg'
  | 'skipped_remote_url_unsupported'
  | 'fallback_decode_failed'
  | 'fallback_invalid_dimensions'
  | 'fallback_canvas_context_unavailable'
  | 'fallback_canvas_export_failed'
  | 'fallback_canvas_export_invalid';

export interface PdfExportImageOptimizationDebugInfo {
  sourceKind: NormalizedExportImageSource['kind'];
  outcome: PdfExportImageOptimizationOutcome;
  sourceWidth: number | null;
  sourceHeight: number | null;
  optimizedWidth: number | null;
  optimizedHeight: number | null;
  beforeApproxDataUrlBytes: number | null;
  afterApproxDataUrlBytes: number | null;
  returnedOriginalSource: boolean;
  wasResized: boolean;
  errorMessage: string | null;
}

export interface PdfExportImageOptimizationResult {
  source: NormalizedExportImageSource;
  debug: PdfExportImageOptimizationDebugInfo;
}

const DEFAULT_MAX_WIDTH = 800;
const DEFAULT_JPEG_QUALITY = 0.85;
const JPEG_MIME_TYPE = 'image/jpeg';
const DATA_URL_MIME_TYPE_REGEX = /^data:([^;,]+)(?:;[^,]*)?,/i;

function getSourceKey(source: NormalizedExportImageSource): string {
  if (source.kind === 'dataUrl') {
    return `dataUrl:${source.dataUrl}`;
  }

  return `url:${source.url}`;
}

function loadImage(sourceUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to decode image source.'));
    image.src = sourceUrl;
  });
}

function approximateDataUrlBytes(dataUrl: string): number | null {
  const match = dataUrl.match(/^data:[^;,]+(?:;charset=[^;,]+)?(;base64)?,(.*)$/);
  if (!match) {
    return null;
  }

  const [, isBase64, body] = match;
  if (!isBase64) {
    return body.length;
  }

  const sanitized = body.replace(/\s+/g, '');
  const paddingLength = sanitized.endsWith('==') ? 2 : sanitized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((sanitized.length * 3) / 4) - paddingLength);
}

function buildBaseDebug(
  source: NormalizedExportImageSource
): PdfExportImageOptimizationDebugInfo {
  return {
    sourceKind: source.kind,
    outcome: 'fallback_decode_failed',
    sourceWidth: null,
    sourceHeight: null,
    optimizedWidth: null,
    optimizedHeight: null,
    beforeApproxDataUrlBytes: source.kind === 'dataUrl' ? approximateDataUrlBytes(source.dataUrl) : null,
    afterApproxDataUrlBytes: null,
    returnedOriginalSource: true,
    wasResized: false,
    errorMessage: null,
  };
}

function buildResult(
  source: NormalizedExportImageSource,
  debug: PdfExportImageOptimizationDebugInfo
): PdfExportImageOptimizationResult {
  return {
    source,
    debug,
  };
}

function getDataUrlMimeType(dataUrl: string): string | null {
  const match = dataUrl.match(DATA_URL_MIME_TYPE_REGEX);
  if (!match?.[1]) {
    return null;
  }

  return match[1].toLowerCase();
}

function isJpegDataUrl(dataUrl: string): boolean {
  const mimeType = getDataUrlMimeType(dataUrl);
  return mimeType === 'image/jpeg' || mimeType === 'image/jpg';
}

export async function optimizeImageForPdfExportDetailed(
  source: NormalizedExportImageSource,
  options: PdfExportImageOptimizationOptions = {}
): Promise<PdfExportImageOptimizationResult> {
  const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;
  const jpegQuality = options.jpegQuality ?? DEFAULT_JPEG_QUALITY;
  const debug = buildBaseDebug(source);
  const sourceUrl = source.kind === 'dataUrl' ? source.dataUrl : source.url;

  let decodedImage: HTMLImageElement;
  try {
    decodedImage = await loadImage(sourceUrl);
  } catch (error) {
    debug.outcome = source.kind === 'url' ? 'skipped_remote_url_unsupported' : 'fallback_decode_failed';
    debug.errorMessage = error instanceof Error ? error.message : 'Unable to decode image source.';
    return buildResult(source, debug);
  }

  const sourceWidth = decodedImage.naturalWidth;
  const sourceHeight = decodedImage.naturalHeight;
  debug.sourceWidth = sourceWidth;
  debug.sourceHeight = sourceHeight;

  if (!Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight) || sourceWidth <= 0 || sourceHeight <= 0) {
    debug.outcome = 'fallback_invalid_dimensions';
    return buildResult(source, debug);
  }

  if (source.kind === 'dataUrl' && isJpegDataUrl(source.dataUrl) && sourceWidth <= maxWidth) {
    debug.outcome = 'skipped_already_small_jpeg';
    debug.optimizedWidth = sourceWidth;
    debug.optimizedHeight = sourceHeight;
    debug.afterApproxDataUrlBytes = debug.beforeApproxDataUrlBytes;
    return buildResult(source, debug);
  }

  const targetWidth = Math.min(sourceWidth, maxWidth);
  const scale = targetWidth / sourceWidth;
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale));
  debug.optimizedWidth = Math.max(1, Math.round(targetWidth));
  debug.optimizedHeight = targetHeight;
  debug.wasResized = targetWidth < sourceWidth;

  const canvas = document.createElement('canvas');
  canvas.width = debug.optimizedWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    debug.outcome = 'fallback_canvas_context_unavailable';
    return buildResult(source, debug);
  }

  try {
    // JPEG has no alpha channel, so flatten transparency onto white.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(decodedImage, 0, 0, canvas.width, canvas.height);

    const optimizedDataUrl = canvas.toDataURL(JPEG_MIME_TYPE, jpegQuality);
    if (!optimizedDataUrl.startsWith('data:image/jpeg')) {
      debug.outcome = 'fallback_canvas_export_invalid';
      return buildResult(source, debug);
    }

    debug.outcome = 'optimized';
    debug.returnedOriginalSource = false;
    debug.afterApproxDataUrlBytes = approximateDataUrlBytes(optimizedDataUrl);

    return buildResult(
      {
        kind: 'dataUrl',
        dataUrl: optimizedDataUrl,
      },
      debug
    );
  } catch (error) {
    debug.outcome = source.kind === 'url' ? 'skipped_remote_url_unsupported' : 'fallback_canvas_export_failed';
    debug.errorMessage = error instanceof Error ? error.message : 'Canvas export failed.';
    return buildResult(source, debug);
  }
}

export async function optimizeImageForPdfExport(
  source: NormalizedExportImageSource,
  options: PdfExportImageOptimizationOptions = {}
): Promise<NormalizedExportImageSource> {
  const result = await optimizeImageForPdfExportDetailed(source, options);
  return result.source;
}

export async function optimizeImageForPdfExportWithCache(
  source: NormalizedExportImageSource,
  cache: Map<string, Promise<NormalizedExportImageSource>>,
  options: PdfExportImageOptimizationOptions = {}
): Promise<NormalizedExportImageSource> {
  const key = getSourceKey(source);
  const existing = cache.get(key);
  if (existing) {
    return await existing;
  }

  const optimizationPromise = optimizeImageForPdfExport(source, options);
  cache.set(key, optimizationPromise);
  return await optimizationPromise;
}

export async function optimizeImageForPdfExportWithCacheDetailed(
  source: NormalizedExportImageSource,
  cache: Map<string, Promise<PdfExportImageOptimizationResult>>,
  options: PdfExportImageOptimizationOptions = {}
): Promise<PdfExportImageOptimizationResult> {
  const key = getSourceKey(source);
  const existing = cache.get(key);
  if (existing) {
    return await existing;
  }

  const optimizationPromise = optimizeImageForPdfExportDetailed(source, options);
  cache.set(key, optimizationPromise);
  return await optimizationPromise;
}
