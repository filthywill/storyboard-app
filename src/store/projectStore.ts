import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import ObjectURLManager from '@/utils/objectURLManager';
import { triggerAutoSave } from '@/utils/autoSave';
import { StoryboardTheme, getDefaultTheme, migrateTheme } from '@/styles/storyboardTheme';

export interface TemplateSettings {
  showLogo: boolean;
  showProjectName: boolean;
  showProjectInfo: boolean;
  showClientAgency: boolean;
  showJobInfo: boolean;
  showActionText: boolean;
  showScriptText: boolean;
  showPageNumber: boolean;
  shotNumberFormat: string;
}

export interface ProjectState {
  projectName: string;
  projectInfo: string;
  projectLogoUrl: string | null;
  projectLogoFile: File | null;
  clientAgency: string;
  jobInfo: string;
  templateSettings: TemplateSettings;
  storyboardTheme: StoryboardTheme;
}

export interface ProjectActions {
  // Project metadata
  setProjectName: (name: string) => void;
  setProjectInfo: (info: string) => void;
  setProjectLogo: (file: File | null) => void;
  setClientAgency: (name: string) => void;
  setJobInfo: (info: string) => void;
  
  // Template settings
  setTemplateSetting: (setting: keyof TemplateSettings, value: boolean | string) => void;
  setTemplateSettings: (settings: Partial<TemplateSettings>) => void;
  resetTemplateSettings: () => void;
  
  // Storyboard theme
  setStoryboardTheme: (theme: StoryboardTheme) => void;
  
  // Utility
  getProjectMetadata: () => Pick<ProjectState, 'projectName' | 'projectInfo' | 'clientAgency' | 'jobInfo'>;
}

export type ProjectStore = ProjectState & ProjectActions;

const defaultTemplateSettings: TemplateSettings = {
  showLogo: true,
  showProjectName: true,
  showProjectInfo: true,
  showClientAgency: true,
  showJobInfo: true,
  showActionText: true,
  showScriptText: true,
  showPageNumber: true,
  shotNumberFormat: '01',
};

export const useProjectStore = create<ProjectStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      projectName: 'Project Name',
      projectInfo: 'Project Info',
      projectLogoUrl: null,
      projectLogoFile: null,
      clientAgency: 'Client/Agency',
      jobInfo: 'Job Info',
      templateSettings: { ...defaultTemplateSettings },
      storyboardTheme: getDefaultTheme(),

      // Project metadata
      setProjectName: (name) => {
        set((state) => {
          state.projectName = name;
        });
        
        // Trigger auto-save after changing project name
        triggerAutoSave();
      },

      setProjectInfo: (info) => {
        set((state) => {
          state.projectInfo = info;
        });
        
        // Trigger auto-save after changing project info
        triggerAutoSave();
      },

      setProjectLogo: (file) => {
        set((state) => {
          // Use ObjectURLManager for better memory management
          state.projectLogoUrl = ObjectURLManager.replaceObjectURL(state.projectLogoUrl, file);
          state.projectLogoFile = file;
        });
        
        // Only trigger auto-save if we have a valid file
        if (file && file instanceof File) {
          triggerAutoSave();
        } else if (file === null) {
          // Logo was removed - trigger auto-save to delete from cloud
          triggerAutoSave();
        }
      },

      setClientAgency: (name) => {
        set((state) => {
          state.clientAgency = name;
        });
        
        // Trigger auto-save after changing client/agency
        triggerAutoSave();
      },

      setJobInfo: (info) => {
        set((state) => {
          state.jobInfo = info;
        });
        
        // Trigger auto-save after changing job info
        triggerAutoSave();
      },

      // Template settings
      setTemplateSetting: (setting, value) => {
        set((state) => {
          (state.templateSettings as any)[setting] = value;
        });
        
        // Trigger auto-save after changing template setting
        triggerAutoSave();
      },

      setTemplateSettings: (settings) => {
        set((state) => {
          Object.assign(state.templateSettings, settings);
        });
      },

      resetTemplateSettings: () => {
        set((state) => {
          state.templateSettings = { ...defaultTemplateSettings };
        });
      },

      // Storyboard theme
      setStoryboardTheme: (theme) => {
        set((state) => {
          state.storyboardTheme = theme;
        });
        
        // Trigger auto-save after changing theme
        triggerAutoSave();
      },

      // Utility methods
      getProjectMetadata: () => {
        const state = get();
        return {
          projectName: state.projectName,
          projectInfo: state.projectInfo,
          clientAgency: state.clientAgency,
          jobInfo: state.jobInfo,
        };
      },
    })),
    {
      name: 'project-storage',
      partialize: (state) => ({
        projectName: state.projectName,
        projectInfo: state.projectInfo,
        projectLogoUrl: state.projectLogoUrl,
        clientAgency: state.clientAgency,
        jobInfo: state.jobInfo,
        templateSettings: state.templateSettings,
        storyboardTheme: state.storyboardTheme,
      }),
      onRehydrateStorage: () => (state) => {
        // Migration: Add default theme if missing, or migrate old themes
        if (state) {
          if (!state.storyboardTheme) {
            state.storyboardTheme = getDefaultTheme();
          } else {
            state.storyboardTheme = migrateTheme(state.storyboardTheme);
          }
        }
      }
    }
  )
); 