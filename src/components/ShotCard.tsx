
import React, { useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Shot } from '@/store/storyboardStore';
import { GripVertical, Plus, X, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShotCardProps {
  shot: Shot;
  onUpdate: (updates: Partial<Shot>) => void;
  onDelete: () => void;
  isOverlay?: boolean;
  className?: string;
}

export const ShotCard: React.FC<ShotCardProps> = ({
  shot,
  onUpdate,
  onDelete,
  isOverlay = false,
  className
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageError, setImageError] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: shot.id,
    data: {
      type: 'Shot',
      shot
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      console.warn('Selected file is not an image');
      return;
    }

    // Create object URL for preview
    const imageUrl = URL.createObjectURL(file);
    
    onUpdate({
      imageFile: file,
      imageUrl: imageUrl
    });
    
    setImageError(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleImageError = () => {
    setImageError(true);
    onUpdate({ imageUrl: null });
  };

  const handleRemoveImage = () => {
    if (shot.imageUrl) {
      URL.revokeObjectURL(shot.imageUrl);
    }
    onUpdate({
      imageFile: null,
      imageUrl: null
    });
    setImageError(false);
  };

  const handleDescriptionChange = (value: string) => {
    onUpdate({ description: value });
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative h-full min-h-[300px] transition-all duration-200',
        isDragging && 'opacity-50 rotate-2 shadow-lg',
        isOverlay && 'rotate-2 shadow-xl',
        'hover:shadow-md border-2',
        isDragOver && 'border-blue-400 bg-blue-50',
        className
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <div className="bg-white/90 backdrop-blur-sm rounded p-1 shadow-sm">
          <GripVertical size={16} className="text-gray-600" />
        </div>
      </div>

      {/* Shot Number */}
      <div className="absolute top-2 right-2 z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold text-gray-700 shadow-sm">
          {shot.number}
        </div>
      </div>

      {/* Delete Button */}
      <Button
        variant="destructive"
        size="sm"
        className="absolute top-2 right-12 z-10 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onDelete}
      >
        <X size={14} />
      </Button>

      <CardContent className="p-4 h-full flex flex-col">
        {/* Image Area */}
        <div
          className={cn(
            'relative flex-1 min-h-[180px] border-2 border-dashed border-gray-300 rounded-lg',
            'transition-all duration-200',
            isDragOver && 'border-blue-400 bg-blue-50',
            'hover:border-gray-400'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {shot.imageUrl && !imageError ? (
            <div className="relative w-full h-full group">
              <img
                src={shot.imageUrl}
                alt={`Shot ${shot.number}`}
                className="w-full h-full object-cover rounded-lg"
                onError={handleImageError}
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white/90 hover:bg-white"
                  >
                    <Upload size={14} className="mr-1" />
                    Change
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveImage}
                    className="bg-red-500/90 hover:bg-red-500"
                  >
                    <X size={14} className="mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div 
              className="w-full h-full flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:text-gray-700 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus size={32} className="mb-2" />
              <span className="text-sm font-medium">Add Image</span>
              <span className="text-xs text-gray-400 mt-1">
                Drag & drop or click
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="mt-4">
          <Textarea
            placeholder="Shot description..."
            value={shot.description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            className="min-h-[60px] text-sm resize-none border-gray-200 focus:border-blue-400 transition-colors"
            maxLength={200}
          />
          <div className="text-xs text-gray-400 mt-1 text-right">
            {shot.description.length}/200
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </CardContent>
    </Card>
  );
};
