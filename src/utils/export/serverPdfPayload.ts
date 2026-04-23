import type { StoryboardPage, StoryboardState } from '@/store/storyboardStore';
import {
  ExportError,
  type NormalizedExportImageSource,
  type ServerPDFExportPayload,
  type ServerPDFPaperSize,
  type ServerPDFShotContent,
} from '@/utils/types/exportTypes';

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

async function normalizeShot(shot: ExportableShot): Promise<ServerPDFShotContent> {
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

async function normalizePage(
  page: ExportablePage,
  storyboardState: StoryboardState
) {
  const pageIndex = storyboardState.pages.findIndex((candidate) => candidate.id === page.id);
  const pageNumber = pageIndex >= 0 ? pageIndex + 1 : 1;
  const normalizedShots = await Promise.all(page.shots.map((shot) => normalizeShot(shot)));

  return {
    id: page.id,
    name: page.name,
    pageNumber,
    gridRows: page.gridRows,
    gridCols: page.gridCols,
    aspectRatio: page.aspectRatio,
    shots: normalizedShots,
  };
}

export async function buildServerPdfPayload(
  pages: ExportablePage[],
  storyboardState: StoryboardState & { projectLogoDataUrl?: string | null },
  options: {
    filename: string;
    paperSize: ServerPDFPaperSize;
  }
): Promise<ServerPDFExportPayload> {
  if (pages.length === 0) {
    throw new ExportError('No pages to export', 'NO_PAGES');
  }

  const normalizedPages = await Promise.all(
    pages.map((page) => normalizePage(page, storyboardState))
  );
  const [firstPage] = normalizedPages;

  return {
    schemaVersion: 1,
    filename: options.filename,
    paperSize: options.paperSize,
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
    page: firstPage,
    pages: normalizedPages,
  };
}
