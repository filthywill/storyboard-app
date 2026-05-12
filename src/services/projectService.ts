import { supabase } from '@/lib/supabase';
import { SecurityNotificationService } from './securityNotificationService';
import { DataValidator } from '@/utils/dataValidator';
import { StoryboardTheme } from '@/styles/storyboardTheme';
import { useProjectManagerStore } from '@/store/projectManagerStore';
import type { PageSizeMode } from '@/utils/pageSize';

export class UpgradeRequiredError extends Error {
  code = "UPGRADE_REQUIRED";
  
  constructor(message: string = "Free plan limit reached. Upgrade to Pro for unlimited projects.") {
    super(message);
    this.name = "UpgradeRequiredError";
  }
}

export class ProjectConflictError extends Error {
  code = "CONFLICT";
  conflictUpdatedAt?: string | null;

  constructor(message: string = "Project was updated elsewhere.", conflictUpdatedAt?: string | null) {
    super(message);
    this.name = "ProjectConflictError";
    this.conflictUpdatedAt = conflictUpdatedAt ?? null;
  }
}

export class LeaseRejectedError extends Error {
  code = "LEASE_REJECTED";
  holder?: string | null;
  expiresAt?: string | null;
  updatedAt?: string | null;

  constructor(
    message: string = "Writer lease rejected.",
    holder?: string | null,
    expiresAt?: string | null,
    updatedAt?: string | null
  ) {
    super(message);
    this.name = "LeaseRejectedError";
    this.holder = holder ?? null;
    this.expiresAt = expiresAt ?? null;
    this.updatedAt = updatedAt ?? null;
  }
}

export interface ProjectData {
  pages: any[];
  shots: Record<string, any>;
  shotOrder?: string[];
  updatedAt?: string | null;
  projectSettings: {
    projectName: string;
    projectInfo: any;
    projectLogoUrl?: string;
    clientAgency: any;
    jobInfo: any;
    pageSizeMode?: PageSizeMode;
    templateSettings: any;
    storyboardTheme?: StoryboardTheme; // Optional for backwards compatibility
  };
  uiSettings: {
    isDragging: boolean;
    isExporting: boolean;
    showDeleteConfirmation: boolean;
  };
}

export class ProjectService {
  static async createProject(name: string, description?: string): Promise<{ id: string; updatedAt: string | null }> {
    const { data: { user } } = await supabase.auth.getUser();
  
    if (!user) throw new Error("Not authenticated");
  
    const { data, error } = await supabase
      .from("projects")
      .insert({
        name,
        description: description || null,
        user_id: user.id,
      })
      .select()
      .single();
  
    if (error) {
      // When RLS policy blocks insert, Postgres returns "new row violates row-level security policy"
      const msg = (error as any)?.message ?? "";
    
      if (msg.toLowerCase().includes("row-level security")) {
        throw new UpgradeRequiredError();
      }
    
      throw error;
    }
  
    const now = new Date().toISOString();
    // Create empty project data entry
    const { error: dataError } = await supabase
      .from("project_data")
      .insert({
        project_id: data.id,
        pages: [],
        shots: {},
        project_settings: {},
        ui_settings: {},
        updated_at: now
      });
  
    if (dataError) throw dataError;
  
    return { id: data.id, updatedAt: now };
  }
  

  static async getProject(projectId: string): Promise<ProjectData> {
    const { data, error } = await supabase
      .from('project_data')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error) {
      throw error;
    }

    // Migration: Add default theme if missing, or migrate old themes
    const projectSettings = data.project_settings || {};
    const { getDefaultTheme, migrateTheme } = await import('@/styles/storyboardTheme');
    
    const originalThemeJson = JSON.stringify(projectSettings.storyboardTheme ?? null);
    
    if (!projectSettings.storyboardTheme) {
      projectSettings.storyboardTheme = getDefaultTheme();
    } else {
      // Migrate existing theme to include new properties if missing
      projectSettings.storyboardTheme = migrateTheme(projectSettings.storyboardTheme);
    }
    
