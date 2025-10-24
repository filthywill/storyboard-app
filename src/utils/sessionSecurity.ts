/**
 * Advanced Session Security
 * Implements session timeout warnings, device fingerprinting, and suspicious activity detection
 */

import { audit } from './auditLogger';

export interface SessionInfo {
  sessionId: string;
  userId?: string;
  startTime: number;
  lastActivity: number;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  isActive: boolean;
  warningShown: boolean;
  timeoutWarningShown: boolean;
}

export interface SecurityConfig {
  sessionTimeoutMs: number; // 30 minutes default
  warningTimeMs: number; // 5 minutes before timeout
  maxInactiveTimeMs: number; // 2 hours max inactive
  maxSessionDurationMs: number; // 8 hours max session
  suspiciousActivityThreshold: number; // 10 rapid actions
  suspiciousActivityWindowMs: number; // 1 minute window
}

const DEFAULT_CONFIG: SecurityConfig = {
  sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes
  warningTimeMs: 5 * 60 * 1000, // 5 minutes
  maxInactiveTimeMs: 2 * 60 * 60 * 1000, // 2 hours
  maxSessionDurationMs: 8 * 60 * 60 * 1000, // 8 hours
  suspiciousActivityThreshold: 200, // Increased to 200 for batch operations
  suspiciousActivityWindowMs: 60 * 1000 // 1 minute
};

