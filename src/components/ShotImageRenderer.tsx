import React, { useState, useEffect } from 'react';
import { Shot } from '@/store';
import { getImageSource } from '@/utils/imageCompression';
import { useAppStore } from '@/store';
import { calculateCoverImageGeometry } from '@/utils/imageGeometry';

interface ShotImageRendererProps {
  shot: Shot;
  containerWidth: number;
  containerHeight: number;
  onError?: () => void;
}

/**
 * Renders ONLY the image portion of a shot with transforms applied.
 * Used by ImageEditorModal with the shared explicit cover geometry.
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

  const imageGeometry = calculateCoverImageGeometry(
    imageNaturalSize.width,
    imageNaturalSize.height,
    containerWidth,
    containerHeight
  );

  if (!imageGeometry) {
    return null;
  }

  return (
    <div 
      className="relative overflow-hidden"
      style={{
        width: `${containerWidth}px`,
        height: `${containerHeight}px`,
        borderRadius: `${borderRadius}px`,
      }}
    >
      <img
        src={imageSource}
        alt={`Shot ${shot.number}`}
        style={{
          position: 'absolute',
          width: `${imageGeometry.width}px`,
          height: `${imageGeometry.height}px`,
          left: `${imageGeometry.left}px`,
          top: `${imageGeometry.top}px`,
          borderRadius: `${borderRadius}px`,
          // Use percentage-based transform origin like ShotCard
          // This makes transforms stable across aspect ratio changes
          transform: `scale(${shot.imageScale || 1.0}) translate(${actualOffsetX}px, ${actualOffsetY}px)`,
          transformOrigin: 'center center',
          maxWidth: 'none',
          maxHeight: 'none',
          border: 'none',
          boxShadow: 'none',
          outline: 'none'
        }}
        onError={onError}
      />
    </div>
  );
};
