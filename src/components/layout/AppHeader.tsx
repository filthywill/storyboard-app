import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useAuthModalStore } from '@/store/authModalStore';
import { OfflineBanner } from '@/components/OfflineBanner';
import { UserAccountDropdown } from '@/components/UserAccountDropdown';
import { getGlassmorphismStyles } from '@/styles/glassmorphism-styles';

/** Fixed header row height (px) — matches main page rendered height to keep alignment consistent on all routes */
const HEADER_ROW_HEIGHT_PX = 36;
const AUTH_BUTTON_HEIGHT_PX = 24; // 75% of previous 32px — smaller auth controls, same row

interface AppHeaderProps {
  /**
   * Optional content to render on the right side of the header (before auth UI)
   */
  rightSlot?: React.ReactNode;
  
  /**
   * Whether to show the offline banner
   * @default true
   */
  showOfflineBanner?: boolean;
  
  /**
   * Whether the logo should be clickable (navigates to /)
   * @default false
   */
  logoClickable?: boolean;
}

/**
 * Unified app header used across all pages
 * Contains: logo, auth UI (Sign In / User menu), and offline banner
 */
export const AppHeader: React.FC<AppHeaderProps> = ({
  rightSlot,
  showOfflineBanner = true,
  logoClickable = false,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { openAuthModal } = useAuthModalStore();
  const logoImg = (
    <img
      src="/storyboardflow-whc_01.png"
      alt="Storyboard Flow"
      className="block object-contain"
      style={{
        imageRendering: 'auto',
        maxWidth: 'none',
        width: 'auto',
        height: HEADER_ROW_HEIGHT_PX,
        filter: 'none'
      }}
    />
  );

  const logoWrapperClass = 'flex items-end';
  const logoWrapperStyle = { height: HEADER_ROW_HEIGHT_PX };

  return (
    <>
      <div className="pt-6" style={getGlassmorphismStyles('header')}>
        {/* Offline Banner */}
        {showOfflineBanner && (
          <OfflineBanner onSignIn={openAuthModal} />
        )}
        
        {/* Main Header */}
        <div className="max-w-7xl mx-auto px-6 pt-2 pb-1">
          <div
            className="flex items-end justify-between"
            style={{ height: HEADER_ROW_HEIGHT_PX, minHeight: HEADER_ROW_HEIGHT_PX }}
          >
            {/* Logo — fixed-height column so logo position is identical on all routes */}
            <div className={logoWrapperClass} style={logoWrapperStyle}>
              {logoClickable ? (
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="h-full inline-flex items-end p-0 border-0 bg-transparent focus:outline-none focus-visible:outline-none"
                >
                  {logoImg}
                </button>
              ) : (
                logoImg
              )}
            </div>
            
            {/* Right side: optional slot + auth UI */}
            <div className="flex items-end gap-4">
              {rightSlot}
              
              {/* Auth UI: Sign In button or User dropdown */}
              {import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true' && (
                <>
                  {!isAuthenticated ? (
                    <button
                      onClick={openAuthModal}
                      className="inline-flex items-center gap-2 text-sm px-1.5 rounded transition-colors leading-none"
                      style={{ 
                        height: AUTH_BUTTON_HEIGHT_PX,
                        fontFamily: '"Gabarito", sans-serif',
                        fontWeight: 600,
                        ...getGlassmorphismStyles('button')
                      }}
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      Sign In
                    </button>
                  ) : (
                    <UserAccountDropdown />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
