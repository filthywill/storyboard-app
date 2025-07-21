import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom hook to manage a single ObjectURL lifecycle and ensure proper cleanup
 * to prevent memory leaks from unreleased object URLs.
 * 
 * @returns Functions to create and revoke object URLs safely
 */
export function useSingleObjectURL() {
  const objectURLRef = useRef<string | null>(null);

  // Cleanup function to revoke the object URL
  const clearObjectURL = useCallback(() => {
    if (objectURLRef.current) {
      URL.revokeObjectURL(objectURLRef.current);
      
      // Report to memory monitor if available
      if (window.__memoryMonitor && typeof window.__memoryMonitor.untrackObjectURL === 'function') {
        window.__memoryMonitor.untrackObjectURL(objectURLRef.current);
      }
      
      objectURLRef.current = null;
    }
  }, []);

  // Create a new object URL, cleaning up any previous one
  const setObjectURL = useCallback((file: File | Blob): string => {
    clearObjectURL();
      const url = URL.createObjectURL(file);
    objectURLRef.current = url;
    
    // Report to memory monitor if available
    if (window.__memoryMonitor && typeof window.__memoryMonitor.trackObjectURL === 'function') {
      window.__memoryMonitor.trackObjectURL(url);
    }
    
      return url;
  }, [clearObjectURL]);

  // Get current object URL
  const getObjectURL = useCallback((): string | null => {
    return objectURLRef.current;
  }, []);

  // Check if an object URL is set
  const hasObjectURL = useCallback((): boolean => {
    return objectURLRef.current !== null;
  }, []);

  // Ensure cleanup on component unmount
  useEffect(() => {
    return () => {
      clearObjectURL();
    };
  }, [clearObjectURL]);

  return {
    setObjectURL,
    clearObjectURL,
    getObjectURL, 
    hasObjectURL 
  };
}

/**
 * Custom hook to manage multiple ObjectURLs and ensure proper cleanup
 * to prevent memory leaks from unreleased object URLs.
 * 
 * @returns Functions to create, track and revoke multiple object URLs safely
 */
export function useMultipleObjectURLs() {
  const objectURLsRef = useRef<Map<string, string>>(new Map());
  const [count, setCount] = useState<number>(0);

  // Create a new object URL with an identifier
  const createObjectURL = useCallback((file: File | Blob, id: string): string => {
    // Clean up previous URL with the same ID if it exists
    if (objectURLsRef.current.has(id)) {
      const oldUrl = objectURLsRef.current.get(id)!;
      URL.revokeObjectURL(oldUrl);
      
      // Report to memory monitor if available
      if (window.__memoryMonitor && typeof window.__memoryMonitor.untrackObjectURL === 'function') {
        window.__memoryMonitor.untrackObjectURL(oldUrl, id);
      }
    }
    
    const url = URL.createObjectURL(file);
    objectURLsRef.current.set(id, url);
    setCount(objectURLsRef.current.size);
    
    // Report to memory monitor if available
    if (window.__memoryMonitor && typeof window.__memoryMonitor.trackObjectURL === 'function') {
      window.__memoryMonitor.trackObjectURL(url, id);
    }
    
    return url;
  }, []);

  // Revoke a specific object URL by ID
  const revokeObjectURL = useCallback((id: string): void => {
    if (objectURLsRef.current.has(id)) {
      const url = objectURLsRef.current.get(id)!;
      URL.revokeObjectURL(url);
      objectURLsRef.current.delete(id);
      setCount(objectURLsRef.current.size);
      
      // Report to memory monitor if available
      if (window.__memoryMonitor && typeof window.__memoryMonitor.untrackObjectURL === 'function') {
        window.__memoryMonitor.untrackObjectURL(url, id);
      }
    }
  }, []);

  // Revoke all object URLs
  const revokeAllObjectURLs = useCallback((): void => {
    objectURLsRef.current.forEach((url, id) => {
      URL.revokeObjectURL(url);
      
      // Report to memory monitor if available
      if (window.__memoryMonitor && typeof window.__memoryMonitor.untrackObjectURL === 'function') {
        window.__memoryMonitor.untrackObjectURL(url, id);
      }
    });
    objectURLsRef.current.clear();
    setCount(0);
  }, []);

  // Get all current object URLs
  const getAllObjectURLs = useCallback((): Map<string, string> => {
    return new Map(objectURLsRef.current);
  }, []);
  
  // Get a specific object URL by ID
  const getObjectURL = useCallback((id: string): string | undefined => {
    return objectURLsRef.current.get(id);
  }, []);
  
  // Check if an object URL exists by ID
  const hasObjectURL = useCallback((id: string): boolean => {
    return objectURLsRef.current.has(id);
  }, []);
  
  // Get the count of active object URLs
  const getObjectURLCount = useCallback((): number => {
    return count;
  }, [count]);
  
  // Batch create multiple object URLs at once
  const batchCreateObjectURLs = useCallback((files: Record<string, File | Blob>): Record<string, string> => {
    const urls: Record<string, string> = {};
    
    Object.entries(files).forEach(([id, file]) => {
      urls[id] = createObjectURL(file, id);
    });
    
    return urls;
  }, [createObjectURL]);
  
  // Batch revoke multiple object URLs at once
  const batchRevokeObjectURLs = useCallback((ids: string[]): void => {
    ids.forEach(id => revokeObjectURL(id));
  }, [revokeObjectURL]);

  // Ensure cleanup on component unmount
  useEffect(() => {
    return () => {
      revokeAllObjectURLs();
    };
  }, [revokeAllObjectURLs]);

  return {
    createObjectURL,
    revokeObjectURL,
    revokeAllObjectURLs,
    getAllObjectURLs,
    getObjectURL,
    hasObjectURL,
    getObjectURLCount,
    batchCreateObjectURLs,
    batchRevokeObjectURLs
  };
}

