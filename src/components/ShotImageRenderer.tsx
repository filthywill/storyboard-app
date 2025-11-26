import React, { useState, useEffect } from 'react';
import { Shot } from '@/store';
import { getImageSource } from '@/utils/imageCompression';
import { useAppStore } from '@/store';

interface ShotImageRendererProps {
  shot: Shot;
  containerWidth: number;
  containerHeight: number;
  onError?: () => void;
}

/**
 * Renders ONLY the image portion of a shot with transforms applied.
 * Used by ImageEditorModal to show the full original image (not CSS-cropped).
 * 
 * Unlike ShotCard which uses object-cover (causing CSS cropping before transforms),
 * this component renders the image at its natural aspect ratio within the container,
 * allowing transforms to reveal any part of the original image.
 */
export const ShotImageRenderer: React.FC<ShotImageRendererProps> = ({
  shot,
  containerWidth,
  containerHeight,
  onError
}) => {
  const storyboardTheme = useAppStore((state) => state.storyboardTheme);
  const imageSource = getImageSource(shot);
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number } | null>(null);
  
  // Safe fallback for border radius
  const borderRadius = storyboardTheme?.shotCard?.borderRadius ?? 8;

  // Load image to get natural dimensions
  useEffect(() => {
    if (!imageSource) return;
    
    const img = new Image();
    img.onload = () => {
      setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      if (onError) onError();
    };
    img.src = imageSource;
  }, [imageSource, onError]);

  if (!imageSource || !imageNaturalSize) {
    return null;
  }

  // Calculate percentage offsets to pixels for CSS transform
  const actualOffsetX = (shot.imageOffsetX || 0) * containerWidth;
  const actualOffsetY = (shot.imageOffsetY || 0) * containerHeight;

  // Calculate what size the image would be if it used object-cover
  // This matches the "cover" behavior: scale to fill container while maintaining aspect ratio
  const containerAspect = containerWidth / containerHeight;
  const imageAspect = imageNaturalSize.width / imageNaturalSize.height;
  
  let renderWidth: number;
  let renderHeight: number;
  
  if (imageAspect > containerAspect) {
    // Image is wider - height fills container, width overflows
    renderHeight = containerHeight;
    renderWidth = containerHeight * imageAspect;
  } else {
    // Image is taller - width fills container, height overflows
    renderWidth = containerWidth;
    renderHeight = containerWidth / imageAspect;
  }

  return (
    <div 
      className="relative overflow-hidden"
      style={{
        width: `${containerWidth}px`,
        height: `${containerHeight}px`,
        borderRadius: `${borderRadius}px`,
        backgroundColor: 'rgba(0, 0, 0, 0.05)' // Subtle background for debugging
      }}
    >
      <img
        src={imageSource}
        alt={`Shot ${shot.number}`}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: `${renderWidth}px`,
          height: `${renderHeight}px`,
          // Transform order: translate to center, apply user scale, apply user offset
          transform: `translate(-50%, -50%) scale(${shot.imageScale || 1.0}) translate(${actualOffsetX}px, ${actualOffsetY}px)`,
          transformOrigin: 'center center',
          borderRadius: `${borderRadius}px`,
          border: 'none',
          boxShadow: 'none',
          outline: 'none'
        }}
        onError={onError}
      />
    </div>
  );
};
