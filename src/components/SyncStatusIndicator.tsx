import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BackgroundSyncService, SyncStatus } from '@/services/backgroundSyncService';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { AlertCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { getGlassmorphismStyles, getColor } from '@/styles/glassmorphism-styles';

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
  const popupRef = useRef<HTMLDivElement>(null);

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

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowDetails(false);
      }
    };

    if (showDetails) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDetails]);

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
      return <WifiOff className="w-4 h-4 text-white" />;
    }
    
    if (syncStatus.totalFailed > 0) {
      return <AlertCircle className="w-4 h-4 text-white" />;
    }
    
    if (syncStatus.isProcessing || syncStatus.totalPending > 0) {
      return <RefreshCw className="w-4 h-4 text-white animate-spin" />;
    }
    
    return <Wifi className="w-4 h-4 text-white" />;
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
      return 'bg-yellow-500 text-white border-yellow-600';
    }
    
    if (syncStatus.totalFailed > 0) {
      return 'bg-red-500 text-white border-red-600';
    }
    
    if (syncStatus.isProcessing || syncStatus.totalPending > 0) {
      return 'bg-blue-500 text-white border-blue-600';
    }
    
    return 'bg-green-500 text-white border-green-600';
  };

  // Always show the indicator
  const isActivelySyncing = syncStatus.totalPending > 0;
  const isOffline = !isOnline;
  const statusColor = getStatusColor();
  
  // Determine button styling based on status
  const getButtonClasses = () => {
    if (isOffline) {
      return "bg-yellow-400 shadow-yellow-400/50";
    }
    if (syncStatus.totalFailed > 0) {
      return "bg-red-500 shadow-red-500/50";
    }
    if (syncStatus.isProcessing || syncStatus.totalPending > 0) {
      return "bg-blue-500 shadow-blue-500/50";
    }
    return "bg-green-500 shadow-green-500/50";
  };

  const getGlowStyle = () => {
    const errorGlow = getColor('status', 'errorGlow');
    const infoGlow = getColor('status', 'infoGlow');
    const successGlow = getColor('status', 'successGlow');
    
    if (isOffline) {
      return {
        boxShadow: 'none',
        filter: 'none'
      };
    }
    if (syncStatus.totalFailed > 0) {
      return {
        boxShadow: `0 0 2px ${errorGlow}, 0 0 4px ${errorGlow}`,
        filter: `drop-shadow(0 0 1px ${errorGlow})`
      };
    }
    if (syncStatus.isProcessing || syncStatus.totalPending > 0) {
      return {
        boxShadow: isActivelySyncing 
          ? `0 0 3px ${infoGlow}, 0 0 6px ${infoGlow}`
          : `0 0 2px ${infoGlow}, 0 0 4px ${infoGlow}`,
        filter: `drop-shadow(0 0 1px ${infoGlow})`
      };
    }
    return {
      boxShadow: isActivelySyncing 
        ? `0 0 3px ${successGlow}, 0 0 6px ${successGlow}`
        : `0 0 2px ${successGlow}, 0 0 4px ${successGlow}`,
      filter: `drop-shadow(0 0 1px ${successGlow})`
    };
  };
  
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`inline-flex items-center justify-center w-3 h-3 rounded-full ${getButtonClasses()} transition-all hover:scale-110`}
        style={getGlowStyle()}
        title="Click for sync details"
      >
      </button>

      {showDetails && createPortal(
        <>
          {/* Backdrop to ensure popup is above everything */}
          <div className="fixed inset-0 z-[99998]" onClick={() => setShowDetails(false)} />
          
          {/* Popup */}
          <div 
            ref={popupRef}
            className="fixed top-16 right-6 w-80 bg-white rounded-lg shadow-2xl z-[99999]"
            style={{ fontFamily: '"Open Sans", sans-serif', border: '1px solid rgb(209, 213, 219)' }}
          >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-base">Sync Status</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700 text-lg font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-700 font-medium">Pending:</span>
                <span className="font-semibold text-gray-900">{syncStatus.totalPending}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-700 font-medium">Syncing:</span>
                <span className="font-semibold text-gray-900">{syncStatus.isProcessing ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-700 font-medium">Completed:</span>
                <span className="font-semibold text-green-700">{syncStatus.totalSynced}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-700 font-medium">Failed:</span>
                <span className="font-semibold text-red-700">{syncStatus.totalFailed}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-700 font-medium">Network:</span>
                <span className={`font-semibold ${isOnline ? 'text-green-700' : 'text-yellow-700'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>

            {syncStatus.totalFailed > 0 && (
              <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgb(209, 213, 219)' }}>
                <button
                  onClick={handleRetryFailed}
                  className="w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors shadow-sm"
                >
                  Retry Failed Uploads
                </button>
              </div>
            )}

            {syncStatus.totalSynced > 0 && (
              <div className="mt-2">
                <button
                  onClick={handleClearCompleted}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
                  style={{ border: '1px solid rgb(229, 231, 235)' }}
                >
                  Clear Completed
                </button>
              </div>
            )}
          </div>
        </div>
        </>,
        document.body
      )}
    </div>
  );
}



