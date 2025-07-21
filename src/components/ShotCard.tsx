import { useRef, useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Shot, useAppStore } from '@/store';
import { Move, Plus, X, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { compressImage, getImageSource, revokeImageObjectURL, shouldUseBase64, MAX_BASE64_SIZE, AUTO_COMPRESS_THRESHOLD } from '@/utils/imageCompression';
import { toast } from 'sonner';

interface ShotCardProps {
  shot: Shot;
  onUpdate: (updates: Partial<Shot>) => void;
  onDelete: () => void;
  onAddSubShot: () => void;
  onInsertShot: () => void;
  isOverlay?: boolean;
  className?: string;
  aspectRatio?: string;
  previewDimensions?: { width: number; imageHeight: number; gap: number } | null;
}

export const ShotCard: React.FC<ShotCardProps> = ({
  shot,
  onUpdate,
  onDelete,
  onAddSubShot,
  onInsertShot,
  isOverlay = false,
  className,
  aspectRatio = '16/9',
  previewDimensions = null
}) => {
  const { templateSettings } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const scriptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (actionTextareaRef.current) {
      actionTextareaRef.current.style.height = 'auto';
      actionTextareaRef.current.style.height = `${actionTextareaRef.current.scrollHeight}px`;
    }
  }, [shot.actionText]);

  useEffect(() => {
    if (scriptTextareaRef.current) {
      scriptTextareaRef.current.style.height = 'auto';
      scriptTextareaRef.current.style.height = `${scriptTextareaRef.current.scrollHeight}px`;
    }
  }, [shot.scriptText]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: shot.id,
    data: {
      type: 'Shot',
      shot
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  // Calculate aspect ratio for image container
  const getAspectRatioStyle = (ratio: string) => {
    const [width, height] = ratio.split('/').map(Number);
    return {
      aspectRatio: `${width} / ${height}`
    };
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    try {
      // Check if file is too large for base64 storage
      if (!shouldUseBase64(file)) {
        toast.warning(`Image too large (${(file.size / 1024).toFixed(1)}KB). Please use an image under ${MAX_BASE64_SIZE / 1024}KB.`);
        return;
      }

      // Show loading message for large images
      const isLargeImage = file.size > AUTO_COMPRESS_THRESHOLD;
      if (isLargeImage) {
        toast.info(`Compressing large image (${(file.size / 1024).toFixed(1)}KB)...`);
      }

      // Compress and convert to base64
      const compressedResult = await compressImage(file);
      
      // Update shot with both session file and persistent base64
      onUpdate({ 
        imageFile: file,           // For current session
        imageData: compressedResult.dataUrl, // For persistence
        imageSize: file.size,
        imageStorageType: 'base64'
      });
      
      setImageError(false);
      
      // Show appropriate success message
      if (compressedResult.wasCompressed) {
        toast.success(`Image auto-compressed from ${(compressedResult.originalSize / 1024).toFixed(1)}KB to ${(compressedResult.size / 1024).toFixed(1)}KB (${compressedResult.compressionRatio.toFixed(1)}x smaller)`);
      } else {
        toast.success(`Image added successfully`);
      }
    } catch (error) {
      console.error('Image processing failed:', error);
      toast.error('Failed to process image. Please try again.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleRemoveImage = () => {
    onUpdate({ 
      imageFile: null,
      imageData: undefined,
      imageUrl: undefined,
      imageSize: undefined,
      imageStorageType: undefined
    });
    setImageError(false);
  };

  const handleActionTextChange = (value: string) => {
    onUpdate({ actionText: value });
  };

  const handleScriptTextChange = (value: string) => {
    onUpdate({ scriptText: value });
  };

  return (
    <Card
      ref={setNodeRef}
      style={{
        ...style,
        ...(previewDimensions ? {
          width: `${previewDimensions.width}px`,
          flex: 'none',
          overflow: 'visible'
        } : {})
      }}
      className={cn(
        'group relative transition-all duration-200',
        'border-0',
        isDragging && 'opacity-50 rotate-2 shadow-lg',
        isOverlay && 'rotate-2 shadow-xl',
        'hover:shadow-md',
        shot.subShotGroupId && 'bg-blue-50/50',
        isDragOver && 'border-blue-400 bg-blue-50',
        className
      )}
      {...attributes}
    >
      {/* Drag Handle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 left-1/2 -translate-x-1/2 z-10 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="bg-blue-500 text-white rounded-full p-2 shadow-lg">
              <Move size={20} />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Move Shot</p>
        </TooltipContent>
      </Tooltip>

      {/* Shot Number */}
      <div className="shot-number-container">
        <div className="shot-number">
          {shot.number}
        </div>
      </div>

      {/* Delete Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2 z-10 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onDelete}
          >
            <X size={14} strokeWidth={3} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Delete Shot</p>
        </TooltipContent>
      </Tooltip>

      {/* Insert Shot Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            size="icon"
            className="absolute top-1/2 -translate-y-1/2 -left-5 z-10 h-8 w-8 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onInsertShot}
          >
            <Plus size={14} strokeWidth={3} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side='right'>
          <p>Insert Shot</p>
        </TooltipContent>
      </Tooltip>

      {/* Add Sub-Shot Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-1/2 -translate-y-1/2 right-2 z-10 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-600 hover:bg-gray-700 text-white"
            onClick={onAddSubShot}
          >
            <Plus size={14} strokeWidth={3} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side='left'>
          <p>Add Sub-Shot</p>
        </TooltipContent>
      </Tooltip>

      <CardContent className={cn('p-2')}>
        {/* Image Area with Aspect Ratio */}
        <div
          className={cn(
            'relative w-full border border-gray-200 rounded-sm bg-gray-100',
            'transition-all duration-200',
            isDragOver && 'border-blue-400 bg-blue-50',
            'hover:border-gray-400'
          )}
          style={previewDimensions ? {
            height: `${previewDimensions.imageHeight}px`
          } : getAspectRatioStyle(aspectRatio)}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {(() => {
            const imageSource = getImageSource(shot);
            return imageSource ? (
              <div className="relative w-full h-full group">
                <img
                  src={imageSource}
                  alt={`Shot ${shot.number}`}
                  className="w-full h-full object-cover rounded-sm"
                  onError={handleImageError}
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-end justify-center pb-4">
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white/90 hover:bg-white h-7 px-2 text-xs"
                    >
                      <Upload size={12} className="mr-1" />
                      New
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleRemoveImage}
                      className="bg-red-500/90 hover:bg-red-500 h-7 px-2 text-xs"
                    >
                      <X size={12} className="mr-1" />
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                className="w-full h-full flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:text-gray-700 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus size={32} className="mb-2" />
                <span className="text-sm font-medium">Add Image</span>
                <span className="text-xs text-gray-400 mt-1">
                  Drag & drop or click
                </span>
              </div>
            );
          })()}
        </div>

        {/* Text Fields Container */}
        {(templateSettings.showActionText || templateSettings.showScriptText) && (
          <div className={cn("flex flex-col gap-0", "mt-1")}>
            {/* Action Text */}
            {templateSettings.showActionText && (
              <Textarea
                ref={actionTextareaRef}
                placeholder="Action text..."
                value={shot.actionText}
                onChange={(e) => handleActionTextChange(e.target.value)}
                className={cn(
                  "w-full font-semibold resize-none overflow-hidden border-gray-100 rounded-sm bg-transparent focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-ring",
                  "text-xs px-1 py-0.5"
                )}
                maxLength={200}
                rows={1}
              />
            )}

            {/* Script Text */}
            {templateSettings.showScriptText && (
              <Textarea
                ref={scriptTextareaRef}
                placeholder="Script text..."
                value={shot.scriptText}
                onChange={(e) => handleScriptTextChange(e.target.value)}
                className={cn(
                  "w-full resize-none overflow-hidden border-gray-100 rounded-sm bg-transparent focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-ring",
                  "text-xs px-1 py-0.5"
                )}
                maxLength={200}
                rows={1}
              />
            )}
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </CardContent>
    </Card>
  );
};
