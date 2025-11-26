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

  // When using width with height:auto, calculate the actual rendered height
  const actualRenderHeight = renderWidth / imageAspect;
  
  // Calculate centering offsets in pixels (not percentages)
  // Position the image so its center aligns with container center
  const leftOffset = (containerWidth - renderWidth) / 2;
  const topOffset = (containerHeight - actualRenderHeight) / 2;

  return (
    <div 
      className="relative overflow-hidden"
      style={{
        width: `${containerWidth}px`,
        height: `${containerHeight}px`,
        borderRadius: `${borderRadius}px`
      }}
    >
      <img
        src={imageSource}
        alt={`Shot ${shot.number}`}
        style={{
          // Position image with calculated pixel offsets (not percentage translate)
          position: 'absolute',
          top: `${topOffset}px`,
          left: `${leftOffset}px`,
          width: `${renderWidth}px`,
          height: 'auto', // Let browser maintain aspect ratio
          borderRadius: `${borderRadius}px`,
          // Apply user transforms from center of image
          // Transform origin is center of the POSITIONED image
          transform: `scale(${shot.imageScale || 1.0}) translate(${actualOffsetX}px, ${actualOffsetY}px)`,
          transformOrigin: 'center center',
          border: 'none',
          boxShadow: 'none',
          outline: 'none'
        }}
        onError={onError}
      />
    </div>
  );
};
