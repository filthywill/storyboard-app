import React from 'react';
import { getColor, getGlassmorphismStyles } from '@/styles/glassmorphism-styles';

interface GuestLocalProjectBannerProps {
  onSignUp: () => void;
}

export function GuestLocalProjectBanner({ onSignUp }: GuestLocalProjectBannerProps) {
  return (
    <button
      type="button"
      onClick={onSignUp}
      className="fixed left-1/2 top-3 z-40 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full px-4 py-2 text-center text-sm font-semibold shadow-lg transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{
        ...getGlassmorphismStyles('buttonAccent'),
        backgroundColor: getColor('brand', 'primary') as string,
        color: getColor('brand', 'dark') as string,
      }}
    >
      Create a free account to save projects
    </button>
  );
}
