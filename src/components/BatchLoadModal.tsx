import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileImage, AlertCircle, CheckCircle, X, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getGlassmorphismStyles, getColor } from '@/styles/glassmorphism-styles';
import { 
  parseAndSortImageFiles, 
  processBatchImages, 
  generateBatchPreview,
  type ParsedImageFile,
  type BatchLoadResult 
} from '@/utils/batchImageLoader';
import { enableBatchMode, disableBatchMode } from '@/utils/autoSave';
import { formatShotNumber } from '@/utils/formatShotNumber';
import { useAppStore } from '@/store';
import { toast } from 'sonner';

interface BatchLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  initialPosition?: number | null;
}

type LoadingState = 'idle' | 'processing' | 'complete' | 'error';

type StartingPosition = 'start' | 'end' | 'custom';

export const BatchLoadModal: React.FC<BatchLoadModalProps> = ({
  isOpen,
  onClose,
  pageId,
  initialPosition
}) => {
  const { addShot, setTemplateSetting, templateSettings, updateShot, getPageShots, shots, shotOrder, deleteShot, pages } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State management
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [parsedFiles, setParsedFiles] = useState<ParsedImageFile[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0, currentFile: '' });
  const [batchResult, setBatchResult] = useState<BatchLoadResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Load options
  const [startingPosition, setStartingPosition] = useState<StartingPosition>(
    initialPosition !== null && initialPosition !== undefined ? 'custom' : 'end'
  );
  const [customPosition, setCustomPosition] = useState<number>(
    initialPosition !== null && initialPosition !== undefined ? initialPosition + 1 : 1
  );

  // File selection handler
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast.error('No image files found in selection');
      return;
    }

    if (imageFiles.length !== fileArray.length) {
      toast.warning(`${fileArray.length - imageFiles.length} non-image files were filtered out`);
    }

    setSelectedFiles(imageFiles);
    const parsed = parseAndSortImageFiles(imageFiles);
    setParsedFiles(parsed);
    setShowPreview(true);
    setLoadingState('idle');
    setBatchResult(null);
  }, []);

  // Get the target page for insertion based on user selection
  const getTargetPageForInsertion = useCallback(() => {
    if (startingPosition === 'start') {
      // Find the first page with shots, or the first page if no shots exist
      const firstPageWithShots = pages.find(page => page.shots.length > 0);
      return firstPageWithShots || pages[0];
    }
    
    if (startingPosition === 'custom') {
      // For custom position, find which page contains the target shot number
      const targetShotNumber = customPosition;
      
      // If custom position is 1, treat it as global start
      if (targetShotNumber === 1) {
        const firstPageWithShots = pages.find(page => page.shots.length > 0);
        return firstPageWithShots || pages[0];
      }
      
      // Format the target shot number using the project's shot number format
      const formattedShotNumber = formatShotNumber(targetShotNumber, templateSettings.shotNumberFormat);
      
      // Find which page contains the target shot number
      const targetPage = pages.find(page => {
        const pageShots = getPageShots(page.id);
        return pageShots.some(shot => shot.number === formattedShotNumber);
      });
      
      return targetPage || pages.find(page => page.id === pageId) || pages[0];
    }
    
    // For 'end' or default, use current page
    return pages.find(page => page.id === pageId) || pages[0];
  }, [startingPosition, customPosition, pages, getPageShots, pageId, templateSettings.shotNumberFormat]);

  // Calculate target position based on user selection
  const calculateTargetPosition = useCallback(() => {
    const targetPage = getTargetPageForInsertion();
    const targetPageShots = getPageShots(targetPage.id);
    
    switch (startingPosition) {
      case 'start':
        // Always insert at position 0 of the target page (first page with shots)
        return 0;
        
      case 'end':
        // Insert at the end of the current page
        const currentPageShotsEnd = getPageShots(pageId);
        return currentPageShotsEnd.length;
        
      case 'custom':
        // If custom position is 1, insert at position 0 of first page
        if (customPosition === 1) {
          return 0;
        }
        
        // Format the target shot number using the project's shot number format
        const targetShotNumber = formatShotNumber(customPosition, templateSettings.shotNumberFormat);
        const shotIndex = targetPageShots.findIndex(shot => shot.number === targetShotNumber);
        
        if (shotIndex !== -1) {
          return shotIndex; // Insert before the existing shot at this position
        }
        
        // If shot number not found, insert at the end of the target page
        return targetPageShots.length;
        
      default:
        const currentPageShotsDefault = getPageShots(pageId);
        return currentPageShotsDefault.length;
    }
  }, [startingPosition, customPosition, getPageShots, pageId, getTargetPageForInsertion, templateSettings.shotNumberFormat]);

  // Get target page and shots for preview
  const targetPage = getTargetPageForInsertion();
  const targetPosition = calculateTargetPosition();

  // For preview, we need to show the global shot order when inserting at start
  let existingShots;
  let previewTargetPosition;
  
  if (startingPosition === 'start') {
    // Show all shots in global order for accurate preview
    existingShots = shotOrder.map(shotId => shots[shotId]).filter(Boolean);
    previewTargetPosition = 0; // Always start at position 0 for global start
  } else {
    // For other insertion types, use the target page shots
    existingShots = getPageShots(targetPage.id);
    previewTargetPosition = targetPosition;
  }


  // Helper function to queue batch images for background cloud upload
  const queueBatchImageForCloud = async (shotId: string, file: File): Promise<void> => {
    try {
      const isCloudEnabled = import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true';
      const { useAuthStore } = await import('@/store/authStore');
      const { isAuthenticated } = useAuthStore.getState();
      
      if (isCloudEnabled && isAuthenticated) {
        const { BackgroundSyncService } = await import('@/services/backgroundSyncService');
        const { useProjectManagerStore } = await import('@/store/projectManagerStore');
        const { currentProjectId } = useProjectManagerStore.getState();
        
        if (currentProjectId) {
          BackgroundSyncService.queueImageUpload(currentProjectId, shotId, file);
          console.log(`Queued batch image upload for shot ${shotId}`);
        }
      }
    } catch (error) {
      console.warn('Failed to queue batch image for cloud upload:', error);
    }
  };

  // Process and load images
  const handleBatchLoad = useCallback(async () => {
    if (parsedFiles.length === 0) return;

    setLoadingState('processing');
    setProgress({ current: 0, total: parsedFiles.length, currentFile: '' });

    // Enable batch mode to prevent auto-save during bulk operations
    enableBatchMode();

    try {
      const result = await processBatchImages(
        parsedFiles,
        (current, total, currentFile) => {
          setProgress({ current, total, currentFile });
        }
      );

      setBatchResult(result);

      if (result.successful.length > 0) {
        // Update shot number format if a pattern was detected
        if (result.numberingPattern && result.numberingPattern !== templateSettings.shotNumberFormat) {
          setTemplateSetting('shotNumberFormat', result.numberingPattern);
          toast.info(`Shot numbering format updated to "${result.numberingPattern}" based on detected pattern`);
        }

        // Determine the target page and position for insertion
        const targetPage = getTargetPageForInsertion();
        const targetPageId = targetPage.id;
        const targetIndex = calculateTargetPosition();

        // Create shots for successful images
        let createdCount = 0;
        
        // For global start insertion, we need to handle the global shot order
        if (startingPosition === 'start') {
          // Get all shots in global order
          const allShots = shotOrder.map(shotId => shots[shotId]).filter(Boolean);
          
          // Check cloud availability for storage type
          const isCloudEnabled = import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true';
          const { useAuthStore } = await import('@/store/authStore');
          const { isAuthenticated } = useAuthStore.getState();
          const storageType = (isCloudEnabled && isAuthenticated) ? 'local-pending-sync' : 'base64';
          
          for (const parsedFile of result.successful) {
            const compressedResult = (parsedFile as any).compressedResult;
            const globalIndex = createdCount; // Insert at global position createdCount
            
            if (globalIndex < allShots.length) {
              // Update existing shot with image data
              const existingShot = allShots[globalIndex];
              
              // INSTANT: Save locally first
              updateShot(existingShot.id, {
                imageFile: parsedFile.file,
                imageData: compressedResult.dataUrl,
                imageSize: parsedFile.file.size,
                imageStorageType: storageType,
                cloudSyncStatus: (isCloudEnabled && isAuthenticated) ? 'pending' : undefined,
                cloudSyncRetries: 0
              });
              
              // BACKGROUND: Queue cloud upload
              if (isCloudEnabled && isAuthenticated) {
                await queueBatchImageForCloud(existingShot.id, parsedFile.file);
              }
            } else {
              // Create new shot at the global position
              const targetPageForShot = pages.find(page => {
                const pageShots = getPageShots(page.id);
                return pageShots.length > 0;
              }) || pages[0];
              
              const shotId = addShot(targetPageForShot.id, globalIndex);
              
              // INSTANT: Save locally first
              updateShot(shotId, {
                imageFile: parsedFile.file,
                imageData: compressedResult.dataUrl,
                imageSize: parsedFile.file.size,
                imageStorageType: storageType,
                cloudSyncStatus: (isCloudEnabled && isAuthenticated) ? 'pending' : undefined,
                cloudSyncRetries: 0
              });
              
              // BACKGROUND: Queue cloud upload
              if (isCloudEnabled && isAuthenticated) {
                await queueBatchImageForCloud(shotId, parsedFile.file);
              }
            }
            
            createdCount++;
          }
        } else {
          // For other insertion types, use the original logic
          // Check cloud availability for storage type
          const isCloudEnabled = import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true';
          const { useAuthStore } = await import('@/store/authStore');
          const { isAuthenticated } = useAuthStore.getState();
          const storageType = (isCloudEnabled && isAuthenticated) ? 'local-pending-sync' : 'base64';
          
          for (const parsedFile of result.successful) {
            const compressedResult = (parsedFile as any).compressedResult;
            
            // Create shot at the target position
            const shotId = addShot(targetPageId, targetIndex + createdCount);
            
            // INSTANT: Save locally first
            updateShot(shotId, {
              imageFile: parsedFile.file,
              imageData: compressedResult.dataUrl,
              imageSize: parsedFile.file.size,
              imageStorageType: storageType,
              cloudSyncStatus: (isCloudEnabled && isAuthenticated) ? 'pending' : undefined,
              cloudSyncRetries: 0
            });
            
            // BACKGROUND: Queue cloud upload
            if (isCloudEnabled && isAuthenticated) {
              await queueBatchImageForCloud(shotId, parsedFile.file);
            }
            
            createdCount++;
          }
        }

        toast.success(`Successfully loaded ${createdCount} images`);
        
        if (result.failed.length > 0) {
          toast.warning(`${result.failed.length} images failed to load`);
        }
      }

      setLoadingState('complete');

    } catch (error) {
      console.error('Batch load failed:', error);
      toast.error('Batch load failed. Please try again.');
      setLoadingState('error');
    } finally {
      // Disable batch mode and trigger a single auto-save for all changes
      disableBatchMode();
    }
  }, [parsedFiles, pageId, addShot, setTemplateSetting, templateSettings.shotNumberFormat, targetPosition, updateShot, startingPosition, pages, getTargetPageForInsertion, calculateTargetPosition]);

  // Reset modal state
  const handleClose = useCallback(() => {
    setSelectedFiles([]);
    setParsedFiles([]);
    setLoadingState('idle');
    setProgress({ current: 0, total: 0, currentFile: '' });
    setBatchResult(null);
    setShowPreview(false);
    setStartingPosition('end');
    setCustomPosition(1);
    onClose();
  }, [onClose]);

  // Generate preview info
  const previewInfo = parsedFiles.length > 0 ? generateBatchPreview(parsedFiles) : null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl w-full" style={getGlassmorphismStyles('dark')}>
        <DialogHeader className="pb-2">
          <DialogTitle 
            className="flex items-center gap-2 text-lg"
            style={{ color: getColor('text', 'primary') as string }}
          >
            <Upload size={18} />
            Batch Load Images
          </DialogTitle>
          <DialogDescription style={{ color: getColor('text', 'secondary') as string }}>
            Upload multiple images to create storyboard shots quickly
          </DialogDescription>
        </DialogHeader>
        {/* File Selection */}
        {!showPreview && (
          <div 
            className="flex flex-col items-center justify-center p-4 rounded-lg"
            style={{ 
              border: `2px dashed ${getColor('border', 'dashed') as string}`,
              backgroundColor: getColor('background', 'lighter') as string
            }}
          >
            <FileImage size={32} className="mb-2" style={{ color: getColor('text', 'muted') as string }} />
            <h3 className="text-lg font-semibold mb-1" style={{ color: getColor('text', 'primary') as string }}>
              Select Images to Load
            </h3>
            <p className="text-center mb-3 text-sm" style={{ color: getColor('text', 'secondary') as string }}>
              Choose multiple image files. The system will automatically detect numbering patterns and sort them appropriately.
            </p>
            <Button 
              onClick={() => fileInputRef.current?.click()}
              style={getGlassmorphismStyles('buttonAccent')}
            >
              <Upload size={16} className="mr-2" />
              Choose Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>
        )}

        {/* Preview and Analysis */}
        {showPreview && previewInfo && loadingState === 'idle' && (
          <div className="flex flex-col gap-1">
            <div className="grid grid-cols-4 gap-1">
                <Card style={getGlassmorphismStyles('background')}>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm" style={{ color: getColor('text', 'secondary') as string }}>
                      Files Selected
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold" style={{ color: getColor('text', 'primary') as string }}>
                      {previewInfo.totalFiles}
                    </div>
                  </CardContent>
                </Card>

                <Card style={getGlassmorphismStyles('background')}>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm" style={{ color: getColor('text', 'secondary') as string }}>
                      Number Range
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold" style={{ color: getColor('text', 'primary') as string }}>
                      {previewInfo.numberRange ? 
                        `${previewInfo.numberRange.min}-${previewInfo.numberRange.max}` : 
                        'N/A'
                      }
                    </div>
                  </CardContent>
                </Card>

                <Card style={getGlassmorphismStyles('background')}>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm" style={{ color: getColor('text', 'secondary') as string }}>
                      Numbering Pattern
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold" style={{ color: getColor('text', 'primary') as string }}>
                      {previewInfo.detectedPattern || 'None'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Image Preview */}
              {parsedFiles.length > 0 && (
                <Card style={getGlassmorphismStyles('background')}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm" style={{ color: getColor('text', 'secondary') as string }}>
                      Image Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {parsedFiles.map((parsedFile, index) => {
                        const targetShotIndex = previewTargetPosition + index;
                        const targetShot = existingShots[targetShotIndex];
                        const isUpdate = targetShot && targetShotIndex < existingShots.length;
                        const isCreate = !targetShot || targetShotIndex >= existingShots.length;
                        
                        return (
                          <div 
                            key={index} 
                            className="flex items-center gap-3 p-2 rounded-lg"
                            style={{ border: `1px solid ${getColor('border', 'primary') as string}` }}
                          >
                            {/* Image Thumbnail */}
                            <div 
                              className="w-12 h-12 rounded flex items-center justify-center overflow-hidden"
                              style={{ 
                                backgroundColor: getColor('background', 'subtle') as string,
                                border: `1px solid ${getColor('border', 'primary') as string}`
                              }}
                            >
                              <img 
                                src={URL.createObjectURL(parsedFile.file)} 
                                alt={parsedFile.originalName}
                                className="w-full h-full object-cover"
                                onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                              />
                            </div>
                            
                            {/* File Info */}
                            <div className="flex-1 min-w-0">
                              <div 
                                className="text-sm font-medium truncate"
                                style={{ color: getColor('text', 'primary') as string }}
                              >
                                {parsedFile.originalName}
                              </div>
                              <div 
                                className="text-xs"
                                style={{ color: getColor('text', 'muted') as string }}
                              >
                                {parsedFile.parsedNumber ? `Number: ${parsedFile.numberString}` : 'No number detected'}
                              </div>
                            </div>
                            
                            {/* Shot Assignment */}
                            <div className="flex items-center gap-2">
                              <div 
                                className="px-2 py-1 rounded text-xs font-medium"
                                style={{
                                  backgroundColor: isUpdate 
                                    ? getColor('status', 'statusBadgeBlue') as string 
                                    : getColor('status', 'statusBadgeGreen') as string,
                                  color: isUpdate 
                                    ? getColor('status', 'statusBadgeBlueText') as string 
                                    : getColor('status', 'statusBadgeGreenText') as string
                                }}
                              >
                                {isUpdate ? `Update Shot ${targetShot?.number || formatShotNumber(targetShotIndex + 1, templateSettings.shotNumberFormat)}` : `Create Shot ${formatShotNumber(targetShotIndex + 1, templateSettings.shotNumberFormat)}`}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Operation Summary */}
              <Card style={getGlassmorphismStyles('background')}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm" style={{ color: getColor('text', 'secondary') as string }}>
                    Operation Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm" style={{ color: getColor('text', 'primary') as string }}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getColor('status', 'statusBadgeBlue') as string }}
                      ></div>
                      <span>Will update: {Math.min(parsedFiles.length, existingShots.length)} existing shots</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getColor('status', 'statusBadgeGreen') as string }}
                      ></div>
                      <span>Will create: {Math.max(0, parsedFiles.length - existingShots.length)} new shots</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Load Options */}
              <Card style={getGlassmorphismStyles('background')}>
                <CardHeader className="pb-1">
                  <CardTitle 
                    className="text-sm flex items-center gap-2"
                    style={{ color: getColor('text', 'secondary') as string }}
                  >
                    <ArrowDown size={14} />
                    Load Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <RadioGroup value={startingPosition} onValueChange={(value) => setStartingPosition(value as StartingPosition)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="start" id="start" />
                      <Label 
                        htmlFor="start" 
                        className="text-xs"
                        style={{ color: getColor('text', 'primary') as string }}
                      >
                        Insert at Start
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="end" id="end" />
                      <Label 
                        htmlFor="end" 
                        className="text-xs"
                        style={{ color: getColor('text', 'primary') as string }}
                      >
                        Insert at End
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="custom" />
                      <Label 
                        htmlFor="custom" 
                        className="text-xs"
                        style={{ color: getColor('text', 'primary') as string }}
                      >
                        Custom
                      </Label>
                    </div>
                    {startingPosition === 'custom' && (
                      <div className="ml-6 flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max={existingShots.length + 1}
                          value={customPosition}
                          onChange={(e) => setCustomPosition(parseInt(e.target.value) || 1)}
                          className="w-16 h-7 text-xs"
                          placeholder="1"
                          style={{
                            backgroundColor: getColor('input', 'background') as string,
                            border: `1px solid ${getColor('input', 'border') as string}`,
                            color: getColor('text', 'primary') as string
                          }}
                        />
                        <span 
                          className="text-xs"
                          style={{ color: getColor('text', 'muted') as string }}
                        >
                          (1-{existingShots.length + 1})
                        </span>
                      </div>
                    )}
                  </RadioGroup>
                </CardContent>
              </Card>
            </div>
          )}

        {/* Processing State */}
        {loadingState === 'processing' && (
          <div className="flex flex-col gap-3 p-4">
            <div className="text-center">
              <h3 
                className="text-lg font-semibold mb-1"
                style={{ color: getColor('text', 'primary') as string }}
              >
                Processing Images...
              </h3>
              <p 
                className="text-sm"
                style={{ color: getColor('text', 'secondary') as string }}
              >
                {progress.current} of {progress.total}
              </p>
            </div>
            
            <Progress value={(progress.current / progress.total) * 100} className="w-full" />
            
            {progress.currentFile && (
              <p 
                className="text-xs text-center truncate"
                style={{ color: getColor('text', 'muted') as string }}
              >
                {progress.currentFile}
              </p>
            )}
          </div>
        )}

        {/* Results */}
        {loadingState === 'complete' && batchResult && (
          <div className="flex flex-col gap-3 p-4">
            {/* Summary Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="flex items-center gap-2"
                  style={{ color: getColor('status', 'statusBadgeGreenText') as string }}
                >
                  <CheckCircle size={16} />
                  <span className="font-semibold">{batchResult.successful.length} loaded</span>
                </div>
                {batchResult.failed.length > 0 && (
                  <div 
                    className="flex items-center gap-2"
                    style={{ color: getColor('status', 'statusBadgeRedText') as string }}
                  >
                    <AlertCircle size={16} />
                    <span className="font-semibold">{batchResult.failed.length} failed</span>
                  </div>
                )}
              </div>
              <Button 
                onClick={handleClose} 
                size="sm"
                style={getGlassmorphismStyles('buttonAccent')}
              >
                Done
              </Button>
            </div>

            {/* Failed Files (if any) */}
            {batchResult.failed.length > 0 && (
              <div 
                className="rounded-md p-3"
                style={{
                  backgroundColor: getColor('status', 'statusBadgeRed') as string,
                  border: `1px solid ${getColor('border', 'primary') as string}`
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle 
                    size={14} 
                    style={{ color: getColor('status', 'statusBadgeRedText') as string }}
                  />
                  <span 
                    className="text-sm font-medium"
                    style={{ color: getColor('status', 'statusBadgeRedText') as string }}
                  >
                    Failed Files
                  </span>
                </div>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {batchResult.failed.map((failure, index) => (
                    <div 
                      key={index} 
                      className="text-xs"
                      style={{ color: getColor('status', 'statusBadgeRedText') as string }}
                    >
                      <span className="font-medium">{failure.file.name}:</span> {failure.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {loadingState === 'error' && (
          <div className="text-center p-4">
            <AlertCircle 
              size={24} 
              className="mx-auto mb-2"
              style={{ color: getColor('status', 'statusBadgeRedText') as string }}
            />
            <h3 
              className="text-lg font-semibold mb-1"
              style={{ color: getColor('text', 'primary') as string }}
            >
              Processing Failed
            </h3>
            <p 
              className="mb-3 text-sm"
              style={{ color: getColor('text', 'secondary') as string }}
            >
              There was an error processing your images. Please try again.
            </p>
            <div className="flex gap-2 justify-center">
              <Button 
                size="sm" 
                onClick={() => setShowPreview(false)}
                style={getGlassmorphismStyles('button')}
              >
                Choose Different Files
              </Button>
              <Button 
                size="sm" 
                onClick={() => setLoadingState('idle')}
                style={getGlassmorphismStyles('buttonAccent')}
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
        {/* Action Buttons */}
        {showPreview && previewInfo && loadingState === 'idle' && (
          <div 
            className="flex gap-2 justify-end pt-2 mt-2"
            style={{ borderTop: `1px solid ${getColor('border', 'primary') as string}` }}
          >
            <Button 
              onClick={() => setShowPreview(false)}
              style={getGlassmorphismStyles('button')}
            >
              Choose Different Files
            </Button>
            <Button 
              onClick={handleBatchLoad}
              style={getGlassmorphismStyles('buttonAccent')}
            >
              Load {previewInfo.totalFiles} Images
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};