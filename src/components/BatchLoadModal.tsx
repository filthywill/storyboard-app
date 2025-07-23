import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileImage, AlertCircle, CheckCircle, X, Eye, ArrowRight, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  parseAndSortImageFiles, 
  processBatchImages, 
  generateBatchPreview,
  type ParsedImageFile,
  type BatchLoadResult 
} from '@/utils/batchImageLoader';
import { useAppStore } from '@/store';
import { toast } from 'sonner';

interface BatchLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  initialPosition?: number | null;
}

type LoadingState = 'idle' | 'processing' | 'complete' | 'error';


type StartingPosition = 'end' | 'specific';

export const BatchLoadModal: React.FC<BatchLoadModalProps> = ({
  isOpen,
  onClose,
  pageId,
  initialPosition
}) => {
  const { addShot, setTemplateSetting, templateSettings, updateShot, getPageShots, shots, shotOrder, deleteShot } = useAppStore();
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
    initialPosition !== null && initialPosition !== undefined ? 'specific' : 'end'
  );
  const [specificPosition, setSpecificPosition] = useState<number>(
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

  // Calculate target position based on user selection
  const calculateTargetPosition = useCallback(() => {
    const existingShots = getPageShots(pageId);
    
    switch (startingPosition) {
      case 'end':
        return existingShots.length;
      case 'specific':
        // For specific position, we want to insert at the exact position specified
        // If user says position 1, we want to insert at index 0 (before the first shot)
        return Math.max(0, Math.min(specificPosition - 1, existingShots.length));
      default:
        return existingShots.length;
    }
  }, [startingPosition, specificPosition, getPageShots, pageId]);

  // Get existing shots for preview
  const existingShots = getPageShots(pageId);
  const targetPosition = calculateTargetPosition();

  // Process and load images
  const handleBatchLoad = useCallback(async () => {
    if (parsedFiles.length === 0) return;

    setLoadingState('processing');
    setProgress({ current: 0, total: parsedFiles.length, currentFile: '' });

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

        // Create shots for successful images
        let createdCount = 0;
        
        for (const parsedFile of result.successful) {
          const compressedResult = (parsedFile as any).compressedResult;
          
          // Create shot at the target position
          const shotId = addShot(pageId, targetPosition + createdCount);
          
          // Update shot with image data
          updateShot(shotId, {
            imageFile: parsedFile.file,
            imageData: compressedResult.dataUrl,
            imageSize: parsedFile.file.size,
            imageStorageType: 'base64'
          });
          
          createdCount++;
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
    }
  }, [parsedFiles, pageId, addShot, setTemplateSetting, templateSettings.shotNumberFormat, targetPosition, updateShot]);

  // Reset modal state
  const handleClose = useCallback(() => {
    setSelectedFiles([]);
    setParsedFiles([]);
    setLoadingState('idle');
    setProgress({ current: 0, total: 0, currentFile: '' });
    setBatchResult(null);
    setShowPreview(false);
    setStartingPosition('end');
    setSpecificPosition(1);
    onClose();
  }, [onClose]);

  // Generate preview info
  const previewInfo = parsedFiles.length > 0 ? generateBatchPreview(parsedFiles) : null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl w-full">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Upload size={18} />
            Batch Load Images
          </DialogTitle>
        </DialogHeader>
        {/* File Selection */}
        {!showPreview && (
          <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg">
            <FileImage size={32} className="text-gray-400 mb-2" />
            <h3 className="text-lg font-semibold mb-1">Select Images to Load</h3>
            <p className="text-gray-600 text-center mb-3 text-sm">
              Choose multiple image files. The system will automatically detect numbering patterns and sort them appropriately.
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
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
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm">Files Selected</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{previewInfo.totalFiles}</div>
                   
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm">Number Range</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">
                      {previewInfo.numberRange ? 
                        `${previewInfo.numberRange.min}-${previewInfo.numberRange.max}` : 
                        'N/A'
                      }
                    </div>
                   
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm">Numbering Pattern</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">
                      {previewInfo.detectedPattern || 'None'}
                    </div>
                    
                  </CardContent>
                </Card>
              </div>

              {/* Load Options */}
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ArrowDown size={14} />
                    Load Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {/* Starting Position */}
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Starting Position</Label>
                    <RadioGroup value={startingPosition} onValueChange={(value) => setStartingPosition(value as StartingPosition)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="end" id="end" />
                        <Label htmlFor="end" className="text-xs">
                          End of current shots ({existingShots.length} total)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="specific" id="specific" />
                        <Label htmlFor="specific" className="text-xs">
                          Specific position
                        </Label>
                      </div>
                      {startingPosition === 'specific' && (
                        <div className="ml-6 flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            max={existingShots.length + 1}
                            value={specificPosition}
                            onChange={(e) => setSpecificPosition(parseInt(e.target.value) || 1)}
                            className="w-16 h-7 text-xs"
                            placeholder="1"
                          />
                          <span className="text-xs text-gray-500">
                            (1-{existingShots.length + 1})
                          </span>
                        </div>
                      )}

                    </RadioGroup>
                  </div>

                  {/* Preview of Impact */}
                  {existingShots.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Impact Preview</Label>
                      <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded">
                        <div className="font-medium">
                          <ArrowRight className="inline w-3 h-3 mr-1" />
                          {previewInfo.totalFiles} new shots will be inserted at position {targetPosition + 1}
                        </div>
                        <div className="text-gray-500">
                          Existing shots {targetPosition + 1}-{existingShots.length} will be pushed back
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* File List Preview */}
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye size={14} />
                    Load Order Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-20">
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {previewInfo.sortedNames.map((name, index) => (
                        <div 
                          key={index}
                          className="flex items-center gap-1 p-1 bg-gray-50 rounded"
                        >
                          <Badge variant="outline" className="text-xs px-1">
                            {index + 1}
                          </Badge>
                          <span className="truncate" title={name}>
                            {name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>


            </div>
          )}

        {/* Processing State */}
        {loadingState === 'processing' && (
          <div className="flex flex-col gap-3 p-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-1">Processing Images...</h3>
              <p className="text-gray-600 text-sm">
                {progress.current} of {progress.total}
              </p>
            </div>
            
            <Progress value={(progress.current / progress.total) * 100} className="w-full" />
            
            {progress.currentFile && (
              <p className="text-xs text-gray-500 text-center truncate">
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
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle size={16} />
                  <span className="font-semibold">{batchResult.successful.length} loaded</span>
                </div>
                {batchResult.failed.length > 0 && (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle size={16} />
                    <span className="font-semibold">{batchResult.failed.length} failed</span>
                  </div>
                )}
              </div>
              <Button onClick={handleClose} size="sm">
                Done
              </Button>
            </div>

            {/* Failed Files (if any) */}
            {batchResult.failed.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={14} className="text-red-600" />
                  <span className="text-sm font-medium text-red-800">Failed Files</span>
                </div>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {batchResult.failed.map((failure, index) => (
                    <div key={index} className="text-xs text-red-700">
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
            <AlertCircle size={24} className="text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-semibold mb-1">Processing Failed</h3>
            <p className="text-gray-600 mb-3 text-sm">
              There was an error processing your images. Please try again.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={() => setShowPreview(false)}>
                Choose Different Files
              </Button>
              <Button size="sm" onClick={() => setLoadingState('idle')}>
                Try Again
              </Button>
            </div>
          </div>
        )}
        {/* Action Buttons */}
        {showPreview && previewInfo && loadingState === 'idle' && (
          <div className="flex gap-2 justify-end pt-2 border-t mt-2">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Choose Different Files
            </Button>
            <Button onClick={handleBatchLoad}>
              Load {previewInfo.totalFiles} Images
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}; 