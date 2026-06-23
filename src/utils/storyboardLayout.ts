import { RENDERED_PAGE_WIDTH_PX } from '@/utils/pageSize';

/**
 * Shared storyboard layout constants.
 *
 * Keep sizing inputs separate from header/footer alignment targets. Shot, grid,
 * page, export scaling, and pagination math should not change when the visual
 * header/footer alignment target changes.
 */
export const STORYBOARD_GRID_GAP_PX = 8;
export const STORYBOARD_GRID_WRAPPER_PADDING_PX = 4;
export const STORYBOARD_PREVIEW_HEADER_PADDING_PX = 16;

// Historical image-frame inset. Retained for legacy sizing math that must not move.
export const STORYBOARD_IMAGE_FRAME_ALIGNMENT_INSET_PX = 33;

export type StoryboardHeaderAlignmentTarget = 'imageFrame' | 'cardOuter';

export const STORYBOARD_CANONICAL_HEADER_ALIGNMENT_TARGET: StoryboardHeaderAlignmentTarget = 'cardOuter';

const normalizeGridCols = (gridCols: number): number => {
  if (!Number.isFinite(gridCols) || gridCols <= 0) {
    return 3;
  }

  return Math.max(1, Math.floor(gridCols));
};

export const getStoryboardShotWidthForGrid = (gridCols: number): number => {
  const normalizedGridCols = normalizeGridCols(gridCols);
  const totalPadding = (STORYBOARD_PREVIEW_HEADER_PADDING_PX + STORYBOARD_GRID_WRAPPER_PADDING_PX) * 2;
  const availableWidth = RENDERED_PAGE_WIDTH_PX - totalPadding;
  const gaps = (normalizedGridCols - 1) * STORYBOARD_GRID_GAP_PX;

  return Math.floor((availableWidth - gaps) / normalizedGridCols);
};

export const getStoryboardCardOuterInset = (gridCols: number): number => {
  const normalizedGridCols = normalizeGridCols(gridCols);
  const shotWidth = getStoryboardShotWidthForGrid(normalizedGridCols);
  const gaps = (normalizedGridCols - 1) * STORYBOARD_GRID_GAP_PX;
  const gridTrackWidth = (normalizedGridCols * shotWidth) + gaps;

  return STORYBOARD_GRID_WRAPPER_PADDING_PX + ((RENDERED_PAGE_WIDTH_PX - gridTrackWidth) / 2);
};

export const getStoryboardImageFrameAlignmentInset = (): number =>
  STORYBOARD_IMAGE_FRAME_ALIGNMENT_INSET_PX;

export const getStoryboardHeaderAlignmentInset = (
  gridCols: number,
  target: StoryboardHeaderAlignmentTarget = STORYBOARD_CANONICAL_HEADER_ALIGNMENT_TARGET
): number => {
  if (target === 'imageFrame') {
    return getStoryboardImageFrameAlignmentInset();
  }

  return getStoryboardCardOuterInset(gridCols);
};

export const getStoryboardHeaderAlignmentInsetCss = (
  gridCols: number,
  target: StoryboardHeaderAlignmentTarget = STORYBOARD_CANONICAL_HEADER_ALIGNMENT_TARGET
): string => `${getStoryboardHeaderAlignmentInset(gridCols, target)}px`;
