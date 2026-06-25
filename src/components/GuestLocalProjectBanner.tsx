import React from 'react';
import { getColor } from '@/styles/glassmorphism-styles';

interface GuestLocalProjectBannerProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

const linkClassName =
  'font-semibold underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-1';

export function GuestLocalProjectBanner({ onSignIn, onSignUp }: GuestLocalProjectBannerProps) {
  const textColor = getColor('brand', 'dark') as string;
  const bg = getColor('brand', 'primary') as string;
  const border = getColor('brand', 'secondary') as string;

  return (
    <div
      role="region"
      aria-label="Local project notice"
      className="fixed top-0 left-0 right-0 z-50 px-4 py-1 text-center text-sm shadow-md"
      style={{
        fontFamily: '"Open Sans", sans-serif',
        backgroundColor: bg,
        borderBottom: `1px solid ${border}`,
        color: textColor,
      }}
    >
      <p>
        <button type="button" className={linkClassName} style={{ color: textColor }} onClick={onSignUp}>
          Create a free account
        </button>
        {' or '}
        <button type="button" className={linkClassName} style={{ color: textColor }} onClick={onSignIn}>
          Sign In
        </button>
        {' to save your project.'}
      </p>
    </div>
  );
}
