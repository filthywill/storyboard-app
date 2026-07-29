import { useProjectManagerStore, type ProjectMetadata } from '@/store/projectManagerStore';

const logRecovery = (operation: string, fields: Record<string, unknown> = {}) => {
  if (!import.meta.env.DEV) return;
  void import('@/utils/projectIdentityDiagnostics').then(({ ProjectIdentityDiagnostics }) => {
    ProjectIdentityDiagnostics.log(operation, { kind: 'recovery', ...fields });
  });
};

const PROJECT_KEY_PREFIXES = {
  page: 'page-storage-project-',
  shot: 'shot-storage-project-',
  project: 'project-storage-project-',
  ui: 'ui-store-project-',
};

type ParsedProjectPayload = {
  pages: unknown[];
  shots: Record<string, unknown>;
  projectName: string;
  projectOrigin?: 'sample_storyboard';
};

type StorageObject = Record<string, unknown>;

const parseStorageJson = (key: string): unknown | null => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`[LocalProjectRecovery] Skipping corrupt storage key: ${key}`, error);
    return null;
  }
};

const unwrapState = (value: unknown): StorageObject | null => {
  if (!value || typeof value !== 'object') return null;
  const maybeState = (value as { state?: unknown }).state;
  return (maybeState && typeof maybeState === 'object' ? maybeState : value) as StorageObject;
};

const getPayloadForProject = (projectId: string): ParsedProjectPayload | null => {
  const pagePayload = unwrapState(parseStorageJson(`${PROJECT_KEY_PREFIXES.page}${projectId}`));
  const shotPayload = unwrapState(parseStorageJson(`${PROJECT_KEY_PREFIXES.shot}${projectId}`));
  const projectPayload = unwrapState(parseStorageJson(`${PROJECT_KEY_PREFIXES.project}${projectId}`));

  const pages = pagePayload?.pages;
  const shots = shotPayload?.shots;

  if (!Array.isArray(pages) || !shots || typeof shots !== 'object') {
    return null;
  }

  if (pages.length === 0 || Object.keys(shots).length === 0) {
    return null;
  }

  const rawProjectName = projectPayload?.projectName;
  const projectName =
    typeof rawProjectName === 'string' && rawProjectName.trim()
      ? rawProjectName.trim()
      : `Recovered Project ${projectId.slice(0, 8)}`;

  return {
    pages,
    shots: shots as Record<string, unknown>,
    projectName,
    projectOrigin:
      projectPayload?.projectOrigin === 'sample_storyboard'
        ? 'sample_storyboard'
        : undefined,
  };
};

export class LocalProjectRecoveryService {
  static recoverOrphanedLocalProjects(): number {
    if (typeof window === 'undefined') return 0;

    const projectManager = useProjectManagerStore.getState();
    const existingProjectIds = new Set(Object.keys(projectManager.projects));
    logRecovery('local_recovery.scan_begin', {
      metadataProjectIds: Array.from(existingProjectIds),
    });
    const candidateProjectIds = new Set<string>();

    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key?.startsWith(PROJECT_KEY_PREFIXES.page)) continue;

        const projectId = key.slice(PROJECT_KEY_PREFIXES.page.length);
        if (projectId && !existingProjectIds.has(projectId)) {
          candidateProjectIds.add(projectId);
        }
      }
    } catch (error) {
      console.warn('[LocalProjectRecovery] Failed to scan local project storage', error);
      return 0;
    }

    const recoveredProjects: Record<string, ProjectMetadata> = {};
    const now = new Date();

    candidateProjectIds.forEach((projectId) => {
      const payload = getPayloadForProject(projectId);
      if (!payload) return;

      recoveredProjects[projectId] = {
        id: projectId,
        name: payload.projectName,
        lastModified: now,
        baseCloudUpdatedAt: null,
        shotCount: Object.keys(payload.shots).length,
        pageCount: payload.pages.length,
        createdAt: now,
        isLocal: true,
        isCloudOnly: false,
        isCloudBacked: false,
        ...(payload.projectOrigin ? { projectOrigin: payload.projectOrigin } : {}),
      };
    });

    const recoveredCount = Object.keys(recoveredProjects).length;
    if (recoveredCount === 0) {
      logRecovery('local_recovery.scan_complete', { recoveredCount: 0 });
      return 0;
    }

    logRecovery('local_recovery.recovered', {
      orphanSnapshotIds: Array.from(candidateProjectIds),
      recoveredProjectIds: Object.keys(recoveredProjects),
      recoveredOrigins: Object.values(recoveredProjects).map((project) => ({
        id: project.id,
        origin: project.projectOrigin ?? null,
      })),
    });

    useProjectManagerStore.setState((state) => ({
      projects: {
        ...state.projects,
        ...recoveredProjects,
      },
    }));

    console.log(`[LocalProjectRecovery] Recovered ${recoveredCount} local project(s)`);
    return recoveredCount;
  }
}
