import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { FileImage, Download, AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { exportManager } from '@/utils/export/exportManager';
import { MODAL_OVERLAY_STYLES, getGlassmorphismStyles, getColor } from '@/styles/glassmorphism-styles';
import { getPageSizeSpec, resolvePageSizeMode } from '@/utils/pageSize';

export interface PNGExportOptions {
  pages: 'all' | 'current' | 'range';
  pageRange?: { start: number; end: number };
}

interface PNGExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPageIndex: number;
}

const INVALID_FILENAME_CHARS_REGEX = /[<>:"/\\|?*]/g;
const CONTROL_CHARS_REGEX = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(31)}]`,
  'g'
);

export function PNGExportModal({ isOpen, onClose, currentPageIndex }: PNGExportModalProps) {
  const {
    pages,
    activePageId,
    startNumber,
    projectName,
    currentProject,
    projectInfo,
    projectLogoUrl,
    projectLogoFile,
    projectLogoDataUrl,
    clientAgency,
    jobInfo,
    pageSizeMode,
    templateSettings,
    storyboardTheme,
    getPageShots
  } = useAppStore();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{current: number; total: number; pageName: string} | null>(null);
  const [filenameInput, setFilenameInput] = useState('');
  const [options, setOptions] = useState<PNGExportOptions>({
    pages: 'all',
    pageRange: { start: 1, end: pages.length }
  });

  const normalizedPageSizeMode = resolvePageSizeMode(pageSizeMode);
  const pageSizeLabel = getPageSizeSpec(normalizedPageSizeMode).label;
  const supportsDirectoryExport =
    typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';

  const sanitizePNGFilename = useCallback((rawName: string): string => {
    const trimmed = rawName.trim();
    const withoutExtension = trimmed.replace(/\.(png|zip)$/i, '').trim();
    const sanitizedBase = withoutExtension
      .replace(INVALID_FILENAME_CHARS_REGEX, '_')
      .replace(CONTROL_CHARS_REGEX, '_')
      .replace(/\s+/g, ' ')
      .replace(/[. ]+$/g, '')
      .trim();
    const safeBase = sanitizedBase || 'storyboard';
    return safeBase;
  }, []);

  const resolveDefaultFilename = useCallback((): string => {
    const projectTitle = (currentProject?.name || projectName || '').trim();
    return sanitizePNGFilename(projectTitle || 'storyboard');
  }, [currentProject?.name, projectName, sanitizePNGFilename]);

  useEffect(() => {
    if (!isOpen) return;
    setFilenameInput(resolveDefaultFilename());
    setOptions(prev => ({
      ...prev,
      pageRange: {
        start: prev.pageRange?.start || 1,
        end: pages.length
      }
    }));
  }, [isOpen, pages.length, resolveDefaultFilename]);

  const updateOptions = <K extends keyof PNGExportOptions>(key: K, value: PNGExportOptions[K]) => {
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

  const getSelectedPages = () => {
    if (options.pages === 'current') {
      return pages[currentPageIndex] ? [pages[currentPageIndex]] : [];
    }

    if (options.pages === 'range' && options.pageRange) {
      const { start, end } = options.pageRange;
      return pages.slice(start - 1, end);
    }

    return pages;
  };

  const getSelectedPageCount = () => {
    if (options.pages === 'all') return pages.length;
    if (options.pages === 'current') return pages[currentPageIndex] ? 1 : 0;
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

  const handleExport = async () => {
    const baseFilename = sanitizePNGFilename(filenameInput || resolveDefaultFilename());
    const pagesToExport = getSelectedPages();

    if (pagesToExport.length === 0) {
      toast({
        title: 'No pages to export',
        description: 'Please select valid pages to export.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsExporting(true);

      const legacyPages = pagesToExport.map(page => ({
        ...page,
        shots: getPageShots(page.id)
      }));

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
        projectLogoDataUrl,
        clientAgency,
        jobInfo,
        pageSizeMode,
        isDragging: false,
        isExporting: true,
        showDeleteConfirmation: true,
        templateSettings,
        storyboardTheme
      };

      const result = await exportManager.downloadPNGs(
        legacyPages,
        storyboardState,
        baseFilename,
        { scale: 2, quality: 0.95 },
        (current, total, pageName) => {
          setExportProgress({ current, total, pageName });
        }
      );

      const destination =
        result === 'folder'
          ? `to folder "${baseFilename}"`
          : result === 'zip'
            ? `to ${baseFilename}.zip`
            : `to ${baseFilename}.png`;

      toast({
        title: 'PNG Export Successful',
        description: `Exported ${pagesToExport.length} page(s) ${destination}`,
      });

      onClose();
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'EXPORT_CANCELLED') {
        return;
      }

      console.error('PNG export failed:', error);
      toast({
        title: 'PNG Export Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        style={getGlassmorphismStyles('dark')}
      >
        <DialogHeader>
          <DialogTitle
            className="flex items-center gap-2"
            style={{ color: getColor('text', 'primary') as string }}
          >
            <FileImage className="h-5 w-5" />
            Export as PNG
          </DialogTitle>
          <DialogDescription className="sr-only">
            Choose which storyboard pages to export as PNG files, review the page size, and set the export filename.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label
              className="text-base font-medium"
              style={{ color: getColor('text', 'primary') as string }}
            >
              Pages to Export
            </Label>
            <RadioGroup
              value={options.pages}
              onValueChange={(value) => updateOptions('pages', value as PNGExportOptions['pages'])}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="png-all-pages" />
                <Label
                  htmlFor="png-all-pages"
                  style={{ color: getColor('text', 'secondary') as string }}
                >
                  All Pages ({pages.length})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="current" id="png-current-page" />
                <Label
                  htmlFor="png-current-page"
                  style={{ color: getColor('text', 'secondary') as string }}
                >
                  Current Page ({currentPageIndex + 1}: {pages[currentPageIndex]?.name || 'Untitled'})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="range" id="png-page-range" />
                <Label
                  htmlFor="png-page-range"
                  style={{ color: getColor('text', 'secondary') as string }}
                >
                  Page Range
                </Label>
              </div>
            </RadioGroup>

            {options.pages === 'range' && (
              <div className="ml-6 flex items-center gap-2">
                <Label
                  htmlFor="png-start-page"
                  style={{ color: getColor('text', 'secondary') as string }}
                >
                  From:
                </Label>
                <input
                  id="png-start-page"
                  type="number"
                  min="1"
                  max={pages.length}
                  value={options.pageRange?.start || 1}
                  onChange={(event) => updatePageRange('start', parseInt(event.target.value) || 1)}
                  className="w-16 px-2 py-1 rounded text-sm"
                  style={{
                    backgroundColor: getColor('input', 'background') as string,
                    border: `1px solid ${getColor('input', 'border') as string}`,
                    color: getColor('text', 'primary') as string
                  }}
                />
                <Label
                  htmlFor="png-end-page"
                  style={{ color: getColor('text', 'secondary') as string }}
                >
                  To:
                </Label>
                <input
                  id="png-end-page"
                  type="number"
                  min="1"
                  max={pages.length}
                  value={options.pageRange?.end || pages.length}
                  onChange={(event) => updatePageRange('end', parseInt(event.target.value) || pages.length)}
                  className="w-16 px-2 py-1 rounded text-sm"
                  style={{
                    backgroundColor: getColor('input', 'background') as string,
                    border: `1px solid ${getColor('input', 'border') as string}`,
                    color: getColor('text', 'primary') as string
                  }}
                />
                <Badge variant={isValidRange() ? 'default' : 'destructive'}>
                  {getSelectedPageCount()} page(s)
                </Badge>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label
              className="text-base font-medium"
              style={{ color: getColor('text', 'primary') as string }}
            >
              Export Settings
            </Label>
            <div className="space-y-2">
              <Label style={{ color: getColor('text', 'secondary') as string }}>
                Page Size
              </Label>
              <div
                className="rounded-md px-3 py-2 text-sm"
                style={{
                  backgroundColor: getColor('background', 'subtle') as string,
                  border: `1px solid ${getColor('border', 'primary') as string}`,
                  color: getColor('text', 'primary') as string
                }}
              >
                {pageSizeLabel}
              </div>
              <p
                className="text-xs"
                style={{ color: getColor('text', 'muted') as string }}
              >
                Controlled from Template Layout
              </p>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="png-filename"
                style={{ color: getColor('text', 'secondary') as string }}
              >
                Filename
              </Label>
              <input
                id="png-filename"
                type="text"
                value={filenameInput}
                onChange={(event) => setFilenameInput(event.target.value)}
                placeholder="storyboard"
                className="w-full px-3 py-2 rounded text-sm"
                style={{
                  backgroundColor: getColor('input', 'background') as string,
                  border: `1px solid ${getColor('input', 'border') as string}`,
                  color: getColor('text', 'primary') as string
                }}
              />
            </div>
          </div>

          <Alert
            style={{
              backgroundColor: getColor('background', 'subtle') as string,
              border: `1px solid ${getColor('border', 'primary') as string}`,
              color: getColor('text', 'primary') as string
            }}
          >
            <Info className="h-4 w-4" />
            <AlertDescription
              style={{ color: getColor('text', 'secondary') as string }}
            >
              Exporting {getSelectedPageCount()} page(s) as PNG.
              {getSelectedPageCount() > 1 && (
                <div className="mt-1">
                  {supportsDirectoryExport
                    ? 'Multiple pages will be saved into a folder when you choose a destination.'
                    : 'Multiple pages will be downloaded as a ZIP archive in this browser.'}
                </div>
              )}
              {normalizedPageSizeMode === 'dynamic' && (
                <div className="mt-1">
                  Dynamic mode preserves exact layout and measured canvas size.
                </div>
              )}
              {(normalizedPageSizeMode === 'letter-portrait' || normalizedPageSizeMode === 'letter-landscape') && (
                <div className="mt-1">
                  Letter mode uses fixed 8.5&quot; × 11&quot; sizing from Template Layout.
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
          <Button
            onClick={onClose}
            disabled={isExporting}
            style={getGlassmorphismStyles('button')}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || !isValidRange()}
            className="min-w-[100px]"
            style={getGlassmorphismStyles('buttonAccent')}
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export PNG
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {exportProgress && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={MODAL_OVERLAY_STYLES}
        >
          <div
            className="rounded-lg shadow-2xl p-8 max-w-md w-full mx-4"
            style={getGlassmorphismStyles('dark')}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="animate-spin rounded-full h-8 w-8 border-b-2"
                  style={{ borderColor: getColor('button', 'accent') as string }}
                />
                <div>
                  <h3
                    className="font-semibold text-lg"
                    style={{ color: getColor('text', 'primary') as string }}
                  >
                    Exporting PNG...
                  </h3>
                  <p
                    className="text-sm"
                    style={{ color: getColor('text', 'secondary') as string }}
                  >
                    Page {exportProgress.current} of {exportProgress.total}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span style={{ color: getColor('text', 'secondary') as string }}>Current page:</span>
                  <span
                    className="font-medium"
                    style={{ color: getColor('text', 'primary') as string }}
                  >
                    {exportProgress.pageName}
                  </span>
                </div>

                <div
                  className="w-full rounded-full h-2.5 overflow-hidden"
                  style={{ backgroundColor: getColor('progress', 'background') as string }}
                >
                  <div
                    className="h-2.5 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: getColor('progress', 'fill') as string,
                      width: `${(exportProgress.current / exportProgress.total) * 100}%`
                    }}
                  />
                </div>

                <p
                  className="text-xs text-center"
                  style={{ color: getColor('text', 'muted') as string }}
                >
                  {Math.round((exportProgress.current / exportProgress.total) * 100)}% complete
                </p>
              </div>

              <Alert
                style={{
                  backgroundColor: getColor('background', 'subtle') as string,
                  border: `1px solid ${getColor('border', 'primary') as string}`,
                  color: getColor('text', 'primary') as string
                }}
              >
                <Info className="h-4 w-4" />
                <AlertDescription
                  className="text-xs"
                  style={{ color: getColor('text', 'secondary') as string }}
                >
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
