import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, AlertCircle, CheckCircle, X, ArrowDown, Clipboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getGlassmorphismStyles, getColor } from '@/styles/glassmorphism-styles';
import { enableBatchMode, disableBatchMode } from '@/utils/autoSave';
import { formatShotNumber } from '@/utils/formatShotNumber';
import { useAppStore } from '@/store';
import { toast } from 'sonner';

interface ShotListLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  initialPosition?: number | null;
}

interface ParsedShotText {
  number: number | null;
  numberString: string | null;
  text: string;
  originalLine: string;
}

interface ShotListLoadResult {
  successful: ParsedShotText[];
  failed: { line: string; error: string }[];
  totalProcessed: number;
}

type LoadingState = 'idle' | 'processing' | 'complete' | 'error';
type StartingPosition = 'start' | 'end' | 'custom';
type InputMode = 'file' | 'paste';
type ParseMode = 'numbers' | 'lineBreaks';

export const ShotListLoadModal: React.FC<ShotListLoadModalProps> = ({
  isOpen,
  onClose,
  pageId,
  initialPosition
}) => {
  const { addShot, setTemplateSetting, templateSettings, updateShot, getPageShots, shots, shotOrder, pages } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State management
  const [inputMode, setInputMode] = useState<InputMode>('paste');
  const [parseMode, setParseMode] = useState<ParseMode>('numbers');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [parsedShots, setParsedShots] = useState<ParsedShotText[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0, currentLine: '' });
  const [loadResult, setLoadResult] = useState<ShotListLoadResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Load options
  const [startingPosition, setStartingPosition] = useState<StartingPosition>(
    initialPosition !== null && initialPosition !== undefined ? 'custom' : 'end'
  );
  const [customPosition, setCustomPosition] = useState<number>(
    initialPosition !== null && initialPosition !== undefined ? initialPosition + 1 : 1
  );

  // Parse text lines into shot data
  const parseShotText = (text: string, mode: ParseMode): ParsedShotText[] => {
    const lines = text.split('\n');
    const parsed: ParsedShotText[] = [];

    // Support patterns like: 01 Text, 01. Text, 01: Text, 01) Text
    const numberLineRegex = /^(\d+)[\.:\-)\s]*\s*(.*)$/;

    for (const rawLine of lines) {
      const line = rawLine.replace(/\r$/, '');
      const trimmed = line.trim();
      if (!trimmed) {
        // Preserve paragraph breaks inside the current shot (Numbers mode)
        if (mode === 'numbers' && parsed.length > 0) {
          parsed[parsed.length - 1].text = `${parsed[parsed.length - 1].text}\n`;
          parsed[parsed.length - 1].originalLine = `${parsed[parsed.length - 1].originalLine}\n`;
        }
        continue;
      }

      if (mode === 'numbers') {
        const match = trimmed.match(numberLineRegex);
        if (match) {
          const numberString = match[1];
          const rest = match[2] ? match[2].trim() : '';
          const number = parseInt(numberString, 10);
          parsed.push({ number, numberString, text: rest, originalLine: trimmed });
        } else if (parsed.length > 0) {
          // Append continuation lines to the current shot text
          const sep = parsed[parsed.length - 1].text ? ' ' : '';
          parsed[parsed.length - 1].text = `${parsed[parsed.length - 1].text}${sep}${trimmed}`.trim();
          parsed[parsed.length - 1].originalLine = `${parsed[parsed.length - 1].originalLine}\n${trimmed}`;
        } else {
          // If text begins without a leading number, treat as first shot text
          parsed.push({ number: null, numberString: null, text: trimmed, originalLine: trimmed });
        }
        continue;
      }

      // Line Breaks mode: each non-empty line is a shot
      parsed.push({ number: null, numberString: null, text: trimmed, originalLine: trimmed });
    }

    return parsed.filter(s => s.text && s.text.trim());
  };

  // File selection handler
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('text/') && !file.name.endsWith('.txt')) {
      toast.error('Please select a text file');
      return;
    }

    setSelectedFile(file);
    setInputMode('file');
    
    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsed = parseShotText(content, parseMode);
      setSourceText(content);
      setParsedShots(parsed);
      setShowPreview(true);
      setLoadingState('idle');
      setLoadResult(null);
    };
    reader.readAsText(file);
  }, []);

  // Paste text handler
  const handlePasteText = useCallback(() => {
    if (!pastedText.trim()) {
      toast.error('Please enter some text');
      return;
    }

    // Default to Numbers on first continue
    setParseMode('numbers');
    const parsed = parseShotText(pastedText, 'numbers');
    setSourceText(pastedText);
    setParsedShots(parsed);
    setShowPreview(true);
    setLoadingState('idle');
    setLoadResult(null);
  }, [pastedText, parseMode]);

  // Change parse mode while previewing and re-parse using original source
  const handlePreviewParseModeChange = useCallback((v: string) => {
    const value = v as ParseMode;
    setParseMode(value);
    const text = sourceText.trim();
    if (!text) return;
    const parsed = parseShotText(text, value);
    setParsedShots(parsed);
    setLoadingState('idle');
    setLoadResult(null);
  }, [sourceText]);

  // Get the target page for insertion based on user selection
  const getTargetPageForInsertion = useCallback(() => {
    if (startingPosition === 'start') {
      const firstPageWithShots = pages.find(page => page.shots.length > 0);
      return firstPageWithShots || pages[0];
    }
    
    if (startingPosition === 'custom') {
      const targetShotNumber = customPosition;
      
      if (targetShotNumber === 1) {
        const firstPageWithShots = pages.find(page => page.shots.length > 0);
        return firstPageWithShots || pages[0];
      }
      
      const formattedShotNumber = formatShotNumber(targetShotNumber, templateSettings.shotNumberFormat);
      const targetPage = pages.find(page => {
        const pageShots = getPageShots(page.id);
        return pageShots.some(shot => shot.number === formattedShotNumber);
      });
      
      return targetPage || pages.find(page => page.id === pageId) || pages[0];
    }
    
    return pages.find(page => page.id === pageId) || pages[0];
  }, [startingPosition, customPosition, pages, getPageShots, pageId, templateSettings.shotNumberFormat]);

  // Calculate target position based on user selection
  const calculateTargetPosition = useCallback(() => {
    const targetPage = getTargetPageForInsertion();
    const targetPageShots = getPageShots(targetPage.id);
    
    switch (startingPosition) {
      case 'start':
        return 0;
        
      case 'end':
        const currentPageShotsEnd = getPageShots(pageId);
        return currentPageShotsEnd.length;
        
      case 'custom':
        if (customPosition === 1) {
          return 0;
        }
        
        const targetShotNumber = formatShotNumber(customPosition, templateSettings.shotNumberFormat);
        const shotIndex = targetPageShots.findIndex(shot => shot.number === targetShotNumber);
        
        if (shotIndex !== -1) {
          return shotIndex;
        }
        
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
    existingShots = shotOrder.map(shotId => shots[shotId]).filter(Boolean);
    previewTargetPosition = 0;
  } else {
    existingShots = getPageShots(targetPage.id);
    previewTargetPosition = targetPosition;
  }

  // Process and load shot text
  const handleShotListLoad = useCallback(async () => {
    if (parsedShots.length === 0) return;

    setLoadingState('processing');
    setProgress({ current: 0, total: parsedShots.length, currentLine: '' });

    // Enable batch mode to prevent auto-save during bulk operations
    enableBatchMode();

    try {
      const successful: ParsedShotText[] = [];
      const failed: { line: string; error: string }[] = [];

      // Process each parsed shot
      for (let i = 0; i < parsedShots.length; i++) {
        const parsedShot = parsedShots[i];
        setProgress({ current: i + 1, total: parsedShots.length, currentLine: parsedShot.originalLine });

        try {
          if (startingPosition === 'start') {
            // Get all shots in global order
            const allShots = shotOrder.map(shotId => shots[shotId]).filter(Boolean);
            const globalIndex = i;
            
            if (globalIndex < allShots.length) {
              // Update existing shot with text data
              const existingShot = allShots[globalIndex];
              updateShot(existingShot.id, {
                actionText: parsedShot.text
              });
            } else {
              // Create new shot at the global position
              const targetPageForShot = pages.find(page => {
                const pageShots = getPageShots(page.id);
                return pageShots.length > 0;
              }) || pages[0];
              
              const shotId = addShot(targetPageForShot.id, globalIndex);
              updateShot(shotId, {
                actionText: parsedShot.text
              });
            }
          } else {
            // For other insertion types, use the target page
            const targetPageId = targetPage.id;
            const targetIndex = calculateTargetPosition();
            
            const shotId = addShot(targetPageId, targetIndex + i);
            updateShot(shotId, {
              actionText: parsedShot.text
            });
          }
          
          successful.push(parsedShot);
        } catch (error) {
          failed.push({
            line: parsedShot.originalLine,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const result: ShotListLoadResult = {
        successful,
        failed,
        totalProcessed: parsedShots.length
      };

      setLoadResult(result);
      setLoadingState('complete');

      toast.success(`Successfully loaded ${successful.length} shot texts`);
      
      if (failed.length > 0) {
        toast.warning(`${failed.length} shots failed to load`);
      }

    } catch (error) {
      console.error('Shot list load failed:', error);
      toast.error('Shot list load failed. Please try again.');
      setLoadingState('error');
    } finally {
      // Disable batch mode and trigger a single auto-save for all changes
      disableBatchMode();
    }
  }, [parsedShots, pageId, addShot, updateShot, startingPosition, pages, getTargetPageForInsertion, calculateTargetPosition, shotOrder, shots, getPageShots]);

  // Reset modal state
  const handleClose = useCallback(() => {
    setSelectedFile(null);
    setPastedText('');
    setParsedShots([]);
    setLoadingState('idle');
    setProgress({ current: 0, total: 0, currentLine: '' });
    setLoadResult(null);
    setShowPreview(false);
    setStartingPosition('end');
    setCustomPosition(1);
    setInputMode('paste');
    onClose();
  }, [onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl w-full" style={getGlassmorphismStyles('dark')}>
        <DialogHeader className="pb-2">
          <DialogTitle 
            className="flex items-center gap-2 text-lg"
            style={{ color: getColor('text', 'primary') as string }}
          >
            <FileText size={18} />
            Load Shot List
          </DialogTitle>
          <DialogDescription style={{ color: getColor('text', 'secondary') as string }}>
            Import shot text data from a file or paste text directly
          </DialogDescription>
        </DialogHeader>

        {/* Input Selection */}
        {!showPreview && (
          <div className="space-y-4">
            {/* Input Mode Selection */}
            <div className="space-y-2">
              <Label 
                className="text-sm font-medium"
                style={{ color: getColor('text', 'primary') as string }}
              >
                Input Method
              </Label>
              <RadioGroup value={inputMode} onValueChange={(value) => setInputMode(value as InputMode)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="paste" id="paste" />
                  <Label 
                    htmlFor="paste" 
                    className="text-sm"
                    style={{ color: getColor('text', 'primary') as string }}
                  >
                    Paste Text
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="file" id="file" />
                  <Label 
                    htmlFor="file" 
                    className="text-sm"
                    style={{ color: getColor('text', 'primary') as string }}
                  >
                    Upload File
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Paste Text Input */}
            {inputMode === 'paste' && (
              <div className="space-y-2">
                <Label 
                  htmlFor="pasted-text"
                  style={{ color: getColor('text', 'primary') as string }}
                >
                  Shot Text (one per line, optionally prefixed with numbers)
                </Label>
                <Textarea
                  id="pasted-text"
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="1. Opening shot of the protagonist&#10;2. Close-up of the door handle&#10;3. Wide shot of the room&#10;..."
                  className="min-h-32"
                  style={{
                    backgroundColor: getColor('input', 'background') as string,
                    border: `1px solid ${getColor('input', 'border') as string}`,
                    color: getColor('text', 'primary') as string
                  }}
                />
                <Button 
                  onClick={handlePasteText} 
                  disabled={!pastedText.trim()}
                  style={getGlassmorphismStyles('buttonAccent')}
                >
                  <Clipboard size={16} className="mr-2" />
                  Continue
                </Button>
              </div>
            )}

            {/* File Upload Input */}
            {inputMode === 'file' && (
              <div 
                className="flex flex-col items-center justify-center p-4 rounded-lg"
                style={{ 
                  border: `2px dashed ${getColor('border', 'dashed') as string}`,
                  backgroundColor: getColor('background', 'lighter') as string
                }}
              >
                <FileText size={32} className="mb-2" style={{ color: getColor('text', 'muted') as string }} />
                <h3 className="text-lg font-semibold mb-1" style={{ color: getColor('text', 'primary') as string }}>
                  Select Text File
                </h3>
                <p className="text-center mb-3 text-sm" style={{ color: getColor('text', 'secondary') as string }}>
                  Choose a text file containing shot descriptions. Each line will be treated as one shot. Supported formats: .txt, .csv (rows treated as lines), .md.
                </p>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  style={getGlassmorphismStyles('buttonAccent')}
                >
                  <Upload size={16} className="mr-2" />
                  Choose File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv,.md,text/plain,text/markdown"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
              </div>
            )}
          </div>
        )}

        {/* Preview and Analysis */}
        {showPreview && parsedShots.length > 0 && loadingState === 'idle' && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-3 gap-1">
              <Card style={getGlassmorphismStyles('background')}>
                <CardHeader className="pb-1 pt-2 px-3">
                  <CardTitle className="text-sm" style={{ color: getColor('text', 'secondary') as string }}>
                    Shots Found
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-2">
                  <div className="text-xl font-bold" style={{ color: getColor('text', 'primary') as string }}>
                    {parsedShots.length}
                  </div>
                </CardContent>
              </Card>

              <Card style={getGlassmorphismStyles('background')}>
                <CardHeader className="pb-1 pt-2 px-3">
                  <CardTitle className="text-sm" style={{ color: getColor('text', 'secondary') as string }}>
                    With Numbers
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-2">
                  <div className="text-xl font-bold" style={{ color: getColor('text', 'primary') as string }}>
                    {parsedShots.filter(s => s.number !== null).length}
                  </div>
                </CardContent>
              </Card>

              <Card style={getGlassmorphismStyles('background')}>
                <CardHeader className="pb-1 pt-2 px-3">
                  <CardTitle className="text-sm" style={{ color: getColor('text', 'secondary') as string }}>
                    Text Only
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-2">
                  <div className="text-xl font-bold" style={{ color: getColor('text', 'primary') as string }}>
                    {parsedShots.filter(s => s.number === null).length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Parse mode toggle (Preview) */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Label 
                  className="text-xs"
                  style={{ color: getColor('text', 'primary') as string }}
                >
                  Parse As
                </Label>
                <RadioGroup value={parseMode} onValueChange={handlePreviewParseModeChange} className="flex flex-row gap-3">
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="numbers" id="parse-numbers-preview" />
                    <Label 
                      htmlFor="parse-numbers-preview" 
                      className="text-xs"
                      style={{ color: getColor('text', 'primary') as string }}
                    >
                      Numbers
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="lineBreaks" id="parse-linebreaks-preview" />
                    <Label 
                      htmlFor="parse-linebreaks-preview" 
                      className="text-xs"
                      style={{ color: getColor('text', 'primary') as string }}
                    >
                      Line Breaks
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Shot Preview */}
            <Card style={getGlassmorphismStyles('background')}>
              <CardHeader className="pb-1 pt-2 px-3">
                <CardTitle className="text-sm" style={{ color: getColor('text', 'secondary') as string }}>
                  Shot Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1 px-3 pb-2">
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {parsedShots.map((parsedShot, index) => {
                    const targetShotIndex = previewTargetPosition + index;
                    const targetShot = existingShots[targetShotIndex];
                    const isUpdate = targetShot && targetShotIndex < existingShots.length;
                    const isCreate = !targetShot || targetShotIndex >= existingShots.length;
                    
                    return (
                      <div 
                        key={index} 
                        className="flex items-center gap-3 p-2 rounded-md"
                        style={{ border: `1px solid ${getColor('border', 'primary') as string}` }}
                      >
                        {/* Shot Info */}
                        <div className="flex-1 min-w-0">
                          <div 
                            className="text-sm font-medium truncate"
                            style={{ color: getColor('text', 'primary') as string }}
                          >
                            {parseMode === 'numbers' && parsedShot.numberString ? `#${parsedShot.numberString}` : ''}
                          </div>
                          <div 
                            className="text-xs truncate"
                            style={{ color: getColor('text', 'muted') as string }}
                          >
                            {parsedShot.text}
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

            {/* Load Options */}
            <Card style={getGlassmorphismStyles('background')}>
              <CardHeader className="pb-1 pt-2 px-3">
                <CardTitle 
                  className="text-sm flex items-center gap-2"
                  style={{ color: getColor('text', 'secondary') as string }}
                >
                  <ArrowDown size={14} />
                  Load Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0 px-3 pb-2">
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
                Processing Shot Text...
              </h3>
              <p 
                className="text-sm"
                style={{ color: getColor('text', 'secondary') as string }}
              >
                {progress.current} of {progress.total}
              </p>
            </div>
            
            <Progress value={(progress.current / progress.total) * 100} className="w-full" />
            
            {progress.currentLine && (
              <p 
                className="text-xs text-center truncate"
                style={{ color: getColor('text', 'muted') as string }}
              >
                {progress.currentLine}
              </p>
            )}
          </div>
        )}

        {/* Results */}
        {loadingState === 'complete' && loadResult && (
          <div className="flex flex-col gap-3 p-4">
            {/* Summary Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="flex items-center gap-2"
                  style={{ color: getColor('status', 'statusBadgeGreenText') as string }}
                >
                  <CheckCircle size={16} />
                  <span className="font-semibold">{loadResult.successful.length} loaded</span>
                </div>
                {loadResult.failed.length > 0 && (
                  <div 
                    className="flex items-center gap-2"
                    style={{ color: getColor('status', 'statusBadgeRedText') as string }}
                  >
                    <AlertCircle size={16} />
                    <span className="font-semibold">{loadResult.failed.length} failed</span>
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

            {/* Failed Lines (if any) */}
            {loadResult.failed.length > 0 && (
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
                    Failed Lines
                  </span>
                </div>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {loadResult.failed.map((failure, index) => (
                    <div 
                      key={index} 
                      className="text-xs"
                      style={{ color: getColor('status', 'statusBadgeRedText') as string }}
                    >
                      <span className="font-medium">{failure.line}:</span> {failure.error}
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
              There was an error processing your shot text. Please try again.
            </p>
            <div className="flex gap-2 justify-center">
              <Button 
                size="sm" 
                onClick={() => setShowPreview(false)}
                style={getGlassmorphismStyles('button')}
              >
                Choose Different Text
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
        {showPreview && parsedShots.length > 0 && loadingState === 'idle' && (
          <div 
            className="flex gap-2 justify-end pt-2 mt-2"
            style={{ borderTop: `1px solid ${getColor('border', 'primary') as string}` }}
          >
            <Button 
              onClick={() => setShowPreview(false)}
              style={getGlassmorphismStyles('button')}
            >
              Choose Different Text
            </Button>
            <Button 
              onClick={handleShotListLoad}
              style={getGlassmorphismStyles('buttonAccent')}
            >
              Load {parsedShots.length} Shots
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
