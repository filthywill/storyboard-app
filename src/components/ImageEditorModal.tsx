import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Shot } from '@/store';
import { ShotCard } from './ShotCard';

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

  // Calculate preview dimensions for the ShotCard - use EXACT same logic as ShotGrid
  const getPreviewDimensions = () => {
    const [w, h] = aspectRatio.split('/').map(str => parseInt(str.trim(), 10));
    
    // Use the EXACT same calculation as ShotGrid previewDimensions
    const fixedWidth = 1000;
    const headerPadding = 16;
    const gridWrapperPadding = 4;
    const totalPadding = (headerPadding + gridWrapperPadding) * 2;
    const availableWidth = fixedWidth - totalPadding;
    const gaps = (gridCols - 1) * 8; // Use actual gridCols from page
    const shotWidth = Math.floor((availableWidth - gaps) / gridCols);
    const cardContentPadding = 8 * 2;
    const imageBorder = 1 * 2;
    const imageContainerWidth = shotWidth - cardContentPadding - imageBorder;
    const imageHeight = Math.floor((imageContainerWidth * h) / w);
    
    return {
      width: shotWidth, // Return shotWidth like the actual calculation
      imageHeight: imageHeight,
      gap: 8
    };
  };

  const previewDimensions = getPreviewDimensions();

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
    
    // Calculate container dimensions (image frame size)
    // Account for card padding (8*2) and border (1*2)
    const containerWidth = previewDimensions.width - 18;
    const containerHeight = previewDimensions.imageHeight;
    
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
  }, [isDragging, dragStart, editingShot, previewDimensions]);

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Edit Image - Shot {shot.number}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-6">
          {/* Real ShotCard for editing */}
          <div className="flex-1">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex justify-center">
                <div 
                  style={{ 
                    width: `${previewDimensions.width}px`,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none'
                  }}
                  onMouseDown={handleMouseDown}
                >
                  <ShotCard
                    shot={editingShot}
                    onUpdate={() => {}} // Not used in editing mode
                    onDelete={() => {}} // Not used in editing mode
                    onAddSubShot={() => {}} // Not used in editing mode
                    onInsertShot={() => {}} // Not used in editing mode
                    isEditing={false} // Disable editing overlay - we use sidebar controls
                    isImageEditor={true} // Hide text fields and overlay buttons
                    aspectRatio={aspectRatio}
                    previewDimensions={previewDimensions}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">
                Click and drag to position • Use controls to zoom
              </p>
            </div>
          </div>

          {/* Controls Sidebar */}
          <div className="w-64 space-y-6">
            {/* Zoom Controls */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Zoom Controls</h3>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
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
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEditUpdate({
                    imageScale: Math.min(4.0, (editingShot.imageScale || 1) + 0.1)
                  })}
                >
                  <ZoomIn size={16} />
                </Button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                {scalePercent}% (10% - 400%)
              </p>
            </div>


            {/* Current Zoom Display */}
            <div className="space-y-2">
              <h3 className="font-medium text-sm">Current Zoom</h3>
              <div className="text-xs space-y-1 font-mono bg-gray-50 p-3 rounded border border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-600">Zoom:</span>
                  <span>{scalePercent}%</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <h3 className="font-medium text-sm">Quick Actions</h3>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleReset}
              >
                <RotateCcw size={16} className="mr-2" />
                Reset
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 space-y-2 border-t">
              <Button
                onClick={handleApply}
                className="w-full"
              >
                Apply Changes
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="w-full"
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

