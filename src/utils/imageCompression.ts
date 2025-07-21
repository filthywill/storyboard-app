// Image compression and base64 utilities
export const MAX_BASE64_SIZE = 1024 * 1024; // 1MB
export const AUTO_COMPRESS_THRESHOLD = 750 * 1024; // 750KB - images over this get auto-compressed

export interface CompressedImageResult {
  dataUrl: string;
  size: number;
  originalSize: number;
  compressionRatio: number;
  wasCompressed: boolean;
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
        wasCompressed: needsCompression
      });
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
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