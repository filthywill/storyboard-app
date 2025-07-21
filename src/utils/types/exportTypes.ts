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