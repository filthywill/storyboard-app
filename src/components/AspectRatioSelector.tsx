
import React from 'react';
import { useStoryboardStore } from '@/store/storyboardStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { RectangleHorizontal } from 'lucide-react';

interface AspectRatioSelectorProps {
  pageId: string;
}

const aspectRatios = [
  { value: '16/9', label: '16:9 (Widescreen)', ratio: 16/9 },
  { value: '4/3', label: '4:3 (Standard)', ratio: 4/3 },
  { value: '1/1', label: '1:1 (Square)', ratio: 1 },
  { value: '3/4', label: '3:4 (Portrait)', ratio: 3/4 },
  { value: '21/9', label: '21:9 (Ultrawide)', ratio: 21/9 }
];

export const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({ pageId }) => {
  const { pages, updatePageAspectRatio } = useStoryboardStore();
  const page = pages.find(p => p.id === pageId);

  if (!page) return null;

  const currentAspectRatio = page.aspectRatio || '16/9';

  const handleAspectRatioChange = (value: string) => {
    updatePageAspectRatio(pageId, value);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <RectangleHorizontal size={16} />
          Image Aspect Ratio
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup 
          value={currentAspectRatio} 
          onValueChange={handleAspectRatioChange}
          className="space-y-3"
        >
          {aspectRatios.map((ratio) => (
            <div key={ratio.value} className="flex items-center space-x-3">
              <RadioGroupItem value={ratio.value} id={ratio.value} />
              <label 
                htmlFor={ratio.value} 
                className="text-sm font-medium text-gray-700 cursor-pointer flex-1"
              >
                {ratio.label}
              </label>
              {/* Visual preview */}
              <div className="flex items-center">
                <div 
                  className="bg-gray-200 border border-gray-300 rounded"
                  style={{
                    width: `${Math.min(32, 32 * ratio.ratio)}px`,
                    height: `${Math.min(32, 32 / ratio.ratio)}px`,
                    minWidth: '16px',
                    minHeight: '16px'
                  }}
                />
              </div>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
};