/**
 * Standalone utility to safely create an object URL with automatic tracking
 * @param file File or Blob to create URL for
 * @param id Optional identifier for tracking
 * @returns The created object URL
 */
export function createTrackedObjectURL(file: File | Blob, id?: string): string {
  const url = URL.createObjectURL(file);
  
  // Report to memory monitor if available
  if (window.__memoryMonitor && typeof window.__memoryMonitor.trackObjectURL === 'function') {
    window.__memoryMonitor.trackObjectURL(url, id);
  }
  
  return url;
}

/**
 * Standalone utility to safely revoke an object URL with automatic tracking
 * @param url URL to revoke
 * @param id Optional identifier for tracking
 */
export function revokeTrackedObjectURL(url: string, id?: string): void {
  if (!url) return;
  
  URL.revokeObjectURL(url);
  
  // Report to memory monitor if available
  if (window.__memoryMonitor && typeof window.__memoryMonitor.untrackObjectURL === 'function') {
    window.__memoryMonitor.untrackObjectURL(url, id);
  }
}

/**
 * Standalone utility to batch create multiple object URLs with tracking
 * @param files Record of ID to File/Blob mappings
 * @returns Record of ID to URL mappings
 */
export function batchCreateTrackedObjectURLs(files: Record<string, File | Blob>): Record<string, string> {
  const urls: Record<string, string> = {};
  
  Object.entries(files).forEach(([id, file]) => {
    urls[id] = createTrackedObjectURL(file, id);
  });
  
  return urls;
}

/**
 * Standalone utility to batch revoke multiple object URLs with tracking
 * @param urls Record of ID to URL mappings
 */
export function batchRevokeTrackedObjectURLs(urls: Record<string, string>): void {
  Object.entries(urls).forEach(([id, url]) => {
    revokeTrackedObjectURL(url, id);
  });
}

/**
 * Utility to check for and clean up any leaked object URLs
 * @param prefix Optional prefix to filter URLs by ID
 * @returns Number of cleaned up URLs
 */
export function cleanupLeakedObjectURLs(prefix?: string): number {
  if (!window.__memoryMonitor) return 0;
  
  const trackedURLs = window.__memoryMonitor.getTrackedObjectURLs?.();
  if (!trackedURLs || !Array.isArray(trackedURLs)) return 0;
  
  let cleanedCount = 0;
  
  trackedURLs.forEach(tracked => {
    // If prefix is provided, only clean URLs with matching ID prefix
    if (prefix && tracked.id && !tracked.id.startsWith(prefix)) {
      return;
    }
    
    // Check if URL has been active for more than 60 seconds
    const now = Date.now();
    const ageMs = now - tracked.createdAt;
    
    if (ageMs > 60000) { // 60 seconds
      revokeTrackedObjectURL(tracked.url, tracked.id);
      cleanedCount++;
    }
  });
  
  return cleanedCount;
}

// Add TypeScript interface for global memory monitor
declare global {
  interface Window {
    __memoryMonitor?: {
      trackObjectURL?: (url: string, id?: string) => void;
      untrackObjectURL?: (url: string, id?: string) => void;
      getTrackedObjectURLs?: () => Array<{url: string, id?: string, createdAt: number}>;
      trackCanvas?: (canvas: HTMLCanvasElement, context?: CanvasRenderingContext2D | null, id?: string) => void;
      untrackCanvas?: (canvas: HTMLCanvasElement, id?: string) => void;
      trackCanvasResize?: (canvas: HTMLCanvasElement, width: number, height: number, id?: string) => void;
      getTrackedCanvases?: () => Array<{
        canvas: HTMLCanvasElement;
        context?: CanvasRenderingContext2D | null;
        id?: string;
        dimensions: { width: number; height: number };
        createdAt: number;
      }>;
    };
  }
} 