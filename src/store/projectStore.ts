import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import ObjectURLManager from '@/utils/objectURLManager';
import { StoryboardTheme, getDefaultTheme, migrateTheme } from '@/styles/storyboardTheme';
import { type PageSizeMode, resolvePageSizeMode } from '@/utils/pageSize';
import { optimizeLogoImage } from '@/utils/imageCompression';

function isBlobUrl(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith('blob:');
}

function isDataUrl(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith('data:');
}

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
  projectLogoDataUrl: string | null;
  clientAgency: string;
  jobInfo: string;
  pageSizeMode: PageSizeMode;
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
  setPageSizeMode: (mode: PageSizeMode) => void;
  
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
  showLogo: false,
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
      projectLogoDataUrl: null,
      clientAgency: 'Client/Agency',
      jobInfo: 'Job Info',
      pageSizeMode: 'dynamic',
      templateSettings: { ...defaultTemplateSettings },
      storyboardTheme: getDefaultTheme(),

      // Project metadata
      setProjectName: (name) => {
        set((state) => {
          state.projectName = name;
        });
        
      },

      setProjectInfo: (info) => {
        set((state) => {
          state.projectInfo = info;
        });
        
      },

      setProjectLogo: (file) => {
        set((state) => {
          // Use ObjectURLManager for better memory management
          state.projectLogoUrl = ObjectURLManager.replaceObjectURL(state.projectLogoUrl, file);
          state.projectLogoFile = file;
          state.projectLogoDataUrl = null;
        });

        if (!file) {
          return;
        }

        void optimizeLogoImage(file)
          .then((result) => {
            set((state) => {
              if (state.projectLogoFile !== file) {
                return;
              }

              state.projectLogoDataUrl = result.dataUrl;
            });
          })
          .catch((error) => {
            console.warn('Failed to preserve exportable project logo data URL:', error);
          });
      },

      setClientAgency: (name) => {
        set((state) => {
          state.clientAgency = name;
        });
        
      },

      setJobInfo: (info) => {
        set((state) => {
          state.jobInfo = info;
        });
        
      },

      setPageSizeMode: (mode) => {
        set((state) => {
          state.pageSizeMode = mode;
        });
      },

      // Template settings
      setTemplateSetting: (setting, value) => {
        set((state) => {
          (state.templateSettings as any)[setting] = value;
        });
        
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
        projectLogoUrl: isDataUrl(state.projectLogoUrl) || isBlobUrl(state.projectLogoUrl)
          ? null
          : state.projectLogoUrl,
        projectLogoDataUrl: state.projectLogoUrl && !isDataUrl(state.projectLogoUrl) && !isBlobUrl(state.projectLogoUrl)
          ? null
          : state.projectLogoDataUrl,
        clientAgency: state.clientAgency,
        jobInfo: state.jobInfo,
        pageSizeMode: state.pageSizeMode,
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

          if (!state.projectLogoDataUrl && isDataUrl(state.projectLogoUrl)) {
            state.projectLogoDataUrl = state.projectLogoUrl;
          }

          if (isBlobUrl(state.projectLogoUrl)) {
            state.projectLogoUrl = state.projectLogoDataUrl || null;
          } else if (!state.projectLogoUrl && state.projectLogoDataUrl) {
            state.projectLogoUrl = state.projectLogoDataUrl;
          }

          state.pageSizeMode = resolvePageSizeMode(state.pageSizeMode);
        }
      }
    }
  )
); 