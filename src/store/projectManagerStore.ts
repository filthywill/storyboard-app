import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface ProjectMetadata {
  id: string;
  name: string;
  description?: string;
  lastModified: Date;
  shotCount: number;
  pageCount: number;
  createdAt: Date;
  isLocal: boolean;        // NEW: Has full local copy
  isCloudOnly: boolean;    // NEW: Only metadata, needs download
}

export interface ProjectManagerState {
  projects: Record<string, ProjectMetadata>;
  currentProjectId: string | null;
  maxProjects: number;
  isInitialized: boolean;
}

export interface ProjectManagerActions {
  // Project management
  createProject: (name: string, description?: string) => string;
  createProjectWithId: (projectId: string, name: string, description?: string) => void;
  deleteProject: (projectId: string) => void;
  renameProject: (projectId: string, name: string) => void;
  setCurrentProject: (projectId: string | null) => void;
  
  // Project metadata
  updateProjectMetadata: (projectId: string, updates: Partial<ProjectMetadata>) => void;
  getAllProjects: () => ProjectMetadata[];
  
  // Cloud project management
  addCloudProject: (project: { id: string; name: string; shotCount: number; lastModified: string }) => void;
  markProjectAsLocal: (projectId: string) => void;
  getProjectsSortedBy: (sortBy: 'name' | 'date') => ProjectMetadata[];
  
  // Utility
  canCreateProject: () => boolean;
  getCurrentProject: () => ProjectMetadata | null;
  initializeDefaultProject: () => string | null;
  setInitialized: (value: boolean) => void;
}

export type ProjectManagerStore = ProjectManagerState & ProjectManagerActions;

const MAX_PROJECTS = 15;