    // Only write back to Supabase if migration actually changed the theme.
    // Avoids unnecessary DB writes that could change updated_at via triggers
    // and cause stale baseCloudUpdatedAt → false autosave conflicts.
    const migratedThemeJson = JSON.stringify(projectSettings.storyboardTheme);
    if (originalThemeJson !== migratedThemeJson) {
      await supabase
        .from('project_data')
        .update({ project_settings: projectSettings })
        .eq('project_id', projectId);
    }

    return {
      pages: data.pages || [],
      shots: data.shots || {},
      shotOrder: data.shot_order || [],
      updatedAt: data.updated_at || null,
      projectSettings: projectSettings,
      uiSettings: data.ui_settings || {}
    };
  }

  static async getProjectUpdatedAt(projectId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('project_data')
      .select('updated_at')
      .eq('project_id', projectId)
      .maybeSingle();

    if (error) throw error;
    return data?.updated_at ?? null;
  }

  static async getProjectRevision(projectId: string): Promise<{ updatedAt: string | null; contentHash: string | null } | null> {
    // Direct SELECT instead of missing get_project_revision RPC.
    // content_hash is not stored server-side, so we return null for it.
    const { data, error } = await supabase
      .from('project_data')
      .select('updated_at')
      .eq('project_id', projectId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return {
      updatedAt: data.updated_at ?? null,
      contentHash: null
    };
  }

  private static async saveProjectCore(
    projectId: string,
    data: ProjectData,
    expectedUpdatedAt?: string | null,
    writerId?: string | null
  ): Promise<{
    ok: boolean;
    conflict: boolean;
    lease_rejected?: boolean;
    lease_holder?: string | null;
    updated_at: string | null;
  }> {
    // Security validation before saving
    const validation = DataValidator.validateBeforeSave(data, projectId, '');
    
    if (!validation.valid) {
      // Show security notifications for validation errors
      SecurityNotificationService.showDataValidationWarning(validation.errors, validation.warnings);
      throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      SecurityNotificationService.showDataValidationWarning([], validation.warnings);
    }

    // Additional size validation
    if (!SecurityNotificationService.validateProjectData(data)) {
      throw new Error('Project data exceeds size limits');
    }

    // CRITICAL VALIDATION: Prevent saving corrupted/empty data
    const shotCount = Object.keys(data.shots || {}).length;
    const pageCount = data.pages?.length || 0;

    // Enhanced validation with timestamp context
    if (pageCount === 0 || shotCount === 0) {
      console.warn(`⚠️ Attempting to save project ${projectId} with potentially empty data:`, {
        pages: pageCount,
        shots: shotCount,
        timestamp: new Date().toISOString()
      });

      try {
        // Fetch existing cloud data to compare
        const existingData = await this.getProject(projectId);
        const existingShotCount = Object.keys(existingData.shots || {}).length;
        const existingPageCount = existingData.pages?.length || 0;

        // If cloud has data but we're trying to save empty data, ABORT!
        if (existingShotCount > 0 && shotCount === 0) {
          console.error(`❌ CRITICAL: Prevented data loss! Cloud has ${existingShotCount} shots, refusing to overwrite with 0 shots.`);
          throw new Error(`Data validation failed: Cannot overwrite ${existingShotCount} shots with empty data.`);
        }

        if (existingPageCount > 0 && pageCount === 0) {
          console.error(`❌ CRITICAL: Prevented data loss! Cloud has ${existingPageCount} pages, refusing to overwrite with 0 pages.`);
          throw new Error(`Data validation failed: Cannot overwrite ${existingPageCount} pages with empty data.`);
        }

        console.log(`✅ Validation passed: Empty project save allowed (cloud is also empty or new project)`);
      } catch (error: any) {
        // If it's our validation error, re-throw it
        if (error.message?.includes('Data validation failed')) {
          throw error;
        }
        // If project doesn't exist in cloud yet (404), that's fine - new project
        console.log(`Project doesn't exist in cloud yet, allowing save of new project`);
      }
    }

    if (import.meta.env.DEV) {
      let serverUpdatedAt: string | null = null;
      try {
        serverUpdatedAt = await this.getProjectUpdatedAt(projectId);
      } catch (error) {
        console.warn('@@@ REV COMPARE failed to fetch server updated_at', { projectId, error });
      }
      const baseCloudUpdatedAt =
        useProjectManagerStore.getState().projects[projectId]?.baseCloudUpdatedAt ?? null;
      console.log('@@@ REV COMPARE', {
        projectId,
        expectedUpdatedAt: expectedUpdatedAt ?? null,
        baseCloudUpdatedAt,
        serverUpdatedAt
      });
    }
    console.log('@@@ RPC CALLED save_project_if_unchanged', { projectId, expectedUpdatedAt: expectedUpdatedAt ?? null });
    const { data: result, error } = await supabase.rpc('save_project_if_unchanged', {
      p_project_id: projectId,
      p_pages: data.pages,
      p_shots: data.shots,
      p_shot_order: data.shotOrder || [],
      p_project_settings: data.projectSettings,
      p_ui_settings: data.uiSettings,
      p_expected_updated_at: expectedUpdatedAt ?? null,
      p_writer_id: writerId ?? null
    });

    if (error) throw error;
    console.log('@@@ RPC RAW RESULT', { projectId, expectedUpdatedAt: expectedUpdatedAt ?? null, result });

    const rawPayload = Array.isArray(result) ? result[0] : result;
    const normalizedPayload = {
      ok: Boolean(rawPayload?.ok),
      conflict: Boolean(rawPayload?.conflict),
      lease_rejected: Boolean(rawPayload?.lease_rejected),
      lease_holder: rawPayload?.holder ?? null,
      updated_at: rawPayload?.out_updated_at ?? rawPayload?.updated_at ?? null
    };
    if (import.meta.env.DEV) {
      console.debug('[ProjectService] save_project_if_unchanged payload', {
        projectId,
        expectedUpdatedAt: expectedUpdatedAt ?? null,
        payload: normalizedPayload
      });
    }
    if (!normalizedPayload.ok && normalizedPayload.lease_rejected) {
      throw new LeaseRejectedError(
        'Writer lease rejected.',
        normalizedPayload.lease_holder,
        rawPayload?.expires_at ?? null,
        normalizedPayload.updated_at
      );
    }
    if (!normalizedPayload.ok && normalizedPayload.conflict) {
      throw new ProjectConflictError('Project was updated elsewhere.', normalizedPayload.updated_at);
    }
    if (!normalizedPayload.ok) {
      throw new Error('Cloud save failed');
    }

    console.log(`✅ Successfully saved project ${projectId} to cloud:`, {
      pages: pageCount,
      shots: shotCount,
      timestamp: new Date().toISOString()
    });
    return normalizedPayload;
  }

  static async saveProject(
    projectId: string,
    data: ProjectData,
    expectedUpdatedAt?: string | null,
    writerId?: string | null
  ): Promise<string> {
    const payload = await this.saveProjectCore(projectId, data, expectedUpdatedAt, writerId);
    return payload.updated_at as string;
  }

  static async saveProjectAtomic(
    projectId: string,
    data: ProjectData,
    expectedUpdatedAt?: string | null,
    writerId?: string | null
  ): Promise<{
    updatedAt: string;
    rpc: {
      ok: boolean;
      conflict: boolean;
      lease_rejected?: boolean;
      lease_holder?: string | null;
      updated_at: string | null;
    };
  }> {
    const payload = await this.saveProjectCore(projectId, data, expectedUpdatedAt, writerId);
    return {
      updatedAt: payload.updated_at as string,
      rpc: payload
    };
  }

  static async deleteProject(projectId: string): Promise<void> {
    // Delete project data first
    await supabase
      .from('project_data')
      .delete()
      .eq('project_id', projectId);

    // Delete project
    await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);
  }

  static async getProjects(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Get projects with their data to calculate shot counts
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_data (
          shots,
          updated_at
        )
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Calculate shot count for each project and include data timestamp
    const projectsWithShotCount = (data || []).map(project => ({
      ...project,
      shot_count: project.project_data?.shots ? Object.keys(project.project_data.shots).length : 0,
      data_updated_at: project.project_data?.updated_at // Actual data timestamp
    }));

    return projectsWithShotCount;
  }
}
