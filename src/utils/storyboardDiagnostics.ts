import { usePageStore } from '@/store/pageStore';
import { useProjectStore } from '@/store/projectStore';
import { useShotStore, type Shot } from '@/store/shotStore';
import { useUIStore } from '@/store/uiStore';
import { useProjectManagerStore } from '@/store/projectManagerStore';
import type { CompressedImageResult } from '@/utils/imageCompression';

type ImageDiagnosticInput = {
  file: File;
  compressedResult: CompressedImageResult;
  shotId: string;
};

type ImageDiagnosticRow = {
  fileName: string;
  shotId: string;
  originalKB: number;
  compressedKB: number;
  compressionRatio: number;
  compressedWidth?: number;
  compressedHeight?: number;
};

type LocalStorageUsageRow = {
  key: string;
  sizeKB: number;
};

type ImageStorageModeSummary = {
  imageDataOnly: number;
  imageUrlOnly: number;
  hybrid: number;
  noImage: number;
};

type ProjectSizeDiagnostics = {
  currentProjectId: string | null;
  totalShotCount: number;
  shotsWithImageData: number;
  shotsWithImageUrl: number;
  shotsWithAnyImage: number;
  activeImageDataKB: number;
  activeSnapshotJsonKB: number;
  selectedLocalStorageKeysKB: number;
  averageImageDataKBPerShot: number;
  averageImageKBPerImage: number;
  imageStorageModeSummary: ImageStorageModeSummary;
  largestImageDataKB: number;
  largestImageDataShotId: string | null;
  largestImageDataShotNumber: string | null;
  localStorageUsage: LocalStorageUsageRow[];
  deprecatedAliases: {
    imageCount: 'shotsWithImageData';
    totalImageDataKB: 'activeImageDataKB';
    totalProjectJsonKB: 'activeSnapshotJsonKB';
    estimatedLocalStorageKB: 'selectedLocalStorageKeysKB';
    averageImageDataKB: 'averageImageDataKBPerShot';
  };
  /** @deprecated Use activeSnapshotJsonKB instead. */
  totalProjectJsonKB: number;
  /** @deprecated Use activeImageDataKB instead. */
  totalImageDataKB: number;
  /** @deprecated Use shotsWithImageData instead. */
  imageCount: number;
  /** @deprecated Use averageImageDataKBPerShot instead. */
  averageImageDataKB: number;
  /** @deprecated Use selectedLocalStorageKeysKB instead. */
  estimatedLocalStorageKB: number;
};

declare global {
  interface Window {
    __storyboardDiagnostics?: {
      getProjectSize: () => ProjectSizeDiagnostics | null;
    };
  }
}

const isDevDiagnosticsEnabled = (): boolean => import.meta.env.DEV && typeof window !== 'undefined';

const bytesForString = (value: string): number => new TextEncoder().encode(value).length;

const roundKB = (bytes: number): number => Number((bytes / 1024).toFixed(2));

const roundRatio = (ratio: number): number => Number(ratio.toFixed(2));

const toImageDiagnosticRow = ({ file, compressedResult, shotId }: ImageDiagnosticInput): ImageDiagnosticRow => ({
  fileName: file.name,
  shotId,
  originalKB: roundKB(compressedResult.originalSize),
  compressedKB: roundKB(compressedResult.size),
  compressionRatio: roundRatio(compressedResult.compressionRatio),
  compressedWidth: compressedResult.width,
  compressedHeight: compressedResult.height,
});

export const logSingleImageUploadDiagnostics = (input: ImageDiagnosticInput): void => {
  if (!isDevDiagnosticsEnabled()) return;

  console.table(toImageDiagnosticRow(input));
};

