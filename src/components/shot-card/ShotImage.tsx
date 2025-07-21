import { useCallback, useRef, useEffect, useState } from 'react';
import { Shot } from '@/store/shotStore';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { useSingleObjectURL } from '../../hooks/useObjectURLCleanup';

interface ShotImageProps {
  shot: Shot;
  onUpdate: (updates: Partial<Shot>) => void;
  aspectRatio?: string;
}

export const ShotImage: React.FC<ShotImageProps> = ({
  shot,
  onUpdate,
  aspectRatio = '16/9'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setObjectURL, clearObjectURL } = useSingleObjectURL();
  const [objectURL, setObjectURLState] = useState<string | null>(null);

  useEffect(() => {
    if (shot.imageFile) {
      const url = setObjectURL(shot.imageFile);
      setObjectURLState(url);
    } else {
      clearObjectURL();
      setObjectURLState(null);
    }
    // Cleanup on unmount
    return () => {
      clearObjectURL();
    };
  }, [shot.imageFile, setObjectURL, clearObjectURL]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpdate({ imageFile: file });
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          onUpdate({ imageFile: file });
        }
        break;
      }
    }
  }, [onUpdate]);

  const [numerator, denominator] = aspectRatio.split('/').map(Number);
  const numericAspectRatio = denominator !== 0 ? numerator / denominator : 16 / 9;

  return (
    <div onPaste={handlePaste}>
      <AspectRatio ratio={numericAspectRatio} className="bg-muted overflow-hidden rounded-md">
        {objectURL ? (
          <img
            src={objectURL}
            alt={`Shot ${shot.number}`}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <Button variant="ghost" onClick={handleButtonClick}>
              Click or Paste Image
            </Button>
          </div>
        )}
      </AspectRatio>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden"
        accept="image/*"
      />
    </div>
  );
};

ShotImage.displayName = 'ShotImage'; 