import { usePageStore } from '@/store/pageStore';
import { useProjectStore } from '@/store/projectStore';
import { useShotStore, type Shot } from '@/store/shotStore';
import {
  ExportError,
  type NormalizedExportImageSource,
  type ServerPDFExportPayload,
  type ServerPDFPaperSize,
  type ServerPDFShotContent,
} from '@/utils/types/exportTypes';

const DEFAULT_PAPER_SIZE: ServerPDFPaperSize = 'letter';

declare global {
  interface Window {
    __DEBUG_BUILD_SERVER_PDF_PAYLOAD__?: (
      paperSize?: ServerPDFPaperSize
    ) => Promise<ServerPDFExportPayload>;
    __DEBUG_SERVER_PDF_PAYLOAD__?: ServerPDFExportPayload | null;
  }
}

function isDataUrl(value: string): boolean {
  return value.startsWith('data:');
}

function isBlobUrl(value: string): boolean {
  return value.startsWith('blob:');
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

async function normalizeShot(shot: Shot): Promise<ServerPDFShotContent> {
  return {
    id: shot.id,
    number: shot.number,
    actionText: shot.actionText || '',
    scriptText: shot.scriptText || '',
    image: await normalizeImageSource({
      dataUrl: shot.imageData,
      url: shot.imageUrl,
      file: shot.imageFile,
      sourceLabel: `Shot ${shot.number || shot.id} image`,
    }),
    imageScale: shot.imageScale ?? 1,
    imageOffsetX: shot.imageOffsetX ?? 0,
    imageOffsetY: shot.imageOffsetY ?? 0,
  };
}

function buildFilename(pageName: string): string {
  const safePageName = pageName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'current-page';
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  return `storyboard-${safePageName}-${timestamp}.pdf`;
}

export async function buildCurrentPageServerPdfPayload(
  options: {
    pageId?: string | null;
    paperSize?: ServerPDFPaperSize;
  } = {}
): Promise<ServerPDFExportPayload> {
  const pageStore = usePageStore.getState();
  const shotStore = useShotStore.getState();
  const projectStore = useProjectStore.getState();

  const targetPageId = options.pageId ?? pageStore.activePageId;
  if (!targetPageId) {
    throw new Error('No active page is selected.');
  }

  const currentPage = pageStore.getPageById(targetPageId);
  if (!currentPage) {
    throw new Error(`Current page not found for page id: ${targetPageId}`);
  }

  const currentPageIndex = pageStore.pages.findIndex((page) => page.id === currentPage.id);
  if (currentPageIndex === -1) {
    throw new Error(`Current page index could not be resolved for page id: ${currentPage.id}`);
  }

  const pageShots = shotStore.getShotsById(currentPage.shots);
  const normalizedShots = await Promise.all(pageShots.map((shot) => normalizeShot(shot)));

  const payload: ServerPDFExportPayload = {
    schemaVersion: 1,
    filename: buildFilename(currentPage.name),
    paperSize: options.paperSize ?? DEFAULT_PAPER_SIZE,
    template: {
      showLogo: projectStore.templateSettings.showLogo,
      showProjectName: projectStore.templateSettings.showProjectName,
      showProjectInfo: projectStore.templateSettings.showProjectInfo,
      showClientAgency: projectStore.templateSettings.showClientAgency,
      showJobInfo: projectStore.templateSettings.showJobInfo,
      showActionText: projectStore.templateSettings.showActionText,
      showScriptText: projectStore.templateSettings.showScriptText,
      showPageNumber: projectStore.templateSettings.showPageNumber,
    },
    theme: projectStore.storyboardTheme,
    project: {
      projectName: projectStore.projectName || '',
      projectInfo: projectStore.projectInfo || '',
      clientAgency: projectStore.clientAgency || '',
      jobInfo: projectStore.jobInfo || '',
      projectLogo: await normalizeImageSource({
        dataUrl: projectStore.projectLogoDataUrl,
        url: projectStore.projectLogoUrl,
        file: projectStore.projectLogoFile,
        sourceLabel: 'Project logo',
      }),
    },
    page: {
      id: currentPage.id,
      name: currentPage.name,
      pageNumber: currentPageIndex + 1,
      gridRows: currentPage.gridRows,
      gridCols: currentPage.gridCols,
      aspectRatio: currentPage.aspectRatio,
      shots: normalizedShots,
    },
  };

  return payload;
}

export function attachDebugServerPdfPayloadHelpers(config?: {
  getPageId?: () => string | null;
  getPaperSize?: () => ServerPDFPaperSize;
}): void {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return;
  }

  window.__DEBUG_SERVER_PDF_PAYLOAD__ = null;
  window.__DEBUG_BUILD_SERVER_PDF_PAYLOAD__ = async (
    paperSize?: ServerPDFPaperSize
  ) => {
    const payload = await buildCurrentPageServerPdfPayload({
      pageId: config?.getPageId?.(),
      paperSize: paperSize ?? config?.getPaperSize?.() ?? DEFAULT_PAPER_SIZE,
    });
    window.__DEBUG_SERVER_PDF_PAYLOAD__ = payload;
    return payload;
  };
}
