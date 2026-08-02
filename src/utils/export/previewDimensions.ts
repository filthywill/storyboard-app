import { RENDERED_PAGE_WIDTH_PX } from '@/utils/pageSize';

export interface PreviewDimensions {
  width: number;
  imageContainerWidth: number;
  imageHeight: number;
  gap: number;
}

export interface PreviewDimensionsPageInput {
  gridCols: number;
  aspectRatio: string;
}

export interface PreviewDimensionsImageFrameInput {
  borderEnabled?: boolean;
  borderWidth?: number;
}

export const getEffectiveImageFrameBorderWidth = (
  imageFrame?: PreviewDimensionsImageFrameInput | null
): number => {
  if (!imageFrame?.borderEnabled) {
    return 0;
  }

  const borderWidth = imageFrame.borderWidth;
  if (!Number.isFinite(borderWidth) || borderWidth <= 0) {
    return 0;
  }

  return borderWidth;
};

export const calculatePreviewDimensions = (
  page: PreviewDimensionsPageInput | null | undefined,
  imageFrame?: PreviewDimensionsImageFrameInput | null
): PreviewDimensions => {
  if (!page) return { width: 200, imageContainerWidth: 200, imageHeight: 100, gap: 8 };

  const { gridCols, aspectRatio } = page;
  const headerPadding = 16;
  const gridWrapperPadding = 4;
  const totalPadding = (headerPadding + gridWrapperPadding) * 2;
  const availableWidth = RENDERED_PAGE_WIDTH_PX - totalPadding;
  const gaps = (gridCols - 1) * 8;
  const shotWidth = Math.floor((availableWidth - gaps) / gridCols);
  const cardContentPadding = 8 * 2;
  const effectiveImageFrameBorderWidth = getEffectiveImageFrameBorderWidth(imageFrame);
  const imageBorder = effectiveImageFrameBorderWidth * 2;
  const imageContainerWidth = shotWidth - cardContentPadding - imageBorder;
  const [w, h] = aspectRatio.split('/').map(str => parseInt(str.trim(), 10));
  const imageHeight = Math.floor((imageContainerWidth * h) / w);

  return {
    width: shotWidth,
    imageContainerWidth,
    imageHeight: imageHeight,
    gap: 8
  };
};
