import { supabase } from '@/lib/supabase';
import { SecurityNotificationService } from './securityNotificationService';
import { DataValidator } from '@/utils/dataValidator';
import { StoryboardTheme } from '@/styles/storyboardTheme';

export interface ProjectData {
  pages: any[];
  shots: Record<string, any>;
  shotOrder?: string[];
  projectSettings: {
    projectName: string;
    projectInfo: any;
    projectLogoUrl?: string;
    clientAgency: any;
    jobInfo: any;
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
  static async createProject(name: string, description?: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        description: description || null,
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Create empty project data entry
    await supabase
      .from('project_data')
      .insert({
        project_id: data.id,
        pages: [],
        shots: {},
        project_settings: {},
        ui_settings: {}
      });

    return data.id;
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
    
    if (!projectSettings.storyboardTheme) {
      projectSettings.storyboardTheme = getDefaultTheme();
    } else {
      // Migrate existing theme to include new properties if missing
      projectSettings.storyboardTheme = migrateTheme(projectSettings.storyboardTheme);
    }
    
    // Save migrated data back to Supabase (silent migration)
    await supabase
      .from('project_data')
      .update({ project_settings: projectSettings })
      .eq('project_id', projectId);

    return {
      pages: data.pages || [],
      shots: data.shots || {},
      shotOrder: data.shot_order || [],
      projectSettings: projectSettings,
      uiSettings: data.ui_settings || {}
    };
  }

  static async saveProject(projectId: string, data: ProjectData): Promise<void> {
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

    const { error } = await supabase
      .from('project_data')
      .upsert({
        project_id: projectId,
        pages: data.pages,
        shots: data.shots,
        shot_order: data.shotOrder || [],
        project_settings: data.projectSettings,
        ui_settings: data.uiSettings,
        updated_at: new Date().toISOString() // This sets the authoritative timestamp
      }, {
        onConflict: 'project_id'
      });

    if (error) {
      throw error;
    }

    console.log(`✅ Successfully saved project ${projectId} to cloud:`, {
      pages: pageCount,
      shots: shotCount,
      timestamp: new Date().toISOString()
    });
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
