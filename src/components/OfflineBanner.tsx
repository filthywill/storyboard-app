import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { BackgroundSyncService, SyncStatus } from '@/services/backgroundSyncService'
import { useAuthStore } from '@/store/authStore'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { LogIn, Shield, AlertTriangle } from 'lucide-react'
import { sessionSecurity, sessionHelpers } from '@/utils/sessionSecurity'
import { getColor } from '@/styles/glassmorphism-styles'

interface OfflineBannerProps {
  onSignIn?: () => void;
}

export function OfflineBanner({ onSignIn }: OfflineBannerProps = {}) {
  const { isOnline, isReconnecting } = useNetworkStatus()
  const { logoutReason, setLogoutReason } = useAuthStore()
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    totalPending: 0,
    totalSyncing: 0,
    totalSynced: 0,
    totalFailed: 0,
    isOnline: true,
    isProcessing: false
  })
  const [syncError, setSyncError] = useState<string | null>(null)
  const [sessionTimeout, setSessionTimeout] = useState<number | null>(null)
  const [securityWarning, setSecurityWarning] = useState<string | null>(null)
  
  // Check sync status periodically
  useEffect(() => {
    const updateSyncStatus = () => {
      const status = BackgroundSyncService.getQueueStatus()
      setSyncStatus(status)
    }
    
    updateSyncStatus()
    const interval = setInterval(updateSyncStatus, 2000)
    return () => clearInterval(interval)
  }, [])
  
  useEffect(() => {
    if (isOnline && BackgroundSyncService.hasQueuedChanges()) {
      setSyncError(null)
      
      // BackgroundSyncService handles its own processing, we just need to trigger it
      // The service will automatically process the queue when online
      console.log('Network online, BackgroundSyncService will process queue automatically')
    }
  }, [isOnline])

  // Session security monitoring
  useEffect(() => {
    const checkSessionTimeout = () => {
      const timeUntilTimeout = sessionHelpers.getTimeUntilTimeout()
      if (timeUntilTimeout > 0 && timeUntilTimeout <= 5 * 60 * 1000) { // 5 minutes
        setSessionTimeout(timeUntilTimeout)
      } else {
        setSessionTimeout(null)
      }
    }

    // Check every 30 seconds
    const interval = setInterval(checkSessionTimeout, 30000)
    checkSessionTimeout() // Check immediately

    return () => clearInterval(interval)
  }, [])

  // Set up session timeout callbacks
  useEffect(() => {
    const handleTimeoutWarning = (timeRemaining: number) => {
      setSessionTimeout(timeRemaining)
    }

    const handleTimeout = () => {
      setLogoutReason('expired')
      setSessionTimeout(null)
    }

    sessionSecurity.onTimeoutWarning(handleTimeoutWarning)
    sessionSecurity.onTimeout(handleTimeout)

    return () => {
      // Cleanup is handled by sessionSecurity itself
    }
  }, [setLogoutReason])
  
  // Don't show banner if online and no queued changes and no session issues and no security warnings
  if (isOnline && !syncStatus.isProcessing && syncStatus.totalPending === 0 && syncStatus.totalFailed === 0 && logoutReason !== 'expired' && !sessionTimeout && !securityWarning) return null
  
  const getStatusMessage = () => {
    // Session expiry takes priority
    if (logoutReason === 'expired') {
      return '🔐 Your account has been logged out due to inactivity. Please log back in to save your changes.'
    }
    
    // Session timeout warning
    if (sessionTimeout) {
      const minutes = Math.ceil(sessionTimeout / (60 * 1000))
      return `⏰ Your session will expire in ${minutes} minute${minutes !== 1 ? 's' : ''}. Save your work to prevent data loss.`
    }
    
    // Security warning
    if (securityWarning) {
      return `🛡️ ${securityWarning}`
    }
    
    if (!isOnline) {
      return '📡 You\'re offline - changes are saving locally and will sync when you reconnect'
    }
    
    if (syncStatus.isProcessing) {
      return `🔄 Syncing ${syncStatus.totalPending} pending uploads...`
    }
    
    if (syncStatus.totalFailed > 0) {
      return `❌ ${syncStatus.totalFailed} upload(s) failed - will retry automatically`
    }
    
    if (syncStatus.totalPending > 0) {
      return `⏳ ${syncStatus.totalPending} upload(s) queued for sync`
    }
    
    return null
  }
  
  const getBannerColors = () => {
    // Base palette
    const textPrimary = getColor('text', 'primary') as string
    const textSecondary = getColor('text', 'secondary') as string
    const border = getColor('border', 'primary') as string

    // Status backgrounds (subtle tints)
    if (logoutReason === 'expired') {
      return { bg: 'rgba(245, 158, 11, 0.15)', border, text: textPrimary }
    }
    if (sessionTimeout) {
      return { bg: 'rgba(251, 191, 36, 0.15)', border, text: textPrimary }
    }
    if (securityWarning) {
      return { bg: 'rgba(239, 68, 68, 0.15)', border, text: textPrimary }
    }
    if (!isOnline) {
      return { bg: 'rgba(156, 163, 175, 0.2)', border, text: textPrimary }
    }
    if (syncStatus.totalFailed > 0) {
      return { bg: 'rgba(239, 68, 68, 0.15)', border, text: textPrimary }
    }
    if (syncStatus.isProcessing || syncStatus.totalPending > 0) {
      return { bg: 'rgba(59, 130, 246, 0.15)', border, text: textPrimary }
    }
    return { bg: 'rgba(34, 197, 94, 0.15)', border, text: textPrimary }
  }
  
  const message = getStatusMessage()
  if (!message) return null
  
  const handleSignIn = () => {
    if (onSignIn) {
      onSignIn();
    }
  };

  const handleExtendSession = () => {
    sessionHelpers.extendSession();
    setSessionTimeout(null);
    toast.success('Session extended successfully');
  };

  const colors = getBannerColors()

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm shadow-md`}
      style={{
        fontFamily: '"Open Sans", sans-serif',
        backgroundColor: colors.bg,
        borderBottom: `1px solid ${colors.border}`,
        color: colors.text
      }}
    >
      <div className="flex items-center justify-center gap-3">
        <span>{message}</span>
        {logoutReason === 'expired' && onSignIn && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleSignIn}
            className="ml-2"
          >
            <LogIn className="h-4 w-4 mr-1" />
            Sign In
          </Button>
        )}
        {sessionTimeout && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleExtendSession}
            className="ml-2"
          >
            <Shield className="h-4 w-4 mr-1" />
            Extend Session
          </Button>
        )}
      </div>
    </div>
  )
}



