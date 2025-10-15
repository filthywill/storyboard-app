import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import ObjectURLManager from '@/utils/objectURLManager';
import { triggerAutoSave } from '@/utils/autoSave';

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
      })
    }
  )
); 