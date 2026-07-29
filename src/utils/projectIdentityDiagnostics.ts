/**
 * Development-only diagnostics for project identity / metadata / store divergence.
 * No-op outside `import.meta.env.DEV`. Never logs storyboard content or PII.
 */

import { useProjectManagerStore } from '@/store/projectManagerStore';
import { getAutosaveDiagnosticsState } from '@/utils/autoSave';
import { LocalStorageManager } from '@/utils/localStorageManager';

const LOG_PREFIX = '[project-identity]';

export type ProjectIdentityOperationKind =
  | 'create'
  | 'reopen'
  | 'switch'
  | 'hydrate'
  | 'save'
  | 'recovery'
  | 'init'
  | 'lookup';

type ProjectInventoryEntry = {
  id: string;
  origin: 'sample_storyboard' | null;
};

type ContextSnapshot = {
  currentProjectId: string | null;
  projectInventory: ProjectInventoryEntry[];
  projectManagerInitialized: boolean;
  hydrationComplete: boolean;
  autosaveSwitching: boolean;
  autosavePaused: boolean;
};

let sequence = 0;
let hydrationStarted = false;
let hydrationComplete = false;
let lastLoadedProjectId: string | null = null;
let startupSelectedWithoutLoad: string | null = null;

const isEnabled = (): boolean => import.meta.env.DEV && typeof window !== 'undefined';

const projectSnapshotKeyNames = (projectId: string): string[] => [
  `page-storage-project-${projectId}`,
  `shot-storage-project-${projectId}`,
  `project-storage-project-${projectId}`,
  `ui-store-project-${projectId}`,
];

const snapshotPresence = (projectId: string): Record<string, boolean> => {
  const keys = projectSnapshotKeyNames(projectId);
  return Object.fromEntries(
    keys.map((key) => [key, Boolean(LocalStorageManager.getItem(key))]),
  );
};

const getProjectInventory = (): ProjectInventoryEntry[] => {
  const projects = useProjectManagerStore.getState().projects;
  return Object.values(projects).map((project) => ({
    id: project.id,
    origin: project.projectOrigin === 'sample_storyboard' ? 'sample_storyboard' : null,
  }));
};

const getContextSnapshot = (): ContextSnapshot => {
  const projectManager = useProjectManagerStore.getState();
  const autosave = getAutosaveDiagnosticsState();
  return {
    currentProjectId: projectManager.currentProjectId,
    projectInventory: getProjectInventory(),
    projectManagerInitialized: projectManager.isInitialized,
    hydrationComplete,
    autosaveSwitching: autosave.isSwitchingProject,
    autosavePaused: autosave.isSavePaused,
  };
};

const countClassifiedSamples = (inventory: ProjectInventoryEntry[]): number =>
  inventory.filter((entry) => entry.origin === 'sample_storyboard').length;

