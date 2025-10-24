/**
 * Audit Logger for Security Events
 * Tracks security-relevant events for monitoring and analysis
 */

export interface AuditEvent {
  id: string;
  timestamp: number;
  type: AuditEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  message: string;
}

export type AuditEventType = 
  | 'auth_login'
  | 'auth_logout'
  | 'auth_failed'
  | 'auth_session_expired'
  | 'auth_forced_logout'
  | 'data_save'
  | 'data_load'
  | 'data_validation_failed'
  | 'data_corruption_detected'
  | 'rate_limit_exceeded'
  | 'request_size_exceeded'
  | 'file_upload'
  | 'file_download'
  | 'export_pdf'
  | 'project_create'
  | 'project_delete'
  | 'project_share'
  | 'security_header_violation'
  | 'csp_violation'
  | 'xss_attempt'
  | 'injection_attempt'
  | 'suspicious_activity'
  | 'system_error'
  | 'performance_issue';

class AuditLogger {
  private events: AuditEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 events in memory
  private isEnabled = true;

  /**
   * Log a security event
   */
  log(event: Omit<AuditEvent, 'id' | 'timestamp'>): void {
    if (!this.isEnabled) return;

    const auditEvent: AuditEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      ...event
    };

    this.events.push(auditEvent);

    // Keep only the most recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log(`🔒 AUDIT [${event.severity.toUpperCase()}] ${event.type}:`, {
        message: event.message,
        userId: event.userId,
        details: event.details
      });
    }

    // In production, you might want to send to a logging service
    this.sendToExternalService(auditEvent);
  }

  /**
   * Log authentication events
   */
  logAuth(event: 'login' | 'logout' | 'failed' | 'session_expired' | 'forced_logout', details: {
    userId?: string;
    email?: string;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
  }): void {
    const severity = event === 'failed' || event === 'forced_logout' ? 'high' : 'medium';
    
    this.log({
      type: `auth_${event}` as AuditEventType,
      severity,
      userId: details.userId,
      details: {
        email: details.email,
        reason: details.reason,
        ipAddress: details.ipAddress,
        userAgent: details.userAgent
      },
      message: `Authentication ${event}: ${details.email || details.userId || 'unknown'}`
    });
  }

  /**
   * Log data-related events
   */
  logData(event: 'save' | 'load' | 'validation_failed' | 'corruption_detected', details: {
    projectId?: string;
    projectName?: string;
    dataSize?: number;
    validationErrors?: string[];
    corruptionType?: string;
  }): void {
    const severity = event === 'corruption_detected' ? 'critical' : 
                   event === 'validation_failed' ? 'high' : 'medium';

    this.log({
      type: `data_${event}` as AuditEventType,
      severity,
      details: {
        projectId: details.projectId,
        projectName: details.projectName,
        dataSize: details.dataSize,
        validationErrors: details.validationErrors,
        corruptionType: details.corruptionType
      },
      message: `Data ${event}: ${details.projectName || details.projectId || 'unknown'}`
    });
  }

  /**
   * Log rate limiting events
   */
  logRateLimit(details: {
    userId?: string;
    endpoint?: string;
    requestsPerWindow?: number;
    windowMs?: number;
    remainingRequests?: number;
  }): void {
    this.log({
      type: 'rate_limit_exceeded',
      severity: 'medium',
      userId: details.userId,
      details: {
        endpoint: details.endpoint,
        requestsPerWindow: details.requestsPerWindow,
        windowMs: details.windowMs,
        remainingRequests: details.remainingRequests
      },
      message: `Rate limit exceeded for ${details.endpoint || 'unknown endpoint'}`
    });
  }

  /**
   * Log security violations
   */
  logSecurityViolation(violation: 'csp' | 'xss' | 'injection' | 'header', details: {
    violationType: string;
    blockedContent?: string;
    source?: string;
    line?: number;
    column?: number;
  }): void {
    this.log({
      type: `${violation}_violation` as AuditEventType,
      severity: 'high',
      details: {
        violationType: details.violationType,
        blockedContent: details.blockedContent,
        source: details.source,
        line: details.line,
        column: details.column
      },
      message: `Security violation: ${details.violationType}`
    });
  }

  /**
   * Log suspicious activity
   */
  logSuspiciousActivity(activity: string, details: {
    userId?: string;
    pattern?: string;
    frequency?: number;
    context?: string;
  }): void {
    this.log({
      type: 'suspicious_activity',
      severity: 'high',
      userId: details.userId,
      details: {
        activity,
        pattern: details.pattern,
        frequency: details.frequency,
        context: details.context
      },
      message: `Suspicious activity detected: ${activity}`
    });
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 100): AuditEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get events by type
   */
  getEventsByType(type: AuditEventType, limit: number = 100): AuditEvent[] {
    return this.events
      .filter(event => event.type === type)
      .slice(-limit);
  }

  /**
   * Get events by severity
   */
  getEventsBySeverity(severity: AuditEvent['severity'], limit: number = 100): AuditEvent[] {
    return this.events
      .filter(event => event.severity === severity)
      .slice(-limit);
  }

  /**
   * Get events for a specific user
   */
  getUserEvents(userId: string, limit: number = 100): AuditEvent[] {
    return this.events
      .filter(event => event.userId === userId)
      .slice(-limit);
  }

  /**
   * Clear old events
   */
  clearOldEvents(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - olderThanMs;
    this.events = this.events.filter(event => event.timestamp > cutoff);
  }

  /**
   * Export events for analysis
   */
  exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send to external logging service (implement as needed)
   */
  private sendToExternalService(event: AuditEvent): void {
    // In production, you might want to send to:
    // - Sentry
    // - LogRocket
    // - Custom logging endpoint
    // - Local file system
    
    // For now, we'll just store in memory
    // You could implement:
    // - fetch('/api/audit-logs', { method: 'POST', body: JSON.stringify(event) })
    // - localStorage.setItem('audit_logs', JSON.stringify([...this.events]))
  }
}

