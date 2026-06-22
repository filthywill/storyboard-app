import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { BackgroundSyncService, SyncStatus } from '@/services/backgroundSyncService'
import { useAuthStore } from '@/store/authStore'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { LogIn } from 'lucide-react'
import { getColor } from '@/styles/glassmorphism-styles'

interface OfflineBannerProps {
  onSignIn?: () => void;
}

export function OfflineBanner({ onSignIn }: OfflineBannerProps = {}) {
  const { isOnline, isReconnecting } = useNetworkStatus()
  const { authStatus, logoutReason } = useAuthStore()
  const isEmailVerificationPending = authStatus === 'authenticated_unconfirmed'
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    totalPending: 0,
    totalSyncing: 0,
    totalSynced: 0,
    totalFailed: 0,
    isOnline: true,
    isProcessing: false
  })
  const [syncError, setSyncError] = useState<string | null>(null)
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

  const shouldShowCloudQueueStatus = !isEmailVerificationPending
  const shouldShowFailedUploadWarning = shouldShowCloudQueueStatus && syncStatus.totalFailed > 0
  const shouldShowSyncingStatus = shouldShowCloudQueueStatus && syncStatus.isProcessing
  const shouldShowPendingUploadStatus = shouldShowCloudQueueStatus && syncStatus.totalPending > 0
  const hasVisibleQueueStatus =
    shouldShowFailedUploadWarning || shouldShowSyncingStatus || shouldShowPendingUploadStatus
  
  // Don't show banner if online and no queued changes and no security warnings
  if (isOnline && !hasVisibleQueueStatus && logoutReason !== 'expired' && !securityWarning) return null
  
  const getStatusMessage = () => {
    // Session expiry takes priority
    if (logoutReason === 'expired') {
      return '🔐 Your account has been logged out due to inactivity. Please log back in to save your changes.'
    }
    
    // Security warning
    if (securityWarning) {
      return `🛡️ ${securityWarning}`
    }
    
    if (!isOnline) {
      return '📡 You\'re offline - changes are saving locally and will sync when you reconnect'
    }
    
    if (shouldShowSyncingStatus) {
      const syncingCount = syncStatus.totalSyncing + syncStatus.totalPending
      return syncingCount > 0
        ? `🔄 Syncing ${syncingCount} upload(s)...`
        : '🔄 Syncing uploads...'
    }
    
    if (shouldShowFailedUploadWarning) {
      return `❌ ${syncStatus.totalFailed} upload(s) failed - will retry automatically`
    }
    
    if (shouldShowPendingUploadStatus) {
      return `⏳ ${syncStatus.totalPending} upload(s) queued for sync`
    }
    
    return null
  }
  
  const getBannerColors = () => {
    // Base palette
    const textPrimary = getColor('text', 'primary') as string
    const border = getColor('border', 'primary') as string

    // Status backgrounds using centralized status colors
    if (logoutReason === 'expired') {
      return { bg: getColor('status', 'warning') as string, border, text: textPrimary }
    }
    if (securityWarning) {
      return { bg: getColor('status', 'error') as string, border, text: textPrimary }
    }
    if (!isOnline) {
      return { bg: getColor('status', 'offline') as string, border, text: textPrimary }
    }
    if (shouldShowFailedUploadWarning) {
      return { bg: getColor('status', 'error') as string, border, text: textPrimary }
    }
    if (shouldShowSyncingStatus || shouldShowPendingUploadStatus) {
      return { bg: getColor('status', 'info') as string, border, text: textPrimary }
    }
    return { bg: getColor('status', 'success') as string, border, text: textPrimary }
  }
  
  const message = getStatusMessage()
  if (!message) return null
  
  const handleSignIn = () => {
    if (onSignIn) {
      onSignIn();
    }
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
      </div>
    </div>
  )
}



