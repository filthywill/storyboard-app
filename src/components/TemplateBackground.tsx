import React from 'react';
import { getColor } from '@/styles/glassmorphism-styles';

interface TemplateBackgroundProps {
  className?: string;
}

export const TemplateBackground: React.FC<TemplateBackgroundProps> = ({ className }) => {
  const borderColor = getColor('border', 'subtle') as string;
  const textPrimary = getColor('text', 'primary') as string;
  const textSecondary = getColor('text', 'secondary') as string;
  const textMuted = getColor('text', 'muted') as string;
  const bgPrimary = getColor('background', 'primary') as string;

  return (
    <div
      className={`w-full flex justify-center p-4 rounded-lg ${className || ''}`}
      style={{ backgroundColor: bgPrimary }}
    >
      <div
        className="rounded-md shadow-lg w-full max-w-4xl"
        style={{ backgroundColor: 'rgba(255,255,255,0.95)', border: `1px solid ${borderColor}` }}
      >
        {/* Template Header */}
        <div
          className="p-4"
          style={{ backgroundColor: 'rgba(255,255,255,0.9)', borderBottom: `1px solid ${borderColor}` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}></div>
              <div>
                <div className="h-4 rounded w-32 mb-2" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}></div>
                <div className="h-3 rounded w-24" style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}></div>
              </div>
            </div>
            <div className="text-sm" style={{ color: textSecondary }}>Template</div>
          </div>
        </div>
        
        {/* Template Content */}
        <div className="p-8">
          <div className="grid grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div 
                key={i}
                className="aspect-video rounded flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.03)',
                  border: `2px dashed ${borderColor}`,
                }}
              >
                <div className="text-center">
                  <div className="w-8 h-8 rounded mx-auto mb-2" style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}></div>
                  <span className="text-sm font-medium" style={{ color: textMuted }}>
                    Shot {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <p className="text-sm" style={{ color: textSecondary }}>Storyboard Template</p>
            <p className="text-xs mt-1" style={{ color: textMuted }}>Create a project to start building your storyboard</p>
          </div>
        </div>
      </div>
    </div>
  );
};
