import type { StoryboardPage, StoryboardState } from '@/store/storyboardStore';
import {
  ExportError,
  type NormalizedExportImageSource,
  type ServerPDFExportPayload,
  type ServerPDFShotContent,
} from '@/utils/types/exportTypes';
import { resolvePageSizeMode } from '@/utils/pageSize';
import {
  optimizeImageForPdfExportWithCacheDetailed,
  type PdfExportImageOptimizationDebugInfo,
  type PdfExportImageOptimizationResult,
} from '@/utils/export/pdfExportImageOptimizer';

export type ExportableShot = StoryboardState['pages'][number]['shots'][number] & {
  imageData?: string;
  imageUrl?: string;
  imageScale?: number;
  imageOffsetX?: number;
  imageOffsetY?: number;
};

export type ExportablePage = Omit<StoryboardPage, 'shots'> & {
  shots: ExportableShot[];
};

type ShotImageSourceOrigin =
  | 'shot.imageData'
  | 'shot.imageFile'
  | 'shot.imageUrl(dataUrl)'
  | 'shot.imageUrl(url)'
  | 'none';

interface ShotImageDebugEntry {
  pageId: string;
  pageName: string;
  shotId: string;
  shotNumber: string;
  sourceOrigin: ShotImageSourceOrigin;
  inputKind: NormalizedExportImageSource['kind'];
  outputKind: NormalizedExportImageSource['kind'];
  outcome: PdfExportImageOptimizationDebugInfo['outcome'];
  returnedOriginalSource: boolean;
  wasResized: boolean;
  sourceWidth: number | null;
  sourceHeight: number | null;
  optimizedWidth: number | null;
  optimizedHeight: number | null;
  beforeApproxDataUrlBytes: number | null;
  afterApproxDataUrlBytes: number | null;
  payloadSourceCharsBefore: number;
  payloadSourceCharsAfter: number;
  errorMessage: string | null;
}

interface PayloadDebugSummary {
  totalShotImages: number;
  optimized: number;
  skippedAlreadySmall: number;
  skippedRemoteUrlUnsupported: number;
  fallbackOptimizationFailure: number;
  totalPayloadSourceCharsBefore: number;
  totalPayloadSourceCharsAfter: number;
  totalApproxDataUrlBytesBefore: number;
  totalApproxDataUrlBytesAfter: number;
  images: ShotImageDebugEntry[];
}

export const ENABLE_PDF_IMAGE_OPTIMIZATION = false;
const ENABLE_PDF_IMAGE_OPTIMIZATION_DEBUG =
  import.meta.env.DEV && ENABLE_PDF_IMAGE_OPTIMIZATION;

declare global {
  interface Window {
    __SERVER_PDF_EXPORT_PAYLOAD_DEBUG__?: PayloadDebugSummary;
  }
}

function isDataUrl(value: string): boolean {
  return value.startsWith('data:');
}

function isBlobUrl(value: string): boolean {
  return value.startsWith('blob:');
}

function getSourceValueLength(source: NormalizedExportImageSource): number {
  return source.kind === 'dataUrl' ? source.dataUrl.length : source.url.length;
}

function detectShotImageSourceOrigin(shot: ExportableShot): ShotImageSourceOrigin {
  if (shot.imageData) {
    return 'shot.imageData';
  }

  if (shot.imageFile) {
    return 'shot.imageFile';
  }

  if (!shot.imageUrl) {
    return 'none';
  }

  return isDataUrl(shot.imageUrl) ? 'shot.imageUrl(dataUrl)' : 'shot.imageUrl(url)';
}

function isOptimizationFailureOutcome(outcome: PdfExportImageOptimizationDebugInfo['outcome']): boolean {
  return (
    outcome === 'fallback_decode_failed' ||
    outcome === 'fallback_invalid_dimensions' ||
    outcome === 'fallback_canvas_context_unavailable' ||
    outcome === 'fallback_canvas_export_failed' ||
    outcome === 'fallback_canvas_export_invalid'
  );
}

