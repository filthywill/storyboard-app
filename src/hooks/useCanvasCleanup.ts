import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom hook to manage canvas context lifecycle and ensure proper cleanup
 * to prevent memory leaks from canvas contexts.
 * 
 * @param initialWidth Initial canvas width
 * @param initialHeight Initial canvas height
 * @returns Canvas element reference and utility functions
 */
export function useCanvasCleanup(initialWidth: number = 1000, initialHeight: number = 800) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize canvas context
  const initializeCanvas = useCallback((width: number = initialWidth, height: number = initialHeight): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;
    
    // Get and store the context
    const ctx = canvas.getContext('2d', { alpha: true });
    contextRef.current = ctx;
    
    if (ctx) {
      setIsInitialized(true);
      
      // Report to memory monitor if available
      if (window.__memoryMonitor && typeof window.__memoryMonitor.trackCanvas === 'function') {
        window.__memoryMonitor.trackCanvas(canvas, ctx);
      }
    }
    
    return ctx;
  }, [initialWidth, initialHeight]);
  
  // Clear canvas content
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);
  
  // Resize canvas with proper cleanup
  const resizeCanvas = useCallback((width: number, height: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Store current image data if needed
    let imageData: ImageData | null = null;
    if (contextRef.current && width > 0 && height > 0) {
      try {
        // Only try to get image data if dimensions are valid
        imageData = contextRef.current.getImageData(0, 0, Math.min(canvas.width, width), Math.min(canvas.height, height));
      } catch (e) {
        console.warn('Could not preserve canvas content during resize:', e);
      }
    }
    
    // Update dimensions
    canvas.width = width;
    canvas.height = height;
    
    // Restore image data if available
    if (contextRef.current && imageData) {
      contextRef.current.putImageData(imageData, 0, 0);
    }
    
    // Report resize to memory monitor if available
    if (window.__memoryMonitor && typeof window.__memoryMonitor.trackCanvasResize === 'function') {
      window.__memoryMonitor.trackCanvasResize(canvas, width, height);
    }
  }, []);
  
  // Cleanup function to release canvas resources
  const cleanupCanvas = useCallback(() => {
    // Clear any large canvas content to help garbage collection
    clearCanvas();
    
    const canvas = canvasRef.current;
    
    // Report to memory monitor if available
    if (canvas && isInitialized && window.__memoryMonitor && typeof window.__memoryMonitor.untrackCanvas === 'function') {
      window.__memoryMonitor.untrackCanvas(canvas);
    }
    
    // Remove references
    contextRef.current = null;
    
    // Additional cleanup for WebGL contexts if needed
    if (canvas) {
      // Force the browser to release resources
      canvas.width = 1;
      canvas.height = 1;
    }
    
    setIsInitialized(false);
  }, [clearCanvas, isInitialized]);
  
  // Get current dimensions
  const getCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { width: 0, height: 0 };
    
    return {
      width: canvas.width,
      height: canvas.height
    };
  }, []);
  
  // Check if the canvas is initialized
  const isCanvasInitialized = useCallback(() => {
    return isInitialized && !!contextRef.current;
  }, [isInitialized]);
  
  // Save canvas content to a new image
  const saveToImage = useCallback((type: string = 'image/png', quality: number = 0.92): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    try {
      return canvas.toDataURL(type, quality);
    } catch (e) {
      console.error('Error saving canvas to image:', e);
      return null;
    }
  }, []);
  
  // Draw an image onto the canvas with proper error handling
  const drawImage = useCallback((image: HTMLImageElement | SVGImageElement | HTMLVideoElement | HTMLCanvasElement | ImageBitmap | OffscreenCanvas, 
                                 dx: number = 0, dy: number = 0, 
                                 dWidth?: number, dHeight?: number) => {
    const ctx = contextRef.current;
    if (!ctx) return false;
    
    try {
      if (dWidth !== undefined && dHeight !== undefined) {
        ctx.drawImage(image, dx, dy, dWidth, dHeight);
      } else {
        ctx.drawImage(image, dx, dy);
      }
      return true;
    } catch (e) {
      console.error('Error drawing image on canvas:', e);
      return false;
    }
  }, []);
  
  // Ensure cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanupCanvas();
    };
  }, [cleanupCanvas]);
  
  return {
    canvasRef,
    contextRef,
    initializeCanvas,
    clearCanvas,
    resizeCanvas,
    cleanupCanvas,
    getCanvasDimensions,
    isCanvasInitialized,
    saveToImage,
    drawImage
  };
}

