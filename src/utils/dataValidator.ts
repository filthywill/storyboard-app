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
   * Non-destructive localStorage validation report (on load).
   * IMPORTANT: validateOnLoad must never delete/overwrite app data automatically.
   */
  private static lastOnLoadReport: {
    ok: boolean;
    critical: boolean;
    checkedKeys: string[];
    issues: Array<{
      key: string;
      status: 'ok' | 'skipped' | 'parse_failed' | 'invalid';
      reason?: string;
      proposedRepair?: unknown;
    }>;
  } | null = null;

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
  static validateOnLoad(): {
    ok: boolean;
    critical: boolean;
    checkedKeys: string[];
    issues: Array<{
      key: string;
      status: 'ok' | 'skipped' | 'parse_failed' | 'invalid';
      reason?: string;
      proposedRepair?: unknown;
    }>;
  } {
    const baseKeys = ['page-storage', 'shot-storage', 'project-storage', 'ui-store'];
    const projectKeyPrefixes = [
      'page-storage-project-',
      'shot-storage-project-',
      'project-storage-project-',
      'ui-store-project-'
    ];

    const keys: string[] = [];
    baseKeys.forEach((k) => keys.push(k));
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (projectKeyPrefixes.some((prefix) => k.startsWith(prefix))) {
          keys.push(k);
        }
      }
    } catch {
      // Ignore enumeration failures (non-critical)
    }

    const uniqKeys = Array.from(new Set(keys));
    const issues: Array<{
      key: string;
      status: 'ok' | 'skipped' | 'parse_failed' | 'invalid';
      reason?: string;
      proposedRepair?: unknown;
    }> = [];

    const nowIso = () => new Date().toISOString();
    const indexKeyFor = (key: string) => `corrupt-backup-index:${key}`;
    const backupKeyFor = (key: string, iso: string) => `corrupt-backup:${key}:${iso}`;
    const capBackups = 3;

    const addBackup = (key: string, raw: string, why: string) => {
      try {
        const iso = nowIso();
        const backupKey = backupKeyFor(key, iso);
        localStorage.setItem(backupKey, raw);

        let index: string[] = [];
        try {
          const existing = localStorage.getItem(indexKeyFor(key));
          if (existing) {
            const parsed = JSON.parse(existing);
            if (Array.isArray(parsed)) index = parsed.filter((x) => typeof x === 'string');
          }
        } catch {
          index = [];
        }

        index.unshift(backupKey);
        const keep = index.slice(0, capBackups);
        const drop = index.slice(capBackups);
        drop.forEach((dropKey) => {
          try {
            localStorage.removeItem(dropKey);
          } catch {
            // ignore
          }
        });
        localStorage.setItem(indexKeyFor(key), JSON.stringify(keep));

        console.warn(`[DataValidator] Backed up potentially corrupt storage key "${key}" (${why}) to "${backupKey}"`);
      } catch (e) {
        console.warn(`[DataValidator] Failed to backup storage key "${key}"`, e);
      }
    };

    const kindForKey = (key: string): 'page' | 'shot' | 'project' | 'ui' | 'unknown' => {
      if (key.startsWith('page-storage')) return 'page';
      if (key.startsWith('shot-storage')) return 'shot';
      if (key.startsWith('project-storage')) return 'project';
      if (key.startsWith('ui-store')) return 'ui';
      return 'unknown';
    };

    const validatePageStore = (stateData: any) => {
      const pages = stateData?.pages;
      if (!Array.isArray(pages)) return { ok: false, reason: 'pages_not_array' };
      for (const p of pages) {
        if (!p || typeof p !== 'object' || typeof p.id !== 'string') {
          return { ok: false, reason: 'page_missing_id' };
        }
      }
      return { ok: true };
    };
    const repairPageStore = (stateData: any) => ({
      pages: Array.isArray(stateData?.pages) ? stateData.pages : [],
      activePageId: typeof stateData?.activePageId === 'string' ? stateData.activePageId : null
    });

    const validateShotStore = (stateData: any) => {
      const shots = stateData?.shots;
      if (!shots || typeof shots !== 'object') return { ok: false, reason: 'shots_not_object' };
      const shotOrder = stateData?.shotOrder;
      if (shotOrder !== undefined && !Array.isArray(shotOrder)) {
        return { ok: false, reason: 'shotOrder_not_array' };
      }
      return { ok: true };
    };
    const repairShotStore = (stateData: any) => ({
      shots: stateData?.shots && typeof stateData.shots === 'object' ? stateData.shots : {},
      shotOrder: Array.isArray(stateData?.shotOrder) ? stateData.shotOrder : []
    });

    const validateProjectStore = (stateData: any) => {
      const name = stateData?.projectName;
      if (name !== undefined && typeof name !== 'string') return { ok: false, reason: 'projectName_not_string' };
      const template = stateData?.templateSettings;
      if (template !== undefined && (template === null || typeof template !== 'object')) {
        return { ok: false, reason: 'templateSettings_not_object' };
      }
      return { ok: true };
    };
    const repairProjectStore = (stateData: any) => ({
      ...stateData,
      projectName: typeof stateData?.projectName === 'string' ? stateData.projectName : (stateData?.projectName ?? ''),
      templateSettings: stateData?.templateSettings && typeof stateData.templateSettings === 'object' ? stateData.templateSettings : {}
    });

    const validateUiStore = (stateData: any) => {
      // If we don't recognize the shape, skip rather than "repair".
      if (!stateData || typeof stateData !== 'object') return { ok: false, reason: 'ui_not_object' };
      const keysToCheck: Array<keyof any> = ['isDragging', 'isExporting', 'showDeleteConfirmation'];
      for (const k of keysToCheck) {
        if (k in stateData && typeof stateData[k] !== 'boolean') {
          return { ok: false, reason: `ui_${String(k)}_not_boolean` };
        }
      }
      return { ok: true };
    };
    const repairUiStore = (stateData: any) => ({
      isDragging: typeof stateData?.isDragging === 'boolean' ? stateData.isDragging : false,
      isExporting: typeof stateData?.isExporting === 'boolean' ? stateData.isExporting : false,
      showDeleteConfirmation:
        typeof stateData?.showDeleteConfirmation === 'boolean' ? stateData.showDeleteConfirmation : true
    });

    let critical = false;

    for (const key of uniqKeys) {
      const raw = (() => {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      })();
      if (!raw) {
        issues.push({ key, status: 'skipped', reason: 'missing' });
        continue;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        addBackup(key, raw, 'parse_failed');
        const kind = kindForKey(key);
        if (kind === 'page' || kind === 'shot' || kind === 'project') critical = true;
        issues.push({ key, status: 'parse_failed', reason: 'parse_failed' });
        continue;
      }

      // Zustand persist stores may wrap under `state`; project-scoped keys may not.
      const stateData = parsed?.state ?? parsed;
      const kind = kindForKey(key);

      // Store-specific validation only; never validate unrelated shapes.
      let v: { ok: boolean; reason?: string } | null = null;
      let proposedRepair: unknown = undefined;

      if (kind === 'page') {
        v = validatePageStore(stateData);
        if (!v.ok) proposedRepair = repairPageStore(stateData);
      } else if (kind === 'shot') {
        v = validateShotStore(stateData);
        if (!v.ok) proposedRepair = repairShotStore(stateData);
      } else if (kind === 'project') {
        v = validateProjectStore(stateData);
        if (!v.ok) proposedRepair = repairProjectStore(stateData);
      } else if (kind === 'ui') {
        v = validateUiStore(stateData);
        if (!v.ok) proposedRepair = repairUiStore(stateData);
      } else {
        issues.push({ key, status: 'skipped', reason: 'no_schema' });
        continue;
      }

      if (v.ok) {
        issues.push({ key, status: 'ok' });
        continue;
      }

      // Non-destructive: backup, report, but do NOT overwrite or remove.
      addBackup(key, raw, 'validation_failed');
      if (kind === 'page' || kind === 'shot' || kind === 'project') critical = true;
      issues.push({
        key,
        status: 'invalid',
        reason: v.reason ?? 'invalid',
        proposedRepair
      });
    }

    const ok = issues.every((i) => i.status === 'ok' || i.status === 'skipped');
    const report = {
      ok,
      critical,
      checkedKeys: uniqKeys,
      issues
    };
    this.lastOnLoadReport = report;
    if (!ok) {
      console.warn('[DataValidator] validateOnLoad detected storage issues', report);
      if (critical) {
        console.error('[DataValidator] Critical storage issues detected — automatic repair is disabled to prevent data loss.');
      }
    }
    return report;
  }

  static getLastOnLoadReport(): typeof DataValidator.lastOnLoadReport {
    return this.lastOnLoadReport;
  }
}
