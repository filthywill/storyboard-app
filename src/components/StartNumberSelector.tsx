import { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { Input } from '@/components/ui/input';
import { ListOrdered } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { buttonVariants } from './ui/button';
import { cn } from '@/lib/utils';
import { getToolbarContainerStyles, TOOLBAR_STYLES } from '@/styles/toolbar-styles';

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
          className={cn(TOOLBAR_STYLES.containerClasses)}
          style={getToolbarContainerStyles()}
        >
          <ListOrdered size={16} className={TOOLBAR_STYLES.iconClasses} />
          <Input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            className={`h-5 w-[45px] border-none shadow-none bg-transparent focus:ring-0 focus:outline-none hover:bg-white/10 ${TOOLBAR_STYLES.textClasses} rounded-sm transition-colors`}
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