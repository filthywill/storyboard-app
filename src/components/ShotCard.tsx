import { useRef, useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Shot, useAppStore } from '@/store';
import { Move, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { compressImage, getImageSource, revokeImageObjectURL, shouldAllowImageUpload, getImageUploadLimitMessage, AUTO_COMPRESS_THRESHOLD } from '@/utils/imageCompression';
import { toast } from 'sonner';
import { SecurityNotificationService } from '@/services/securityNotificationService';
import { getColor } from '@/styles/glassmorphism-styles';
import { getShotTextSpacing } from '@/styles/storyboardTheme';
import type { ServerPDFExportPayload } from '@/utils/types/exportTypes';

interface ShotCardProps {
  shot: Shot;
  onUpdate: (updates: Partial<Shot>) => void;
  onDelete: () => void;
  onAddSubShot: () => void;
  onInsertShot: () => void;
  onEditImage?: () => void;
  isOverlay?: boolean;
  isEditing?: boolean;
  onEditUpdate?: (updates: Partial<Shot>) => void;
  isImageEditor?: boolean;
  readOnly?: boolean;
  className?: string;
  aspectRatio?: string;
  previewDimensions?: { width: number; imageHeight: number; gap: number } | null;
  exportPayload?: ServerPDFExportPayload;
}

const ConnectedShotCard: React.FC<ShotCardProps> = ({
  shot,
  onUpdate,
  onDelete,
  onAddSubShot,
  onInsertShot,
  onEditImage,
  isOverlay = false,
  isEditing = false,
  onEditUpdate,
  isImageEditor = false,
  readOnly = false,
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
  const actionTextSpacing = getShotTextSpacing(storyboardTheme.actionText.fontSize);
  const scriptTextSpacing = getShotTextSpacing(storyboardTheme.scriptText.fontSize);

  useEffect(() => {
    const animationFrame = requestAnimationFrame(() => {
      if (actionTextareaRef.current) {
        actionTextareaRef.current.style.height = 'auto';
        actionTextareaRef.current.style.height = `${actionTextareaRef.current.scrollHeight}px`;
      }
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [shot.actionText, actionTextSpacing.fontSize, actionTextSpacing.blockPaddingY, templateSettings.showActionText]);

  useEffect(() => {
    const animationFrame = requestAnimationFrame(() => {
      if (scriptTextareaRef.current) {
        scriptTextareaRef.current.style.height = 'auto';
        scriptTextareaRef.current.style.height = `${scriptTextareaRef.current.scrollHeight}px`;
      }
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [shot.scriptText, scriptTextSpacing.fontSize, scriptTextSpacing.blockPaddingY, templateSettings.showScriptText]);

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
    },
    disabled: readOnly
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
      // Check if the original file is too large to enter compression.
      if (!shouldAllowImageUpload(file)) {
        toast.warning(getImageUploadLimitMessage(file));
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
        imageUrl: undefined,       // Replacing an image invalidates any previous cloud URL
        imageSize: file.size,
        imageStorageType: 'base64'
      });
      if (import.meta.env.DEV) {
        const { logSingleImageUploadDiagnostics } = await import('@/utils/storyboardDiagnostics');
        logSingleImageUploadDiagnostics({ file, compressedResult, shotId: shot.id });
      }
      
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
      {...(readOnly ? {} : attributes)}
    >
      {/* Drag Handle - Hide in Image Editor */}
      {!isImageEditor && !readOnly && (
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
      {!isImageEditor && !readOnly && (
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
          onDrop={readOnly ? undefined : handleDrop}
          onDragOver={readOnly ? undefined : handleDragOver}
          onDragLeave={readOnly ? undefined : handleDragLeave}
        >
          {(() => {
            const imageSource = getImageSource(shot);
            
            // Calculate actual offsets in pixels from percentage values
            const containerWidth = previewDimensions ? previewDimensions.width : 300;
            const containerHeight = previewDimensions ? previewDimensions.imageHeight : 169;
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
                    {/* Center action buttons */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        {onEditImage && (
                          <Button
                            variant="secondary"
                            onClick={onEditImage}
                            className="h-7 px-2 text-xs"
                            style={{
                              backgroundColor: getColor('brand', 'fourth') as string,
                              color: getColor('text', 'inverse') as string
                            }}
                            title="Click to edit image"
                          >
                            Edit Image
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-7 px-2 text-xs"
                          style={{
                            backgroundColor: getColor('brand', 'secondary') as string,
                            color: getColor('text', 'inverse') as string
                          }}
                        >
                          Replace Image
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
                onClick={() => {
                  if (!readOnly) {
                    fileInputRef.current?.click();
                  }
                }}
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

          {/* Insert Shot Button - Hide in Image Editor */}
          {!isImageEditor && !readOnly && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className="absolute top-1/2 -translate-y-1/2 -left-5 z-10 h-8 w-8 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    backgroundColor: getColor('brand', 'primary') as string,
                    color: getColor('text', 'inverse') as string
                  }}
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
          {!isImageEditor && !readOnly && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-1/2 -translate-y-1/2 -right-2 z-10 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    backgroundColor: getColor('overlayButton', 'blue') as string,
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
        </div>

        {/* Text Fields Container - Hide in Image Editor */}
        {!isImageEditor && (templateSettings.showActionText || templateSettings.showScriptText) && (
          <div className={cn("flex flex-col gap-0", "mt-1")}>
            {/* Action Text */}
            {templateSettings.showActionText && (
              readOnly ? (
                <div
                  className={cn(
                    "w-full font-semibold border-0 rounded-sm bg-transparent",
                    "text-xs px-1 py-0.5 action-text whitespace-pre-wrap"
                  )}
                  style={{
                    color: storyboardTheme.actionText.text,
                    fontSize: `${actionTextSpacing.fontSize}px`,
                    lineHeight: actionTextSpacing.lineHeight,
                    paddingTop: `${actionTextSpacing.blockPaddingY}px`,
                    paddingBottom: `${actionTextSpacing.blockPaddingY}px`
                  }}
                >
                  {shot.actionText || ''}
                </div>
              ) : (
                <Textarea
                  ref={actionTextareaRef}
                  placeholder="Action text..."
                  value={shot.actionText}
                  onChange={(e) => handleActionTextChange(e.target.value)}
                  readOnly={readOnly}
                  className={cn(
                    "w-full font-semibold resize-none overflow-hidden border-0 rounded-sm bg-transparent focus:outline-none focus:ring-0",
                    "text-xs px-1 py-0.5 action-text"
                  )}
                  style={{ 
                    color: storyboardTheme.actionText.text,
                    fontSize: `${actionTextSpacing.fontSize}px`,
                    lineHeight: actionTextSpacing.lineHeight,
                    paddingTop: `${actionTextSpacing.blockPaddingY}px`,
                    paddingBottom: `${actionTextSpacing.blockPaddingY}px`,
                    ['--placeholder-color' as any]: storyboardTheme.actionText.text
                  }}
                  maxLength={200}
                  rows={1}
                />
              )
            )}

            {/* Script Text */}
            {templateSettings.showScriptText && (
              readOnly ? (
                <div
                  className={cn(
                    "w-full border-0 rounded-sm bg-transparent",
                    "text-xs px-1 py-0.5 script-text whitespace-pre-wrap"
                  )}
                  style={{
                    color: storyboardTheme.scriptText.text,
                    fontSize: `${scriptTextSpacing.fontSize}px`,
                    lineHeight: scriptTextSpacing.lineHeight,
                    paddingTop: `${scriptTextSpacing.blockPaddingY}px`,
                    paddingBottom: `${scriptTextSpacing.blockPaddingY}px`
                  }}
                >
                  {shot.scriptText || ''}
                </div>
              ) : (
                <Textarea
                  ref={scriptTextareaRef}
                  placeholder="Script text..."
                  value={shot.scriptText}
                  onChange={(e) => handleScriptTextChange(e.target.value)}
                  readOnly={readOnly}
                  className={cn(
                    "w-full resize-none overflow-hidden border-0 rounded-sm bg-transparent focus:outline-none focus:ring-0",
                    "text-xs px-1 py-0.5 script-text"
                  )}
                  style={{ 
                    color: storyboardTheme.scriptText.text,
                    fontSize: `${scriptTextSpacing.fontSize}px`,
                    lineHeight: scriptTextSpacing.lineHeight,
                    paddingTop: `${scriptTextSpacing.blockPaddingY}px`,
                    paddingBottom: `${scriptTextSpacing.blockPaddingY}px`,
                    ['--placeholder-color' as any]: storyboardTheme.scriptText.text
                  }}
                  maxLength={200}
                  rows={1}
                />
              )
            )}
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (!readOnly) {
              handleFileSelect(e.target.files);
            }
          }}
        />
      </div>
    </div>
  );
};

const ExportShotCard: React.FC<ShotCardProps> = ({
  shot,
  previewDimensions = null,
  exportPayload,
}) => {
  if (!exportPayload || !previewDimensions) {
    return null;
  }

  const { template, theme } = exportPayload;
  const imageSource = getImageSource(shot);
  const containerWidth = previewDimensions.width;
  const containerHeight = previewDimensions.imageHeight;
  const actualOffsetX = (shot.imageOffsetX || 0) * containerWidth;
  const actualOffsetY = (shot.imageOffsetY || 0) * containerHeight;
  const actionTextSpacing = getShotTextSpacing(theme.actionText.fontSize);
  const scriptTextSpacing = getShotTextSpacing(theme.scriptText.fontSize);

  return (
    <div
      style={{
        width: `${previewDimensions.width}px`,
        flex: 'none',
        overflow: 'visible',
        ['--inline-bg-color' as any]: theme.shotCard.backgroundEnabled ? theme.shotCard.background : 'transparent',
        ['--inline-border-color' as any]: theme.shotCard.borderEnabled ? theme.shotCard.border : 'transparent',
        ['--inline-border-width' as any]: theme.shotCard.borderEnabled ? `${theme.shotCard.borderWidth}px` : '0px',
        ['--inline-border-style' as any]: theme.shotCard.borderEnabled ? 'solid' : 'none',
        ['--inline-border-radius' as any]: `${theme.shotCard.borderRadius}px`,
      }}
      className={cn('group relative transition-all duration-200 shot-card storyboard-themeable')}
    >
      <div className="shot-number-container">
        <div
          className="shot-number storyboard-themeable"
          style={{
            ['--inline-text-color' as any]: theme.shotNumber.text,
            ['--inline-bg-color' as any]: theme.shotNumber.background,
            ['--inline-border-color' as any]: theme.shotNumber.borderEnabled ? theme.shotNumber.border : 'transparent',
            ['--inline-border-width' as any]: theme.shotNumber.borderEnabled ? `${theme.shotNumber.borderWidth}px` : '0px',
            ['--inline-border-style' as any]: theme.shotNumber.borderEnabled ? 'solid' : 'none',
            ['--inline-border-radius' as any]: `${theme.shotNumber.borderRadius}px`,
          }}
        >
          {shot.number}
        </div>
      </div>

      <div className={cn('p-2')}>
        <div
          className={cn('relative w-full')}
          style={{
            height: `${previewDimensions.imageHeight}px`,
            borderRadius: `${theme.shotCard.borderRadius}px`,
            backgroundColor: getColor('background', 'lighter') as string
          }}
        >
          {imageSource ? (
            <div
              className="relative w-full h-full overflow-hidden"
              style={{
                borderRadius: `${theme.shotCard.borderRadius}px`
              }}
            >
              <img
                src={imageSource}
                alt={`Shot ${shot.number}`}
                className="w-full h-full object-cover"
                style={{
                  borderRadius: `${theme.shotCard.borderRadius}px`,
                  transform: `scale(${shot.imageScale || 1.0}) translate(${actualOffsetX}px, ${actualOffsetY}px)`,
                  transformOrigin: 'center center',
                  border: 'none',
                  boxShadow: 'none',
                  outline: 'none'
                }}
              />
            </div>
          ) : null}

          <div
            className="absolute pointer-events-none"
            style={{
              top: '-0.75px',
              right: '-0.75px',
              bottom: '-0.75px',
              left: '-0.75px',
              borderRadius: `${theme.shotCard.borderRadius}px`,
              border: theme.imageFrame.borderEnabled
                ? `${theme.imageFrame.borderWidth}px solid ${theme.imageFrame.border}`
                : 'none'
            }}
          />
        </div>

        {(template.showActionText || template.showScriptText) && (
          <div className={cn("flex flex-col gap-0", "mt-1")}>
            {template.showActionText && (
              <div
                className={cn(
                  "w-full font-semibold border-0 rounded-sm bg-transparent",
                  "text-xs px-1 py-0.5 action-text whitespace-pre-wrap"
                )}
                style={{
                  color: theme.actionText.text,
                  fontSize: `${actionTextSpacing.fontSize}px`,
                  lineHeight: actionTextSpacing.lineHeight,
                  paddingTop: `${actionTextSpacing.blockPaddingY}px`,
                  paddingBottom: `${actionTextSpacing.blockPaddingY}px`
                }}
              >
                {shot.actionText || ''}
              </div>
            )}

            {template.showScriptText && (
              <div
                className={cn(
                  "w-full border-0 rounded-sm bg-transparent",
                  "text-xs px-1 py-0.5 script-text whitespace-pre-wrap"
                )}
                style={{
                  color: theme.scriptText.text,
                  fontSize: `${scriptTextSpacing.fontSize}px`,
                  lineHeight: scriptTextSpacing.lineHeight,
                  paddingTop: `${scriptTextSpacing.blockPaddingY}px`,
                  paddingBottom: `${scriptTextSpacing.blockPaddingY}px`
                }}
              >
                {shot.scriptText || ''}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const ShotCard: React.FC<ShotCardProps> = (props) => {
  if (props.exportPayload) {
    return <ExportShotCard {...props} />;
  }

  return <ConnectedShotCard {...props} />;
};
