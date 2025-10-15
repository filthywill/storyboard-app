import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { BackgroundSyncService, SyncStatus } from '@/services/backgroundSyncService'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export function OfflineBanner() {
  const { isOnline, isReconnecting } = useNetworkStatus()
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    totalPending: 0,
    totalSyncing: 0,
    totalSynced: 0,
    totalFailed: 0,
    isOnline: true,
    isProcessing: false
  })
  const [syncError, setSyncError] = useState<string | null>(null)
  
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
  
  // Don't show banner if online and no queued changes
  if (isOnline && !syncStatus.isProcessing && syncStatus.totalPending === 0 && syncStatus.totalFailed === 0) return null
  
  const getStatusMessage = () => {
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
  
  const getBannerStyle = () => {
    if (!isOnline) {
      return 'bg-yellow-100 border-yellow-200 text-yellow-800'
    }
    
    if (syncStatus.totalFailed > 0) {
      return 'bg-red-100 border-red-200 text-red-800'
    }
    
    if (syncStatus.isProcessing || syncStatus.totalPending > 0) {
      return 'bg-blue-100 border-blue-200 text-blue-800'
    }
    
    return 'bg-green-100 border-green-200 text-green-800'
  }
  
  const message = getStatusMessage()
  if (!message) return null
  
  return (
    <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm shadow-md ${getBannerStyle()}`}>
      <span>{message}</span>
    </div>
  )
}



