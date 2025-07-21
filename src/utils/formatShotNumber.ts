/**
 * Formats shot numbers based on the project's shot number format setting
 * Supports formats like: '1', '01', '001', '100', etc.
 * 
 * Format examples:
 * - '1' = no padding, starts from 1
 * - '01' = zero-pad to 2 digits, starts from 1  
 * - '001' = zero-pad to 3 digits, starts from 1
 * - '100' = zero-pad to 3 digits, starts from 100
 */
export function formatShotNumber(
  position: number, 
  format: string, 
  subShotLetter?: string
): string {
  // Parse the format to extract prefix, padding, and starting number
  const numericPartMatch = format.match(/\d+$/);
  
  if (!numericPartMatch) {
    // Fallback if format is invalid
    return subShotLetter ? `${position}${subShotLetter}` : position.toString();
  }
  
  const prefix = format.substring(0, numericPartMatch.index || 0);
  const numericPart = numericPartMatch[0];
  const padding = numericPart.length;
  const startingNumber = parseInt(numericPart, 10);
  
  // Calculate the actual shot number based on position and starting number
  const shotNumber = startingNumber + position - 1;
  
  // Format with zero padding
  const formattedNumber = shotNumber.toString().padStart(padding, '0');
  
  // Combine prefix, formatted number, and optional sub-shot letter
  return `${prefix}${formattedNumber}${subShotLetter || ''}`;
}

/**
 * Extract format components for analysis
 */
export function parseFormat(format: string): {
  prefix: string;
  padding: number;
  startingNumber: number;
} {
  const numericPartMatch = format.match(/\d+$/);
  
  if (!numericPartMatch) {
    return { prefix: '', padding: 1, startingNumber: 1 };
  }
  
  const prefix = format.substring(0, numericPartMatch.index || 0);
  const numericPart = numericPartMatch[0];
  const padding = numericPart.length;
  const startingNumber = parseInt(numericPart, 10);
  
  return { prefix, padding, startingNumber };
}