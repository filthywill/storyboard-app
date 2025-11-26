import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Shot } from '@/store';
import { ShotImageRenderer } from './ShotImageRenderer';
import { getGlassmorphismStyles, getColor } from '@/styles/glassmorphism-styles';

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  shot: Shot | null;
  aspectRatio?: string;
  gridCols?: number;
  onApply: (updates: { imageScale?: number; imageOffsetX?: number; imageOffsetY?: number }) => void;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  isOpen,
  onClose,
  shot,
  aspectRatio = '16/9',
  gridCols = 3,
  onApply
}) => {
  // Create a copy of the shot for editing
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Load shot data when modal opens
  useEffect(() => {
    if (isOpen && shot) {
      setEditingShot({...shot});
    } else {
      setEditingShot(null);
    }
  }, [isOpen, shot]);

  // Calculate IMAGE container dimensions for the editor preview
  // Use a reasonable fixed size that's large enough for comfortable editing
  const getImageDimensions = () => {
    const [w, h] = aspectRatio.split('/').map(str => parseInt(str.trim(), 10));
    
    // Use a comfortable preview width for editing (larger than ShotCard)
    const previewWidth = 500; // Large enough to see details while editing
    const previewHeight = Math.floor((previewWidth * h) / w);
    
    console.log('📐 ImageEditor Dimensions:', {
      aspectRatio,
      gridCols,
      calculatedSize: { width: previewWidth, height: previewHeight }
    });
    
    return {
      width: previewWidth,
      height: previewHeight
    };
  };

  const imageDimensions = getImageDimensions();

  const handleEditUpdate = (updates: Partial<Shot>) => {
    if (editingShot) {
      setEditingShot({...editingShot, ...updates});
    }
  };

  // Drag handlers for positioning
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ 
      x: e.clientX, 
      y: e.clientY 
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !editingShot) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    // Use actual image container dimensions
    const containerWidth = imageDimensions.width;
    const containerHeight = imageDimensions.height;
    
    // Adjust drag sensitivity based on zoom level
    // When zoomed in more, we need to move less to get the same visual effect
    const scale = editingShot.imageScale || 1.0;
    
    // Convert pixel delta to percentage of container size
    // This makes offsets relative to aspect ratio, not absolute pixels
    const percentDeltaX = (deltaX / scale) / containerWidth;
    const percentDeltaY = (deltaY / scale) / containerHeight;
    
    setEditingShot({
      ...editingShot,
      imageOffsetX: (editingShot.imageOffsetX || 0) + percentDeltaX,
      imageOffsetY: (editingShot.imageOffsetY || 0) + percentDeltaY
    });
    
    setDragStart({ 
      x: e.clientX, 
      y: e.clientY 
    });
  }, [isDragging, dragStart, editingShot, imageDimensions]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);


  const handleReset = () => {
    if (editingShot) {
      setEditingShot({
        ...editingShot,
        imageScale: 1.0,
        imageOffsetX: 0,
        imageOffsetY: 0
      });
    }
  };

  const handleApply = () => {
    if (editingShot) {
      onApply({
        imageScale: editingShot.imageScale,
        imageOffsetX: editingShot.imageOffsetX,
        imageOffsetY: editingShot.imageOffsetY
      });
    }
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!shot || !editingShot) return null;

  const scalePercent = Math.round((editingShot.imageScale || 1) * 100);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-hidden"
        style={getGlassmorphismStyles('dark')}
      >
        <DialogHeader>
          <DialogTitle style={{ color: getColor('text', 'primary') as string }}>
            Edit Image - Shot {shot.number}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6">
          {/* Real ShotCard for editing */}
          <div className="flex-1">
            <div 
              className="rounded-lg p-4"
              style={{
                ...getGlassmorphismStyles('background'),
                border: `1px solid ${getColor('border', 'primary') as string}`
              }}
            >
              <div className="flex justify-center">
                <div 
                  style={{ 
                    cursor: isDragging ? 'grabbing' : 'grab',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none'
                  }}
                  onMouseDown={handleMouseDown}
                >
                  <ShotImageRenderer
                    shot={editingShot}
                    containerWidth={imageDimensions.width}
                    containerHeight={imageDimensions.height}
                  />
                </div>
              </div>
              <p 
                className="text-xs text-center mt-2"
                style={{ color: getColor('text', 'muted') as string }}
              >
                Click and drag to position • Use controls to zoom
              </p>
            </div>
          </div>

          {/* Controls Sidebar */}
          <div className="w-64 space-y-6">
            {/* Zoom Controls */}
            <div className="space-y-3">
              <h3 
                className="font-medium text-sm"
                style={{ color: getColor('text', 'primary') as string }}
              >
                Zoom Controls
              </h3>
              <div className="flex items-center gap-3">
                <Button
                  size="icon"
                  className="h-8 w-8"
                  style={getGlassmorphismStyles('button')}
                  onClick={() => handleEditUpdate({
                    imageScale: Math.max(0.1, (editingShot.imageScale || 1) - 0.1)
                  })}
                >
                  <ZoomOut size={16} />
                </Button>
                <Slider
                  value={[editingShot.imageScale || 1]}
                  onValueChange={([value]) => handleEditUpdate({ imageScale: value })}
                  min={0.1}
                  max={4.0}
                  step={0.1}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  className="h-8 w-8"
                  style={getGlassmorphismStyles('button')}
                  onClick={() => handleEditUpdate({
                    imageScale: Math.min(4.0, (editingShot.imageScale || 1) + 0.1)
                  })}
                >
                  <ZoomIn size={16} />
                </Button>
              </div>
              <p 
                className="text-xs text-center"
                style={{ color: getColor('text', 'muted') as string }}
              >
                {scalePercent}% (10% - 400%)
              </p>
            </div>


            {/* Current Zoom Display */}
            <div className="space-y-2">
              <h3 
                className="font-medium text-sm"
                style={{ color: getColor('text', 'primary') as string }}
              >
                Current Zoom
              </h3>
              <div 
                className="text-xs space-y-1 font-mono p-3 rounded"
                style={{
                  ...getGlassmorphismStyles('background'),
                  border: `1px solid ${getColor('border', 'primary') as string}`
                }}
              >
                <div className="flex justify-between">
                  <span style={{ color: getColor('text', 'secondary') as string }}>Zoom:</span>
                  <span style={{ color: getColor('text', 'primary') as string }}>{scalePercent}%</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <h3 
                className="font-medium text-sm"
                style={{ color: getColor('text', 'primary') as string }}
              >
                Quick Actions
              </h3>
              <Button
                className="w-full justify-start"
                style={getGlassmorphismStyles('button')}
                onClick={handleReset}
              >
                <RotateCcw size={16} className="mr-2" />
                Reset
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 space-y-2">
              <Button
                onClick={handleApply}
                className="w-full"
                style={getGlassmorphismStyles('buttonSecondary')}
              >
                Apply Changes
              </Button>
              <Button
                onClick={handleCancel}
                className="w-full"
                style={getGlassmorphismStyles('button')}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

