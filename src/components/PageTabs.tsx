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

export const PageTabs: React.FC = () => {
  const {
    pages,
    activePageId,
    setActivePage,
    createPage,
    deletePage,
    duplicatePage,
    showDeleteConfirmation,
    setShowDeleteConfirmation
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
                    "flex items-center group rounded-t-md h-8",
                    activePageId === page.id ? "bg-white" : "bg-muted opacity-50"
                  )}
                >
                  <TabsTrigger
                    value={page.id}
                    className="bg-transparent shadow-none border-none outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 px-2 pt-0.5 pb-2 text-xs font-medium data-[state=active]:bg-transparent data-[state=inactive]:bg-transparent hover:bg-transparent data-[state=active]:shadow-none data-[state=inactive]:shadow-none data-[state=active]:border-none data-[state=inactive]:border-none"
                    style={{
                      boxShadow: 'none',
                      outline: 'none',
                      border: 'none'
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
                        className="text-red-600 focus:text-red-600"
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
          className="shrink-0 ml-0.3 px-1.5 py-0.5 h-6 text-xs mt-0.5 bg-purple-500/20 hover:bg-purple-500/30 border-none border-purple-400/30 text-purple-200 hover:text-purple-100 transition-all duration-200"
        >
          <Plus size={14} strokeWidth={3} className="mr-0" />
          </Button>
      </div>



      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog !== null} onOpenChange={() => setShowDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Page</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this page? This action cannot be undone.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(!!checked)}
            />
            <Label htmlFor="dont-show-again" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Don't show this again
            </Label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
