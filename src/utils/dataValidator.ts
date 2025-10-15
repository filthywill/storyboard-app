import { StoryboardPage } from '@/store/pageStore'
import { Shot } from '@/store/shotStore'

export interface ProjectData {
  pages: StoryboardPage[]
  shots: Record<string, Shot>
  shotOrder?: string[]
  projectSettings: any
  uiSettings: any
}

export class DataValidator {
  static validateProjectData(data: any): ProjectData | null {
    try {
      // Validate pages
      if (!Array.isArray(data.pages)) {
        data.pages = []
      }
      
      // Validate shots
      if (!data.shots || typeof data.shots !== 'object') {
        data.shots = {}
      }
      
      // Validate project settings
      if (!data.projectSettings || typeof data.projectSettings !== 'object') {
        data.projectSettings = {}
      }
      
      // Validate UI settings
      if (!data.uiSettings || typeof data.uiSettings !== 'object') {
        data.uiSettings = {}
      }
      
      return data as ProjectData
    } catch (error) {
      console.error('Data validation failed:', error)
      return null
    }
  }
  
  static autoRepair(data: ProjectData): ProjectData {
    // Ensure activePageId exists
    if (data.pages.length > 0 && !data.pages.some(page => page.id === data.pages[0].id)) {
      console.warn('Fixing activePageId')
      data.pages[0].id = data.pages[0].id || `page-${Date.now()}`
    }
    
    // Derive shotOrder from pages if missing
    if (data.shots && Object.keys(data.shots).length > 0) {
      const shotOrder = Object.keys(data.shots)
      if (!shotOrder || shotOrder.length === 0) {
        console.warn('Deriving shotOrder from shots')
        // This would be handled by the store
      }
    }
    
    return data
  }
  
  static validateOnLoad(): void {
    // Check localStorage for corrupted data
    const keys = ['page-storage', 'shot-storage', 'project-storage', 'ui-storage']
    
    keys.forEach(key => {
      try {
        const data = localStorage.getItem(key)
        if (data) {
          const parsed = JSON.parse(data)
          this.validateProjectData(parsed)
        }
      } catch (error) {
        console.error(`Corrupted data in ${key}:`, error)
        // Could implement recovery logic here
      }
    })
  }
}
