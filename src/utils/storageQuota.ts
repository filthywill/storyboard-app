export interface StorageQuota {
  used: number
  limit: number
  percentUsed: number
  canUpload: boolean
  warningThreshold: number
  blockThreshold: number
}

export class StorageQuotaManager {
  private static readonly USER_LIMIT_MB = 10
  private static readonly WARNING_THRESHOLD_MB = 8
  private static readonly BLOCK_THRESHOLD_MB = 10
  
  static async checkUserQuota(): Promise<StorageQuota> {
    try {
      // This would integrate with Supabase to get actual usage
      // For now, we'll simulate the check
      const used = 0 // MB
      const limit = this.USER_LIMIT_MB
      const percentUsed = (used / limit) * 100
      
      return {
        used,
        limit,
        percentUsed,
        canUpload: used < this.BLOCK_THRESHOLD_MB,
        warningThreshold: this.WARNING_THRESHOLD_MB,
        blockThreshold: this.BLOCK_THRESHOLD_MB
      }
    } catch (error) {
      console.error('Failed to check storage quota:', error)
      return {
        used: 0,
        limit: this.USER_LIMIT_MB,
        percentUsed: 0,
        canUpload: true,
        warningThreshold: this.WARNING_THRESHOLD_MB,
        blockThreshold: this.BLOCK_THRESHOLD_MB
      }
    }
  }
  
  static async checkImageUploadQuota(fileSize: number): Promise<{ canUpload: boolean; reason?: string }> {
    const quota = await this.checkUserQuota()
    const fileSizeMB = fileSize / (1024 * 1024)
    
    if (quota.used + fileSizeMB > quota.blockThreshold) {
      return {
        canUpload: false,
        reason: `Upload would exceed storage limit (${quota.used.toFixed(1)}MB + ${fileSizeMB.toFixed(1)}MB > ${quota.blockThreshold}MB)`
      }
    }
    
    if (quota.used + fileSizeMB > quota.warningThreshold) {
      return {
        canUpload: true,
        reason: `Warning: Storage usage will be ${((quota.used + fileSizeMB) / quota.limit * 100).toFixed(1)}%`
      }
    }
    
    return { canUpload: true }
  }
  
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 MB'
    
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }
  
  static formatQuotaDisplay(quota: StorageQuota): string {
    return `${quota.used.toFixed(1)} / ${quota.limit} MB used`
  }
  
  static shouldShowWarning(quota: StorageQuota): boolean {
    return quota.percentUsed >= (quota.warningThreshold / quota.limit) * 100
  }
  
  static shouldBlockUpload(quota: StorageQuota): boolean {
    return quota.percentUsed >= (quota.blockThreshold / quota.limit) * 100
  }
}