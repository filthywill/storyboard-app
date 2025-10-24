/**
 * Input Sanitization Utilities
 * 
 * These utilities help prevent XSS and injection attacks by sanitizing user input.
 * Note: These are basic sanitization helpers. For complex HTML rendering,
 * React's built-in XSS protection is used.
 */

/**
 * Sanitize a string by removing potentially dangerous characters
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove angle brackets (basic XSS prevention)
    .trim()
    .slice(0, maxLength); // Limit length
}

/**
 * Sanitize project/shot names (alphanumeric, spaces, basic punctuation)
 */
export function sanitizeName(input: string, maxLength: number = 100): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[^a-zA-Z0-9\s\-_.,!?'"()]/g, '') // Allow common characters
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(input: string | number, min?: number, max?: number): number {
  const num = typeof input === 'string' ? parseInt(input, 10) : input;
  
  if (isNaN(num)) return 0;
  
  let result = num;
  if (min !== undefined && result < min) result = min;
  if (max !== undefined && result > max) result = max;
  
  return result;
}

/**
 * Sanitize URL input (basic validation)
 */
export function sanitizeUrl(input: string): string | null {
  if (typeof input !== 'string' || !input) return null;
  
  try {
    const url = new URL(input);
    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize file name
 */
export function sanitizeFileName(input: string, maxLength: number = 255): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[^a-zA-Z0-9\s\-_.]]/g, '') // Only allow safe characters
    .replace(/\.{2,}/g, '.') // Prevent directory traversal
    .trim()
    .slice(0, maxLength);
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(input: string): string | null {
  if (typeof input !== 'string') return null;
  
  const email = input.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return emailRegex.test(email) ? email : null;
}

/**
 * Sanitize multiline text (preserve newlines but remove dangerous content)
 */
export function sanitizeMultilineText(input: string, maxLength: number = 5000): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/\r\n/g, '\n') // Normalize line endings
    .slice(0, maxLength);
}

/**
 * Validate file size
 */
export function validateFileSize(fileSize: number, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return fileSize > 0 && fileSize <= maxSizeBytes;
}

/**
 * Validate image file type
 */
export function validateImageFileType(mimeType: string): boolean {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];
  
  return allowedTypes.includes(mimeType.toLowerCase());
}



