import React from 'react';

interface LoadingModalProps {
  isVisible: boolean;
  message?: string;
}

export function LoadingModal({ isVisible, message = "Loading project..." }: LoadingModalProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 flex flex-col items-center gap-4 shadow-xl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-700 text-lg font-medium">{message}</p>
      </div>
    </div>
  );
}



