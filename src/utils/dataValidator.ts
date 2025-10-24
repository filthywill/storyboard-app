import { StoryboardPage } from '@/store/pageStore'
import { Shot } from '@/store/shotStore'
import { validateProjectSize, validatePageCount, validateShotCount, validateTextLength } from './requestLimits'

export interface ProjectData {
  pages: StoryboardPage[]
  shots: Record<string, Shot>
  shotOrder?: string[]
  projectSettings: any
  uiSettings: any
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  data?: ProjectData
}

export class DataValidator {
  /**
   * Comprehensive project data validation
   */
  static validateProjectData(data: any): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    try {
      // Basic structure validation
      if (!data || typeof data !== 'object') {
        errors.push('Project data is not a valid object')
        return { valid: false, errors, warnings }
      }
      
      // Validate pages
      if (!Array.isArray(data.pages)) {
        errors.push('Pages must be an array')
        return { valid: false, errors, warnings }
      }
      
      // Validate page count
      const pageCountValidation = validatePageCount(data.pages.length)
      if (!pageCountValidation.valid) {
        errors.push(pageCountValidation.error!)
      }
      
      // Validate each page
      data.pages.forEach((page: any, index: number) => {
        if (!page.id || typeof page.id !== 'string') {
          errors.push(`Page ${index} is missing valid ID`)
        }
        if (!page.name || typeof page.name !== 'string') {
          errors.push(`Page ${index} is missing valid name`)
        }
        
        // Validate page name length
        if (page.name) {
          const nameValidation = validateTextLength(page.name, 'Page name')
          if (!nameValidation.valid) {
            errors.push(`Page ${index} name: ${nameValidation.error}`)
          }
        }
      })
      
      // Validate shots
      if (!data.shots || typeof data.shots !== 'object') {
        errors.push('Shots must be an object')
        return { valid: false, errors, warnings }
      }
      
      const shotCount = Object.keys(data.shots).length
      const shotCountValidation = validateShotCount(shotCount)
      if (!shotCountValidation.valid) {
        errors.push(shotCountValidation.error!)
      }
      
      // Validate each shot
      Object.entries(data.shots).forEach(([shotId, shot]: [string, any]) => {
        if (!shot || typeof shot !== 'object') {
          errors.push(`Shot ${shotId} is not a valid object`)
          return
        }
        
        if (!shot.id || shot.id !== shotId) {
          errors.push(`Shot ${shotId} has mismatched ID`)
        }
        
        if (!shot.number || typeof shot.number !== 'string') {
          errors.push(`Shot ${shotId} is missing valid number`)
        }
        
        // Validate shot text fields
        if (shot.actionText) {
          const actionValidation = validateTextLength(shot.actionText, 'Action text')
          if (!actionValidation.valid) {
            errors.push(`Shot ${shotId} action text: ${actionValidation.error}`)
          }
        }
        
        if (shot.scriptText) {
          const scriptValidation = validateTextLength(shot.scriptText, 'Script text')
          if (!scriptValidation.valid) {
            errors.push(`Shot ${shotId} script text: ${scriptValidation.error}`)
          }
        }
      })
      
      // Validate project settings
      if (!data.projectSettings || typeof data.projectSettings !== 'object') {
        warnings.push('Project settings are missing or invalid')
        data.projectSettings = {}
      }
      
      // Validate UI settings
      if (!data.uiSettings || typeof data.uiSettings !== 'object') {
        warnings.push('UI settings are missing or invalid')
        data.uiSettings = {}
      }
      
      // Validate overall project size
      const sizeValidation = validateProjectSize(data)
      if (!sizeValidation.valid) {
        errors.push(sizeValidation.error!)
      }
      
      // Check for suspicious data patterns
      this.checkForSuspiciousData(data, warnings)
      
      return {
        valid: errors.length === 0,
        errors,
        warnings,
        data: errors.length === 0 ? data as ProjectData : undefined
      }
      
    } catch (error) {
      errors.push(`Data validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return { valid: false, errors, warnings }
    }
  }
  
  /**
   * Validate data before saving to prevent corruption
   */
  static validateBeforeSave(data: ProjectData, projectId: string, projectName: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Validate project ID matches
    if (data.projectSettings?.id && data.projectSettings.id !== projectId) {
      errors.push(`Project ID mismatch: expected ${projectId}, got ${data.projectSettings.id}`)
    }
    
    // Validate project name matches
    if (data.projectSettings?.name && data.projectSettings.name !== projectName) {
      errors.push(`Project name mismatch: expected ${projectName}, got ${data.projectSettings.name}`)
    }
    
    // Check for empty project (potential data loss)
    if (data.pages.length === 0) {
      warnings.push('Project has no pages - this may indicate data loss')
    }
    
    if (Object.keys(data.shots).length === 0) {
      warnings.push('Project has no shots - this may indicate data loss')
    }
    
    // Validate data integrity
    const validation = this.validateProjectData(data)
    if (!validation.valid) {
      errors.push(...validation.errors)
    }
    warnings.push(...validation.warnings)
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      data: errors.length === 0 ? data : undefined
    }
  }
  
  /**
   * Validate data after loading from cloud
   */
  static validateAfterLoad(data: any, expectedProjectId: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Check for suspiciously empty data
    if (!data || Object.keys(data).length === 0) {
      errors.push('Loaded data is completely empty - this may indicate data corruption')
      return { valid: false, errors, warnings }
    }
    
    // Check for missing critical fields
    if (!data.pages || data.pages.length === 0) {
      warnings.push('No pages found in loaded data')
    }
    
    if (!data.shots || Object.keys(data.shots).length === 0) {
      warnings.push('No shots found in loaded data')
    }
    
    // Validate project ID
    if (data.projectSettings?.id && data.projectSettings.id !== expectedProjectId) {
      errors.push(`Project ID mismatch: expected ${expectedProjectId}, got ${data.projectSettings.id}`)
    }
    
    // Run full validation
    const validation = this.validateProjectData(data)
    if (!validation.valid) {
      errors.push(...validation.errors)
    }
    warnings.push(...validation.warnings)
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      data: errors.length === 0 ? data as ProjectData : undefined
    }
  }
  
  /**
   * Check for suspicious data patterns that might indicate corruption
   */
  private static checkForSuspiciousData(data: any, warnings: string[]): void {
    // Check for duplicate IDs
    const pageIds = data.pages?.map((p: any) => p.id) || []
    const shotIds = Object.keys(data.shots || {})
    
    const duplicatePageIds = pageIds.filter((id: string, index: number) => pageIds.indexOf(id) !== index)
    const duplicateShotIds = shotIds.filter((id: string, index: number) => shotIds.indexOf(id) !== index)
    
    if (duplicatePageIds.length > 0) {
      warnings.push(`Duplicate page IDs found: ${duplicatePageIds.join(', ')}`)
    }
    
    if (duplicateShotIds.length > 0) {
      warnings.push(`Duplicate shot IDs found: ${duplicateShotIds.join(', ')}`)
    }
    
    // Check for extremely long text fields
    Object.entries(data.shots || {}).forEach(([shotId, shot]: [string, any]) => {
      if (shot.actionText && shot.actionText.length > 5000) {
        warnings.push(`Shot ${shotId} has unusually long action text (${shot.actionText.length} chars)`)
      }
      if (shot.scriptText && shot.scriptText.length > 5000) {
        warnings.push(`Shot ${shotId} has unusually long script text (${shot.scriptText.length} chars)`)
      }
    })
    
    // Check for missing required fields
    data.pages?.forEach((page: any, index: number) => {
      if (!page.id || !page.name) {
        warnings.push(`Page ${index} is missing required fields (id: ${!!page.id}, name: ${!!page.name})`)
      }
    })
  }
  
  /**
   * Auto-repair common data issues
   */
  static autoRepair(data: ProjectData): ProjectData {
    const repaired = { ...data }
    
    // Ensure pages array exists
    if (!Array.isArray(repaired.pages)) {
      repaired.pages = []
    }
    
    // Ensure shots object exists
    if (!repaired.shots || typeof repaired.shots !== 'object') {
      repaired.shots = {}
    }
    
    // Ensure project settings exist
    if (!repaired.projectSettings || typeof repaired.projectSettings !== 'object') {
      repaired.projectSettings = {}
    }
    
    // Ensure UI settings exist
    if (!repaired.uiSettings || typeof repaired.uiSettings !== 'object') {
      repaired.uiSettings = {}
    }
    
    // Fix missing page IDs
    repaired.pages.forEach((page, index) => {
      if (!page.id) {
        page.id = `page-${Date.now()}-${index}`
        console.warn(`Fixed missing page ID for page ${index}`)
      }
    })
    
    // Fix missing shot IDs
    Object.entries(repaired.shots).forEach(([shotId, shot]) => {
      if (!shot.id) {
        shot.id = shotId
        console.warn(`Fixed missing shot ID for shot ${shotId}`)
      }
    })
    
    return repaired
  }
  
  /**
   * Validate localStorage data on app load
   */
  static validateOnLoad(): void {
    const keys = ['page-storage', 'shot-storage', 'project-storage', 'ui-storage']
    
    keys.forEach(key => {
      try {
        const data = localStorage.getItem(key)
        if (data) {
          const parsed = JSON.parse(data)
          const validation = this.validateProjectData(parsed)
          
          if (!validation.valid) {
            console.error(`Corrupted data in ${key}:`, validation.errors)
            
            // Attempt auto-repair
            if (validation.data) {
              const repaired = this.autoRepair(validation.data)
              localStorage.setItem(key, JSON.stringify(repaired))
              console.log(`Auto-repaired data in ${key}`)
            }
          }
        }
      } catch (error) {
        console.error(`Failed to parse data in ${key}:`, error)
        // Clear corrupted data
        localStorage.removeItem(key)
        console.log(`Cleared corrupted data in ${key}`)
      }
    })
  }
}
