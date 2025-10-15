import { useState, useEffect } from 'react'

export interface NetworkStatus {
  isOnline: boolean
  isReconnecting: boolean
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isReconnecting, setIsReconnecting] = useState(false)
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setIsReconnecting(false)
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      setIsReconnecting(false)
    }
    
    const handleReconnecting = () => {
      setIsReconnecting(true)
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Listen for visibility change to detect reconnection
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !navigator.onLine) {
        handleReconnecting()
      }
    })
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleReconnecting)
    }
  }, [])
  
  return { isOnline, isReconnecting }
}