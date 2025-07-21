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
  paperSize: 'letter' | 'a4' | 'a3' | 'tabloid' | 'canvas';
  orientation: 'portrait' | 'landscape';
  quality: 'standard' | 'high' | 'print';
  margin: 'none' | 'small' | 'medium' | 'large';
  fitToPage: boolean;
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
  
  const [options, setOptions] = useState<PDFExportOptions>({
    paperSize: 'letter',
    orientation: 'landscape',
    quality: 'high',
    margin: 'medium',
    fitToPage: true,
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

      // Export PDF
      await exportManager.downloadPDF(legacyPages, storyboardState, filename, options);
      
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

  // Helper to check if we're in canvas mode
  const isCanvasMode = options.paperSize === 'canvas';

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
            <Label className="text-base font-medium">Paper Settings</Label>
            <div className="grid grid-cols-2 gap-4">
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
                    <SelectItem value="letter">Letter (8.5" × 11")</SelectItem>
                    <SelectItem value="a4">A4 (210 × 297mm)</SelectItem>
                    <SelectItem value="a3">A3 (297 × 420mm)</SelectItem>
                    <SelectItem value="tabloid">Tabloid (11" × 17")</SelectItem>
                    <SelectItem value="canvas">Canvas (Custom)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="orientation">Orientation</Label>
                <Select
                  value={options.orientation}
                  onValueChange={(value) => updateOptions('orientation', value)}
                >
                  <SelectTrigger id="orientation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Quality Settings */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Quality Settings</Label>
            <RadioGroup
              value={options.quality}
              onValueChange={(value) => updateOptions('quality', value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="standard" id="quality-standard" />
                <Label htmlFor="quality-standard">Standard (Fast)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="quality-high" />
                <Label htmlFor="quality-high">High Quality</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="print" id="quality-print" />
                <Label htmlFor="quality-print">Print Ready</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Layout Options */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Layout Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fit-to-page"
                  checked={options.fitToPage}
                  onCheckedChange={(checked) => updateOptions('fitToPage', checked)}
                />
                <Label htmlFor="fit-to-page">Fit to page</Label>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="margin">Margin</Label>
              <Select
                value={options.margin}
                onValueChange={(value) => updateOptions('margin', value)}
              >
                <SelectTrigger id="margin">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Margin</SelectItem>
                  <SelectItem value="small">Small (0.25")</SelectItem>
                  <SelectItem value="medium">Medium (0.5")</SelectItem>
                  <SelectItem value="large">Large (1")</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Export Summary */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Exporting {getSelectedPageCount()} page(s) as PDF with {options.quality} quality.
              {isCanvasMode && (
                <div className="mt-1 text-amber-600">
                  Canvas mode will preserve exact layout and scaling.
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
    </Dialog>
  );
} 