import { useState } from 'react';
import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Plus, MoreHorizontal, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { getColor, getGlassmorphismStyles } from '@/styles/glassmorphism-styles';

export const PageTabs: React.FC = () => {
  const {
    pages,
    activePageId,
    setActivePage,
    createPage,
    deletePage,
    duplicatePage,
    showDeleteConfirmation,
    setShowDeleteConfirmation,
    storyboardTheme
  } = useAppStore();

  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleCreatePage = () => {
    createPage();
    toast.success('New page created!');
  };

  const handleDuplicate = (pageId: string) => {
    duplicatePage(pageId);
    toast.success('Page duplicated successfully!');
  };

  const handleDeleteConfirm = () => {
    if (showDeleteDialog) {
      if (pages.length <= 1) {
        toast.error('Cannot delete the last page');
        return;
      }
      deletePage(showDeleteDialog);
      toast.success('Page deleted successfully!');
      if (dontShowAgain) {
        setShowDeleteConfirmation(false);
      }
    }
    setShowDeleteDialog(null);
    setDontShowAgain(false);
  };

  const handleAttemptDelete = (pageId: string) => {
    if (showDeleteConfirmation) {
      setShowDeleteDialog(pageId);
    } else {
      if (pages.length <= 1) {
        toast.error('Cannot delete the last page');
        return;
      }
      deletePage(pageId);
      toast.success('Page deleted successfully!');
    }
  };

  return (
    <>
      <div className="flex items-start gap-0.5 mb-0">
        <div className="overflow-x-auto">
          <Tabs value={activePageId} onValueChange={setActivePage}>
            <TabsList className="h-auto p-0 bg-transparent gap-1">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className={cn(
                    "flex items-center group rounded-t-md h-8"
                  )}
                  style={{
                    backgroundColor: storyboardTheme.contentBackground,
                    // INACTIVE TAB OPACITY - Change 0.5 to adjust transparency (0 = fully transparent, 1 = fully opaque)
                    opacity: activePageId === page.id ? 1 : 0.55
                  }}
                >
                  <TabsTrigger
                    value={page.id}
                    className="bg-transparent shadow-none border-none outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 px-2 pt-0.5 pb-2 text-xs font-medium data-[state=active]:bg-transparent data-[state=inactive]:bg-transparent hover:bg-transparent data-[state=active]:shadow-none data-[state=inactive]:shadow-none data-[state=active]:border-none data-[state=inactive]:border-none"
                    style={{
                      boxShadow: 'none',
                      outline: 'none',
                      border: 'none',
                      color: storyboardTheme.header.text
                    }}
                  >
                    {page.name}
                  </TabsTrigger>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-6 p-0 transition-opacity mr-0 text-muted-foreground hover:text-foreground"
                      >
                        <MoreHorizontal size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleDuplicate(page.id)}
                      >
                        <Copy size={14} className="mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleAttemptDelete(page.id)}
                        style={{ 
                          color: 'rgba(220, 38, 38, 1)' // red-600 for destructive action
                        }}
                        disabled={pages.length <= 1}
                      >
                        <Trash2 size={14} className="mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <Button
          onClick={handleCreatePage}
          size="sm"
          className="shrink-0 ml-0.3 px-1.5 py-0.5 h-6 text-xs mt-0.5 border-none transition-all duration-200"
          style={{
            backgroundColor: getColor('button', 'actionBackground') as string,
            color: getColor('button', 'actionText') as string,
            border: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = getColor('button', 'actionBackgroundHover') as string;
            e.currentTarget.style.color = getColor('button', 'actionTextHover') as string;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = getColor('button', 'actionBackground') as string;
            e.currentTarget.style.color = getColor('button', 'actionText') as string;
          }}
        >
          <Plus size={14} strokeWidth={3} className="mr-0" />
          </Button>
      </div>



      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog !== null} onOpenChange={() => setShowDeleteDialog(null)}>
        <DialogContent style={getGlassmorphismStyles('dark')}>
          <DialogHeader>
            <DialogTitle style={{ color: getColor('text', 'primary') as string }}>
              Delete Page
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p 
              className="text-sm"
              style={{ color: getColor('text', 'secondary') as string }}
            >
              Are you sure you want to delete this page? This action cannot be undone.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(!!checked)}
            />
            <Label 
              htmlFor="dont-show-again" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              style={{ color: getColor('text', 'primary') as string }}
            >
              Don't show this again
            </Label>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setShowDeleteDialog(null)}
              style={getGlassmorphismStyles('button')}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteConfirm}
              style={{
                backgroundColor: getColor('button', 'destructive') as string,
                color: getColor('button', 'destructiveText') as string,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = getColor('button', 'destructiveHover') as string;
                e.currentTarget.style.color = getColor('button', 'destructiveTextHover') as string;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = getColor('button', 'destructive') as string;
                e.currentTarget.style.color = getColor('button', 'destructiveText') as string;
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
