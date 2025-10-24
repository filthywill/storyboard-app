/**
 * Request Size Limits and Validation
 * Prevents large payload attacks and ensures reasonable resource usage
 */

export interface RequestLimits {
  maxProjectSize: number; // Maximum project data size in bytes
  maxImageSize: number; // Maximum image file size in bytes
  maxPageCount: number; // Maximum pages per project
  maxShotCount: number; // Maximum shots per page
  maxTextLength: number; // Maximum text field length
  maxConcurrentUploads: number; // Maximum concurrent file uploads
}

// Default limits (can be overridden by environment variables)
export const DEFAULT_LIMITS: RequestLimits = {
  maxProjectSize: 50 * 1024 * 1024, // 50MB
  maxImageSize: 10 * 1024 * 1024, // 10MB
  maxPageCount: 50,
  maxShotCount: 100,
  maxTextLength: 10000, // 10,000 characters
  maxConcurrentUploads: 5
};

// Get limits from environment variables or use defaults
export function getRequestLimits(): RequestLimits {
  return {
    maxProjectSize: parseInt(import.meta.env.VITE_MAX_PROJECT_SIZE || '52428800'), // 50MB
    maxImageSize: parseInt(import.meta.env.VITE_MAX_IMAGE_SIZE || '10485760'), // 10MB
    maxPageCount: parseInt(import.meta.env.VITE_MAX_PAGE_COUNT || '50'),
    maxShotCount: parseInt(import.meta.env.VITE_MAX_SHOT_COUNT || '100'),
    maxTextLength: parseInt(import.meta.env.VITE_MAX_TEXT_LENGTH || '10000'),
    maxConcurrentUploads: parseInt(import.meta.env.VITE_MAX_CONCURRENT_UPLOADS || '5')
  };
}

/**
 * Validate project data size
 * @param projectData - Project data to validate
 * @returns Validation result
 */
export function validateProjectSize(projectData: any): {
  valid: boolean;
  size: number;
  maxSize: number;
  error?: string;
} {
  const limits = getRequestLimits();
  const jsonString = JSON.stringify(projectData);
  const size = new Blob([jsonString]).size;
  
  if (size > limits.maxProjectSize) {
    return {
      valid: false,
      size,
      maxSize: limits.maxProjectSize,
      error: `Project size (${formatBytes(size)}) exceeds maximum allowed size (${formatBytes(limits.maxProjectSize)})`
    };
  }
  
  return {
    valid: true,
    size,
    maxSize: limits.maxProjectSize
  };
}

/**
 * Validate image file size
 * @param file - Image file to validate
 * @returns Validation result
 */
export function validateImageSize(file: File): {
  valid: boolean;
  size: number;
  maxSize: number;
  error?: string;
} {
  const limits = getRequestLimits();
  
  if (file.size > limits.maxImageSize) {
    return {
      valid: false,
      size: file.size,
      maxSize: limits.maxImageSize,
      error: `Image size (${formatBytes(file.size)}) exceeds maximum allowed size (${formatBytes(limits.maxImageSize)})`
    };
  }
  
  return {
    valid: true,
    size: file.size,
    maxSize: limits.maxImageSize
  };
}

/**
 * Validate page count
 * @param pageCount - Number of pages
 * @returns Validation result
 */
export function validatePageCount(pageCount: number): {
  valid: boolean;
  count: number;
  maxCount: number;
  error?: string;
} {
  const limits = getRequestLimits();
  
  if (pageCount > limits.maxPageCount) {
    return {
      valid: false,
      count: pageCount,
      maxCount: limits.maxPageCount,
      error: `Page count (${pageCount}) exceeds maximum allowed (${limits.maxPageCount})`
    };
  }
  
  return {
    valid: true,
    count: pageCount,
    maxCount: limits.maxPageCount
  };
}

/**
 * Validate shot count per page
 * @param shotCount - Number of shots
 * @returns Validation result
 */
export function validateShotCount(shotCount: number): {
  valid: boolean;
  count: number;
  maxCount: number;
  error?: string;
} {
  const limits = getRequestLimits();
  
  if (shotCount > limits.maxShotCount) {
    return {
      valid: false,
      count: shotCount,
      maxCount: limits.maxShotCount,
      error: `Shot count (${shotCount}) exceeds maximum allowed (${limits.maxShotCount})`
    };
  }
  
  return {
    valid: true,
    count: shotCount,
    maxCount: limits.maxShotCount
  };
}

/**
 * Validate text field length
 * @param text - Text to validate
 * @param fieldName - Name of the field for error messages
 * @returns Validation result
 */
export function validateTextLength(text: string, fieldName: string = 'Text'): {
  valid: boolean;
  length: number;
  maxLength: number;
  error?: string;
} {
  const limits = getRequestLimits();
  
  if (text.length > limits.maxTextLength) {
    return {
      valid: false,
      length: text.length,
      maxLength: limits.maxTextLength,
      error: `${fieldName} length (${text.length}) exceeds maximum allowed (${limits.maxTextLength})`
    };
  }
  
  return {
    valid: true,
    length: text.length,
    maxLength: limits.maxTextLength
  };
}

/**
 * Validate concurrent uploads
 * @param currentUploads - Current number of uploads
 * @returns Validation result
 */
export function validateConcurrentUploads(currentUploads: number): {
  valid: boolean;
  current: number;
  max: number;
  error?: string;
} {
  const limits = getRequestLimits();
  
  if (currentUploads >= limits.maxConcurrentUploads) {
    return {
      valid: false,
      current: currentUploads,
      max: limits.maxConcurrentUploads,
      error: `Too many concurrent uploads (${currentUploads}/${limits.maxConcurrentUploads}). Please wait for current uploads to complete.`
    };
  }
  
  return {
    valid: true,
    current: currentUploads,
    max: limits.maxConcurrentUploads
  };
}

/**
 * Format bytes to human readable string
 * @param bytes - Number of bytes
 * @returns Formatted string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get current memory usage (if available)
 * @returns Memory usage info or null if not available
 */
export function getMemoryUsage(): {
  used: number;
  total: number;
  percentage: number;
} | null {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
    };
  }
  
  return null;
}

/**
 * Check if memory usage is approaching limits
 * @param threshold - Memory usage threshold percentage (default: 80%)
 * @returns Warning if memory usage is high
 */
export function checkMemoryUsage(threshold: number = 80): {
  warning: boolean;
  usage?: number;
  message?: string;
} {
  const memory = getMemoryUsage();
  
  if (!memory) {
    return { warning: false };
  }
  
  if (memory.percentage > threshold) {
    return {
      warning: true,
      usage: memory.percentage,
      message: `High memory usage detected: ${memory.percentage.toFixed(1)}% (${formatBytes(memory.used)}/${formatBytes(memory.total)})`
    };
  }
  
  return { warning: false };
}