export const logBatchImageUploadDiagnostics = (inputs: ImageDiagnosticInput[]): void => {
  if (!isDevDiagnosticsEnabled() || inputs.length === 0) return;

  const rows = inputs.map(toImageDiagnosticRow);
  const totalOriginalBytes = inputs.reduce((sum, item) => sum + item.compressedResult.originalSize, 0);
  const totalCompressedBytes = inputs.reduce((sum, item) => sum + item.compressedResult.size, 0);

  console.table(rows);
  console.table({
    imageCount: inputs.length,
    totalOriginalKB: roundKB(totalOriginalBytes),
    totalCompressedKB: roundKB(totalCompressedBytes),
    overallCompressionRatio: totalCompressedBytes > 0 ? roundRatio(totalOriginalBytes / totalCompressedBytes) : 0,
  });
};

const getSerializableShot = (shot: Shot): Shot => ({
  ...shot,
  imageFile: null,
});

const getProjectSnapshot = () => {
  const pageStore = usePageStore.getState();
  const shotStore = useShotStore.getState();
  const projectStore = useProjectStore.getState();
  const uiStore = useUIStore.getState();
  const projectManagerStore = useProjectManagerStore.getState();

  return {
    currentProjectId: projectManagerStore.currentProjectId,
    pages: pageStore.pages,
    activePageId: pageStore.activePageId,
    shots: Object.fromEntries(
      Object.entries(shotStore.shots).map(([shotId, shot]) => [shotId, getSerializableShot(shot)])
    ),
    shotOrder: shotStore.shotOrder,
    project: {
      projectName: projectStore.projectName,
      projectInfo: projectStore.projectInfo,
      projectLogoUrl: projectStore.projectLogoUrl,
      projectLogoDataUrl: projectStore.projectLogoDataUrl,
      clientAgency: projectStore.clientAgency,
      jobInfo: projectStore.jobInfo,
      pageSizeMode: projectStore.pageSizeMode,
      templateSettings: projectStore.templateSettings,
      storyboardTheme: projectStore.storyboardTheme,
    },
    ui: {
      isDragging: uiStore.isDragging,
      isExporting: uiStore.isExporting,
      showDeleteConfirmation: uiStore.showDeleteConfirmation,
    },
  };
};

const getCurrentProjectStorageKeys = (currentProjectId: string | null): string[] => {
  const activeStoreKeys = ['page-storage', 'shot-storage', 'project-storage', 'ui-store', 'project-manager-storage'];

  if (!currentProjectId) {
    return activeStoreKeys;
  }

  return [
    `page-storage-project-${currentProjectId}`,
    `shot-storage-project-${currentProjectId}`,
    `project-storage-project-${currentProjectId}`,
    `ui-store-project-${currentProjectId}`,
    'project-manager-storage',
    ...activeStoreKeys,
  ];
};

