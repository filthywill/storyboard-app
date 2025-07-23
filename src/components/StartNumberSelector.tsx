import { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { Input } from '@/components/ui/input';
import { ListOrdered } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { buttonVariants } from './ui/button';
import { cn } from '@/lib/utils';

export const StartNumberSelector: React.FC = () => {
  const { templateSettings, setTemplateSetting, renumberAllShotsImmediate } = useAppStore();
  const [inputValue, setInputValue] = useState(templateSettings.shotNumberFormat);

  useEffect(() => {
    setInputValue(templateSettings.shotNumberFormat);
  }, [templateSettings.shotNumberFormat]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const value = inputValue.trim();
    if (value) {
      setTemplateSetting('shotNumberFormat', value);
      // Trigger immediate renumbering with the new format
      renumberAllShotsImmediate();
    } else {
      setInputValue(templateSettings.shotNumberFormat);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setInputValue(templateSettings.shotNumberFormat);
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'flex items-center justify-between p-2 gap-2 h-10 border border-input bg-background rounded-md'
          )}
        >
          <ListOrdered size={16} />
          <Input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            className="h-7 w-[60px] border-none shadow-none bg-transparent focus:ring-0 hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors"
            maxLength={10}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Shot Number Format</p>
      </TooltipContent>
    </Tooltip>
  );
}; 