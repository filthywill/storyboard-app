import { useState } from 'react';
import { useAppStore } from '@/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { exportManager } from '@/utils/export/exportManager';

export interface PDFExportOptions {
  paperSize: 'letter' | 'canvas';
  pages: 'all' | 'current' | 'range';
  pageRange?: { start: number; end: number };
}

interface PDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPageIndex: number;
}

export function PDFExportModal({ isOpen, onClose, currentPageIndex }: PDFExportModalProps) {
  const { 
    pages, 
    activePageId,
    startNumber,
    projectName,
    projectInfo,
    projectLogoUrl,
    projectLogoFile,
    clientAgency,
    jobInfo,
    templateSettings,
    getPageShots
  } = useAppStore();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{current: number; total: number; pageName: string} | null>(null);
  
  const [options, setOptions] = useState<PDFExportOptions>({
    paperSize: 'letter',
    pages: 'all',
    pageRange: { start: 1, end: pages.length }
  });

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // Determine which pages to export
      let pagesToExport = pages;
      if (options.pages === 'current') {
        pagesToExport = [pages[currentPageIndex]];
      } else if (options.pages === 'range' && options.pageRange) {
        const { start, end } = options.pageRange;
        pagesToExport = pages.slice(start - 1, end);
      }

      if (pagesToExport.length === 0) {
        toast({
          title: 'No pages to export',
          description: 'Please select valid pages to export.',
          variant: 'destructive'
        });
        return;
      }

      // Convert new format to old format for export compatibility
      const legacyPages = pagesToExport.map(page => ({
        ...page,
        shots: getPageShots(page.id)
      }));

      // Create storyboard state object for export
      const storyboardState = {
        pages: pages.map(page => ({
          ...page,
          shots: getPageShots(page.id)
        })),
        activePageId,
        startNumber,
        projectName,
        projectInfo,
        projectLogoUrl,
        projectLogoFile,
        clientAgency,
        jobInfo,
        isDragging: false,
        isExporting: true,
        showDeleteConfirmation: true,
        templateSettings
      };

      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const filename = `storyboard_${timestamp}.pdf`;

      // Export PDF using DOM capture system with progress tracking
      await exportManager.downloadPDF(
        legacyPages,
        storyboardState,
        filename,
        options,
        (current, total, pageName) => {
          setExportProgress({ current, total, pageName });
        }
      );
      
      toast({
        title: 'PDF Export Successful',
        description: `Exported ${pagesToExport.length} page(s) to ${filename}`,
      });
      
      onClose();
      
    } catch (error) {
      console.error('PDF export failed:', error);
      toast({
        title: 'PDF Export Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const updateOptions = (key: keyof PDFExportOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const updatePageRange = (field: 'start' | 'end', value: number) => {
    setOptions(prev => ({
      ...prev,
      pageRange: {
        ...prev.pageRange!,
        [field]: Math.max(1, Math.min(pages.length, value))
      }
    }));
  };


  const getSelectedPageCount = () => {
    if (options.pages === 'all') return pages.length;
    if (options.pages === 'current') return 1;
    if (options.pages === 'range' && options.pageRange) {
      return Math.max(0, options.pageRange.end - options.pageRange.start + 1);
    }
    return 0;
  };

  const isValidRange = () => {
    if (options.pages !== 'range' || !options.pageRange) return true;
    const { start, end } = options.pageRange;
    return start >= 1 && end <= pages.length && start <= end;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export as PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Page Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Pages to Export</Label>
            <RadioGroup
              value={options.pages}
              onValueChange={(value) => updateOptions('pages', value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all-pages" />
                <Label htmlFor="all-pages">All Pages ({pages.length})</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="current" id="current-page" />
                <Label htmlFor="current-page">
                  Current Page ({currentPageIndex + 1}: {pages[currentPageIndex]?.name || 'Untitled'})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="range" id="page-range" />
                <Label htmlFor="page-range">Page Range</Label>
              </div>
            </RadioGroup>

            {options.pages === 'range' && (
              <div className="ml-6 flex items-center gap-2">
                <Label htmlFor="start-page">From:</Label>
                <input
                  id="start-page"
                  type="number"
                  min="1"
                  max={pages.length}
                  value={options.pageRange?.start || 1}
                  onChange={(e) => updatePageRange('start', parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1 border rounded text-sm"
                />
                <Label htmlFor="end-page">To:</Label>
                <input
                  id="end-page"
                  type="number"
                  min="1"
                  max={pages.length}
                  value={options.pageRange?.end || pages.length}
                  onChange={(e) => updatePageRange('end', parseInt(e.target.value) || pages.length)}
                  className="w-16 px-2 py-1 border rounded text-sm"
                />
                <Badge variant={isValidRange() ? 'default' : 'destructive'}>
                  {getSelectedPageCount()} page(s)
                </Badge>
              </div>
            )}
          </div>

          {/* Paper Settings */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Export Settings</Label>
            <div className="space-y-2">
              <Label htmlFor="paper-size">Paper Size</Label>
              <Select
                value={options.paperSize}
                onValueChange={(value) => updateOptions('paperSize', value)}
              >
                <SelectTrigger id="paper-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="letter">8.5" × 11" (Standard)</SelectItem>
                  <SelectItem value="canvas">Canvas (Exact Layout)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Export Summary */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Exporting {getSelectedPageCount()} page(s) as PDF.
              {options.paperSize === 'canvas' && (
                <div className="mt-1 text-amber-600">
                  Canvas mode preserves exact layout and scaling.
                </div>
              )}
              {options.paperSize === 'letter' && (
                <div className="mt-1 text-blue-600">
                  Standard 8.5" × 11" format with optimized quality.
                </div>
              )}
            </AlertDescription>
          </Alert>

          {!isValidRange() && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Invalid page range. Please select a valid range between 1 and {pages.length}.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || !isValidRange()}
            className="min-w-[100px]"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
      
      {/* Export Progress Overlay - Fullscreen to hide page switching */}
      {exportProgress && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                <div>
                  <h3 className="font-semibold text-lg">Exporting PDF...</h3>
                  <p className="text-sm text-gray-600">
                    Page {exportProgress.current} of {exportProgress.total}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Current page:</span>
                  <span className="font-medium">{exportProgress.pageName}</span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
                  />
                </div>
                
                <p className="text-xs text-gray-500 text-center">
                  {Math.round((exportProgress.current / exportProgress.total) * 100)}% complete
                </p>
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Please wait while we export your storyboard. This may take a moment for multi-page exports.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
} 