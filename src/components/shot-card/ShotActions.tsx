import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { GripVertical, MoreVertical, Trash2, PlusCircle, ChevronsDownUp } from 'lucide-react';
import { DraggableSyntheticListeners } from '@dnd-kit/core';
import { Transform } from '@dnd-kit/utilities';

interface ShotActionsProps {
  onDelete: () => void;
  onAddSubShot: () => void;
  onInsertShot: () => void;
  sortableAttributes: {
    role: string;
    'aria-roledescription': string;
    tabIndex: number;
  };
  sortableListeners: DraggableSyntheticListeners;
}

export const ShotActions: React.FC<ShotActionsProps> = ({
  onDelete,
  onAddSubShot,
  onInsertShot,
  sortableAttributes,
  sortableListeners,
}) => {
  return (
    <div className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
      <div className="flex items-center space-x-1 bg-white/80 backdrop-blur-sm rounded-full p-1">
        <Button
          variant="ghost"
          size="icon"
          className="cursor-grab"
          {...sortableAttributes}
          {...sortableListeners}
        >
          <GripVertical className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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