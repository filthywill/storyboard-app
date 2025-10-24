import React from 'react';

interface TemplateBackgroundProps {
  className?: string;
}

export const TemplateBackground: React.FC<TemplateBackgroundProps> = ({ className }) => {
  return (
    <div className={`w-full flex justify-center bg-gray-100 p-4 rounded-lg ${className || ''}`}>
      <div className="bg-white rounded-md shadow-lg border border-gray-200 w-full max-w-4xl">
        {/* Template Header */}
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gray-300 rounded"></div>
              <div>
                <div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
            <div className="text-sm text-gray-500">Template</div>
          </div>
        </div>
        
        {/* Template Content */}
        <div className="p-8">
          <div className="grid grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div 
                key={i} 
                className="aspect-video bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center hover:border-gray-400 transition-colors"
              >
                <div className="text-center">
                  <div className="w-8 h-8 bg-gray-200 rounded mx-auto mb-2"></div>
                  <span className="text-gray-400 text-sm font-medium">Shot {String(i + 1).padStart(2, '0')}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <p className="text-gray-500 text-sm">Storyboard Template</p>
            <p className="text-gray-400 text-xs mt-1">Create a project to start building your storyboard</p>
          </div>
        </div>
      </div>
    </div>
  );
};