/**
 * Custom hook for managing multiple canvases
 * Useful when a component needs to work with several canvas elements
 */
export function useMultipleCanvasCleanup() {
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const contextRefs = useRef<Map<string, CanvasRenderingContext2D>>(new Map());
  const [canvasCount, setCanvasCount] = useState(0);
  
  // Initialize a specific canvas
  const initializeCanvas = useCallback((id: string, width: number, height: number): CanvasRenderingContext2D | null => {
    const canvas = canvasRefs.current.get(id);
    if (!canvas) return null;
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d', { alpha: true });
    if (ctx) {
      contextRefs.current.set(id, ctx);
      
      // Report to memory monitor if available
      if (window.__memoryMonitor && typeof window.__memoryMonitor.trackCanvas === 'function') {
        window.__memoryMonitor.trackCanvas(canvas, ctx, id);
      }
    }
    
    return ctx;
  }, []);
  
  // Register a canvas element
  const registerCanvas = useCallback((id: string, canvas: HTMLCanvasElement) => {
    canvasRefs.current.set(id, canvas);
    setCanvasCount(canvasRefs.current.size);
  }, []);
  
  // Unregister and cleanup a canvas
  const unregisterCanvas = useCallback((id: string) => {
    const canvas = canvasRefs.current.get(id);
    if (canvas) {
      // Clear canvas
      const ctx = contextRefs.current.get(id);
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        contextRefs.current.delete(id);
      }
      
      // Report to memory monitor if available
      if (window.__memoryMonitor && typeof window.__memoryMonitor.untrackCanvas === 'function') {
        window.__memoryMonitor.untrackCanvas(canvas, id);
      }
      
      // Reset canvas size
      canvas.width = 1;
      canvas.height = 1;
      
      // Remove from refs
      canvasRefs.current.delete(id);
      setCanvasCount(canvasRefs.current.size);
    }
  }, []);
  
  // Clean up all canvases
  const cleanupAllCanvases = useCallback(() => {
    canvasRefs.current.forEach((canvas, id) => {
      const ctx = contextRefs.current.get(id);
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      
      // Report to memory monitor if available
      if (window.__memoryMonitor && typeof window.__memoryMonitor.untrackCanvas === 'function') {
        window.__memoryMonitor.untrackCanvas(canvas, id);
      }
      
      canvas.width = 1;
      canvas.height = 1;
    });
    
    canvasRefs.current.clear();
    contextRefs.current.clear();
    setCanvasCount(0);
  }, []);
  
  // Get a specific context
  const getContext = useCallback((id: string): CanvasRenderingContext2D | undefined => {
    return contextRefs.current.get(id);
  }, []);
  
  // Get a specific canvas
  const getCanvas = useCallback((id: string): HTMLCanvasElement | undefined => {
    return canvasRefs.current.get(id);
  }, []);
  
  // Clear a specific canvas
  const clearCanvas = useCallback((id: string): boolean => {
    const canvas = canvasRefs.current.get(id);
    const ctx = contextRefs.current.get(id);
    
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return true;
    }
    return false;
  }, []);
  
  // Resize a specific canvas
  const resizeCanvas = useCallback((id: string, width: number, height: number): boolean => {
    const canvas = canvasRefs.current.get(id);
    const ctx = contextRefs.current.get(id);
    
    if (!canvas || !ctx) return false;
    
    // Store current image data if needed
    let imageData: ImageData | null = null;
    try {
      // Only try to get image data if dimensions are valid
      imageData = ctx.getImageData(0, 0, Math.min(canvas.width, width), Math.min(canvas.height, height));
    } catch (e) {
      console.warn(`Could not preserve canvas ${id} content during resize:`, e);
    }
    
    // Update dimensions
    canvas.width = width;
    canvas.height = height;
    
    // Restore image data if available
    if (imageData) {
      ctx.putImageData(imageData, 0, 0);
    }
    
    // Report resize to memory monitor if available
    if (window.__memoryMonitor && typeof window.__memoryMonitor.trackCanvasResize === 'function') {
      window.__memoryMonitor.trackCanvasResize(canvas, width, height, id);
    }
    
    return true;
  }, []);
  
  // Get the count of registered canvases
  const getCanvasCount = useCallback((): number => {
    return canvasCount;
  }, [canvasCount]);
  
  // Batch operations on multiple canvases
  const batchOperation = useCallback((ids: string[], operation: (id: string) => void): void => {
    ids.forEach(id => {
      if (canvasRefs.current.has(id)) {
        operation(id);
      }
    });
  }, []);
  
  // Ensure cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanupAllCanvases();
    };
  }, [cleanupAllCanvases]);
  
  return {
    registerCanvas,
    unregisterCanvas,
    initializeCanvas,
    getContext,
    getCanvas,
    clearCanvas,
    resizeCanvas,
    cleanupAllCanvases,
    getCanvasCount,
    batchOperation
  };
}

