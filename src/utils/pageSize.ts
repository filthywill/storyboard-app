export type PageSizeMode = 'dynamic' | 'letter-portrait' | 'letter-landscape';

export const RENDERED_PAGE_WIDTH_PX = 1000;

export interface PageSizeSpec {
  mode: PageSizeMode;
  label: string;
  widthInches: number | null;
  heightInches: number | null;
  frameAspectRatio: number | null;
}

interface ParsedAspectRatio {
  width: number;
  height: number;
}

export interface GridLayoutFitCheckInput {
  pageSizeMode: PageSizeMode;
  gridRows: number;
  gridCols: number;
  aspectRatio: string;
  showPageNumber: boolean;
}

export interface MaxValidRowsInput {
  pageSizeMode: PageSizeMode;
  gridCols: number;
  aspectRatio: string;
  showPageNumber: boolean;
  maxRowsToEvaluate?: number;
}

const LETTER_WIDTH_INCHES = 8.5;
const LETTER_HEIGHT_INCHES = 11;

const PAGE_SIZE_SPECS: Record<PageSizeMode, PageSizeSpec> = {
  dynamic: {
    mode: 'dynamic',
    label: 'Dynamic',
    widthInches: null,
    heightInches: null,
    frameAspectRatio: null,
  },
  'letter-portrait': {
    mode: 'letter-portrait',
    label: 'Letter Portrait',
    widthInches: LETTER_WIDTH_INCHES,
    heightInches: LETTER_HEIGHT_INCHES,
    frameAspectRatio: LETTER_WIDTH_INCHES / LETTER_HEIGHT_INCHES,
  },
  'letter-landscape': {
    mode: 'letter-landscape',
    label: 'Letter Landscape',
    widthInches: LETTER_HEIGHT_INCHES,
    heightInches: LETTER_WIDTH_INCHES,
    frameAspectRatio: LETTER_HEIGHT_INCHES / LETTER_WIDTH_INCHES,
  },
};

export const PAGE_SIZE_MODE_OPTIONS = [
  { value: 'dynamic', label: 'Dynamic' },
  { value: 'letter-portrait', label: 'Letter Portrait' },
  { value: 'letter-landscape', label: 'Letter Landscape' },
] as const;

const GRID_GAP_PX = 8;
const PREVIEW_HEADER_PADDING_PX = 16;
const PREVIEW_GRID_WRAPPER_PADDING_PX = 4;
const SHOT_CARD_CONTENT_PADDING_PX = 16;
const SHOT_IMAGE_BORDER_PX = 2;
const SHOT_SLOT_TEXT_BLOCK_PX = 80;

const FRAME_HEADER_RESERVED_HEIGHT_PX = 100;
const FRAME_GRID_WRAPPER_VERTICAL_PADDING_PX = 8;
const FRAME_FOOTER_RESERVED_HEIGHT_PX = 44;

export const isPageSizeMode = (value: unknown): value is PageSizeMode => {
  return value === 'dynamic' || value === 'letter-portrait' || value === 'letter-landscape';
};

export const resolvePageSizeMode = (value: unknown): PageSizeMode => {
  return isPageSizeMode(value) ? value : 'dynamic';
};

export const getPageSizeSpec = (mode: PageSizeMode): PageSizeSpec => {
  return PAGE_SIZE_SPECS[mode];
};

export const getFixedPageFrameHeight = (
  mode: PageSizeMode,
  widthPx: number = RENDERED_PAGE_WIDTH_PX
): number | null => {
  const spec = getPageSizeSpec(mode);
  if (!spec.frameAspectRatio) {
    return null;
  }

  return Math.round(widthPx / spec.frameAspectRatio);
};

const parseAspectRatio = (aspectRatio: string): ParsedAspectRatio | null => {
  const [rawWidth, rawHeight] = aspectRatio.split('/');
  const width = Number.parseInt(rawWidth?.trim() ?? '', 10);
  const height = Number.parseInt(rawHeight?.trim() ?? '', 10);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
};

export const isGridLayoutValidForPageSize = ({
  pageSizeMode,
  gridRows,
  gridCols,
  aspectRatio,
  showPageNumber,
}: GridLayoutFitCheckInput): boolean => {
  if (pageSizeMode === 'dynamic') {
    return true;
  }

  if (gridRows <= 0 || gridCols <= 0) {
    return false;
  }

  const fixedFrameHeight = getFixedPageFrameHeight(pageSizeMode);
  if (!fixedFrameHeight) {
    return true;
  }

  const ratio = parseAspectRatio(aspectRatio);
  if (!ratio) {
    return false;
  }

  const totalHorizontalPaddingPx = (PREVIEW_HEADER_PADDING_PX + PREVIEW_GRID_WRAPPER_PADDING_PX) * 2;
  const availableWidthPx = RENDERED_PAGE_WIDTH_PX - totalHorizontalPaddingPx;
  const totalGridGapPx = (gridCols - 1) * GRID_GAP_PX;
  const shotWidthPx = Math.floor((availableWidthPx - totalGridGapPx) / gridCols);
  const imageContainerWidthPx = shotWidthPx - SHOT_CARD_CONTENT_PADDING_PX - SHOT_IMAGE_BORDER_PX;

  if (shotWidthPx <= 0 || imageContainerWidthPx <= 0) {
    return false;
  }

  const imageHeightPx = Math.floor((imageContainerWidthPx * ratio.height) / ratio.width);
  const slotHeightPx = imageHeightPx + SHOT_SLOT_TEXT_BLOCK_PX;
  const gridHeightPx = (gridRows * slotHeightPx) + ((gridRows - 1) * GRID_GAP_PX);

  const reservedHeightPx =
    FRAME_HEADER_RESERVED_HEIGHT_PX +
    FRAME_GRID_WRAPPER_VERTICAL_PADDING_PX +
    (showPageNumber ? FRAME_FOOTER_RESERVED_HEIGHT_PX : 0);

  const availableGridHeightPx = fixedFrameHeight - reservedHeightPx;

  return gridHeightPx <= availableGridHeightPx;
};

export const getMaxValidRowsForPageSize = ({
  pageSizeMode,
  gridCols,
  aspectRatio,
  showPageNumber,
  maxRowsToEvaluate = 8,
}: MaxValidRowsInput): number => {
  if (pageSizeMode === 'dynamic') {
    return maxRowsToEvaluate;
  }

  const safeMaxRowsToEvaluate = Math.max(0, Math.floor(maxRowsToEvaluate));
  let maxValidRows = 0;

  for (let rows = 1; rows <= safeMaxRowsToEvaluate; rows += 1) {
    const isValid = isGridLayoutValidForPageSize({
      pageSizeMode,
      gridRows: rows,
      gridCols,
      aspectRatio,
      showPageNumber,
    });

    if (isValid) {
      maxValidRows = rows;
    } else {
      break;
    }
  }

  return maxValidRows;
};