const getLocalStorageUsage = (currentProjectId: string | null): LocalStorageUsageRow[] => {
  const seen = new Set<string>();

  return getCurrentProjectStorageKeys(currentProjectId)
    .filter((key) => {
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((key) => {
      const value = window.localStorage.getItem(key);
      return {
        key,
        sizeKB: value ? roundKB(bytesForString(value)) : 0,
      };
    })
    .filter((entry) => entry.sizeKB > 0);
};

const getProjectSize = (): ProjectSizeDiagnostics | null => {
  if (!isDevDiagnosticsEnabled()) return null;

  const snapshot = getProjectSnapshot();
  const shots = Object.values(useShotStore.getState().shots);
  const imageDataShots = shots.filter((shot) => Boolean(shot.imageData));
  const imageSizes = imageDataShots.map((shot) => ({
    shot,
    bytes: bytesForString(shot.imageData || ''),
  }));
  const totalImageDataBytes = imageSizes.reduce((sum, item) => sum + item.bytes, 0);
  const largest = imageSizes.reduce<typeof imageSizes[number] | null>(
    (currentLargest, item) => (!currentLargest || item.bytes > currentLargest.bytes ? item : currentLargest),
    null
  );
  const projectJsonBytes = bytesForString(JSON.stringify(snapshot));
  const localStorageUsage = getLocalStorageUsage(snapshot.currentProjectId);
  const estimatedLocalStorageBytes = localStorageUsage.reduce((sum, entry) => sum + entry.sizeKB * 1024, 0);
  const imageStorageModeSummary = shots.reduce<ImageStorageModeSummary>(
    (summary, shot) => {
      const hasImageData = Boolean(shot.imageData);
      const hasImageUrl = Boolean(shot.imageUrl);

      if (hasImageData && hasImageUrl) {
        summary.hybrid += 1;
      } else if (hasImageData) {
        summary.imageDataOnly += 1;
      } else if (hasImageUrl) {
        summary.imageUrlOnly += 1;
      } else {
        summary.noImage += 1;
      }

      return summary;
    },
    {
      imageDataOnly: 0,
      imageUrlOnly: 0,
      hybrid: 0,
      noImage: 0,
    }
  );
  const shotsWithImageUrl = imageStorageModeSummary.imageUrlOnly + imageStorageModeSummary.hybrid;
  const shotsWithAnyImage =
    imageStorageModeSummary.imageDataOnly + imageStorageModeSummary.imageUrlOnly + imageStorageModeSummary.hybrid;
  const activeImageDataKB = roundKB(totalImageDataBytes);
  const averageImageDataKBPerShot = imageDataShots.length > 0 ? roundKB(totalImageDataBytes / imageDataShots.length) : 0;
  const selectedLocalStorageKeysKB = roundKB(estimatedLocalStorageBytes);
  const activeSnapshotJsonKB = roundKB(projectJsonBytes);

  const diagnostics: ProjectSizeDiagnostics = {
    currentProjectId: snapshot.currentProjectId,
    totalShotCount: shots.length,
    shotsWithImageData: imageDataShots.length,
    shotsWithImageUrl,
    shotsWithAnyImage,
    activeImageDataKB,
    activeSnapshotJsonKB,
    selectedLocalStorageKeysKB,
    averageImageDataKBPerShot,
    averageImageKBPerImage: averageImageDataKBPerShot,
    imageStorageModeSummary,
    largestImageDataKB: largest ? roundKB(largest.bytes) : 0,
    largestImageDataShotId: largest?.shot.id || null,
    largestImageDataShotNumber: largest?.shot.number || null,
    localStorageUsage,
    deprecatedAliases: {
      imageCount: 'shotsWithImageData',
      totalImageDataKB: 'activeImageDataKB',
      totalProjectJsonKB: 'activeSnapshotJsonKB',
      estimatedLocalStorageKB: 'selectedLocalStorageKeysKB',
      averageImageDataKB: 'averageImageDataKBPerShot',
    },
    totalProjectJsonKB: activeSnapshotJsonKB,
    totalImageDataKB: activeImageDataKB,
    imageCount: imageDataShots.length,
    averageImageDataKB: averageImageDataKBPerShot,
    estimatedLocalStorageKB: selectedLocalStorageKeysKB,
  };

  console.table({
    totalShotCount: diagnostics.totalShotCount,
    shotsWithImageData: diagnostics.shotsWithImageData,
    shotsWithImageUrl: diagnostics.shotsWithImageUrl,
    shotsWithAnyImage: diagnostics.shotsWithAnyImage,
    activeImageDataKB: diagnostics.activeImageDataKB,
    activeSnapshotJsonKB: diagnostics.activeSnapshotJsonKB,
    selectedLocalStorageKeysKB: diagnostics.selectedLocalStorageKeysKB,
    averageImageDataKBPerShot: diagnostics.averageImageDataKBPerShot,
    averageImageKBPerImage: diagnostics.averageImageKBPerImage,
    largestImageDataKB: diagnostics.largestImageDataKB,
    largestImageDataShotId: diagnostics.largestImageDataShotId,
    largestImageDataShotNumber: diagnostics.largestImageDataShotNumber,
  });
  console.table(diagnostics.imageStorageModeSummary);
  console.table(localStorageUsage);

  return diagnostics;
};

export const registerStoryboardDiagnostics = (): void => {
  if (!isDevDiagnosticsEnabled()) return;

  window.__storyboardDiagnostics = {
    getProjectSize,
  };
};

registerStoryboardDiagnostics();
