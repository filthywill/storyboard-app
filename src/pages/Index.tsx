import React, { useEffect } from 'react';
import { PageTabs } from '@/components/PageTabs';
import { StoryboardPage } from '@/components/StoryboardPage';
import { useAppStore } from '@/store';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Target } from 'lucide-react';
import { formatShotNumber } from '@/utils/formatShotNumber';

const Index = () => {
  const { 
    activePageId, 
    pages, 
    setActivePage,
    getTotalShots,
    initializeAppContent,
    renumberAllShotsImmediate,
    templateSettings,
    shots,
    shotOrder
  } = useAppStore();
  
  // Initialize app content only once on mount
  useEffect(() => {
    try {
      initializeAppContent();
      // Force renumbering after initialization
      setTimeout(() => {
        renumberAllShotsImmediate(templateSettings.shotNumberFormat || '01');
      }, 100);
    } catch (error) {
      console.error('Error during app initialization:', error);
    }
  }, []); // Empty dependency array - run only once on mount
  
  // Handle active page validation separately
  useEffect(() => {
    if (!pages.find(p => p.id === activePageId) && pages.length > 0) {
      setActivePage(pages[0].id);
    }
  }, [activePageId, pages, setActivePage]);

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

  const activePageIndex = pages.findIndex(p => p.id === activePageId);
  const totalShots = pages.reduce((total, page) => total + getTotalShots(page.id), 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
                <span>{pages.length} Pages</span>
              </div>
              <div className="flex items-center gap-2">
                <Target size={16} />
                <span>{totalShots} Shots</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-grow w-full">
        <StoryboardPage pageId={activePage.id} />
      </main>

      <footer className="bg-white border-t">
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
      </footer>
    </div>
  );
};

export default Index;
