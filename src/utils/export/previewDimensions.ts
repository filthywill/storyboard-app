export interface PreviewDimensions {
  width: number;
  imageHeight: number;
  gap: number;
}

export interface PreviewDimensionsPageInput {
  gridCols: number;
  aspectRatio: string;
}

export const calculatePreviewDimensions = (
  page: PreviewDimensionsPageInput | null | undefined
): PreviewDimensions => {
  if (!page) return { width: 200, imageHeight: 100, gap: 8 };

  const { gridCols, aspectRatio } = page;
  const fixedWidth = 1000;
  const headerPadding = 16;
  const gridWrapperPadding = 4;
  const totalPadding = (headerPadding + gridWrapperPadding) * 2;
  const availableWidth = fixedWidth - totalPadding;
  const gaps = (gridCols - 1) * 8;
  const shotWidth = Math.floor((availableWidth - gaps) / gridCols);
  const cardContentPadding = 8 * 2;
  const imageBorder = 1 * 2;
  const imageContainerWidth = shotWidth - cardContentPadding - imageBorder;
  const [w, h] = aspectRatio.split('/').map(str => parseInt(str.trim(), 10));
  const imageHeight = Math.floor((imageContainerWidth * h) / w);

  return {
    width: shotWidth,
    imageHeight: imageHeight,
    gap: 8
  };
};
