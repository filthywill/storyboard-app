
import React from 'react';
import { PageTabs } from '@/components/PageTabs';
import { StoryboardPage } from '@/components/StoryboardPage';
import { useStoryboardStore } from '@/store/storyboardStore';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Image, Grid3X3 } from 'lucide-react';

const Index = () => {
  const { activePageId, pages } = useStoryboardStore();
  const activePage = pages.find(p => p.id === activePageId);

  if (!activePage) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Storyboard Creator
            </h1>
            <p className="text-lg text-gray-600">
              Create, organize, and export professional storyboards
            </p>
          </div>
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Pages Found
              </h3>
              <p className="text-gray-600">
                Start by creating your first storyboard page.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Storyboard Creator
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Create professional storyboards with drag-and-drop ease
              </p>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <FileText size={16} />
                <span>{pages.length} pages</span>
              </div>
              <div className="flex items-center gap-2">
                <Image size={16} />
                <span>
                  {pages.reduce((total, page) => 
                    total + page.shots.filter(s => s.imageUrl).length, 0
                  )} images
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Grid3X3 size={16} />
                <span>{activePage.gridCols} × {activePage.gridRows} grid</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <PageTabs />
        <StoryboardPage pageId={activePageId} />
      </div>

      {/* Footer */}
      <div className="mt-12 border-t bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              Last updated: {new Date(activePage.updatedAt).toLocaleString()}
            </div>
            <div>
              Auto-saved to local storage
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
