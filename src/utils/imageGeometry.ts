export interface CoverImageGeometry {
  width: number;
  height: number;
  left: number;
  top: number;
}

/**
 * Sizes an image to cover a viewport while preserving its intrinsic aspect ratio.
 * The returned position centers the untransformed image in that viewport.
 */
export const calculateCoverImageGeometry = (
  naturalWidth: number,
  naturalHeight: number,
  containerWidth: number,
  containerHeight: number
): CoverImageGeometry | null => {
  if (
    !Number.isFinite(naturalWidth) ||
    !Number.isFinite(naturalHeight) ||
    !Number.isFinite(containerWidth) ||
    !Number.isFinite(containerHeight) ||
    naturalWidth <= 0 ||
    naturalHeight <= 0 ||
    containerWidth <= 0 ||
    containerHeight <= 0
  ) {
    return null;
  }

  const coverScale = Math.max(containerWidth / naturalWidth, containerHeight / naturalHeight);
  const width = naturalWidth * coverScale;
  const height = naturalHeight * coverScale;

  return {
    width,
    height,
    left: (containerWidth - width) / 2,
    top: (containerHeight - height) / 2,
  };
};
