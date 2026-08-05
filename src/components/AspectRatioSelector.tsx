import { useAppStore } from '@/store';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { buttonVariants } from './ui/button';
import { cn } from '@/lib/utils';
import { getLayoutToolbarContainerStyles, TOOLBAR_STYLES } from '@/styles/toolbar-styles';

interface AspectRatioSelectorProps {
  pageId: string;
}

const aspectRatios = [
  { value: '16/9', label: '16:9' },
  { value: '4/3', label: '4:3' },
  { value: '1/1', label: '1:1' },
  { value: '9/16', label: '9:16' },
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
          className={cn(TOOLBAR_STYLES.containerClasses, "max-sm:py-0.5")}
          style={getLayoutToolbarContainerStyles()}
        >
          <ToggleGroup
            type="single"
            value={currentAspectRatio} 
            onValueChange={handleAspectRatioChange}
            aria-label="Aspect Ratio"
            className="gap-1 max-sm:gap-0.5"
          >
            {aspectRatios.map((ratio) => (
              <ToggleGroupItem
                key={ratio.value}
                value={ratio.value}
                aria-label={ratio.label}
                className={cn(
                  "h-5 px-1.5 border-none transition-colors",
                  "max-sm:min-h-11 max-sm:min-w-11 max-sm:h-11 max-sm:px-2",
                  "max-sm:flex max-sm:items-center max-sm:justify-center",
                  TOOLBAR_STYLES.layoutEditableHoverClasses,
                  TOOLBAR_STYLES.textClasses
                )}
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
