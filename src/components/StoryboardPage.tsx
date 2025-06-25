
import React from 'react';
import { ShotGrid } from './ShotGrid';
import { useStoryboardStore } from '@/store/storyboardStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileImage, FileText } from 'lucide-react';
import { exportCurrentPage } from '@/utils/export';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StoryboardPageProps {
  pageId: string;
  className?: string;
}

export const StoryboardPage: React.FC<StoryboardPageProps> = ({ 
  pageId, 
  className 
}) => {
  const { pages, isExporting, setIsExporting } = useStoryboardStore();
  const page = pages.find(p => p.id === pageId);

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
    try {
      setIsExporting(true);
      await exportCurrentPage(pageId, page.name, { format: 'png' });
      toast.success('Page exported as PNG successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export page. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      await exportCurrentPage(pageId, page.name, { format: 'pdf' });
      toast.success('Page exported as PDF successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export page. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{page.name}</h2>
          <p className="text-sm text-gray-600 mt-1">
            {page.shots.length} shots • {page.gridCols} × {page.gridRows} grid
          </p>
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

      {/* Storyboard Grid */}
      <div 
        id={`storyboard-page-${pageId}`}
        className="bg-white rounded-lg border p-6"
      >
        <ShotGrid pageId={pageId} />
      </div>

      {/* Page Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Shots
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{page.shots.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              With Images
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">
              {page.shots.filter(s => s.imageUrl).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              With Descriptions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">
              {page.shots.filter(s => s.description.trim()).length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