export const ProjectIdentityDiagnostics = {
  log(operation: string, fields: Record<string, unknown> = {}): void {
    if (!isEnabled()) return;
    sequence += 1;
    console.debug(LOG_PREFIX, {
      seq: sequence,
      ts: Date.now(),
      operation: operation,
      ...getContextSnapshot(),
      ...fields,
    });
  },

  warn(assertion: string, fields: Record<string, unknown> = {}): void {
    if (!isEnabled()) return;
    sequence += 1;
    console.warn(LOG_PREFIX, {
      seq: sequence,
      ts: Date.now(),
      assertion,
      ...getContextSnapshot(),
      ...fields,
    });
  },

  onHydrationStart(): void {
    if (!isEnabled()) return;
    hydrationStarted = true;
    hydrationComplete = false;
    this.log('project_manager.hydration_start', { kind: 'hydrate' as ProjectIdentityOperationKind });
  },

  onHydrationComplete(error?: unknown): void {
    if (!isEnabled()) return;
    hydrationComplete = true;
    const projectManager = useProjectManagerStore.getState();
    this.log('project_manager.hydration_complete', {
      kind: 'hydrate' as ProjectIdentityOperationKind,
      hydrationStarted,
      hydrationError: error ? String(error) : null,
      hydratedCurrentProjectId: projectManager.currentProjectId,
      hydratedProjectInventory: getProjectInventory(),
    });
  },

  noteLoadProjectData(projectId: string): void {
    if (!isEnabled()) return;
    lastLoadedProjectId = projectId;
    this.log('project_snapshot.load_complete', {
      kind: 'hydrate' as ProjectIdentityOperationKind,
      argumentProjectId: projectId,
      snapshotKeysRead: projectSnapshotKeyNames(projectId),
      snapshotKeysPresent: snapshotPresence(projectId),
    });
  },

  noteStartupProjectSelected(projectId: string, source: string): void {
    if (!isEnabled()) return;
    startupSelectedWithoutLoad = projectId;
    this.log('startup.project_selected', {
      kind: 'init' as ProjectIdentityOperationKind,
      destinationProjectId: projectId,
      source,
      snapshotKeysPresent: snapshotPresence(projectId),
      loadedProjectId: lastLoadedProjectId,
    });
    if (lastLoadedProjectId !== projectId) {
      this.warn('startup_select_without_load', {
        selectedProjectId: projectId,
        lastLoadedProjectId,
        source,
        snapshotKeysPresent: snapshotPresence(projectId),
      });
    }
  },

  noteSnapshotWrite(projectId: string, keys: string[]): void {
    if (!isEnabled()) return;
    const currentProjectId = useProjectManagerStore.getState().currentProjectId;
    this.log('project_snapshot.write', {
      kind: 'save' as ProjectIdentityOperationKind,
      argumentProjectId: projectId,
      snapshotKeysWritten: keys,
    });
    if (currentProjectId && projectId !== currentProjectId) {
      this.warn('snapshot_write_id_differs_from_current', {
        argumentProjectId: projectId,
        currentProjectId,
      });
    }
  },

  assertSaveProjectIds(argumentProjectId: string | null | undefined): void {
    if (!isEnabled() || !argumentProjectId) return;
    const currentProjectId = useProjectManagerStore.getState().currentProjectId;
    if (currentProjectId && argumentProjectId !== currentProjectId) {
      this.warn('save_argument_differs_from_current', {
        argumentProjectId,
        currentProjectId,
      });
    }
    const metadata = useProjectManagerStore.getState().projects[argumentProjectId];
    if (!metadata) {
      this.warn('save_without_matching_metadata', { argumentProjectId, currentProjectId });
    }
  },

  assertSampleHandoffReadiness(input: {
    sampleRequestId: string;
    isProjectSystemReady: boolean;
    projectManagerInitialized: boolean;
  }): void {
    if (!isEnabled()) return;
    if (!hydrationComplete) {
      this.warn('sample_handoff_before_hydration_complete', {
        sampleRequestId: input.sampleRequestId,
        hydrationStarted,
        hydrationComplete,
        projectManagerInitialized: input.projectManagerInitialized,
        projectSystemReady: input.isProjectSystemReady,
      });
    }
  },

  assertDuplicateClassifiedSamples(): void {
    if (!isEnabled()) return;
    const inventory = getProjectInventory();
    const sampleCount = countClassifiedSamples(inventory);
    if (sampleCount > 1) {
      this.warn('multiple_classified_samples', {
        sampleCount,
        sampleProjectIds: inventory
          .filter((entry) => entry.origin === 'sample_storyboard')
          .map((entry) => entry.id),
      });
    }
  },

  assertSampleCreatedWhileExisting(existingSampleId: string | null, created: boolean): void {
    if (!isEnabled() || !created || !existingSampleId) return;
    this.warn('sample_created_while_classified_exists', {
      existingSampleId,
      created,
    });
  },

  getHydrationComplete(): boolean {
    return hydrationComplete;
  },

  exportTraceHint(): void {
    if (!isEnabled()) return;
    console.info(
      `${LOG_PREFIX} Filter DevTools console by "${LOG_PREFIX}" to collect traces. Copy objects as JSON; do not share localStorage contents.`,
    );
  },
};

if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    ProjectIdentityDiagnostics.exportTraceHint();
  });
}

declare global {
  interface Window {
    __projectIdentityDiagnostics?: typeof ProjectIdentityDiagnostics;
  }
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__projectIdentityDiagnostics = ProjectIdentityDiagnostics;
}