export const useProjectManagerStore = create<ProjectManagerStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      projects: {},
      currentProjectId: null,
      maxProjects: MAX_PROJECTS,
      isInitialized: false,

      // Project management
      createProject: (name, description) => {
        const state = get();
        
        if (!state.canCreateProject()) {
          throw new Error(`Cannot create more than ${state.maxProjects} projects`);
        }

        const projectId = crypto.randomUUID();
        const now = new Date();
        
        const newProject: ProjectMetadata = {
          id: projectId,
          name,
          description,
          lastModified: now,
          shotCount: 0,
          pageCount: 1, // Default to 1 page
          createdAt: now,
          isLocal: true,
          isCloudOnly: false
        };

        set((state) => {
          state.projects[projectId] = newProject;
          state.currentProjectId = projectId;
        });

        return projectId;
      },

      createProjectWithId: (projectId, name, description) => {
        const state = get();
        
        if (!state.canCreateProject()) {
          throw new Error(`Cannot create more than ${state.maxProjects} projects`);
        }

        const now = new Date();
        
        const newProject: ProjectMetadata = {
          id: projectId,
          name,
          description,
          lastModified: now,
          shotCount: 0,
          pageCount: 1,
          createdAt: now,
          isLocal: true,
          isCloudOnly: false
        };

        set((state) => {
          state.projects[projectId] = newProject;
          state.currentProjectId = projectId;
        });
      },

      deleteProject: (projectId) => {
        console.log('ProjectManager: Deleting project:', projectId);
        set((state) => {
          delete state.projects[projectId];
          console.log('ProjectManager: Project deleted, remaining projects:', Object.keys(state.projects).length);
          
          // Don't clear currentProjectId here - let the deletion logic handle it
          // This prevents the UI from showing "No Project" during fallback
        });
      },

      renameProject: (projectId, name) => {
        set((state) => {
          const project = state.projects[projectId];
          if (project) {
            project.name = name;
            project.lastModified = new Date();
          }
        });
      },

      setCurrentProject: (projectId) => {
        console.log('ProjectManager: Setting current project:', projectId);
        set((state) => {
          if (projectId === null) {
            state.currentProjectId = null;
            console.log('ProjectManager: Current project cleared');
          } else if (state.projects[projectId]) {
            state.currentProjectId = projectId;
            console.log('ProjectManager: Current project set to:', state.currentProjectId);
            // Update last modified when switching to project
            state.projects[projectId].lastModified = new Date();
          } else {
            console.warn('ProjectManager: Project not found:', projectId);
          }
        });
      },

      // Project metadata
      updateProjectMetadata: (projectId, updates) => {
        set((state) => {
          const project = state.projects[projectId];
          if (project) {
            Object.assign(project, updates, { lastModified: new Date() });
          }
        });
      },


      getAllProjects: () => {
        return Object.values(get().projects).sort((a, b) => {
          // Handle both Date objects and date strings
          const aTime = a.lastModified instanceof Date ? a.lastModified.getTime() : new Date(a.lastModified).getTime();
          const bTime = b.lastModified instanceof Date ? b.lastModified.getTime() : new Date(b.lastModified).getTime();
          return bTime - aTime;
        });
      },

      // Utility
      canCreateProject: () => {
        const projectCount = Object.keys(get().projects).length;
        const maxProjects = get().maxProjects;
        
        // Check if user is authenticated
        // We need to access authStore directly to avoid circular dependencies
        // Since this is synchronous, we'll check if authStore exists in the global state
        try {
          // Access the Zustand store state directly from localStorage
          const authStoreState = localStorage.getItem('auth-storage');
          if (authStoreState) {
            const parsed = JSON.parse(authStoreState);
            const isAuthenticated = parsed.state?.isAuthenticated || false;
            
            // Unauthenticated users: max 1 test project
            if (!isAuthenticated) {
              return projectCount < 1;
            }
          } else {
            // No auth state found, assume unauthenticated
            return projectCount < 1;
          }
        } catch (error) {
          console.warn('Could not check auth status for project limit', error);
          // If we can't determine auth status, default to unauthenticated limit
          return projectCount < 1;
        }
        
        // Authenticated users: max 15 projects
        return projectCount < maxProjects;
      },

      getCurrentProject: () => {
        const state = get();
        return state.currentProjectId ? state.projects[state.currentProjectId] : null;
      },

      initializeDefaultProject: () => {
        const state = get();
        
        // Fix any corrupted date data first
        set((state) => {
          Object.values(state.projects).forEach((project: any) => {
            if (typeof project.lastModified === 'string') {
              project.lastModified = new Date(project.lastModified);
            }
            if (typeof project.createdAt === 'string') {
              project.createdAt = new Date(project.createdAt);
            }
          });
        });
        
        // Don't auto-create a project - just return the first one if it exists
        if (Object.keys(state.projects).length > 0) {
          return Object.keys(state.projects)[0];
        }

        // No projects exist - return null (empty state will show)
        return null;
      },

      setInitialized: (value) => {
        set((state) => {
          state.isInitialized = value;
        });
      },

      // Cloud project management
      addCloudProject: (project) => {
        set((state) => {
          // Don't overwrite if we already have a local copy
          if (state.projects[project.id]?.isLocal) {
            return;
          }
          
          state.projects[project.id] = {
            id: project.id,
            name: project.name,
            description: '',
            lastModified: new Date(project.lastModified),
            createdAt: new Date(project.lastModified),
            shotCount: project.shotCount,
            pageCount: 0,
            isLocal: false,
            isCloudOnly: true
          };
        });
      },

      markProjectAsLocal: (projectId) => {
        set((state) => {
          if (state.projects[projectId]) {
            state.projects[projectId].isLocal = true;
            state.projects[projectId].isCloudOnly = false;
          }
        });
      },

      getProjectsSortedBy: (sortBy) => {
        const projects = get().getAllProjects();
        
        if (sortBy === 'name') {
          return [...projects].sort((a, b) => a.name.localeCompare(b.name));
        }
        
        // Default: sort by date (already done in getAllProjects)
        return projects;
      },

    })),
    {
      name: 'project-manager-storage',
      partialize: (state) => ({
        projects: state.projects,
        currentProjectId: state.currentProjectId,
        isInitialized: state.isInitialized,
      }),
    }
  )
);
