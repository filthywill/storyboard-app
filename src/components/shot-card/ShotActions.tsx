import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  MoreVertical,
  Trash2,
  PlusCircle,
  ChevronsDownUp,
  FileImage,
  Pencil,
} from 'lucide-react';

interface ShotActionsProps {
  onDelete: () => void;
  onAddSubShot: () => void;
  onInsertShot: () => void;
  onEditImage?: () => void;
  onReplaceImage: () => void;
}

export const ShotActions: React.FC<ShotActionsProps> = ({
  onDelete,
  onAddSubShot,
  onInsertShot,
  onEditImage,
  onReplaceImage,
}) => {
  return (
    <div className="absolute top-1 right-1 z-10 hidden [@media(hover:none)]:block [@media(pointer:coarse)]:block">
      <div className="flex items-center space-x-1 bg-white/80 backdrop-blur-sm rounded-full p-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              aria-label="Shot actions"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEditImage && (
              <DropdownMenuItem onClick={onEditImage}>
                <Pencil className="mr-2 h-4 w-4" />
                <span>Edit Image</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onReplaceImage}>
              <FileImage className="mr-2 h-4 w-4" />
              <span>Replace Image</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onInsertShot}>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>Insert Shot Below</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAddSubShot}>
              <ChevronsDownUp className="mr-2 h-4 w-4" />
              <span>Add Sub-Shot</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-red-500">
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete Shot</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

ShotActions.displayName = 'ShotActions'; 