function buildPayloadDebugSummary(images: ShotImageDebugEntry[]): PayloadDebugSummary {
  return {
    totalShotImages: images.length,
    optimized: images.filter((image) => image.outcome === 'optimized').length,
    skippedAlreadySmall: images.filter(
      (image) =>
        image.outcome === 'skipped_already_small' ||
        image.outcome === 'skipped_already_small_jpeg'
    ).length,
    skippedRemoteUrlUnsupported: images.filter((image) => image.outcome === 'skipped_remote_url_unsupported').length,
    fallbackOptimizationFailure: images.filter((image) => isOptimizationFailureOutcome(image.outcome)).length,
    totalPayloadSourceCharsBefore: images.reduce((total, image) => total + image.payloadSourceCharsBefore, 0),
    totalPayloadSourceCharsAfter: images.reduce((total, image) => total + image.payloadSourceCharsAfter, 0),
    totalApproxDataUrlBytesBefore: images.reduce(
      (total, image) => total + (image.beforeApproxDataUrlBytes ?? 0),
      0
    ),
    totalApproxDataUrlBytesAfter: images.reduce(
      (total, image) => total + (image.afterApproxDataUrlBytes ?? 0),
      0
    ),
    images,
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to convert blob to data URL.'));
    reader.readAsDataURL(blob);
  });
}

async function fileToDataUrl(file: File): Promise<string> {
  return await blobToDataUrl(file);
}

async function normalizeImageSource({
  dataUrl,
  url,
  file,
  sourceLabel,
}: {
  dataUrl?: string;
  url?: string | null;
  file?: File | null;
  sourceLabel: string;
}): Promise<NormalizedExportImageSource | null> {
  if (dataUrl) {
    return {
      kind: 'dataUrl',
      dataUrl,
    };
  }

  if (file) {
    return {
      kind: 'dataUrl',
      dataUrl: await fileToDataUrl(file),
    };
  }

  if (!url) {
    return null;
  }

  if (isDataUrl(url)) {
    return {
      kind: 'dataUrl',
      dataUrl: url,
    };
  }

  if (isBlobUrl(url)) {
    throw new ExportError(
      `${sourceLabel} is only available as a local blob URL with no backing file or data URL. Please reattach the image before exporting.`,
      'BLOB_IMAGE_SOURCE_UNRESOLVED'
    );
  }

  return {
    kind: 'url',
    url,
  };
}

async function normalizeShot(
  page: ExportablePage,
  shot: ExportableShot,
  optimizedShotImageCache: Map<string, Promise<PdfExportImageOptimizationResult>> | null
): Promise<{ shotContent: ServerPDFShotContent; debugEntry: ShotImageDebugEntry | null }> {
  const sourceOrigin = detectShotImageSourceOrigin(shot);
  const normalizedImageSource = await normalizeImageSource({
    dataUrl: shot.imageData,
    url: shot.imageUrl,
    file: shot.imageFile,
    sourceLabel: `Shot ${shot.number || shot.id} image`,
  });

  let optimizedImageSource: NormalizedExportImageSource | null = null;
  let debugEntry: ShotImageDebugEntry | null = null;

  if (normalizedImageSource && ENABLE_PDF_IMAGE_OPTIMIZATION) {
    if (!optimizedShotImageCache) {
      throw new ExportError(
        'PDF export image optimization cache is required when optimization is enabled.',
        'PDF_OPTIMIZATION_CACHE_MISSING'
      );
    }

    const optimizationResult = await optimizeImageForPdfExportWithCacheDetailed(
      normalizedImageSource,
      optimizedShotImageCache,
      {
        maxWidth: 800,
        jpegQuality: 0.85,
      }
    );

    optimizedImageSource = optimizationResult.source;
    debugEntry = {
      pageId: page.id,
      pageName: page.name,
      shotId: shot.id,
      shotNumber: shot.number,
      sourceOrigin,
      inputKind: normalizedImageSource.kind,
      outputKind: optimizedImageSource.kind,
      outcome: optimizationResult.debug.outcome,
      returnedOriginalSource: optimizationResult.debug.returnedOriginalSource,
      wasResized: optimizationResult.debug.wasResized,
      sourceWidth: optimizationResult.debug.sourceWidth,
      sourceHeight: optimizationResult.debug.sourceHeight,
      optimizedWidth: optimizationResult.debug.optimizedWidth,
      optimizedHeight: optimizationResult.debug.optimizedHeight,
      beforeApproxDataUrlBytes: optimizationResult.debug.beforeApproxDataUrlBytes,
      afterApproxDataUrlBytes: optimizationResult.debug.afterApproxDataUrlBytes,
      payloadSourceCharsBefore: getSourceValueLength(normalizedImageSource),
      payloadSourceCharsAfter: getSourceValueLength(optimizedImageSource),
      errorMessage: optimizationResult.debug.errorMessage,
    };
  } else if (normalizedImageSource) {
    optimizedImageSource = normalizedImageSource;
  }

  return {
    shotContent: {
      id: shot.id,
      number: shot.number,
      actionText: shot.actionText || '',
      scriptText: shot.scriptText || '',
      image: optimizedImageSource,
      imageScale: shot.imageScale ?? 1,
      imageOffsetX: shot.imageOffsetX ?? 0,
      imageOffsetY: shot.imageOffsetY ?? 0,
    },
    debugEntry,
  };
}

