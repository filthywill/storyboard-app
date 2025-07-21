import { Shot, StoryboardState } from '@/store/storyboardStore';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ShotTextProps {
  shot: Shot;
  onUpdate: (updates: Partial<Shot>) => void;
  templateSettings: StoryboardState['templateSettings'];
}

export const ShotText: React.FC<ShotTextProps> = ({
  shot,
  onUpdate,
  templateSettings
}) => {
  const handleTextChange = (field: 'actionText' | 'scriptText', value: string) => {
    onUpdate({ [field]: value });
  };

  return (
    <div className="mt-2 space-y-1 text-xs">
      {templateSettings.showActionText && <p>{shot.actionText}</p>}
      {templateSettings.showScriptText && <p className="text-gray-600">{shot.scriptText}</p>}
    </div>
  );
};

ShotText.displayName = 'ShotText'; 