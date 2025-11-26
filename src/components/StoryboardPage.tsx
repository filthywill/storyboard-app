import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ShotGrid } from './ShotGrid';
import { GridSizeSelector } from './GridSizeSelector';
import { AspectRatioSelector } from './AspectRatioSelector';
import { StartNumberSelector } from './StartNumberSelector';
import { useAppStore, Shot } from '@/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getToolbarContainerStyles, getToolbarContainerStylesWithOverrides, TOOLBAR_STYLES } from '@/styles/toolbar-styles';
import { getGlassmorphismStyles, getColor } from '@/styles/glassmorphism-styles';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Download, FileImage, FileText, FolderOpen, ChevronDown, Palette, ChevronUp } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageTabs } from './PageTabs';
import { MasterHeader } from './MasterHeader';
import { TemplateSettings } from './TemplateSettings';
import { ThemeToolbar } from './ThemeToolbar';
import { ProjectDropdown } from './ProjectDropdown';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PDFExportModal } from './PDFExportModal';
import { BatchLoadModal } from './BatchLoadModal';
import { ShotListLoadModal } from './ShotListLoadModal';
import { ImageEditorModal } from './ImageEditorModal';
import { exportManager } from '@/utils/export/exportManager';
import ErrorBoundary from './ErrorBoundary';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { ShotCard } from './ShotCard';

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
    storyboardTheme,
    getPageById,
    getPageShots,
    shots,
    shotOrder,
    projectName,
    projectInfo,
    projectLogoUrl,
    projectLogoFile,
    clientAgency,
    updateShot,
    deleteShot,
    addShot,
    addSubShot,
    reorderShots,
    moveShot,
    moveShotGroup,
    getGlobalShotIndex,
    setIsDragging,
    insertShotIntoSubGroup,
    removeFromSubGroup,
    jobInfo,
    canCreateProject,
    createProject
  } = useAppStore();
  
  const page = getPageById(pageId);
  const pageIndex = pages.findIndex(p => p.id === pageId);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [showBatchLoadModal, setShowBatchLoadModal] = useState(false);
  const [showShotListLoadModal, setShowShotListLoadModal] = useState(false);
  const [showImageEditorModal, setShowImageEditorModal] = useState(false);
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [batchInsertPosition, setBatchInsertPosition] = useState<number | null>(null);
  
  // Theme toolbar collapse state with localStorage persistence
  const [isThemeToolbarOpen, setIsThemeToolbarOpen] = useState(() => {
    const saved = localStorage.getItem('themeToolbarOpen');
    return saved !== null ? saved === 'true' : true; // Default to open
  });
  
  const handleThemeToolbarToggle = (open: boolean) => {
    setIsThemeToolbarOpen(open);
    localStorage.setItem('themeToolbarOpen', String(open));
  };
  
  // Drag and drop state
  const [activeShot, setActiveShot] = React.useState<Shot | null>(null);
  const pageShots = getPageShots(pageId);

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
        
        // Get the unscaled heights of both elements
        const pageTabsElement = wrapper.querySelector('[data-page-tabs]');
        const pageTabsHeight = pageTabsElement ? pageTabsElement.scrollHeight : 0;
        const contentHeight = content.scrollHeight;
        
        // Calculate total height with scaling applied to BOTH together
        const totalContentHeight = pageTabsHeight + contentHeight;
        const newHeight = totalContentHeight * newScale + wrapperPadding;
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

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // Calculate dimensions for shot grid (moved from ShotGrid)
  const previewDimensions = React.useMemo(() => {
    if (!page) return { width: 200, imageHeight: 100, gap: 8 };
    
    const { gridCols, aspectRatio } = page;
    const fixedWidth = 1000;
    const headerPadding = 16;
    const gridWrapperPadding = 4;
    const totalPadding = (headerPadding + gridWrapperPadding) * 2;
    const availableWidth = fixedWidth - totalPadding;
    const gaps = (gridCols - 1) * 8;
    const shotWidth = Math.floor((availableWidth - gaps) / gridCols);
    const cardContentPadding = 8 * 2;
    const imageBorder = 1 * 2;
    const imageContainerWidth = shotWidth - cardContentPadding - imageBorder;
    const [w, h] = aspectRatio.split('/').map(str => parseInt(str.trim(), 10));
    const imageHeight = Math.floor((imageContainerWidth * h) / w);
    return {
      width: shotWidth,
      imageHeight: imageHeight,
      gap: 8
    };
  }, [page]);

  // Helper function to detect if a shot should be inserted into a sub-shot group
  const shouldInsertIntoSubGroup = useCallback((activeShot: Shot, overShot: Shot, targetPosition: number): { shouldInsert: boolean; groupId?: string; insertPosition?: number } => {
    // Target shot must be part of a sub-shot group
    if (!overShot.subShotGroupId) {
      return { shouldInsert: false };
    }

    const overShotGlobalIndex = shotOrder.indexOf(overShot.id);
    
    if (overShotGlobalIndex === -1) {
      return { shouldInsert: false };
    }

    // Check if we're dropping into a sub-shot group by looking at surrounding shots
    const prevShotIndex = overShotGlobalIndex - 1;
    const nextShotIndex = overShotGlobalIndex + 1;
    
    // Check if the previous shot is in the same sub-shot group
    const prevShotInSameGroup = prevShotIndex >= 0 && (() => {
      const prevShotId = shotOrder[prevShotIndex];
      const prevShot = shots[prevShotId];
      return prevShot && prevShot.subShotGroupId === overShot.subShotGroupId;
    })();
    
    // Check if the next shot is in the same sub-shot group
    const nextShotInSameGroup = nextShotIndex < shotOrder.length && (() => {
      const nextShotId = shotOrder[nextShotIndex];
      const nextShot = shots[nextShotId];
      return nextShot && nextShot.subShotGroupId === overShot.subShotGroupId;
    })();
    
    // Insert into sub-shot group if:
    // 1. We're dropping between two shots in the same sub-shot group, OR
    // 2. We're dropping a shot from before the sub-shot group into the group
    if (prevShotInSameGroup || nextShotInSameGroup) {
      return { 
        shouldInsert: true, 
        groupId: overShot.subShotGroupId,
        insertPosition: targetPosition
      };
    }

    return { shouldInsert: false };
  }, [shots, shotOrder]);

  // Helper function to determine if we should move the entire group or just the individual shot
  const shouldMoveEntireGroup = useCallback((activeShot: Shot): boolean => {
    if (!activeShot.subShotGroupId) {
      return false; // Standard shots are always moved individually
    }

    // Find the first shot in the sub-shot group
    const groupShots = Object.values(shots).filter(
      shot => shot.subShotGroupId === activeShot.subShotGroupId
    );
    
    if (groupShots.length === 0) {
      return false;
    }

    // Sort by global order to find the first shot in the group
    const sortedGroupShots = groupShots.sort((a, b) => {
      const aIndex = shotOrder.indexOf(a.id);
      const bIndex = shotOrder.indexOf(b.id);
      return aIndex - bIndex;
    });

    // Only move the entire group if we're dragging the first shot in the group
    return sortedGroupShots[0].id === activeShot.id;
  }, [shots, shotOrder]);

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const shot = pageShots.find(s => s.id === event.active.id);
    setActiveShot(shot || null);
    setIsDragging(true);
  }, [pageShots, setIsDragging]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveShot(null);
    setIsDragging(false);

    if (!over || active.id === over.id) return;

    const activeShot = pageShots.find(shot => shot.id === active.id);
    const overShot = pageShots.find(shot => shot.id === over.id);

    if (!activeShot || !overShot) return;

    const targetPosition = getGlobalShotIndex(overShot.id);
    
    if (targetPosition === -1) return;

    // Check if we should insert the active shot into a sub-shot group
    const insertInfo = shouldInsertIntoSubGroup(activeShot, overShot, targetPosition);
    
    if (insertInfo.shouldInsert && insertInfo.groupId && insertInfo.insertPosition !== undefined) {
      // Insert the shot into the sub-shot group
      insertShotIntoSubGroup(activeShot.id, insertInfo.groupId, insertInfo.insertPosition);
    } else {
      // Normal drag behavior - determine if we should move the entire group or just the individual shot
      if (activeShot.subShotGroupId && shouldMoveEntireGroup(activeShot)) {
        // Move the entire sub-shot group
        moveShotGroup(activeShot.subShotGroupId, targetPosition);
      } else {
        // Move individual shot (this includes sub-shots being moved independently)
        moveShot(activeShot.id, targetPosition);
        
        // If this was a sub-shot being moved to a position outside its group,
        // we need to remove it from the sub-shot group
        if (activeShot.subShotGroupId && !insertInfo.shouldInsert) {
          // The shot is being moved outside its sub-shot group
          // The moveShot operation will handle the position change,
          // and we need to remove it from the sub-shot group
          removeFromSubGroup(activeShot.id);
        }
      }
    }
  }, [pageShots, setIsDragging, getGlobalShotIndex, moveShot, moveShotGroup, shouldInsertIntoSubGroup, shouldMoveEntireGroup, insertShotIntoSubGroup, removeFromSubGroup, shots]);

  if (!page) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <h3 
              className="text-lg font-semibold mb-2"
              style={{ color: getColor('text', 'primary') as string }}
            >
              Page Not Found
            </h3>
            <p style={{ color: getColor('text', 'secondary') as string }}>
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
        startNumber: '01', // TODO: Add startNumber to project store
        projectName,
        projectInfo,
        projectLogoUrl,
        projectLogoFile,
        clientAgency,
        jobInfo,
        isDragging: false,
        isExporting: false,
        showDeleteConfirmation: false,
        templateSettings,
        storyboardTheme
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

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('Project name is required');
      return;
    }

    try {
      const projectId = await createProject(newProjectName.trim(), newProjectDescription.trim() || undefined);
      if (projectId) {
        toast.success(`Created project: ${newProjectName}`);
        setNewProjectName('');
        setNewProjectDescription('');
        setShowCreateProjectDialog(false);
      } else {
        toast.error('Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    }
  };

  const handleBatchLoad = () => {
    setBatchInsertPosition(null);
    setShowBatchLoadModal(true);
  };

  const handleShotListLoad = () => {
    setBatchInsertPosition(null);
    setShowShotListLoadModal(true);
  };

  const handleEditImage = (shot: Shot) => {
    setEditingShot(shot);
    setShowImageEditorModal(true);
  };

  const handleApplyImageEdit = (updates: { imageScale?: number; imageOffsetX?: number; imageOffsetY?: number }) => {
    if (editingShot) {
      updateShot(editingShot.id, updates);
    }
  };

  const handleInsertBatch = (shotId: string) => {
    // Find the position of the shot in the current page
    const shotIndex = pageShots.findIndex(shot => shot.id === shotId);
    if (shotIndex !== -1) {
      // Create a hidden file input for direct batch insertion
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.multiple = true;
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      
      fileInput.onchange = async (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (!files || files.length === 0) return;
        
        try {
          const { parseAndSortImageFiles, processBatchImages } = await import('@/utils/batchImageLoader');
          
          // Parse and sort the files
          const parsedFiles = parseAndSortImageFiles(Array.from(files));
          
          if (parsedFiles.length === 0) {
            toast.error('No valid image files found');
            return;
          }
          
          // Process the images
          const result = await processBatchImages(parsedFiles);
          
          if (result.successful.length > 0) {
            // Insert shots at the specific position
            let createdCount = 0;
            
            for (const parsedFile of result.successful) {
              const compressedResult = (parsedFile as any).compressedResult;
              
              // Create shot at the target position
              const shotId = addShot(pageId, shotIndex + createdCount);
              
              // Update shot with image data
              updateShot(shotId, {
                imageFile: parsedFile.file,
                imageData: compressedResult.dataUrl,
                imageSize: parsedFile.file.size,
                imageStorageType: 'base64'
              });
              
              createdCount++;
            }
            
            toast.success(`Successfully inserted ${createdCount} images at position ${shotIndex + 1}`);
            
            if (result.failed.length > 0) {
              toast.warning(`${result.failed.length} images failed to load`);
            }
          } else {
            toast.error('No images were successfully processed');
          }
        } catch (error) {
          console.error('Batch insert failed:', error);
          toast.error('Failed to insert images. Please try again.');
        }
        
        // Clean up the file input
        document.body.removeChild(fileInput);
      };
      
      // Add to DOM and trigger click
      document.body.appendChild(fileInput);
      fileInput.click();
    }
  };

  return (
    <div className={cn("flex flex-col flex-grow", className)}>
      <div className="mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <GridSizeSelector pageId={pageId} />
            <AspectRatioSelector pageId={pageId} />
            <StartNumberSelector />
            <TemplateSettings />
            <Collapsible open={isThemeToolbarOpen} onOpenChange={handleThemeToolbarToggle}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="compact" 
                      className={cn(
                        "py-1.5 flex items-center justify-center gap-1 transition-all duration-200",
                        "focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:border-transparent",
                        "active:outline-none active:ring-0 active:border-transparent",
                        "hover:border-transparent",
                        "border-transparent"
                      )}
                      style={{
                        ...getToolbarContainerStyles(),
                        border: 'none',
                        outline: 'none',
                        ...(isThemeToolbarOpen && { 
                          backgroundColor: getColor('button', 'active')
                        })
                      }}
                      onMouseDown={(e) => {
                        // Blur immediately after mousedown to prevent focus border
                        setTimeout(() => e.currentTarget.blur(), 0);
                      }}
                    >
                      <Palette size={16} className={TOOLBAR_STYLES.iconClasses} />
                      {isThemeToolbarOpen ? (
                        <ChevronUp size={12} className={TOOLBAR_STYLES.iconClasses} />
                      ) : (
                        <ChevronDown size={12} className={TOOLBAR_STYLES.iconClasses} />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Customize Theme</p>
                </TooltipContent>
              </Tooltip>
            </Collapsible>
          </div>
        </div>
        
        <div className="flex gap-2">
          <ProjectDropdown 
            compact 
            onRequestCreate={() => setShowCreateProjectDialog(true)}
          />
          <Button
            variant="outline"
            size="compact"
            onClick={handleBatchLoad}
            disabled={isExporting}
            className="px-2"
            style={getToolbarContainerStyles()}
          >
            <FolderOpen size={16} className={`mr-1 ${TOOLBAR_STYLES.iconClasses}`} />
            Batch Load
          </Button>
          <Button
            variant="outline"
            size="compact"
            onClick={handleShotListLoad}
            disabled={isExporting}
            className="px-2"
            style={getToolbarContainerStyles()}
          >
            <FileText size={16} className={`mr-0.25 ${TOOLBAR_STYLES.iconClasses}`} />
            Load Shot List
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="compact"
                disabled={isExporting}
                className="px-2"
                style={getToolbarContainerStyles()}
              >
                <Download size={16} className={`mr-0.25 ${TOOLBAR_STYLES.iconClasses}`} />
                Export
                <ChevronDown size={14} className={`ml-0.25 ${TOOLBAR_STYLES.iconClasses}`} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPNG} disabled={isExporting}>
                <FileImage size={16} className="mr-2" />
                Export as PNG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
                <FileText size={16} className="mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Theme Toolbar - Collapsible */}
      <Collapsible open={isThemeToolbarOpen} onOpenChange={handleThemeToolbarToggle}>
        <CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <ThemeToolbar />
        </CollapsibleContent>
      </Collapsible>

      <ErrorBoundary>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
      <div 
        ref={wrapperRef}
        className={cn(
          "w-full flex flex-col items-start p-4 rounded-lg"
        )}
        style={{ 
          transition: 'height 0.2s ease-out',
          ...getGlassmorphismStyles('background')
        }}
      >
        {/* Single scaling parent container for both PageTabs and StoryboardContent */}
        <div 
          className="w-full flex flex-col items-center"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          {/* Single centered 1000px container holding BOTH PageTabs and StoryboardContent */}
          <div className="w-full flex justify-center">
            <div style={{ width: '1000px' }}>
              
              {/* PageTabs - sibling of StoryboardContent within shared container */}
              <div className="relative z-10 -mb-1" data-page-tabs>
                <PageTabs />
              </div>
              
              {/* StoryboardContent - sibling of PageTabs within shared container */}
              <div 
                ref={contentRef}
                id={`storyboard-page-${pageId}`}
                className={cn(
                  "shadow-lg overflow-visible relative z-20 storyboard-themeable"
                )}
                style={{
                  height: 'min-content',
                  ['--inline-bg-color' as any]: storyboardTheme.contentBackground,
                  ['--inline-border-radius' as any]: '6px', // rounded-md = 6px
                }}
              >
          <MasterHeader />
          <div className='p-1'>
          <SortableContext items={pageShots.map(s => s.id)} strategy={rectSortingStrategy}>
            <ShotGrid 
              pageId={pageId} 
              previewDimensions={previewDimensions}
              onShotUpdate={updateShot}
              onShotDelete={deleteShot}
              onAddShot={addShot}
              onAddSubShot={addSubShot}
              onInsertBatch={handleInsertBatch}
              onEditImage={handleEditImage}
            />
          </SortableContext>
          </div>
          </div>
          </div>
          </div>
        </div>
        </div>
        
        <DragOverlay>
          {activeShot ? (
            <ShotCard
              shot={activeShot}
              onUpdate={() => {}}
              onDelete={() => {}}
              onAddSubShot={() => {}}
              onInsertShot={() => {}}
              isOverlay
              aspectRatio={page?.aspectRatio || '16/9'}
              previewDimensions={previewDimensions}
            />
          ) : null}
        </DragOverlay>
        </DndContext>
        </ErrorBoundary>

        <PDFExportModal
          isOpen={showPDFModal}
          onClose={() => setShowPDFModal(false)}
          currentPageIndex={pageIndex}
        />

        <BatchLoadModal
          isOpen={showBatchLoadModal}
          onClose={() => setShowBatchLoadModal(false)}
          pageId={pageId}
          initialPosition={batchInsertPosition}
        />

        <ShotListLoadModal
          isOpen={showShotListLoadModal}
          onClose={() => setShowShotListLoadModal(false)}
          pageId={pageId}
          initialPosition={batchInsertPosition}
        />

        <ImageEditorModal
          isOpen={showImageEditorModal}
          onClose={() => {
            setShowImageEditorModal(false);
            setEditingShot(null);
          }}
          shot={editingShot}
          aspectRatio={page?.aspectRatio || '16/9'}
          gridCols={page?.gridCols || 3}
          onApply={handleApplyImageEdit}
        />

        {/* Create Project Dialog */}
        <Dialog open={showCreateProjectDialog} onOpenChange={setShowCreateProjectDialog}>
          <DialogContent style={getGlassmorphismStyles('dark')}>
            <DialogHeader>
              <DialogTitle style={{ color: getColor('text', 'primary') as string }}>
                Create New Project
              </DialogTitle>
              <DialogDescription style={{ color: getColor('text', 'secondary') as string }}>
                Create a new storyboard project with a custom name and description.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="project-name" style={{ color: getColor('text', 'primary') as string }}>
                  Project Name
                </Label>
                <Input
                  id="project-name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Enter project name"
                  maxLength={50}
                  style={{
                    backgroundColor: getColor('input', 'background') as string,
                    border: `1px solid ${getColor('input', 'border') as string}`,
                    color: getColor('text', 'primary') as string
                  }}
                />
              </div>
              <div>
                <Label htmlFor="project-description" style={{ color: getColor('text', 'primary') as string }}>
                  Description (Optional)
                </Label>
                <Textarea
                  id="project-description"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="Enter project description"
                  maxLength={200}
                  rows={3}
                  style={{
                    backgroundColor: getColor('input', 'background') as string,
                    border: `1px solid ${getColor('input', 'border') as string}`,
                    color: getColor('text', 'primary') as string
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={() => setShowCreateProjectDialog(false)}
                style={getGlassmorphismStyles('button')}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateProject}
                style={getGlassmorphismStyles('buttonAccent')}
              >
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
};
