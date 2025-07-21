import React, { useEffect, useRef, useState } from 'react';
import { ShotGrid } from './ShotGrid';
import { GridSizeSelector } from './GridSizeSelector';
import { AspectRatioSelector } from './AspectRatioSelector';
import { StartNumberSelector } from './StartNumberSelector';
import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileImage, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageTabs } from './PageTabs';
import { MasterHeader } from './MasterHeader';
import { TemplateSettings } from './TemplateSettings';
import { PDFExportModal } from './PDFExportModal';
import { exportManager } from '@/utils/export/exportManager';
import ErrorBoundary from './ErrorBoundary';

interface StoryboardPageProps {
  pageId: string;
  className?: string;
}

export const StoryboardPage: React.FC<StoryboardPageProps> = ({ 
  pageId, 
  className 
}) => {
  const { 
    pages, 
    isExporting, 
    setIsExporting, 
    templateSettings,
    getPageById,
    getPageShots,
    shots,
    startNumber,
    projectName,
    projectInfo,
    projectLogoUrl,
    projectLogoFile,
    clientAgency,
    jobInfo
  } = useAppStore();
  
  const page = getPageById(pageId);
  const pageIndex = pages.findIndex(p => p.id === pageId);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [showPDFModal, setShowPDFModal] = useState(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    const updateLayout = () => {
      const { width: wrapperWidth } = wrapper.getBoundingClientRect();
      if (wrapperWidth > 0) {
        const wrapperPadding = 32;
        const availableWidth = wrapperWidth - wrapperPadding;
        const newScale = Math.max(availableWidth / 1000, 0.2);
        setScale(newScale);
        const contentHeight = content.scrollHeight;
        const newHeight = contentHeight * newScale + wrapperPadding;
        wrapper.style.height = `${newHeight}px`;
      }
    };

    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(wrapper);
    resizeObserver.observe(content);
    updateLayout();
    return () => {
      resizeObserver.disconnect();
      if (wrapper) {
        wrapper.style.height = '';
      }
    };
  }, [page, templateSettings]);

  if (!page) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Page Not Found
            </h3>
            <p className="text-gray-600">
              The requested storyboard page could not be found.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleExportPNG = async () => {
    if (!page) {
      toast.error('No active page to export.');
      return;
    }

    try {
      setIsExporting(true);
      
      // Convert new format to old format for export compatibility
      const pageShots = getPageShots(pageId);
      const legacyPage = {
        ...page,
        shots: pageShots // Convert from shot IDs to shot objects
      };
      
      const legacyState = {
        pages: pages.map(p => ({
          ...p,
          shots: getPageShots(p.id)
        })),
        activePageId: pageId,
        startNumber,
        projectName,
        projectInfo,
        projectLogoUrl,
        projectLogoFile,
        clientAgency,
        jobInfo,
        isDragging: false,
        isExporting: false,
        showDeleteConfirmation: false,
        templateSettings
      };
      
      await exportManager.downloadPage(
        legacyPage,
        legacyState,
        `${page.name}_export_${Date.now()}.png`,
        { scale: 2, quality: 0.95 }
      );
      toast.success(`Exported ${page.name} as PNG`);
    } catch (error) {
      console.error('PNG export failed:', error);
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = () => {
    setShowPDFModal(true);
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <GridSizeSelector pageId={pageId} />
            <AspectRatioSelector pageId={pageId} />
            <StartNumberSelector />
            <TemplateSettings />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportPNG}
            disabled={isExporting}
            className="hover:bg-blue-50"
          >
            <FileImage size={16} className="mr-2" />
            Export PNG
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="hover:bg-green-50"
          >
            <FileText size={16} className="mr-2" />
            Export PDF
          </Button>
        </div>
      </div>
      
      <PageTabs />

      <ErrorBoundary>
      <div 
        ref={wrapperRef}
        className={cn(
          "w-full flex justify-center bg-gray-100 p-4 rounded-lg"
        )}
        style={{ transition: 'height 0.2s ease-out' }}
      >
        <div 
          ref={contentRef}
          id={`storyboard-page-${pageId}`}
          className={cn(
            "bg-white rounded-md shadow-lg border border-gray-200 overflow-visible"
          )}
          style={{
            height: 'min-content',
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          <MasterHeader />
          <div className='p-1'>
          <ShotGrid pageId={pageId} />
          </div>
        </div>
      </div>
      </ErrorBoundary>

      <PDFExportModal
        isOpen={showPDFModal}
        onClose={() => setShowPDFModal(false)}
        currentPageIndex={pageIndex}
      />
    </div>
  );
};