/**
 * Standalone utility to clean up a canvas element
 * Useful for one-off cleanup outside of component lifecycle
 * 
 * @param canvas Canvas element to clean up
 * @param id Optional identifier for tracking
 */
export function cleanupCanvasElement(canvas: HTMLCanvasElement | null, id?: string): void {
  if (!canvas) return;
  
  try {
    // Get context for clearing
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Report to memory monitor if available
    if (window.__memoryMonitor && typeof window.__memoryMonitor.untrackCanvas === 'function') {
      window.__memoryMonitor.untrackCanvas(canvas, id);
    }
    
    // Reset size to minimum
    canvas.width = 1;
    canvas.height = 1;
  } catch (e) {
    console.error('Error cleaning up canvas:', e);
  }
}

/**
 * Utility to clean up a canvas context
 * 
 * @param ctx Canvas context to clean up
 * @param canvas Optional canvas element (for complete cleanup)
 * @param id Optional identifier for tracking
 */
export function cleanupCanvasContext(ctx: CanvasRenderingContext2D | null, canvas?: HTMLCanvasElement | null, id?: string): void {
  if (!ctx) return;
  
  try {
    // Clear the canvas if we have dimensions
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    if (width > 0 && height > 0) {
      ctx.clearRect(0, 0, width, height);
    }
    
    // If canvas is provided, do full cleanup
    if (canvas) {
      cleanupCanvasElement(canvas, id);
    }
  } catch (e) {
    console.error('Error cleaning up canvas context:', e);
  }
}

/**
 * Utility to check for and clean up any leaked canvas elements
 * @param prefix Optional prefix to filter canvases by ID
 * @returns Number of cleaned up canvases
 */
export function cleanupLeakedCanvases(prefix?: string): number {
  if (!window.__memoryMonitor || !window.__memoryMonitor.getTrackedCanvases) return 0;
  
  const trackedCanvases = window.__memoryMonitor.getTrackedCanvases();
  if (!trackedCanvases || !Array.isArray(trackedCanvases)) return 0;
  
  let cleanedCount = 0;
  
  trackedCanvases.forEach(tracked => {
    // If prefix is provided, only clean canvases with matching ID prefix
    if (prefix && tracked.id && !tracked.id.startsWith(prefix)) {
      return;
    }
    
    // Check if canvas has been active for more than 5 minutes
    const now = Date.now();
    const ageMs = now - tracked.createdAt;
    
    if (ageMs > 300000) { // 5 minutes
      cleanupCanvasElement(tracked.canvas, tracked.id);
      cleanedCount++;
    }
  });
  
  return cleanedCount;
}

// Add TypeScript interface for global memory monitor
declare global {
  interface Window {
    __memoryMonitor?: {
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
      trackObjectURL?: (url: string, id?: string) => void;
      untrackObjectURL?: (url: string, id?: string) => void;
      getTrackedObjectURLs?: () => Array<{url: string, id?: string, createdAt: number}>;
    };
  }
} 