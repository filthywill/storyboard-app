
import React, { useState } from 'react';
import { useStoryboardStore } from '@/store/storyboardStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus, MoreHorizontal, Edit2, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export const PageTabs: React.FC = () => {
  const {
    pages,
    activePageId,
    setActivePage,
    createPage,
    deletePage,
    renamePage,
    duplicatePage
  } = useStoryboardStore();

  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);

  const handleCreatePage = () => {
    createPage();
    toast.success('New page created!');
  };

  const handleStartRename = (pageId: string, currentName: string) => {
    setIsRenaming(pageId);
    setRenameValue(currentName);
  };

  const handleRename = () => {
    if (isRenaming && renameValue.trim()) {
      renamePage(isRenaming, renameValue.trim());
      toast.success('Page renamed successfully!');
    }
    setIsRenaming(null);
    setRenameValue('');
  };

  const handleCancelRename = () => {
    setIsRenaming(null);
    setRenameValue('');
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
    }
    setShowDeleteDialog(null);
  };

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1">
          <Tabs value={activePageId} onValueChange={setActivePage}>
            <TabsList className="grid w-full grid-cols-[repeat(auto-fit,minmax(150px,1fr))] h-auto p-1">
              {pages.map((page) => (
                <div key={page.id} className="flex items-center group">
                  <TabsTrigger
                    value={page.id}
                    className="flex-1 px-3 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    {page.name}
                  </TabsTrigger>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                      >
                        <MoreHorizontal size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleStartRename(page.id, page.name)}
                      >
                        <Edit2 size={14} className="mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDuplicate(page.id)}
                      >
                        <Copy size={14} className="mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setShowDeleteDialog(page.id)}
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
          className="shrink-0"
        >
          <Plus size={16} className="mr-2" />
          New Page
        </Button>
      </div>

      {/* Rename Dialog */}
      <Dialog open={isRenaming !== null} onOpenChange={() => handleCancelRename()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Page</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter page name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') handleCancelRename();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelRename}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!renameValue.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
