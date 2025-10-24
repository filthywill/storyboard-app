/**
 * Security Notification Service
 * Integrates security events with existing notification system
 */

import { toast } from 'sonner'
import { audit, auditLogger } from '@/utils/auditLogger'
import { checkRateLimit, getUserIdentifier } from '@/utils/rateLimiter'
import { validateProjectSize, validateImageSize, validateTextLength } from '@/utils/requestLimits'

class SecurityNotificationService {
  /**
   * Show rate limiting notification
   */
  static showRateLimitWarning(endpoint: string, remaining: number, resetTime: number): void {
    const minutes = Math.ceil(resetTime / (60 * 1000))
    
    toast.warning('Rate limit exceeded', {
      description: `Too many requests to ${endpoint}. ${remaining} requests remaining. Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`,
      duration: 5000
    })

    // Log the event
    audit.rateLimitExceeded(getUserIdentifier(), endpoint, remaining)
  }

  /**
   * Show request size limit notification
   */
  static showSizeLimitWarning(type: 'project' | 'image' | 'text', size: number, maxSize: number): void {
    const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    let message = ''
    switch (type) {
      case 'project':
        message = `Project size (${formatBytes(size)}) exceeds limit (${formatBytes(maxSize)})`
        break
      case 'image':
        message = `Image size (${formatBytes(size)}) exceeds limit (${formatBytes(maxSize)})`
        break
      case 'text':
        message = `Text length (${size} characters) exceeds limit (${maxSize} characters)`
        break
    }

    toast.error('Size limit exceeded', {
      description: message,
      duration: 7000
    })

    // Log the event
    auditLogger.log({
      type: 'request_size_exceeded',
      severity: 'medium',
      details: { type, size, maxSize },
      message: `Size limit exceeded: ${type}`
    })
  }

  /**
   * Show data validation warning
   */
  static showDataValidationWarning(errors: string[], warnings: string[]): void {
    if (errors.length > 0) {
      toast.error('Data validation failed', {
        description: errors.slice(0, 2).join(', ') + (errors.length > 2 ? '...' : ''),
        duration: 8000
      })
    } else if (warnings.length > 0) {
      toast.warning('Data validation warnings', {
        description: warnings.slice(0, 2).join(', ') + (warnings.length > 2 ? '...' : ''),
        duration: 6000
      })
    }

    // Log the event
    auditLogger.log({
      type: 'data_validation_failed',
      severity: errors.length > 0 ? 'high' : 'medium',
      details: { errors, warnings },
      message: `Data validation: ${errors.length} errors, ${warnings.length} warnings`
    })
  }

  /**
   * Show security violation notification
   */
  static showSecurityViolation(violation: string, details?: string): void {
    toast.error('Security violation detected', {
      description: details || violation,
      duration: 8000
    })

    // Log the event
    audit.securityViolation('csp', { violationType: violation, details })
  }

  /**
   * Show suspicious activity notification
   */
  static showSuspiciousActivity(activity: string, context?: string): void {
    toast.warning('Suspicious activity detected', {
      description: context || activity,
      duration: 6000
    })

    // Log the event
    audit.suspiciousActivity(activity, getUserIdentifier(), context)
  }

  /**
   * Show memory usage warning
   */
  static showMemoryWarning(usage: number, threshold: number): void {
    toast.warning('High memory usage', {
      description: `Memory usage is at ${usage.toFixed(1)}% (threshold: ${threshold}%). Consider refreshing the page.`,
      duration: 5000
    })

    // Log the event
    auditLogger.log({
      type: 'performance_issue',
      severity: 'medium',
      details: { usage, threshold },
      message: `High memory usage: ${usage.toFixed(1)}%`
    })
  }

  /**
   * Show successful security event
   */
  static showSecuritySuccess(message: string, description?: string): void {
    toast.success(message, {
      description,
      duration: 3000
    })
  }

  /**
   * Check rate limit before API call
   */
  static async checkRateLimitBeforeCall(rateLimiter: any, endpoint: string): Promise<boolean> {
    const result = await checkRateLimit(rateLimiter, getUserIdentifier())
    
    if (!result.allowed) {
      this.showRateLimitWarning(endpoint, result.remaining || 0, result.resetTime || 0)
      return false
    }
    
    return true
  }

  /**
   * Validate and show warnings for project data
   */
  static validateProjectData(data: any): boolean {
    const sizeValidation = validateProjectSize(data)
    if (!sizeValidation.valid) {
      this.showSizeLimitWarning('project', sizeValidation.size, sizeValidation.maxSize)
      return false
    }

    // Check text fields
    if (data.pages) {
      for (const page of data.pages) {
        if (page.name) {
          const nameValidation = validateTextLength(page.name, 'Page name')
          if (!nameValidation.valid) {
            this.showSizeLimitWarning('text', nameValidation.length, nameValidation.maxLength)
            return false
          }
        }
      }
    }

    if (data.shots) {
      for (const [shotId, shot] of Object.entries(data.shots)) {
        if (shot.actionText) {
          const actionValidation = validateTextLength(shot.actionText, 'Action text')
          if (!actionValidation.valid) {
            this.showSizeLimitWarning('text', actionValidation.length, actionValidation.maxLength)
            return false
          }
        }
        if (shot.scriptText) {
          const scriptValidation = validateTextLength(shot.scriptText, 'Script text')
          if (!scriptValidation.valid) {
            this.showSizeLimitWarning('text', scriptValidation.length, scriptValidation.maxLength)
            return false
          }
        }
      }
    }

    return true
  }

  /**
   * Validate and show warnings for image upload
   */
  static validateImageUpload(file: File): boolean {
    const sizeValidation = validateImageSize(file)
    if (!sizeValidation.valid) {
      this.showSizeLimitWarning('image', sizeValidation.size, sizeValidation.maxSize)
      return false
    }

    return true
  }
}

export { SecurityNotificationService }
