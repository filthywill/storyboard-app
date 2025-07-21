import { useAppStore } from '@/store';
import { RectangleHorizontal } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { buttonVariants } from './ui/button';
import { cn } from '@/lib/utils';

interface AspectRatioSelectorProps {
  pageId: string;
}

const aspectRatios = [
  { value: '16/9', label: '16:9' },
  { value: '4/3', label: '4:3' },
  { value: '1/1', label: '1:1' },
];

export const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({ pageId }) => {
  const { pages, updatePageAspectRatio } = useAppStore();
  const page = pages.find(p => p.id === pageId);

  if (!page) return null;

  const currentAspectRatio = page.aspectRatio || '16/9';

  const handleAspectRatioChange = (value: string) => {
    if (value) {
    updatePageAspectRatio(pageId, value);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'flex items-center justify-between p-2 gap-2 h-10'
          )}
        >
          <RectangleHorizontal size={16} />
          <ToggleGroup
            type="single"
            value={currentAspectRatio} 
            onValueChange={handleAspectRatioChange}
            aria-label="Aspect Ratio"
            className='gap-1'
          >
            {aspectRatios.map((ratio) => (
              <ToggleGroupItem
                key={ratio.value}
                value={ratio.value}
                aria-label={ratio.label}
                className="h-7 px-2 border-none"
                >
                  {ratio.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Shot Aspect Ratio</p>
      </TooltipContent>
    </Tooltip>
  );
};
