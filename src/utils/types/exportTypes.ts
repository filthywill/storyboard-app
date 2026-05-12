import type { StoryboardTheme } from '@/styles/storyboardTheme';
import type { PageSizeMode } from '@/utils/pageSize';

// Core export data types
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FontConfig {
  family: string;
  size: number;
  weight: 'normal' | 'bold' | '400' | '500' | '600' | '700';
  color: string;
}

export interface TextStyle extends FontConfig {
  lineHeight: number;
  textAlign: 'left' | 'center' | 'right';
  maxLines?: number;
}

export interface ExportDimensions {
  width: number;
  height: number;
  scale: number;
}

export interface GridConfig {
  rows: number;
  cols: number;
  gap: number;
  aspectRatio: string;
}

export interface LayoutConfig {
  canvas: ExportDimensions;
  header: Rectangle;
  grid: Rectangle;
  shotBounds: Rectangle[];
  footer?: Rectangle;
}

// Export-specific data models
export interface ExportHeader {
  projectName: string;
  projectInfo: string;
  clientAgency: string;
  jobInfo: string;
  logoImageData?: ImageData | HTMLImageElement;
  templateSettings: {
    showLogo: boolean;
    showProjectName: boolean;
    showProjectInfo: boolean;
    showClientAgency: boolean;
    showJobInfo: boolean;
    showActionText: boolean;
    showScriptText: boolean;
    showPageNumber: boolean;
  };
}

export interface ExportShot {
  id: string;
  number: string;
  imageData?: ImageData | HTMLImageElement;
  actionText: string;
  scriptText: string;
  bounds: Rectangle;
  imageScale?: number;
  imageOffsetX?: number;
  imageOffsetY?: number;
  templateSettings?: {
    showLogo: boolean;
    showProjectName: boolean;
    showProjectInfo: boolean;
    showClientAgency: boolean;
    showJobInfo: boolean;
    showActionText: boolean;
    showScriptText: boolean;
    showPageNumber: boolean;
  };
}

export interface ExportGrid {
  config: GridConfig;
  bounds: Rectangle;
  shots: ExportShot[];
}

export interface ExportStoryboardPage {
  id: string;
  name: string;
  header: ExportHeader;
  grid: ExportGrid;
  layout: LayoutConfig;
  backgroundColor: string;
  storyboardTheme?: StoryboardTheme; // Optional for backward compatibility
}

// Server-side PDF payload types
export type ServerPDFPaperSize = 'letter' | 'canvas' | 'letter-portrait' | 'letter-landscape';

export interface ExportTemplateVisibility {
  showLogo: boolean;
  showProjectName: boolean;
  showProjectInfo: boolean;
  showClientAgency: boolean;
  showJobInfo: boolean;
  showActionText: boolean;
  showScriptText: boolean;
  showPageNumber: boolean;
}

export type NormalizedExportImageSource =
  | {
      kind: 'dataUrl';
      dataUrl: string;
    }
  | {
      kind: 'url';
      url: string;
    };

export interface ServerPDFProjectContent {
  projectName: string;
  projectInfo: string;
  clientAgency: string;
  jobInfo: string;
  projectLogo: NormalizedExportImageSource | null;
}

export interface ServerPDFShotContent {
  id: string;
  number: string;
  actionText: string;
  scriptText: string;
  image: NormalizedExportImageSource | null;
  imageScale: number;
  imageOffsetX: number;
  imageOffsetY: number;
}

export interface ServerPDFPageContent {
  id: string;
  name: string;
  pageNumber: number;
  gridRows: number;
  gridCols: number;
  aspectRatio: string;
  shots: ServerPDFShotContent[];
}

export interface ServerPDFExportPayload {
  schemaVersion: 1;
  filename: string;
  paperSize: ServerPDFPaperSize;
  pageSizeMode?: PageSizeMode;
  template: ExportTemplateVisibility;
  theme: StoryboardTheme;
  project: ServerPDFProjectContent;
  page: ServerPDFPageContent;
  pages?: ServerPDFPageContent[];
  debug?: Record<string, unknown>;
}

// Export options and settings
export interface ExportOptions {
  format: 'png' | 'pdf';
  quality: number;
  scale: number;
  width?: number;
  height?: number;
  backgroundColor?: string;
  includeGrid?: boolean;
}

export interface ExportSettings {
  targetWidth: number;
  scale: number;
  quality: number;
  backgroundColor: string;
}

// Error handling
export class ExportError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ExportError';
  }
}

// Validation results
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} 