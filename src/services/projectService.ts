import { supabase } from '@/lib/supabase';

export interface ProjectData {
  pages: any[];
  shots: Record<string, any>;
  projectSettings: {
    projectName: string;
    projectInfo: any;
    projectLogoUrl?: string;
    clientAgency: any;
    jobInfo: any;
    templateSettings: any;
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

    return {
      pages: data.pages || [],
      shots: data.shots || {},
      shotOrder: data.shot_order || [],
      projectSettings: data.project_settings || {},
      uiSettings: data.ui_settings || {}
    };
  }

  static async saveProject(projectId: string, data: ProjectData): Promise<void> {
    const { error } = await supabase
      .from('project_data')
      .upsert({
        project_id: projectId,
        pages: data.pages,
        shots: data.shots,
        shot_order: data.shotOrder || [],
        project_settings: data.projectSettings,
        ui_settings: data.uiSettings,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'project_id'
      });

    if (error) {
      throw error;
    }
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
          shots
        )
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Calculate shot count for each project
    const projectsWithShotCount = (data || []).map(project => ({
      ...project,
      shot_count: project.project_data?.shots ? Object.keys(project.project_data.shots).length : 0
    }));

    return projectsWithShotCount;
  }
}
