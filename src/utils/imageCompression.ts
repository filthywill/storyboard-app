// Image compression and base64 utilities
export const MAX_BASE64_SIZE = 1024 * 1024; // 1MB
export const MAX_IMAGE_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB original upload limit
export const AUTO_COMPRESS_THRESHOLD = 750 * 1024; // 750KB - images over this get auto-compressed
export const LOGO_MAX_WIDTH = 600;
export const LOGO_MAX_HEIGHT = 240;
export const LOGO_JPEG_QUALITY = 0.8;

export interface CompressedImageResult {
  dataUrl: string;
  size: number;
  originalSize: number;
  compressionRatio: number;
  wasCompressed: boolean;
  width: number;
  height: number;
}

/**
 * Compress an image file to base64 with size optimization
 */
export const compressImage = async (file: File, maxSize: number = MAX_BASE64_SIZE): Promise<CompressedImageResult> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      const originalSize = file.size;
      const needsCompression = originalSize > AUTO_COMPRESS_THRESHOLD;
      
      // Calculate dimensions to maintain aspect ratio
      let maxDimension = 800; // Default max width/height
      
      // If image is large, use more aggressive compression
      if (needsCompression) {
        if (originalSize > 1024 * 1024) {
          maxDimension = 500; // Very aggressive for images over 1MB
        } else {
          maxDimension = 600; // Moderate compression for images 750KB-1MB
        }
      }
      
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Start with appropriate quality based on original size
      let quality = 0.9; // Default high quality
      if (needsCompression) {
        if (originalSize > 1024 * 1024) {
          quality = 0.5; // Very aggressive for images over 1MB
        } else {
          quality = 0.7; // Moderate compression for images 750KB-1MB
        }
      }
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      
      // If still too large, reduce quality further
      while (dataUrl.length > maxSize && quality > 0.1) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }

      const compressedSize = dataUrl.length;
      const compressionRatio = originalSize / compressedSize;

      resolve({
        dataUrl,
        size: compressedSize,
        originalSize,
        compressionRatio,
        wasCompressed: needsCompression,
        width,
        height
      });
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

const loadImageFromObjectUrl = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
};

const hasTransparentPixels = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): boolean => {
  try {
    const { data } = ctx.getImageData(0, 0, width, height);
    for (let index = 3; index < data.length; index += 4) {
      if (data[index] < 255) {
        return true;
      }
    }
  } catch (error) {
    // If alpha inspection fails, prefer preserving transparency for formats that may need it.
    return true;
  }

  return false;
};

/**
 * Optimize project logos for local persistence/export while preserving display size.
 * SVGs stay vector/raw; raster logos are resized to header-appropriate dimensions.
 */
export const optimizeLogoImage = async (file: File): Promise<CompressedImageResult> => {
  const originalDataUrl = await fileToBase64(file);

  if (file.type === 'image/svg+xml') {
    return {
      dataUrl: originalDataUrl,
      size: originalDataUrl.length,
      originalSize: file.size,
      compressionRatio: file.size / originalDataUrl.length,
      wasCompressed: false,
      width: 0,
      height: 0,
    };
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await loadImageFromObjectUrl(objectUrl);
    const scale = Math.min(
      1,
      LOGO_MAX_WIDTH / img.naturalWidth,
      LOGO_MAX_HEIGHT / img.naturalHeight
    );
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    const shouldPreserveTransparency = hasTransparentPixels(ctx, width, height);
    const optimizedDataUrl = shouldPreserveTransparency
      ? canvas.toDataURL('image/png')
      : canvas.toDataURL('image/jpeg', LOGO_JPEG_QUALITY);

    const dataUrl = optimizedDataUrl.length < originalDataUrl.length
      ? optimizedDataUrl
      : originalDataUrl;

    return {
      dataUrl,
      size: dataUrl.length,
      originalSize: file.size,
      compressionRatio: file.size / dataUrl.length,
      wasCompressed: dataUrl !== originalDataUrl,
      width,
      height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

/**
 * Convert File to base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Check if image should use base64 storage
 */
export const shouldUseBase64 = (file: File): boolean => {
  return file.size <= MAX_BASE64_SIZE;
};

/**
 * Check if an original image file may enter the compression pipeline.
 */
export const shouldAllowImageUpload = (file: File): boolean => {
  return file.size <= MAX_IMAGE_UPLOAD_SIZE;
};

export const formatImageUploadSize = (bytes: number): string => {
  if (bytes >= 1024 * 1024) {
    const megabytes = bytes / (1024 * 1024);
    return `${Number.isInteger(megabytes) ? megabytes.toFixed(0) : megabytes.toFixed(1)} MB`;
  }

  return `${(bytes / 1024).toFixed(1)} KB`;
};

export const getImageUploadLimitMessage = (file: File, subject: 'Image' | 'File' = 'Image'): string => {
  return `${subject} too large (${formatImageUploadSize(file.size)}). Maximum original image size is ${formatImageUploadSize(MAX_IMAGE_UPLOAD_SIZE)}.`;
};

/**
 * Get image display source (prioritizes base64 over File object)
 */
export const getImageSource = (shot: any): string | null => {
  // Priority: base64 data > imageUrl > imageFile
  if (shot.imageData) {
    return shot.imageData;
  }
  
  if (shot.imageUrl) {
    return shot.imageUrl;
  }
  
  if (shot.imageFile && shot.imageFile instanceof File) {
    return URL.createObjectURL(shot.imageFile);
  }
  
  return null;
};

/**
 * Clean up object URLs to prevent memory leaks
 */
export const revokeImageObjectURL = (url: string): void => {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}; 