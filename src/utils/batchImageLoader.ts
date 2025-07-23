// Batch image loading with intelligent file name parsing
import { compressImage, shouldUseBase64, MAX_BASE64_SIZE } from './imageCompression';

export interface ParsedImageFile {
  file: File;
  originalName: string;
  parsedNumber: number | null;
  numberString: string | null;
  prefix: string;
  suffix: string;
  sortKey: number;
}

export interface BatchLoadResult {
  successful: ParsedImageFile[];
  failed: { file: File; error: string }[];
  totalProcessed: number;
  numberingPattern: string | null;
}

/**
 * Extract numbers from filename using various patterns
 */
const extractNumberFromFilename = (filename: string): { number: number | null; numberString: string | null; prefix: string; suffix: string } => {
  // Remove file extension for parsing
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  const extension = filename.substring(nameWithoutExt.length);
  
  // Common numbering patterns (in order of preference)
  const patterns = [
    // Pattern 1: Numbers at the end (shot001, image_05, etc.)
    /^(.+?)(\d+)$/,
    // Pattern 2: Numbers at the beginning (001_shot, 05_image, etc.)
    /^(\d+)(.+)$/,
    // Pattern 3: Numbers in the middle (shot_001_final, image_05_v2, etc.)
    /^(.+?)(\d+)(.+)$/,
    // Pattern 4: Just numbers (001, 05, etc.)
    /^(\d+)$/
  ];
  
  for (const pattern of patterns) {
    const match = nameWithoutExt.match(pattern);
    if (match) {
      let numberString: string;
      let prefix: string;
      let suffix: string;
      
      if (pattern === patterns[0]) { // Numbers at end
        prefix = match[1];
        numberString = match[2];
        suffix = extension;
      } else if (pattern === patterns[1]) { // Numbers at beginning
        prefix = '';
        numberString = match[1];
        suffix = match[2] + extension;
      } else if (pattern === patterns[2]) { // Numbers in middle
        prefix = match[1];
        numberString = match[2];
        suffix = match[3] + extension;
      } else { // Just numbers
        prefix = '';
        numberString = match[1];
        suffix = extension;
      }
      
      const number = parseInt(numberString, 10);
      if (!isNaN(number)) {
        return {
          number,
          numberString,
          prefix,
          suffix
        };
      }
    }
  }
  
  // No number found
  return {
    number: null,
    numberString: null,
    prefix: nameWithoutExt,
    suffix: extension
  };
};

/**
 * Detect the numbering pattern from a collection of parsed files
 */
const detectNumberingPattern = (parsedFiles: ParsedImageFile[]): string | null => {
  const filesWithNumbers = parsedFiles.filter(f => f.parsedNumber !== null);
  if (filesWithNumbers.length === 0) return null;
  
  // Analyze the number strings to detect padding pattern
  const numberStrings = filesWithNumbers.map(f => f.numberString!);
  const maxLength = Math.max(...numberStrings.map(s => s.length));
  const minLength = Math.min(...numberStrings.map(s => s.length));
  
  // If all numbers have the same length and > 1, it's likely padded
  if (maxLength === minLength && maxLength > 1) {
    return '0'.repeat(maxLength - 1) + '1'; // e.g., "01" for 2-digit padding
  }
  
  // If mixed lengths, use the most common pattern
  const lengthCounts = numberStrings.reduce((acc, s) => {
    acc[s.length] = (acc[s.length] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  
  const mostCommonLength = Object.keys(lengthCounts).reduce((a, b) => 
    lengthCounts[parseInt(a)] > lengthCounts[parseInt(b)] ? a : b
  );
  
  const length = parseInt(mostCommonLength);
  return length > 1 ? '0'.repeat(length - 1) + '1' : '1';
};

/**
 * Parse and sort image files intelligently
 */
export const parseAndSortImageFiles = (files: FileList | File[]): ParsedImageFile[] => {
  const fileArray = Array.from(files);
  const parsedFiles: ParsedImageFile[] = [];
  
  fileArray.forEach((file, index) => {
    const { number, numberString, prefix, suffix } = extractNumberFromFilename(file.name);
    
    parsedFiles.push({
      file,
      originalName: file.name,
      parsedNumber: number,
      numberString,
      prefix,
      suffix,
      sortKey: number !== null ? number : 999999 + index // Files without numbers go to the end
    });
  });
  
  // Sort by extracted number, then by original filename
  parsedFiles.sort((a, b) => {
    if (a.sortKey !== b.sortKey) {
      return a.sortKey - b.sortKey;
    }
    return a.originalName.localeCompare(b.originalName);
  });
  
  return parsedFiles;
};

/**
 * Process batch of images with compression and validation
 */
export const processBatchImages = async (
  parsedFiles: ParsedImageFile[],
  onProgress?: (processed: number, total: number, currentFile: string) => void
): Promise<BatchLoadResult> => {
  const successful: ParsedImageFile[] = [];
  const failed: { file: File; error: string }[] = [];
  const total = parsedFiles.length;
  
  for (let i = 0; i < parsedFiles.length; i++) {
    const parsedFile = parsedFiles[i];
    const { file } = parsedFile;
    
    onProgress?.(i + 1, total, file.name);
    
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        failed.push({ file, error: 'Not an image file' });
        continue;
      }
      
      // Check file size
      if (!shouldUseBase64(file)) {
        failed.push({ 
          file, 
          error: `File too large (${(file.size / 1024).toFixed(1)}KB). Maximum size is ${MAX_BASE64_SIZE / 1024}KB.` 
        });
        continue;
      }
      
      // Compress image
      const compressedResult = await compressImage(file);
      
      // Add compression result to parsed file
      (parsedFile as any).compressedResult = compressedResult;
      
      successful.push(parsedFile);
      
    } catch (error) {
      failed.push({ 
        file, 
        error: error instanceof Error ? error.message : 'Unknown processing error' 
      });
    }
  }
  
  const numberingPattern = detectNumberingPattern(successful);
  
  return {
    successful,
    failed,
    totalProcessed: successful.length + failed.length,
    numberingPattern
  };
};

/**
 * Generate preview information for batch load
 */
export const generateBatchPreview = (parsedFiles: ParsedImageFile[]): {
  totalFiles: number;
  filesWithNumbers: number;
  filesWithoutNumbers: number;
  numberRange: { min: number; max: number } | null;
  detectedPattern: string | null;
  sortedNames: string[];
} => {
  const filesWithNumbers = parsedFiles.filter(f => f.parsedNumber !== null);
  const filesWithoutNumbers = parsedFiles.filter(f => f.parsedNumber === null);
  
  const numberRange = filesWithNumbers.length > 0 ? {
    min: Math.min(...filesWithNumbers.map(f => f.parsedNumber!)),
    max: Math.max(...filesWithNumbers.map(f => f.parsedNumber!))
  } : null;
  
  const detectedPattern = detectNumberingPattern(parsedFiles);
  
  return {
    totalFiles: parsedFiles.length,
    filesWithNumbers: filesWithNumbers.length,
    filesWithoutNumbers: filesWithoutNumbers.length,
    numberRange,
    detectedPattern,
    sortedNames: parsedFiles.map(f => f.originalName)
  };
}; 