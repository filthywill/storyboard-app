import { useRef, useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Shot, useAppStore } from '@/store';
import { Move, Plus, X, Upload, FolderOpen, Pen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { compressImage, getImageSource, revokeImageObjectURL, shouldUseBase64, MAX_BASE64_SIZE, AUTO_COMPRESS_THRESHOLD } from '@/utils/imageCompression';
import { toast } from 'sonner';
import { SecurityNotificationService } from '@/services/securityNotificationService';
import { getColor } from '@/styles/glassmorphism-styles';

interface ShotCardProps {
  shot: Shot;
  onUpdate: (updates: Partial<Shot>) => void;
  onDelete: () => void;
  onAddSubShot: () => void;
  onInsertShot: () => void;
  onInsertBatch?: () => void;
  onEditImage?: () => void;
  isOverlay?: boolean;
  isEditing?: boolean;
  onEditUpdate?: (updates: Partial<Shot>) => void;
  isImageEditor?: boolean;
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
  onInsertBatch,
  onEditImage,
  isOverlay = false,
  isEditing = false,
  onEditUpdate,
  isImageEditor = false,
  className,
  aspectRatio = '16/9',
  previewDimensions = null
}) => {
  const { templateSettings, storyboardTheme } = useAppStore();
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

    // Security validation for image upload
    if (!SecurityNotificationService.validateImageUpload(file)) {
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
    <div
      ref={setNodeRef}
      style={{
        ...style,
        ...(previewDimensions ? {
          width: `${previewDimensions.width}px`,
          flex: 'none',
          overflow: 'visible'
        } : {}),
        ...(shot.subShotGroupId ? { backgroundColor: getColor('interaction', 'hover') as string } : {}),
        ...(isDragOver ? { 
          borderColor: `${getColor('interaction', 'active')} !important` as string,
          backgroundColor: getColor('interaction', 'hover') as string 
        } : {}),
        // Use CSS variables so our protection rule can reference them
        ['--inline-bg-color' as any]: storyboardTheme.shotCard.backgroundEnabled ? storyboardTheme.shotCard.background : 'transparent',
        ['--inline-border-color' as any]: storyboardTheme.shotCard.borderEnabled ? storyboardTheme.shotCard.border : 'transparent',
        ['--inline-border-width' as any]: storyboardTheme.shotCard.borderEnabled ? `${storyboardTheme.shotCard.borderWidth}px` : '0px',
        ['--inline-border-style' as any]: storyboardTheme.shotCard.borderEnabled ? 'solid' : 'none',
        ['--inline-border-radius' as any]: `${storyboardTheme.shotCard.borderRadius}px`,
      }}
      className={cn(
        'group relative transition-all duration-200 shot-card storyboard-themeable',
        isDragging && 'opacity-50 rotate-2 shadow-lg',
        isOverlay && 'rotate-2 shadow-xl',
        'hover:shadow-md',
        className
      )}
      {...attributes}
    >
      {/* Drag Handle - Hide in Image Editor */}
      {!isImageEditor && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              {...attributes}
              {...listeners}
              className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
            >
            <div 
              className="rounded-full p-2 shadow-lg"
              style={{
                backgroundColor: getColor('overlayButton', 'blue') as string,
                color: getColor('text', 'inverse') as string
              }}
            >
              <Move size={20} />
            </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Move Shot</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Shot Number */}
      <div className="shot-number-container">
        <div 
          className="shot-number storyboard-themeable" 
          style={{ 
            ['--inline-text-color' as any]: storyboardTheme.shotNumber.text,
            ['--inline-bg-color' as any]: storyboardTheme.shotNumber.background,
            ['--inline-border-color' as any]: storyboardTheme.shotNumber.borderEnabled ? storyboardTheme.shotNumber.border : 'transparent',
            ['--inline-border-width' as any]: storyboardTheme.shotNumber.borderEnabled ? `${storyboardTheme.shotNumber.borderWidth}px` : '0px',
            ['--inline-border-style' as any]: storyboardTheme.shotNumber.borderEnabled ? 'solid' : 'none',
            ['--inline-border-radius' as any]: `${storyboardTheme.shotNumber.borderRadius}px`,
          }}
        >
          {shot.number}
        </div>
      </div>

      {/* Delete Button - Hide in Image Editor */}
      {!isImageEditor && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              className="absolute top-1 right-1 z-10 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                backgroundColor: getColor('button', 'destructive') as string,
                color: getColor('button', 'destructiveText') as string,
                border: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = getColor('button', 'destructiveHover') as string;
                e.currentTarget.style.color = getColor('button', 'destructiveTextHover') as string;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = getColor('button', 'destructive') as string;
                e.currentTarget.style.color = getColor('button', 'destructiveText') as string;
              }}
              onClick={onDelete}
            >
              <X size={14} strokeWidth={3} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delete Shot</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Insert Batch Button - Hide in Image Editor */}
      {!isImageEditor && onInsertBatch && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="icon"
              className="absolute top-1/2 -translate-y-1/2 -left-5 z-10 h-8 w-8 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ 
                top: 'calc(50% - 2rem)',
                backgroundColor: getColor('overlayButton', 'purple') as string,
                color: getColor('text', 'inverse') as string
              }}
              onClick={onInsertBatch}
            >
              <FolderOpen size={14} strokeWidth={3} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side='right'>
            <p>Insert Batch</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Insert Shot Button - Hide in Image Editor */}
      {!isImageEditor && (
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
      )}

      {/* Add Sub-Shot Button - Hide in Image Editor */}
      {!isImageEditor && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-1/2 -translate-y-1/2 right-2 z-10 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                backgroundColor: getColor('overlayButton', 'gray') as string,
                color: getColor('text', 'inverse') as string
              }}
              onClick={onAddSubShot}
            >
              <Plus size={14} strokeWidth={3} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side='left'>
            <p>Add Sub-Shot</p>
          </TooltipContent>
        </Tooltip>
      )}

      <div className={cn('p-2')}>
        {/* Image Area with Aspect Ratio */}
        <div
          className={cn(
            'relative w-full',
            'transition-all duration-200'
          )}
          style={{
            ...(previewDimensions ? {
              height: `${previewDimensions.imageHeight}px`
            } : getAspectRatioStyle(aspectRatio)),
            borderRadius: `${storyboardTheme.shotCard.borderRadius}px`,
            backgroundColor: isDragOver 
              ? getColor('interaction', 'hover') as string 
              : getColor('background', 'lighter') as string
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {(() => {
            const imageSource = getImageSource(shot);
            
            // Calculate actual pixel offsets from percentage values
            // Offsets are stored as percentages (0.0 to 1.0) relative to container size
            // This makes them aspect-ratio-relative and grid-layout-independent
            const containerWidth = previewDimensions ? 
              previewDimensions.width - 18 : // Account for card padding (8*2) and border (1*2)
              300; // Fallback default
            const containerHeight = previewDimensions ? 
              previewDimensions.imageHeight :
              169; // Fallback default for 16:9
            
            // Convert percentage offsets to pixels for CSS transform
            const actualOffsetX = (shot.imageOffsetX || 0) * containerWidth;
            const actualOffsetY = (shot.imageOffsetY || 0) * containerHeight;
            
            
            return imageSource ? (
              <div 
                className="relative w-full h-full group overflow-hidden"
                style={{
                  borderRadius: `${storyboardTheme.shotCard.borderRadius}px`
                }}
              >
                <img
                  src={imageSource}
                  alt={`Shot ${shot.number}`}
                  className="w-full h-full object-cover"
                  style={{
                    borderRadius: `${storyboardTheme.shotCard.borderRadius}px`,
                    transform: `scale(${shot.imageScale || 1.0}) translate(${actualOffsetX}px, ${actualOffsetY}px)`,
                    transformOrigin: 'center center',
                    border: 'none',
                    boxShadow: 'none',
                    outline: 'none'
                  }}
                  onError={handleImageError}
                />
                {/* Editing mode overlay - only show if onEditUpdate is provided (inline editing) */}
                {isEditing && onEditUpdate && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
                  >
                    <div 
                      className="p-4 rounded-lg shadow-lg max-w-xs"
                      style={{ backgroundColor: getColor('background', 'primary') as string }}
                    >
                      <div className="space-y-4">
                        <h3 
                          className="font-medium text-sm text-center"
                          style={{ color: getColor('text', 'primary') as string }}
                        >Image Editor</h3>
                        
                        {/* Zoom control */}
                        <div className="space-y-2">
                          <label 
                            className="text-xs"
                            style={{ color: getColor('text', 'secondary') as string }}
                          >
                            Zoom: {Math.round((shot.imageScale || 1) * 100)}%
                          </label>
                          <input
                            type="range"
                            min="0.1"
                            max="4.0"
                            step="0.1"
                            value={shot.imageScale || 1}
                            onChange={(e) => onEditUpdate?.({
                              imageScale: parseFloat(e.target.value)
                            })}
                            className="w-full"
                          />
                        </div>
                        
                        {/* Position X control */}
                        <div className="space-y-2">
                          <label 
                            className="text-xs"
                            style={{ color: getColor('text', 'secondary') as string }}
                          >
                            Position X: {shot.imageOffsetX || 0}px
                          </label>
                          <input
                            type="range"
                            min="-200"
                            max="200"
                            step="1"
                            value={shot.imageOffsetX || 0}
                            onChange={(e) => onEditUpdate?.({
                              imageOffsetX: parseInt(e.target.value)
                            })}
                            className="w-full"
                          />
                        </div>
                        
                        {/* Position Y control */}
                        <div className="space-y-2">
                          <label 
                            className="text-xs"
                            style={{ color: getColor('text', 'secondary') as string }}
                          >
                            Position Y: {shot.imageOffsetY || 0}px
                          </label>
                          <input
                            type="range"
                            min="-200"
                            max="200"
                            step="1"
                            value={shot.imageOffsetY || 0}
                            onChange={(e) => onEditUpdate?.({
                              imageOffsetY: parseInt(e.target.value)
                            })}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Normal hover overlay (only show when not editing and not in image editor) */}
                {!isEditing && !isImageEditor && (
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                  >
                    {/* Edit button in center */}
                    {onEditImage && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Button
                          variant="default"
                          size="icon"
                          onClick={onEditImage}
                          className="h-12 w-12 rounded-full shadow-lg"
                          style={{
                            backgroundColor: getColor('overlayButton', 'blue') as string,
                            color: getColor('text', 'inverse') as string
                          }}
                          title="Click to edit image"
                        >
                          <Pen size={20} />
                        </Button>
                      </div>
                    )}
                    
                    {/* Bottom buttons */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-7 px-2 text-xs"
                          style={{
                            backgroundColor: getColor('overlayButton', 'white') as string,
                            color: getColor('text', 'dark') as string
                          }}
                        >
                          <Upload size={12} className="mr-1" />
                          New
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleRemoveImage}
                          className="h-7 px-2 text-xs"
                          style={{
                            backgroundColor: getColor('overlayButton', 'red') as string,
                            color: getColor('text', 'inverse') as string
                          }}
                        >
                          <X size={12} className="mr-1" />
                          Clear
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div 
                className="w-full h-full flex flex-col items-center justify-center cursor-pointer transition-colors"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  color: getColor('text', 'primary') as string,
                  borderRadius: `${storyboardTheme.shotCard.borderRadius}px`
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus size={32} className="mb-2" />
                <span className="text-sm font-medium">Add Image</span>
                <span className="text-xs mt-1">
                  Drag & drop or click
                </span>
              </div>
            );
          })()}
          
          {/* Border overlay - Always renders, styled by theme */}
          <div
            className="absolute pointer-events-none"
            style={{
              // Expand border container slightly to prevent image bleed-through
              // BORDER OVERLAY EXPANSION - Change -0.1px to adjust (more negative = larger expansion)
              top: '-0.75px',
              right: '-0.75px',
              bottom: '-0.75px',
              left: '-0.75px',
              borderRadius: `${storyboardTheme.shotCard.borderRadius}px`,
              border: storyboardTheme.imageFrame.borderEnabled
                ? `${storyboardTheme.imageFrame.borderWidth}px solid ${isDragOver ? getColor('interaction', 'active') : storyboardTheme.imageFrame.border}`
                : 'none'
            }}
          />
        </div>

        {/* Text Fields Container - Hide in Image Editor */}
        {!isImageEditor && (templateSettings.showActionText || templateSettings.showScriptText) && (
          <div className={cn("flex flex-col gap-0", "mt-1")}>
            {/* Action Text */}
            {templateSettings.showActionText && (
              <Textarea
                ref={actionTextareaRef}
                placeholder="Action text..."
                value={shot.actionText}
                onChange={(e) => handleActionTextChange(e.target.value)}
                className={cn(
                  "w-full font-semibold resize-none overflow-hidden border-0 rounded-sm bg-transparent focus:outline-none focus:ring-0",
                  "text-xs px-1 py-0.5 action-text"
                )}
                style={{ 
                  color: storyboardTheme.actionText.text,
                  ['--placeholder-color' as any]: storyboardTheme.actionText.text
                }}
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
                  "w-full resize-none overflow-hidden border-0 rounded-sm bg-transparent focus:outline-none focus:ring-0",
                  "text-xs px-1 py-0.5 script-text"
                )}
                style={{ 
                  color: storyboardTheme.scriptText.text,
                  ['--placeholder-color' as any]: storyboardTheme.scriptText.text
                }}
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
      </div>
    </div>
  );
};
