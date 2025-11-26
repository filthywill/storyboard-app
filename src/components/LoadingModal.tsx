import React from 'react';
import { MODAL_OVERLAY_STYLES, getGlassmorphismStyles, getColor } from '@/styles/glassmorphism-styles';

interface LoadingModalProps {
  isVisible: boolean;
  message?: string;
}

export function LoadingModal({ isVisible, message = "Loading project..." }: LoadingModalProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={MODAL_OVERLAY_STYLES}>
      <div 
        className="rounded-lg p-8 flex flex-col items-center gap-4 shadow-xl"
        style={getGlassmorphismStyles('dark')}
      >
        <div 
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: getColor('button', 'accent') as string }}
        ></div>
        <p 
          className="text-lg font-medium"
          style={{ color: getColor('text', 'primary') as string }}
        >
          {message}
        </p>
      </div>
    </div>
  );
}