// Global audit logger instance
export const auditLogger = new AuditLogger();

// Helper functions for common audit events
export const audit = {
  /**
   * Log user login
   */
  login: (userId: string, email: string, ipAddress?: string, userAgent?: string) => {
    auditLogger.logAuth('login', { userId, email, ipAddress, userAgent });
  },

  /**
   * Log user logout
   */
  logout: (userId: string, email: string, ipAddress?: string, userAgent?: string) => {
    auditLogger.logAuth('logout', { userId, email, ipAddress, userAgent });
  },

  /**
   * Log failed authentication
   */
  authFailed: (email: string, reason: string, ipAddress?: string, userAgent?: string) => {
    auditLogger.logAuth('failed', { email, reason, ipAddress, userAgent });
  },

  /**
   * Log data save
   */
  dataSave: (projectId: string, projectName: string, dataSize: number, userId?: string) => {
    auditLogger.logData('save', { projectId, projectName, dataSize, userId });
  },

  /**
   * Log data corruption
   */
  dataCorruption: (projectId: string, corruptionType: string, userId?: string) => {
    auditLogger.logData('corruption_detected', { projectId, corruptionType, userId });
  },

  /**
   * Log rate limit exceeded
   */
  rateLimitExceeded: (userId: string, endpoint: string, requestsPerWindow: number) => {
    auditLogger.logRateLimit({ userId, endpoint, requestsPerWindow });
  },

  /**
   * Log security violation
   */
  securityViolation: (violation: 'csp' | 'xss' | 'injection' | 'header', details: any) => {
    auditLogger.logSecurityViolation(violation, details);
  },

  /**
   * Log suspicious activity
   */
  suspiciousActivity: (activity: string, userId?: string, context?: string) => {
    auditLogger.logSuspiciousActivity(activity, { userId, context });
  }
};

// Initialize audit logging on app start
if (typeof window !== 'undefined') {
  // Set up CSP violation reporting
  document.addEventListener('securitypolicyviolation', (event) => {
    audit.securityViolation('csp', {
      violationType: event.violatedDirective,
      blockedContent: event.blockedURI,
      source: event.sourceFile,
      line: event.lineNumber,
      column: event.columnNumber
    });
  });

  // Set up error reporting for security-related errors
  window.addEventListener('error', (event) => {
    if (event.error?.message?.includes('CSP') || 
        event.error?.message?.includes('Content Security Policy')) {
      audit.securityViolation('csp', {
        violationType: 'script_error',
        source: event.filename,
        line: event.lineno,
        column: event.colno
      });
    }
  });
}