async function normalizePage(
  page: ExportablePage,
  storyboardState: StoryboardState,
  optimizedShotImageCache: Map<string, Promise<PdfExportImageOptimizationResult>> | null
) {
  const pageIndex = storyboardState.pages.findIndex((candidate) => candidate.id === page.id);
  const pageNumber = pageIndex >= 0 ? pageIndex + 1 : 1;
  const normalizedShots = await Promise.all(
    page.shots.map((shot) => normalizeShot(page, shot, optimizedShotImageCache))
  );

  return {
    pageContent: {
      id: page.id,
      name: page.name,
      pageNumber,
      gridRows: page.gridRows,
      gridCols: page.gridCols,
      aspectRatio: page.aspectRatio,
      shots: normalizedShots.map((entry) => entry.shotContent),
    },
    debugEntries: normalizedShots
      .map((entry) => entry.debugEntry)
      .filter((entry): entry is ShotImageDebugEntry => entry !== null),
  };
}

export async function buildServerPdfPayload(
  pages: ExportablePage[],
  storyboardState: StoryboardState & { projectLogoDataUrl?: string | null },
  options: {
    filename: string;
  }
): Promise<ServerPDFExportPayload> {
  if (pages.length === 0) {
    throw new ExportError('No pages to export', 'NO_PAGES');
  }

  const optimizedShotImageCache = ENABLE_PDF_IMAGE_OPTIMIZATION
    ? new Map<string, Promise<PdfExportImageOptimizationResult>>()
    : null;
  const normalizedPages = await Promise.all(
    pages.map((page) => normalizePage(page, storyboardState, optimizedShotImageCache))
  );
  const [firstPage] = normalizedPages;
  const debugSummary =
    ENABLE_PDF_IMAGE_OPTIMIZATION_DEBUG
      ? buildPayloadDebugSummary(normalizedPages.flatMap((page) => page.debugEntries))
      : null;

  const resolvedPageSizeMode = resolvePageSizeMode(storyboardState.pageSizeMode);
  const paperSize =
    resolvedPageSizeMode === 'dynamic'
      ? 'canvas'
      : resolvedPageSizeMode === 'letter-portrait'
        ? 'letter-portrait'
        : 'letter-landscape';

  const payload: ServerPDFExportPayload = {
    schemaVersion: 1,
    filename: options.filename,
    paperSize,
    pageSizeMode: resolvedPageSizeMode,
    template: {
      showLogo: storyboardState.templateSettings.showLogo,
      showProjectName: storyboardState.templateSettings.showProjectName,
      showProjectInfo: storyboardState.templateSettings.showProjectInfo,
      showClientAgency: storyboardState.templateSettings.showClientAgency,
      showJobInfo: storyboardState.templateSettings.showJobInfo,
      showActionText: storyboardState.templateSettings.showActionText,
      showScriptText: storyboardState.templateSettings.showScriptText,
      showPageNumber: storyboardState.templateSettings.showPageNumber,
    },
    theme: storyboardState.storyboardTheme,
    project: {
      projectName: storyboardState.projectName || '',
      projectInfo: storyboardState.projectInfo || '',
      clientAgency: storyboardState.clientAgency || '',
      jobInfo: storyboardState.jobInfo || '',
      projectLogo: await normalizeImageSource({
        dataUrl: storyboardState.projectLogoDataUrl,
        url: storyboardState.projectLogoUrl,
        file: storyboardState.projectLogoFile,
        sourceLabel: 'Project logo',
      }),
    },
    page: firstPage.pageContent,
    pages: normalizedPages.map((page) => page.pageContent),
    ...(debugSummary ? { debug: debugSummary as unknown as Record<string, unknown> } : {}),
  };

  if (debugSummary && typeof window !== 'undefined') {
    window.__SERVER_PDF_EXPORT_PAYLOAD_DEBUG__ = debugSummary;
    console.debug('[server-pdf][payload-build]', JSON.stringify(debugSummary));
  }

  return payload;
}