class SessionSecurity {
  private config: SecurityConfig;
  private currentSession: SessionInfo | null = null;
  private activityLog: Array<{ timestamp: number; action: string }> = [];
  private warningCallbacks: Array<(timeRemaining: number) => void> = [];
  private timeoutCallbacks: Array<() => void> = [];
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeSession();
    this.startMonitoring();
  }

  /**
   * Initialize new session
   */
  private initializeSession(): void {
    const sessionId = this.generateSessionId();
    const now = Date.now();

    this.currentSession = {
      sessionId,
      startTime: now,
      lastActivity: now,
      isActive: true,
      warningShown: false,
      timeoutWarningShown: false,
      userAgent: navigator.userAgent,
      deviceFingerprint: this.generateDeviceFingerprint()
    };

    // Store session info
    sessionStorage.setItem('session-info', JSON.stringify(this.currentSession));
    
    // Log session start
    audit.login(this.currentSession.userId || 'anonymous', 'session_started');
  }

  /**
   * Start monitoring session security
   */
  private startMonitoring(): void {
    // Check every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkSessionSecurity();
    }, 30 * 1000);

    // Track user activity
    this.trackUserActivity();
  }

  /**
   * Track user activity for security monitoring
   */
  private trackUserActivity(): void {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.recordActivity(event);
      }, { passive: true });
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.recordActivity('page_hidden');
      } else {
        this.recordActivity('page_visible');
      }
    });
  }

  /**
   * Record user activity
   */
  private recordActivity(action: string): void {
    if (!this.currentSession) return;

    const now = Date.now();
    this.currentSession.lastActivity = now;

    // Throttle activity logging to prevent spam during batch operations
    const lastActivity = this.activityLog[this.activityLog.length - 1];
    if (lastActivity && (now - lastActivity.timestamp) < 500) { // Throttle to max 2 per second
      return;
    }

    // Log activity
    this.activityLog.push({ timestamp: now, action });
    
    // Keep only recent activity (last hour)
    const oneHourAgo = now - (60 * 60 * 1000);
    this.activityLog = this.activityLog.filter(log => log.timestamp > oneHourAgo);

    // Check for suspicious activity
    this.checkSuspiciousActivity();

    // Update session storage
    sessionStorage.setItem('session-info', JSON.stringify(this.currentSession));
  }

  /**
   * Check for suspicious activity patterns
   */
  private checkSuspiciousActivity(): void {
    const now = Date.now();
    const windowStart = now - this.config.suspiciousActivityWindowMs;
    
    // Count activities in the time window
    const recentActivities = this.activityLog.filter(
      log => log.timestamp > windowStart
    );

    if (recentActivities.length >= this.config.suspiciousActivityThreshold) {
      audit.suspiciousActivity(
        `High activity detected: ${recentActivities.length} actions in ${this.config.suspiciousActivityWindowMs}ms`,
        this.currentSession?.userId,
        'rapid_actions'
      );
    }

    // Check for automated patterns
    const clickEvents = recentActivities.filter(log => log.action === 'click');
    if (clickEvents.length > 5) {
      const intervals = clickEvents.slice(1).map((log, i) => 
        log.timestamp - clickEvents[i].timestamp
      );
      
      // Check for regular intervals (bot-like behavior)
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, interval) => 
        sum + Math.pow(interval - avgInterval, 2), 0
      ) / intervals.length;
      
      if (variance < 100) { // Very low variance indicates automation
        audit.suspiciousActivity(
          'Automated clicking pattern detected',
          this.currentSession?.userId,
          'automated_behavior'
        );
      }
    }
  }

  /**
   * Check session security status
   */
  private checkSessionSecurity(): void {
    if (!this.currentSession) return;

    const now = Date.now();
    const inactiveTime = now - this.currentSession.lastActivity;
    const sessionDuration = now - this.currentSession.startTime;

    // Check for session timeout
    if (inactiveTime > this.config.sessionTimeoutMs) {
      this.handleSessionTimeout();
      return;
    }

    // Check for maximum session duration
    if (sessionDuration > this.config.maxSessionDurationMs) {
      this.handleSessionExpired();
      return;
    }

    // Check for maximum inactive time
    if (inactiveTime > this.config.maxInactiveTimeMs) {
      this.handleInactiveTimeout();
      return;
    }

    // Check for timeout warning
    const timeUntilTimeout = this.config.sessionTimeoutMs - inactiveTime;
    if (timeUntilTimeout <= this.config.warningTimeMs && !this.currentSession.timeoutWarningShown) {
      this.showTimeoutWarning(timeUntilTimeout);
    }
  }

  /**
   * Show timeout warning
   */
  private showTimeoutWarning(timeRemaining: number): void {
    if (!this.currentSession) return;

    this.currentSession.timeoutWarningShown = true;
    this.currentSession.warningShown = true;

    // Notify callbacks
    this.warningCallbacks.forEach(callback => {
      try {
        callback(timeRemaining);
      } catch (error) {
        console.error('Error in timeout warning callback:', error);
      }
    });

    // Log warning
    audit.log({
      type: 'auth_session_expired',
      severity: 'medium',
      userId: this.currentSession.userId,
      details: {
        timeRemaining,
        sessionId: this.currentSession.sessionId
      },
      message: `Session timeout warning: ${Math.ceil(timeRemaining / 1000)} seconds remaining`
    });
  }

  /**
   * Handle session timeout
   */
  private handleSessionTimeout(): void {
    if (!this.currentSession) return;

    this.currentSession.isActive = false;
    
    // Log timeout
    audit.log({
      type: 'auth_session_expired',
      severity: 'high',
      userId: this.currentSession.userId,
      details: {
        sessionId: this.currentSession.sessionId,
        inactiveTime: Date.now() - this.currentSession.lastActivity
      },
      message: 'Session timed out due to inactivity'
    });

    // Notify callbacks
    this.timeoutCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in timeout callback:', error);
      }
    });
  }

  /**
   * Handle session expired (max duration)
   */
  private handleSessionExpired(): void {
    if (!this.currentSession) return;

    this.currentSession.isActive = false;
    
    audit.log({
      type: 'auth_session_expired',
      severity: 'medium',
      userId: this.currentSession.userId,
      details: {
        sessionId: this.currentSession.sessionId,
        duration: Date.now() - this.currentSession.startTime
      },
      message: 'Session expired due to maximum duration'
    });

    this.timeoutCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in session expired callback:', error);
      }
    });
  }

  /**
   * Handle inactive timeout
   */
  private handleInactiveTimeout(): void {
    if (!this.currentSession) return;

    this.currentSession.isActive = false;
    
    audit.log({
      type: 'auth_session_expired',
      severity: 'high',
      userId: this.currentSession.userId,
      details: {
        sessionId: this.currentSession.sessionId,
        inactiveTime: Date.now() - this.currentSession.lastActivity
      },
      message: 'Session terminated due to extended inactivity'
    });

    this.timeoutCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in inactive timeout callback:', error);
      }
    });
  }

  /**
   * Extend session (user is active)
   */
  extendSession(): void {
    if (!this.currentSession) return;

    this.currentSession.lastActivity = Date.now();
    this.currentSession.warningShown = false;
    this.currentSession.timeoutWarningShown = false;
    
    sessionStorage.setItem('session-info', JSON.stringify(this.currentSession));
  }

  /**
   * Get current session info
   */
  getSessionInfo(): SessionInfo | null {
    return this.currentSession;
  }

  /**
   * Get time until timeout
   */
  getTimeUntilTimeout(): number {
    if (!this.currentSession) return 0;
    
    const inactiveTime = Date.now() - this.currentSession.lastActivity;
    return Math.max(0, this.config.sessionTimeoutMs - inactiveTime);
  }

  /**
   * Add timeout warning callback
   */
  onTimeoutWarning(callback: (timeRemaining: number) => void): void {
    this.warningCallbacks.push(callback);
  }

  /**
   * Add timeout callback
   */
  onTimeout(callback: () => void): void {
    this.timeoutCallbacks.push(callback);
  }

  /**
   * Clear session
   */
  clearSession(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    this.currentSession = null;
    this.activityLog = [];
    sessionStorage.removeItem('session-info');
  }

  /**
   * Generate device fingerprint
   */
  private generateDeviceFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    // Simple hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Global session security instance
export const sessionSecurity = new SessionSecurity();

// Helper functions
export const sessionHelpers = {
  /**
   * Check if session is active
   */
  isSessionActive: (): boolean => {
    return sessionSecurity.getSessionInfo()?.isActive ?? false;
  },

  /**
   * Get time until timeout
   */
  getTimeUntilTimeout: (): number => {
    return sessionSecurity.getTimeUntilTimeout();
  },

  /**
   * Extend session
   */
  extendSession: (): void => {
    sessionSecurity.extendSession();
  },

  /**
   * Set up session timeout UI
   */
  setupTimeoutUI: (onTimeout: () => void, onWarning?: (timeRemaining: number) => void) => {
    sessionSecurity.onTimeout(onTimeout);
    if (onWarning) {
      sessionSecurity.onTimeoutWarning(onWarning);
    }
  }
};
