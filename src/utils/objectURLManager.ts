/**
 * ObjectURLManager - Utility for managing object URLs to prevent memory leaks
 * 
 * This utility helps manage object URLs created from files, ensuring they are
 * properly revoked when no longer needed to prevent memory leaks.
 */

class ObjectURLManager {
  private static activeURLs = new Set<string>();

  /**
   * Replace an existing object URL with a new one, properly cleaning up the old one
   * @param currentURL - The current object URL (can be null)
   * @param newFile - The new file to create an object URL from (can be null)
   * @returns The new object URL or null if no file provided
   */
  static replaceObjectURL(currentURL: string | null, newFile: File | null): string | null {
    // Revoke the current URL if it exists
    if (currentURL) {
      this.revokeObjectURL(currentURL);
    }

    // Create new URL if file is provided
    if (newFile) {
      const newURL = URL.createObjectURL(newFile);
      this.activeURLs.add(newURL);
      return newURL;
    }

    return null;
  }

  /**
   * Revoke a specific object URL
   * @param url - The object URL to revoke
   */
  static revokeObjectURL(url: string): void {
    if (url && this.activeURLs.has(url)) {
      URL.revokeObjectURL(url);
      this.activeURLs.delete(url);
    }
  }

  /**
   * Revoke all active object URLs
   */
  static revokeAllObjectURLs(): void {
    this.activeURLs.forEach(url => {
      URL.revokeObjectURL(url);
    });
    this.activeURLs.clear();
  }

  /**
   * Get the number of active object URLs
   * @returns The count of active object URLs
   */
  static getActiveURLCount(): number {
    return this.activeURLs.size;
  }

  /**
   * Check if a URL is being tracked
   * @param url - The URL to check
   * @returns True if the URL is being tracked
   */
  static isTracked(url: string): boolean {
    return this.activeURLs.has(url);
  }
}

export default ObjectURLManager; 