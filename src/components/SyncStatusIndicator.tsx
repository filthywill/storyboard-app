import React, { useState, useEffect } from 'react';
import { BackgroundSyncService, SyncStatus } from '@/services/backgroundSyncService';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { AlertCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface SyncStatusIndicatorProps {
  className?: string;
}

export function SyncStatusIndicator({ className = '' }: SyncStatusIndicatorProps) {
  const { isOnline } = useNetworkStatus();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    totalPending: 0,
    totalSyncing: 0,
    totalSynced: 0,
    totalFailed: 0,
    isOnline: true,
    isProcessing: false
  });
  const [showDetails, setShowDetails] = useState(false);

  // Update sync status periodically
  useEffect(() => {
    const updateStatus = () => {
      const status = BackgroundSyncService.getQueueStatus();
      setSyncStatus(status);
    };

    // Update immediately
    updateStatus();

    // Update every 2 seconds
    const interval = setInterval(updateStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  // Auto-dismiss when all issues are resolved
  useEffect(() => {
    if (isOnline && syncStatus.totalFailed === 0 && syncStatus.totalPending === 0) {
      setShowDetails(false);
    }
  }, [isOnline, syncStatus.totalFailed, syncStatus.totalPending]);

  // Always show indicator to display connection status
  // Only hide if there are no issues and we're online with no pending operations
  const shouldShow = !isOnline || syncStatus.totalFailed > 0 || syncStatus.totalPending > 0 || syncStatus.isProcessing;

  const handleRetryFailed = () => {
    BackgroundSyncService.retryFailed();
    toast.success('Retrying failed uploads...');
  };

  const handleClearCompleted = () => {
    BackgroundSyncService.clearCompleted();
    toast.success('Cleared completed uploads');
  };

  const getStatusIcon = () => {
    if (!isOnline) {
      return <WifiOff className="w-4 h-4 text-yellow-600" />;
    }
    
    if (syncStatus.totalFailed > 0) {
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
    
    if (syncStatus.isProcessing || syncStatus.totalPending > 0) {
      return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
    }
    
    return <Wifi className="w-4 h-4 text-green-600" />;
  };

  const getStatusText = () => {
    if (!isOnline) {
      return 'Offline';
    }
    
    if (syncStatus.totalFailed > 0) {
      return `${syncStatus.totalFailed} failed`;
    }
    
    if (syncStatus.isProcessing) {
      return 'Syncing...';
    }
    
    if (syncStatus.totalPending > 0) {
      return `${syncStatus.totalPending} pending`;
    }
    
    return 'Online';
  };

  const getStatusColor = () => {
    if (!isOnline) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    
    if (syncStatus.totalFailed > 0) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    
    if (syncStatus.isProcessing || syncStatus.totalPending > 0) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    
    return 'bg-green-100 text-green-800 border-green-200';
  };

  // Always show the indicator
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${getStatusColor()}`}
        title="Click for sync details"
      >
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </button>

      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Sync Status</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Pending:</span>
                <span className="font-medium">{syncStatus.totalPending}</span>
              </div>
              <div className="flex justify-between">
                <span>Syncing:</span>
                <span className="font-medium">{syncStatus.isProcessing ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span>Completed:</span>
                <span className="font-medium text-green-600">{syncStatus.totalSynced}</span>
              </div>
              <div className="flex justify-between">
                <span>Failed:</span>
                <span className="font-medium text-red-600">{syncStatus.totalFailed}</span>
              </div>
              <div className="flex justify-between">
                <span>Network:</span>
                <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-yellow-600'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>

            {syncStatus.totalFailed > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <button
                  onClick={handleRetryFailed}
                  className="w-full px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                >
                  Retry Failed Uploads
                </button>
              </div>
            )}

            {syncStatus.totalSynced > 0 && (
              <div className="mt-2">
                <button
                  onClick={handleClearCompleted}
                  className="w-full px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors"
                >
                  Clear Completed
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}



