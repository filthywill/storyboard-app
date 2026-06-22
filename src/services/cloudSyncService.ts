import { ProjectService, ProjectData, ProjectConflictError, LeaseRejectedError } from './projectService'
import { StorageService } from './storageService'
import { CloudAccessService } from './cloudAccessService'
import { usePageStore } from '@/store/pageStore'
import { useShotStore } from '@/store/shotStore'
import { useProjectStore } from '@/store/projectStore'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useProjectManagerStore } from '@/store/projectManagerStore'
import { useProjectConflictStore } from '@/store/projectConflictStore'
import { useCloudSaveConflictStore } from '@/store/cloudSaveConflictStore'
import { useWriterLeaseStore } from '@/store/writerLeaseStore'
import { setSavePaused } from '@/utils/autoSave'
import { WriterLeaseService } from '@/services/writerLeaseService'
import { resolvePageSizeMode } from '@/utils/pageSize';

export type CloudSaveFailureReason =
  | 'no_project_id'
  | 'sync_in_progress'
  | 'invalid_data'
  | 'cloud_disabled'
  | 'unauthenticated'
  | 'offline'
  | 'plan_limit'
  | 'project_record_missing'
  | 'conflict'
  | 'blocked_not_writer'
  | 'local_save_failed'
  | 'cloud_error';

export interface CloudSaveResult {
  ok: boolean;
  localSaved: boolean;
  cloudAttempted: boolean;
  cloudSaved: boolean;
  queued: boolean;
  reason?: CloudSaveFailureReason;
  error?: unknown;
}

export class CloudSyncService {
  private static currentProjectId: string | null = null;
  private static syncTimeout: NodeJS.Timeout | null = null;
  private static inFlightSaves = new Map<string, Promise<CloudSaveResult>>();
  private static pendingSaveRequests = new Map<string, boolean>();
  private static lastSuccessfulUpdatedAt = new Map<string, string>();
  private static offlineQueue: Array<{
    projectId: string;
    data: ProjectData;
    expectedUpdatedAt?: string | null;
    timestamp: number;
  }> = [];
  private static cloudProjectCache = new Map<string, { exists: boolean; checkedAt: number }>();
  private static readonly CLOUD_RECORD_TTL_MS = 30000;
  
  private static stableStringify(value: any): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }
    const keys = Object.keys(value).filter((key) => value[key] !== undefined).sort();
    const entries = keys.map((key) => `${JSON.stringify(key)}:${this.stableStringify(value[key])}`);
    return `{${entries.join(',')}}`;
  }

  private static md5(input: string): string {
    const rotateLeft = (lValue: number, iShiftBits: number) => (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
    const addUnsigned = (lX: number, lY: number) => {
      const lX4 = lX & 0x40000000;
      const lY4 = lY & 0x40000000;
      const lX8 = lX & 0x80000000;
      const lY8 = lY & 0x80000000;
      const lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
      if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
      if (lX4 | lY4) {
        if (lResult & 0x40000000) return lResult ^ 0xC0000000 ^ lX8 ^ lY8;
        return lResult ^ 0x40000000 ^ lX8 ^ lY8;
      }
      return lResult ^ lX8 ^ lY8;
    };
    const f = (x: number, y: number, z: number) => (x & y) | (~x & z);
    const g = (x: number, y: number, z: number) => (x & z) | (y & ~z);
    const h = (x: number, y: number, z: number) => x ^ y ^ z;
    const i = (x: number, y: number, z: number) => y ^ (x | ~z);
    const ff = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) =>
      addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, f(b, c, d)), addUnsigned(x, ac)), s), b);
    const gg = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) =>
      addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, g(b, c, d)), addUnsigned(x, ac)), s), b);
    const hh = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) =>
      addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, h(b, c, d)), addUnsigned(x, ac)), s), b);
    const ii = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) =>
      addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, i(b, c, d)), addUnsigned(x, ac)), s), b);
    const convertToWordArray = (str: string) => {
      const lWordCount: number[] = [];
      const lMessageLength = str.length;
      let lNumberOfWordsTempOne = lMessageLength + 8;
      let lNumberOfWordsTempTwo = (lNumberOfWordsTempOne - (lNumberOfWordsTempOne % 64)) / 64;
      const lNumberOfWords = (lNumberOfWordsTempTwo + 1) * 16;
      let lByteCount = 0;
      while (lByteCount < lMessageLength) {
        const lWordCountIndex = (lByteCount - (lByteCount % 4)) / 4;
        lWordCount[lWordCountIndex] = lWordCount[lWordCountIndex] || 0;
        lWordCount[lWordCountIndex] |= str.charCodeAt(lByteCount) << ((lByteCount % 4) * 8);
        lByteCount++;
      }
      const lWordCountIndex = (lByteCount - (lByteCount % 4)) / 4;
      lWordCount[lWordCountIndex] = lWordCount[lWordCountIndex] || 0;
      lWordCount[lWordCountIndex] |= 0x80 << ((lByteCount % 4) * 8);
      lWordCount[lNumberOfWords - 2] = lMessageLength << 3;
      lWordCount[lNumberOfWords - 1] = lMessageLength >>> 29;
      return lWordCount;
    };
    const wordToHex = (lValue: number) => {
      let wordToHexValue = '';
      for (let lCount = 0; lCount <= 3; lCount++) {
        const lByte = (lValue >>> (lCount * 8)) & 255;
        const wordToHexValueTemp = `0${lByte.toString(16)}`;
        wordToHexValue += wordToHexValueTemp.substring(wordToHexValueTemp.length - 2, wordToHexValueTemp.length);
      }
      return wordToHexValue;
    };
    let a = 0x67452301;
    let b = 0xEFCDAB89;
    let c = 0x98BADCFE;
    let d = 0x10325476;
    const x = convertToWordArray(input);
    for (let k = 0; k < x.length; k += 16) {
      const aa = a;
      const bb = b;
      const cc = c;
      const dd = d;
      a = ff(a, b, c, d, x[k + 0], 7, 0xD76AA478);
      d = ff(d, a, b, c, x[k + 1], 12, 0xE8C7B756);
      c = ff(c, d, a, b, x[k + 2], 17, 0x242070DB);
      b = ff(b, c, d, a, x[k + 3], 22, 0xC1BDCEEE);
      a = ff(a, b, c, d, x[k + 4], 7, 0xF57C0FAF);
      d = ff(d, a, b, c, x[k + 5], 12, 0x4787C62A);
      c = ff(c, d, a, b, x[k + 6], 17, 0xA8304613);
      b = ff(b, c, d, a, x[k + 7], 22, 0xFD469501);
      a = ff(a, b, c, d, x[k + 8], 7, 0x698098D8);
      d = ff(d, a, b, c, x[k + 9], 12, 0x8B44F7AF);
      c = ff(c, d, a, b, x[k + 10], 17, 0xFFFF5BB1);
      b = ff(b, c, d, a, x[k + 11], 22, 0x895CD7BE);
      a = ff(a, b, c, d, x[k + 12], 7, 0x6B901122);
      d = ff(d, a, b, c, x[k + 13], 12, 0xFD987193);
      c = ff(c, d, a, b, x[k + 14], 17, 0xA679438E);
      b = ff(b, c, d, a, x[k + 15], 22, 0x49B40821);
      a = gg(a, b, c, d, x[k + 1], 5, 0xF61E2562);
      d = gg(d, a, b, c, x[k + 6], 9, 0xC040B340);
      c = gg(c, d, a, b, x[k + 11], 14, 0x265E5A51);
      b = gg(b, c, d, a, x[k + 0], 20, 0xE9B6C7AA);
      a = gg(a, b, c, d, x[k + 5], 5, 0xD62F105D);
      d = gg(d, a, b, c, x[k + 10], 9, 0x02441453);
      c = gg(c, d, a, b, x[k + 15], 14, 0xD8A1E681);
      b = gg(b, c, d, a, x[k + 4], 20, 0xE7D3FBC8);
      a = gg(a, b, c, d, x[k + 9], 5, 0x21E1CDE6);
      d = gg(d, a, b, c, x[k + 14], 9, 0xC33707D6);
      c = gg(c, d, a, b, x[k + 3], 14, 0xF4D50D87);
      b = gg(b, c, d, a, x[k + 8], 20, 0x455A14ED);
      a = gg(a, b, c, d, x[k + 13], 5, 0xA9E3E905);
      d = gg(d, a, b, c, x[k + 2], 9, 0xFCEFA3F8);
      c = gg(c, d, a, b, x[k + 7], 14, 0x676F02D9);
      b = gg(b, c, d, a, x[k + 12], 20, 0x8D2A4C8A);
      a = hh(a, b, c, d, x[k + 5], 4, 0xFFFA3942);
      d = hh(d, a, b, c, x[k + 8], 11, 0x8771F681);
      c = hh(c, d, a, b, x[k + 11], 16, 0x6D9D6122);
      b = hh(b, c, d, a, x[k + 14], 23, 0xFDE5380C);
      a = hh(a, b, c, d, x[k + 1], 4, 0xA4BEEA44);
      d = hh(d, a, b, c, x[k + 4], 11, 0x4BDECFA9);
      c = hh(c, d, a, b, x[k + 7], 16, 0xF6BB4B60);
      b = hh(b, c, d, a, x[k + 10], 23, 0xBEBFBC70);
      a = hh(a, b, c, d, x[k + 13], 4, 0x289B7EC6);
      d = hh(d, a, b, c, x[k + 0], 11, 0xEAA127FA);
      c = hh(c, d, a, b, x[k + 3], 16, 0xD4EF3085);
      b = hh(b, c, d, a, x[k + 6], 23, 0x04881D05);
      a = hh(a, b, c, d, x[k + 9], 4, 0xD9D4D039);
      d = hh(d, a, b, c, x[k + 12], 11, 0xE6DB99E5);
      c = hh(c, d, a, b, x[k + 15], 16, 0x1FA27CF8);
      b = hh(b, c, d, a, x[k + 2], 23, 0xC4AC5665);
      a = ii(a, b, c, d, x[k + 0], 6, 0xF4292244);
      d = ii(d, a, b, c, x[k + 7], 10, 0x432AFF97);
      c = ii(c, d, a, b, x[k + 14], 15, 0xAB9423A7);
      b = ii(b, c, d, a, x[k + 5], 21, 0xFC93A039);
      a = ii(a, b, c, d, x[k + 12], 6, 0x655B59C3);
      d = ii(d, a, b, c, x[k + 3], 10, 0x8F0CCC92);
      c = ii(c, d, a, b, x[k + 10], 15, 0xFFEFF47D);
      b = ii(b, c, d, a, x[k + 1], 21, 0x85845DD1);
      a = ii(a, b, c, d, x[k + 8], 6, 0x6FA87E4F);
      d = ii(d, a, b, c, x[k + 15], 10, 0xFE2CE6E0);
      c = ii(c, d, a, b, x[k + 6], 15, 0xA3014314);
      b = ii(b, c, d, a, x[k + 13], 21, 0x4E0811A1);
      a = ii(a, b, c, d, x[k + 4], 6, 0xF7537E82);
      d = ii(d, a, b, c, x[k + 11], 10, 0xBD3AF235);
      c = ii(c, d, a, b, x[k + 2], 15, 0x2AD7D2BB);
      b = ii(b, c, d, a, x[k + 9], 21, 0xEB86D391);
      a = addUnsigned(a, aa);
      b = addUnsigned(b, bb);
      c = addUnsigned(c, cc);
      d = addUnsigned(d, dd);
    }
    return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
  }

  private static computeContentHash(data: ProjectData): string {
    const pages = data.pages ?? [];
    const shots = data.shots ?? {};
    const shotOrder = data.shotOrder ?? [];
    const projectSettings = data.projectSettings ?? {};
    const uiSettings = data.uiSettings ?? {};
    const content =
      this.stableStringify(pages) +
      this.stableStringify(shots) +
      this.stableStringify(shotOrder) +
      this.stableStringify(projectSettings) +
      this.stableStringify(uiSettings);
    return this.md5(content);
  }
  
  static setCurrentProject(projectId: string) {
    this.currentProjectId = projectId
  }
  
  static getCurrentProjectId(): string | null {
    return this.currentProjectId
  }

  // Public helpers for other services
  static isCloudAvailable(): boolean {
    const cached = CloudAccessService.getCachedAccessState();
    if (cached) {
      return cached.canReadCloud;
    }
    return this.isCloudEnabled() && this.isAuthenticated();
  }

  static markProjectAsCloudBacked(projectId: string): void {
    this.cloudProjectCache.set(projectId, { exists: true, checkedAt: Date.now() });
    const projectManager = useProjectManagerStore.getState();
    if (projectManager.projects[projectId]) {
      projectManager.setProjectCloudBacked(projectId, true);
    }
  }

  private static getCachedCloudRecord(projectId: string): boolean | null {
    const cached = this.cloudProjectCache.get(projectId);
    if (!cached) return null;
    if (Date.now() - cached.checkedAt > this.CLOUD_RECORD_TTL_MS) return null;
    return cached.exists;
  }

  private static async fetchCloudProjectRecord(projectId: string): Promise<{ exists: boolean; error?: unknown }> {
    const cached = this.getCachedCloudRecord(projectId);
    if (cached !== null) {
      return { exists: cached };
    }
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .limit(1)
        .maybeSingle();
      if (error) {
        return { exists: false, error };
      }
      const exists = Boolean(data?.id);
      this.cloudProjectCache.set(projectId, { exists, checkedAt: Date.now() });
      return { exists };
    } catch (error) {
      return { exists: false, error };
    }
  }

  static async checkCloudProjectRecord(projectId: string): Promise<{ exists: boolean; error?: unknown }> {
    return this.fetchCloudProjectRecord(projectId);
  }

  static async hasCloudProjectRecord(projectId: string): Promise<boolean> {
    const { exists } = await this.fetchCloudProjectRecord(projectId);
    return exists;
  }

  private static async isProjectCloudBacked(projectId: string): Promise<boolean> {
    const cached = this.getCachedCloudRecord(projectId);
    if (cached !== null) return cached;
    if (!navigator.onLine) return false;
    const { exists } = await this.fetchCloudProjectRecord(projectId);
    if (exists) {
      this.markProjectAsCloudBacked(projectId);
    }
    return exists;
  }

  static async ensureCloudProjectRecord(projectId: string, name?: string, description?: string): Promise<void> {
    if (!this.isCloudEnabled()) return;
    const access = await CloudAccessService.getAccessState();
    if (!access.canReadCloud) return;
    const exists = await this.hasCloudProjectRecord(projectId);
    if (exists) return;
    if (!access.canCreateCloudProject) {
      const error = new Error('Cloud project limit reached');
      (error as any).code = 'CLOUD_PROJECT_LIMIT';
      throw error;
    }
    try {
      const updatedAt = await this.createCloudProject(
        projectId,
        name || `Project ${projectId.slice(0, 8)}`,
        description
      );
      this.markProjectAsCloudBacked(projectId);
      if (import.meta.env.DEV) {
        console.log('@@@ BASE SET', {
          projectId,
          value: updatedAt,
          source: 'cloudSync.ensureCloudProjectRecord'
        });
      }
      useProjectManagerStore.getState().setProjectCloudUpdatedAt(projectId, updatedAt);
    } catch (err) {
      console.warn('ensureCloudProjectRecord failed (will retry later):', err);
      throw err;
    }
  }
  
  static async createProject(name: string, description?: string): Promise<string> {
    const { id: projectId, updatedAt } = await ProjectService.createProject(name, description)
    this.markProjectAsCloudBacked(projectId)
    if (import.meta.env.DEV) {
      console.log('@@@ BASE SET', {
        projectId,
        value: updatedAt,
        source: 'cloudSync.createProject'
      });
    }
    useProjectManagerStore.getState().setProjectCloudUpdatedAt(projectId, updatedAt);
    
    // Set as current project
    this.currentProjectId = projectId
    
    // Initialize with default state
    await this.saveProject(projectId)
    
    // Don't load into stores here - let ProjectSwitcher handle that
    // await this.loadProject(projectId)
    
    return projectId
  }
  
  static async loadProject(projectId: string): Promise<void> {
    const data = await ProjectService.getProject(projectId)
    
    // Apply to stores
    usePageStore.setState({
      pages: data.pages.map(page => ({
        ...page,
        createdAt: new Date(page.createdAt),
        updatedAt: new Date(page.updatedAt)
      })),
      activePageId: data.pages[0]?.id || null
    })
    
    useShotStore.setState({
      shots: Object.fromEntries(
        Object.entries(data.shots).map(([id, shot]: [string, any]) => [
          id,
          {
            ...shot,
            createdAt: new Date(shot.createdAt),
            updatedAt: new Date(shot.updatedAt),
            imageFile: null // Files don't persist
          }
        ])
      ),
      shotOrder: data.shotOrder || this.deriveShotOrderFromPages(data.pages)
    })
    
    useProjectStore.setState({
      ...data.projectSettings,
      pageSizeMode: resolvePageSizeMode(data.projectSettings?.pageSizeMode),
      projectLogoUrl: data.projectSettings?.projectLogoUrl ?? null,
      projectLogoFile: null,
      projectLogoDataUrl: data.projectSettings?.projectLogoUrl?.startsWith('data:')
        ? data.projectSettings.projectLogoUrl
        : null,
    })
    useUIStore.setState(data.uiSettings)
    
    this.currentProjectId = projectId
  }
  
  private static deriveShotOrderFromPages(pages: any[]): string[] {
    console.warn('⚠️ shotOrder missing from cloud data, deriving from pages');
    const shotOrder: string[] = [];
    
    // Concatenate shot IDs from all pages in order
    pages.forEach(page => {
      if (page.shots && Array.isArray(page.shots)) {
        shotOrder.push(...page.shots);
      }
    });
    
    return shotOrder;
  }

  private static async ensureWriterLeaseForSave(
    projectId: string,
    source: string
  ): Promise<{ ok: boolean; writerId?: string | null; reason?: CloudSaveFailureReason }> {
    const leaseState = useWriterLeaseStore.getState();
    if (leaseState.projectId === projectId && leaseState.mode === 'read_only') {
      if (import.meta.env.DEV) {
        console.debug('[lease] save blocked (read_only)', {
          projectId,
          holder: leaseState.holder,
          source
        });
      }
      return { ok: false, reason: 'blocked_not_writer' };
    }

    const result = await WriterLeaseService.ensureWriter(projectId, { force: false, source });
    if (!result.ok) {
      if (import.meta.env.DEV) {
        console.debug('[lease] save blocked (no lease)', {
          projectId,
          reason: result.reason,
          holder: result.holder,
          source
        });
      }
      return { ok: false, reason: 'blocked_not_writer' };
    }

    return { ok: true, writerId: result.writerId ?? null };
  }
  
  static async saveProject(projectId?: string, isManual: boolean = false): Promise<CloudSaveResult> {
    const id = projectId || this.currentProjectId
    const baseResult: CloudSaveResult = {
      ok: false,
      localSaved: false,
      cloudAttempted: false,
      cloudSaved: false,
      queued: false
    };

    if (!id) {
      console.warn('CloudSyncService.saveProject: No project ID provided');
      return { ...baseResult, reason: 'no_project_id' };
    }

    const inFlight = this.inFlightSaves.get(id);
    if (inFlight) {
      const pendingManual = this.pendingSaveRequests.get(id) ?? false;
      this.pendingSaveRequests.set(id, pendingManual || isManual);
      if (import.meta.env.DEV) {
        console.debug('[CloudSyncService] Save coalesced', {
          projectId: id,
          queued: true,
          isManual
        });
      }
      return inFlight;
    }

    const savePromise = this.saveProjectInternal(id, isManual);
    this.inFlightSaves.set(id, savePromise);
    savePromise.finally(() => {
      if (this.inFlightSaves.get(id) === savePromise) {
        this.inFlightSaves.delete(id);
      }
      const pendingManual = this.pendingSaveRequests.get(id);
      if (pendingManual !== undefined) {
        this.pendingSaveRequests.delete(id);
        if (import.meta.env.DEV) {
          console.debug('[CloudSyncService] Running queued save', {
            projectId: id
          });
        }
        void this.saveProject(id, pendingManual);
      }
    });

    return savePromise;
  }

  private static async saveProjectInternal(id: string, isManual: boolean): Promise<CloudSaveResult> {
    const baseResult: CloudSaveResult = {
      ok: false,
      localSaved: false,
      cloudAttempted: false,
      cloudSaved: false,
      queued: false
    };

    const pageStore = usePageStore.getState()
    const shotStore = useShotStore.getState()
    const projectStore = useProjectStore.getState()
    const uiStore = useUIStore.getState()

      const isOnline = navigator.onLine;
      const access = await CloudAccessService.getAccessState();
      const isConflictDialogOpen = useProjectConflictStore.getState().isOpen;
      
      const data: ProjectData = {
        pages: pageStore.pages,
        shots: Object.fromEntries(
          Object.entries(shotStore.shots).map(([id, shot]) => [
            id,
            {
              ...shot,
              imageFile: null, // Don't serialize File objects
              // Ensure all image-related fields are preserved
              imageData: shot.imageData,
              imageUrl: shot.imageUrl,
              imageSize: shot.imageSize,
              imageStorageType: shot.imageStorageType,
              imageScale: shot.imageScale,
              imageOffsetX: shot.imageOffsetX,
              imageOffsetY: shot.imageOffsetY,
              cloudSyncStatus: shot.cloudSyncStatus,
              cloudSyncRetries: shot.cloudSyncRetries,
              lastSyncAttempt: shot.lastSyncAttempt
            }
          ])
        ),
        shotOrder: shotStore.shotOrder,
        projectSettings: {
          projectName: projectStore.projectName,
          projectInfo: projectStore.projectInfo,
          projectLogoUrl: projectStore.projectLogoUrl?.startsWith('blob:')
            ? (projectStore.projectLogoDataUrl || undefined)
            : projectStore.projectLogoUrl,
          clientAgency: projectStore.clientAgency,
          jobInfo: projectStore.jobInfo,
          pageSizeMode: projectStore.pageSizeMode,
          templateSettings: projectStore.templateSettings,
          storyboardTheme: projectStore.storyboardTheme
        },
        uiSettings: {
          isDragging: uiStore.isDragging,
          isExporting: uiStore.isExporting,
          showDeleteConfirmation: uiStore.showDeleteConfirmation
        }
      }

      // CRITICAL: Validate project data before saving
      if (!data.pages || data.pages.length === 0) {
        console.error('❌ CRITICAL ERROR: Attempting to save project with 0 pages! Aborting save to prevent data corruption.');
        console.error('Project data:', { projectId: id, pagesCount: data.pages?.length, shotsCount: Object.keys(data.shots).length });
        return { ...baseResult, reason: 'invalid_data' };
      }

      if (!data.shots || Object.keys(data.shots).length === 0) {
        console.error('❌ CRITICAL ERROR: Attempting to save project with 0 shots! Aborting save to prevent data corruption.');
        console.error('Project data:', { projectId: id, pagesCount: data.pages?.length, shotsCount: Object.keys(data.shots).length });
        return { ...baseResult, reason: 'invalid_data' };
      }

      if (!data.projectSettings.projectName || data.projectSettings.projectName.trim() === '') {
        console.error('❌ CRITICAL ERROR: Attempting to save project with empty name! Aborting save to prevent data corruption.');
        console.error('Project data:', { projectId: id, projectName: data.projectSettings.projectName });
        return { ...baseResult, reason: 'invalid_data' };
      }
      
      console.log('CloudSyncService.saveProject: Data to save:', {
        projectId: id,
        pagesCount: data.pages.length,
        shotsCount: Object.keys(data.shots).length,
        projectName: data.projectSettings.projectName,
        isManual,
        shotOrderLength: data.shotOrder.length,
        shotsWithImages: Object.values(data.shots).filter((shot: any) => shot.imageData || shot.imageUrl).length,
        shotsWithBase64: Object.values(data.shots).filter((shot: any) => shot.imageData).length,
        shotsWithUrls: Object.values(data.shots).filter((shot: any) => shot.imageUrl).length
      });
      
      // VALIDATION: Check if project name matches metadata
      const projectManager = useProjectManagerStore.getState();
      const projectMetadata = projectManager.projects[id];
      const baseCloudUpdatedAt = projectMetadata?.baseCloudUpdatedAt ?? null;
      data.updatedAt = baseCloudUpdatedAt;
      
      if (projectMetadata && projectMetadata.name !== data.projectSettings.projectName) {
        console.warn('⚠️ Project name mismatch detected, updating metadata to match store:', {
          savingToProjectId: id,
          metadataName: projectMetadata.name,
          storeName: data.projectSettings.projectName,
          dataContainsShotCount: Object.keys(data.shots).length,
          metadataShotCount: projectMetadata.shotCount
        });
        
        // Update the project metadata to match the store data
        projectManager.renameProject(id, data.projectSettings.projectName);
        console.log('✅ Project metadata updated to match store data');
      } else {
        console.log('✅ Validation passed: Project name matches');
      }
      
      // Save locally first (always)
      try {
        await this.saveToLocalStorage(id, data)
        baseResult.localSaved = true;
      } catch (error) {
        return { ...baseResult, reason: 'local_save_failed', error };
      }

      if (!isManual) {
        const conflictState = useCloudSaveConflictStore.getState();
        if (conflictState.status === 'paused_conflict' && conflictState.projectId === id) {
          if (import.meta.env.DEV) {
            console.debug('[autosave] paused_conflict active, skipping cloud save', {
              projectId: id,
              conflictUpdatedAt: conflictState.conflictUpdatedAt
            });
          }
          return { ...baseResult, localSaved: true, reason: 'conflict' };
        }
      }
      
      console.log('CloudSyncService.saveProject: Status check:', {
        isOnline,
        canReadCloud: access.canReadCloud,
        canCreateCloudProject: access.canCreateCloudProject
      });

      if (!access.canReadCloud) {
        return {
          ...baseResult,
          localSaved: true,
          reason: access.reason === 'cloud_disabled' ? 'cloud_disabled' : 'unauthenticated'
        };
      }

      if (isConflictDialogOpen) {
        return { ...baseResult, localSaved: true, reason: 'conflict' };
      }
      
      if (!isOnline) {
        const hasCloudRecord = await this.isProjectCloudBacked(id);
        if (hasCloudRecord) {
          console.log('CloudSyncService.saveProject: Offline, queuing for later sync');
          this.queueChange(id, data, baseCloudUpdatedAt);
          return { ...baseResult, localSaved: true, queued: true, reason: 'offline' };
        }
        return { ...baseResult, localSaved: true, reason: 'offline' };
      }

      let hasCloudRecord = await this.isProjectCloudBacked(id);
      let justCreatedCloudRecord = false;
      if (!hasCloudRecord) {
        if (!access.canCreateCloudProject) {
          const denyReason: CloudSaveFailureReason =
            access.reason === 'unknown' ? 'cloud_error' : 'plan_limit';
          return { ...baseResult, localSaved: true, reason: denyReason };
        }
        try {
          const description =
            typeof data.projectSettings.projectInfo === 'string'
              ? data.projectSettings.projectInfo
              : undefined;
          const createdUpdatedAt = await this.createCloudProject(
            id,
            data.projectSettings.projectName,
            description
          );
          this.markProjectAsCloudBacked(id);
          if (import.meta.env.DEV) {
            console.log('@@@ BASE SET', {
              projectId: id,
              value: createdUpdatedAt,
              source: 'cloudSync.saveProject.createCloudProject'
            });
          }
          useProjectManagerStore.getState().setProjectCloudUpdatedAt(id, createdUpdatedAt);
          hasCloudRecord = true;
          justCreatedCloudRecord = true;
        } catch (error) {
          const reason = this.getCloudFailureReason(error);
          return { ...baseResult, localSaved: true, reason, error };
        }
      }

      let writerId: string | null = null;
      if (hasCloudRecord) {
        const leaseResult = await this.ensureWriterLeaseForSave(
          id,
          isManual ? 'manual_save' : 'autosave'
        );
        if (!leaseResult.ok) {
          return { ...baseResult, localSaved: true, reason: leaseResult.reason ?? 'blocked_not_writer' };
        }
        writerId = leaseResult.writerId ?? null;
      }

      let expectedUpdatedAt = baseCloudUpdatedAt;
      if (hasCloudRecord && !expectedUpdatedAt) {
        try {
          const fetchedUpdatedAt = await ProjectService.getProjectUpdatedAt(id);
          if (fetchedUpdatedAt) {
            expectedUpdatedAt = fetchedUpdatedAt;
            if (import.meta.env.DEV) {
              console.log('@@@ BASE SET', {
                projectId: id,
                value: fetchedUpdatedAt,
                source: 'cloudSync.saveProject.fetchBase'
              });
            }
            projectManager.setProjectCloudUpdatedAt(id, fetchedUpdatedAt);
            data.updatedAt = fetchedUpdatedAt;
          } else {
            console.warn('CloudSyncService.saveProject: Missing baseCloudUpdatedAt; skipping cloud save', {
              projectId: id
            });
            return { ...baseResult, localSaved: true, reason: 'cloud_error' };
          }
        } catch (error) {
          const reason = this.getCloudFailureReason(error);
          return { ...baseResult, localSaved: true, reason, error };
        }
      }

      const toMs = (value: string | null) => (value ? new Date(value).getTime() : null);
      const isSameMs = (a: string | null, b: string | null) => {
        const aMs = toMs(a);
        const bMs = toMs(b);
        return aMs !== null && bMs !== null && aMs === bMs;
      };

      let hasRetried = false;
      let lastExpectedForCall: string | null = null;
      const attemptSave = async (
        overrideExpected: string | null | undefined,
        retryAttempt: boolean
      ): Promise<{ updatedAt: string; expectedUpdatedAt: string | null; rpc: any }> => {
        const baseCloudUpdatedAtNow =
          useProjectManagerStore.getState().projects[id]?.baseCloudUpdatedAt ?? null;
        let expectedForCall: string | null;
        if (justCreatedCloudRecord) {
          expectedForCall = null;
          justCreatedCloudRecord = false;
        } else {
          expectedForCall =
            overrideExpected !== undefined ? overrideExpected : baseCloudUpdatedAtNow;
        }
        lastExpectedForCall = expectedForCall;
        const lastSuccessfulUpdatedAt = this.lastSuccessfulUpdatedAt.get(id) ?? null;

        if (import.meta.env.DEV) {
          console.debug('[CloudSyncService] Atomic save attempt', {
            projectId: id,
            expectedUpdatedAt: expectedForCall,
            baseCloudUpdatedAt: baseCloudUpdatedAtNow,
            lastSuccessfulUpdatedAt,
            inFlight: this.inFlightSaves.has(id),
            coalesced: this.pendingSaveRequests.get(id) ?? false,
            retryAttempt
          });
        }

        console.log('@@@ ATOMIC SAVE ATTEMPT', {
          projectId: id,
          isManual,
          baseCloudUpdatedAt: useProjectManagerStore.getState().projects[id]?.baseCloudUpdatedAt ?? null
        });
        const result = await ProjectService.saveProjectAtomic(id, data, expectedForCall, writerId);
        if (import.meta.env.DEV) {
          console.debug('[CloudSyncService] Atomic save result', {
            projectId: id,
            expectedUpdatedAt: expectedForCall,
            rpc: result.rpc
          });
        }
        return { updatedAt: result.updatedAt, expectedUpdatedAt: expectedForCall, rpc: result.rpc };
      };

      try {
        baseResult.cloudAttempted = true;
        console.log('CloudSyncService.saveProject: Attempting cloud save...');
        const firstAttempt = await attemptSave(undefined, false);
        const updatedAt = firstAttempt.updatedAt;
        baseResult.cloudSaved = true;
        baseResult.ok = true;
        if (import.meta.env.DEV) {
          console.log('@@@ BASE SET', {
            projectId: id,
            value: updatedAt,
            source: 'cloudSync.saveProject.success'
          });
        }
        projectManager.setProjectCloudUpdatedAt(id, updatedAt);
        this.lastSuccessfulUpdatedAt.set(id, updatedAt);
        data.updatedAt = updatedAt;
        if (import.meta.env.DEV) {
          console.debug('[CloudSyncService] Atomic save success', {
            projectId: id,
            updatedAt,
            baseCloudUpdatedAt: updatedAt
          });
        }
        console.log('CloudSyncService.saveProject: Cloud save successful');
      } catch (error) {
        if (error instanceof LeaseRejectedError || (error as any)?.code === 'LEASE_REJECTED') {
          const leaseError = error as LeaseRejectedError;
          WriterLeaseService.handleLeaseRejected(
            id,
            leaseError.holder ?? null,
            leaseError.expiresAt ?? null,
            'save'
          );
          if (import.meta.env.DEV) {
            console.debug('[lease] rejected on save', {
              projectId: id,
              holder: leaseError.holder ?? null
            });
          }
          return { ...baseResult, localSaved: true, reason: 'blocked_not_writer', error };
        }
        if (error instanceof ProjectConflictError || (error as any)?.code === 'CONFLICT') {
          const conflictUpdatedAt = (error as ProjectConflictError).conflictUpdatedAt ?? null;
          const expectedUsed = lastExpectedForCall ??
            useProjectManagerStore.getState().projects[id]?.baseCloudUpdatedAt ?? null;

          // Guard: if the conflict timestamp matches what we sent, the RPC has a
          // precision mismatch — not a real conflict. Bail without pausing.
          const matchesExpected =
            Boolean(conflictUpdatedAt && expectedUsed) &&
            isSameMs(conflictUpdatedAt, expectedUsed);

          if (import.meta.env.DEV) {
            console.debug('[CloudSyncService] Atomic save conflict', {
              projectId: id,
              expectedUpdatedAt: expectedUsed,
              conflictUpdatedAt,
              matchesExpected,
              isManual
            });
          }
          if (matchesExpected) {
            return { ...baseResult, localSaved: true, reason: 'cloud_error', error };
          }

          // ── Auto-recovery: fetch latest server updated_at and retry ONCE ──
          if (!hasRetried) {
            hasRetried = true;

            // Prefer the conflict-returned timestamp; fall back to a direct SELECT
            let serverUpdatedAt: string | null = conflictUpdatedAt;
            if (!serverUpdatedAt) {
              try {
                serverUpdatedAt = await ProjectService.getProjectUpdatedAt(id);
              } catch (fetchErr) {
                console.warn('[CloudSyncService] Failed to fetch server updated_at for retry:', fetchErr);
              }
            }

            if (serverUpdatedAt) {
              if (import.meta.env.DEV) {
                console.log('@@@ BASE SET', {
                  projectId: id,
                  value: serverUpdatedAt,
                  source: 'cloudSync.saveProject.autoRecovery'
                });
              }
              projectManager.setProjectCloudUpdatedAt(id, serverUpdatedAt);
              data.updatedAt = serverUpdatedAt;

              try {
                const retryAttempt = await attemptSave(serverUpdatedAt, true);
                const retryUpdatedAt = retryAttempt.updatedAt;
                baseResult.cloudSaved = true;
                baseResult.ok = true;
                projectManager.setProjectCloudUpdatedAt(id, retryUpdatedAt);
                this.lastSuccessfulUpdatedAt.set(id, retryUpdatedAt);
                data.updatedAt = retryUpdatedAt;
                if (import.meta.env.DEV) {
                  console.debug('[CloudSyncService] Auto-recovery retry success', {
                    projectId: id,
                    updatedAt: retryUpdatedAt
                  });
                }
                console.log('CloudSyncService.saveProject: Cloud save successful (auto-recovery)');

                // Clear any existing paused_conflict for this project
                const conflictStore = useCloudSaveConflictStore.getState();
                if (conflictStore.status === 'paused_conflict' && conflictStore.projectId === id) {
                  conflictStore.clearPause();
                  setSavePaused(false, 'auto_recovery_success');
                }
                return baseResult;
              } catch (retryError) {
                if (retryError instanceof ProjectConflictError || (retryError as any)?.code === 'CONFLICT') {
                  // Retry also conflicted — genuine multi-writer conflict
                  const retryConflictUpdatedAt =
                    (retryError as ProjectConflictError).conflictUpdatedAt ?? null;
                  if (isManual) {
                    useCloudSaveConflictStore.getState().open(id, true);
                  } else {
                    useCloudSaveConflictStore.getState().pause(id, retryConflictUpdatedAt);
                    setSavePaused(true, 'autosave_conflict');
                    if (import.meta.env.DEV) {
                      console.debug('[autosave] paused_conflict set after retry', {
                        projectId: id,
                        conflictUpdatedAt: retryConflictUpdatedAt
                      });
                    }
                  }
                  return { ...baseResult, localSaved: true, reason: 'conflict', error: retryError };
                }
                // Non-conflict error on retry
                const reason = this.getCloudFailureReason(retryError);
                console.error('CloudSyncService.saveProject: Retry failed:', retryError);
                return { ...baseResult, localSaved: true, reason, error: retryError };
              }
            }
          }

          // No retry possible (already retried or no server timestamp available)
          if (isManual) {
            useCloudSaveConflictStore.getState().open(id, true);
          } else {
            useCloudSaveConflictStore.getState().pause(id, conflictUpdatedAt);
            setSavePaused(true, 'autosave_conflict');
            if (import.meta.env.DEV) {
              console.debug('[autosave] paused_conflict set', { projectId: id, conflictUpdatedAt });
            }
          }
          return { ...baseResult, localSaved: true, reason: 'conflict', error };
        }
        // Non-conflict error
        const reason = this.getCloudFailureReason(error);
        console.error('CloudSyncService.saveProject: Cloud save failed:', error);
        return { ...baseResult, localSaved: true, reason, error };
      }

      // Post-save migrations only when cloud-backed and successful
      if (baseResult.ok && hasCloudRecord) {
        const base64Images = Object.entries(shotStore.shots).filter(([_, shot]) => 
          shot.imageData && !shot.imageUrl
        );
        
        if (base64Images.length > 0) {
          console.log(`Found ${base64Images.length} base64 images to migrate`);
          await this.migrateBase64Images(id, base64Images);
        }

        // Check for project logo that needs migration (only if we have a valid file)
        // Only process logo operations if this is the current active project and not switching
        const currentProjectId = useProjectManagerStore.getState().currentProjectId;
        const { ProjectSwitcher } = await import('@/utils/projectSwitcher');
        const isProjectSwitching = ProjectSwitcher.isProjectSwitching();

        if (id === currentProjectId && !isProjectSwitching) {
          if (projectStore.projectLogoFile && 
              projectStore.projectLogoFile instanceof File && 
              !projectStore.projectLogoUrl?.includes('supabase')) {
            console.log('Found project logo file to migrate');
            try {
              await this.migrateProjectLogo(id, projectStore.projectLogoFile);
            } catch (error) {
              console.error('Project logo migration failed:', error);
              // Don't let logo migration break the entire save
            }
          } else if (projectStore.projectLogoFile === null && projectStore.projectLogoUrl === null) {
            // Check if this project previously had a logo that needs to be cleaned up
            // Only delete if we can confirm this project had a logo before
            try {
              const { StorageService } = await import('./storageService');
              const existingLogo = await StorageService.getProjectLogo(id);
              if (existingLogo) {
                console.log('Project logo was removed, deleting from cloud storage');
                await StorageService.deleteProjectLogo(id);
              }
            } catch (error) {
              console.error('Project logo deletion failed:', error);
              // Don't let logo deletion break the entire save
            }
          }
        } else {
          if (isProjectSwitching) {
            console.log(`⏭️ Skipping logo operations for project ${id} - project switching in progress`);
          } else {
            console.log(`Skipping logo operations for project ${id} - not the current active project (${currentProjectId})`);
          }
        }
      }

    return baseResult;
  }

  private static getCloudFailureReason(error: unknown): CloudSaveFailureReason {
    const code = (error as any)?.code;
    const message = String((error as any)?.message || '').toLowerCase();
    if (code === '42501' || message.includes('row-level security')) {
      return 'plan_limit';
    }
    if (code === '23503' || message.includes('foreign key')) {
      return 'project_record_missing';
    }
    if (code === 'CLOUD_PROJECT_LIMIT') {
      return 'plan_limit';
    }
    return 'cloud_error';
  }
  
  static autoSave(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout)
    }
    
    this.syncTimeout = setTimeout(() => {
      this.saveProject().catch(error => {
        console.error('Auto-save failed:', error)
      })
    }, 2000) // Auto-save 2 seconds after last change
  }
  
  static async uploadShotImage(projectId: string, shotId: string, file: File): Promise<string> {
    const imageUrl = await StorageService.uploadImage(projectId, shotId, file)
    return imageUrl
  }
  
  static async deleteProject(projectId: string): Promise<void> {
    await ProjectService.deleteProject(projectId)
  }
  
  /**
   * Migrate base64 images to cloud storage with improved error handling
   */
  private static async migrateBase64Images(projectId: string, base64Images: [string, any][]): Promise<void> {
    const { StorageService } = await import('./storageService');
    const { useShotStore } = await import('@/store/shotStore');
    const { BackgroundSyncService } = await import('@/services/backgroundSyncService');
    
    let migratedCount = 0;
    let failedCount = 0;
    const failedImages: string[] = [];

    for (const [shotId, shot] of base64Images) {
      try {
        console.log(`Migrating base64 image for shot ${shotId}...`);
        
        // Convert base64 to File
        const response = await fetch(shot.imageData);
        const blob = await response.blob();
        const file = new File([blob], `shot-${shotId}.png`, { type: 'image/png' });
        
        // Upload to Supabase Storage
        const imageUrl = await StorageService.uploadImage(projectId, shotId, file);
        
        // Update shot in store with new URL and remove base64
        const shotStore = useShotStore.getState();
        shotStore.updateShot(shotId, {
          imageUrl,
          imageData: undefined, // Remove base64 to save space
          imageStorageType: 'supabase',
          cloudSyncStatus: 'synced'
        });
        BackgroundSyncService.reconcileImageUploadSuccess(projectId, shotId);
        
        console.log(`Successfully migrated image for shot ${shotId}`);
        migratedCount++;
      } catch (error) {
        console.error(`Failed to migrate image for shot ${shotId}:`, error);
        failedCount++;
        failedImages.push(shotId);
        
        // Update shot with failed status for retry later
        const shotStore = useShotStore.getState();
        shotStore.updateShot(shotId, {
          cloudSyncStatus: 'failed',
          cloudSyncRetries: (shot.cloudSyncRetries || 0) + 1,
          lastSyncAttempt: new Date()
        });
      }
    }

    if (migratedCount > 0) {
      console.log(`Successfully migrated ${migratedCount} image(s) to cloud storage`);
    }
    
    if (failedCount > 0) {
      console.warn(`Failed to migrate ${failedCount} image(s):`, failedImages);
    }
  }

  /**
   * Migrate project logo to cloud storage
   */
  private static async migrateProjectLogo(projectId: string, logoFile: File): Promise<void> {
    const { StorageService } = await import('./storageService');
    const { useProjectStore } = await import('@/store/projectStore');
    
    try {
      console.log('Migrating project logo to cloud storage...');
      
      // Upload to Supabase Storage
      const imageUrl = await StorageService.uploadProjectLogo(projectId, logoFile);
      
      // Update project store with new URL and remove file
      const projectStore = useProjectStore.getState();
      projectStore.setProjectLogo(null); // Clear the file
      
      // Update the URL directly in the store
      useProjectStore.setState(state => ({
        ...state,
        projectLogoUrl: imageUrl,
        projectLogoFile: null,
        projectLogoDataUrl: null,
      }));
      
      console.log('Successfully migrated project logo to cloud storage');
    } catch (error) {
      console.error('Failed to migrate project logo:', error);
      throw error;
    }
  }

  /**
   * Manually trigger migration of base64 images to cloud storage
   */
  static async triggerImageMigration(projectId?: string): Promise<void> {
    const id = projectId || this.currentProjectId;
    if (!id) {
      console.warn('CloudSyncService.triggerImageMigration: No project ID provided');
      return;
    }

    const access = await CloudAccessService.getAccessState();
    if (!access.canReadCloud) {
      console.log('CloudSyncService.triggerImageMigration: Cloud access unavailable');
      return;
    }

    if (useProjectConflictStore.getState().isOpen) {
      console.log('CloudSyncService.triggerImageMigration: Conflict dialog open, skipping migration');
      return;
    }

    const hasCloudRecord = await this.isProjectCloudBacked(id);
    if (!hasCloudRecord) {
      console.warn('CloudSyncService.triggerImageMigration: Project is not cloud-backed, skipping migration');
      return;
    }

    const shotStore = useShotStore.getState();
    const base64Images = Object.entries(shotStore.shots).filter(([_, shot]) => 
      shot.imageData && !shot.imageUrl
    );

    if (base64Images.length === 0) {
      console.log('No base64 images to migrate');
      return;
    }

    console.log(`Manually triggering migration of ${base64Images.length} base64 images`);
    await this.migrateBase64Images(id, base64Images);
  }

  /**
   * Manually trigger migration of project logo to cloud storage
   */
  static async triggerProjectLogoMigration(projectId?: string): Promise<void> {
    const id = projectId || this.currentProjectId;
    if (!id) {
      console.warn('CloudSyncService.triggerProjectLogoMigration: No project ID provided');
      return;
    }

    const access = await CloudAccessService.getAccessState();
    if (!access.canReadCloud) {
      console.log('CloudSyncService.triggerProjectLogoMigration: Cloud access unavailable');
      return;
    }

    if (useProjectConflictStore.getState().isOpen) {
      console.log('CloudSyncService.triggerProjectLogoMigration: Conflict dialog open, skipping migration');
      return;
    }

    const hasCloudRecord = await this.isProjectCloudBacked(id);
    if (!hasCloudRecord) {
      console.warn('CloudSyncService.triggerProjectLogoMigration: Project is not cloud-backed, skipping migration');
      return;
    }

    const projectStore = useProjectStore.getState();
    
    if (!projectStore.projectLogoFile || projectStore.projectLogoUrl?.includes('supabase')) {
      console.log('No project logo file to migrate');
      return;
    }

    console.log('Manually triggering migration of project logo');
    await this.migrateProjectLogo(id, projectStore.projectLogoFile);
  }

  static async migrateProject(projectId: string): Promise<void> {
    // Get current project data
    const pageStore = usePageStore.getState()
    const shotStore = useShotStore.getState()
    const projectStore = useProjectStore.getState()
    const uiStore = useUIStore.getState()
    
    const projectManager = useProjectManagerStore.getState();
    const baseCloudUpdatedAt = projectManager.projects[projectId]?.baseCloudUpdatedAt ?? null;
    const data: ProjectData = {
      pages: pageStore.pages,
      shots: shotStore.shots,
      shotOrder: shotStore.shotOrder,
      updatedAt: baseCloudUpdatedAt,
      projectSettings: {
        projectName: projectStore.projectName,
        projectInfo: projectStore.projectInfo,
        projectLogoUrl: projectStore.projectLogoUrl?.startsWith('blob:')
          ? (projectStore.projectLogoDataUrl || undefined)
          : projectStore.projectLogoUrl,
        clientAgency: projectStore.clientAgency,
        jobInfo: projectStore.jobInfo,
        pageSizeMode: projectStore.pageSizeMode,
        templateSettings: projectStore.templateSettings,
        storyboardTheme: projectStore.storyboardTheme
      },
      uiSettings: {
        isDragging: uiStore.isDragging,
        isExporting: uiStore.isExporting,
        showDeleteConfirmation: uiStore.showDeleteConfirmation
      }
    }

    const leaseResult = await this.ensureWriterLeaseForSave(projectId, 'migrate');
    if (!leaseResult.ok) {
      if (import.meta.env.DEV) {
        console.debug('[lease] migrate blocked (read_only)', {
          projectId
        });
      }
      return;
    }
    const writerId = leaseResult.writerId ?? null;

    // Upload to cloud
    const updatedAt = await ProjectService.saveProject(projectId, data, baseCloudUpdatedAt, writerId)
    if (import.meta.env.DEV) {
      console.log('@@@ BASE SET', {
        projectId,
        value: updatedAt,
        source: 'cloudSync.migrateProject'
      });
    }
    projectManager.setProjectCloudUpdatedAt(projectId, updatedAt);
    
    // Migrate Base64 images to Supabase Storage
    const base64Images = Object.entries(shotStore.shots).filter(([_, shot]) => 
      shot.imageData && !shot.imageUrl
    );
    
    if (base64Images.length > 0) {
      await this.migrateBase64Images(projectId, base64Images);
    }

    // Migrate project logo to Supabase Storage (only if we have a valid file)
    if (projectStore.projectLogoFile && 
        projectStore.projectLogoFile instanceof File && 
        !projectStore.projectLogoUrl?.includes('supabase')) {
      try {
        await this.migrateProjectLogo(projectId, projectStore.projectLogoFile);
      } catch (error) {
        console.error('Project logo migration failed:', error);
        // Don't let logo migration break the entire migration
      }
    }
    
    // Save updated data
    await this.saveProject(projectId)
  }
  
  static queueChange(projectId: string, data: ProjectData, expectedUpdatedAt?: string | null): void {
    this.offlineQueue.push({
      projectId,
      data,
      expectedUpdatedAt,
      timestamp: Date.now()
    })
  }
  
  static async replayQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return
    
    const queue = [...this.offlineQueue]
    this.offlineQueue = []
    
    for (const item of queue) {
      let writerId: string | null = null;
      try {
        const leaseResult = await this.ensureWriterLeaseForSave(item.projectId, 'replay_queue');
        if (!leaseResult.ok) {
          if (import.meta.env.DEV) {
            console.debug('[lease] replay blocked (read_only)', {
              projectId: item.projectId
            });
          }
          this.offlineQueue.push(item);
          continue;
        }
        writerId = leaseResult.writerId ?? null;

        const updatedAt = await ProjectService.saveProject(
          item.projectId,
          item.data,
          item.expectedUpdatedAt,
          writerId
        )
        if (import.meta.env.DEV) {
          console.log('@@@ BASE SET', {
            projectId: item.projectId,
            value: updatedAt,
            source: 'cloudSync.replayQueue'
          });
        }
        useProjectManagerStore.getState().setProjectCloudUpdatedAt(item.projectId, updatedAt);
      } catch (error) {
        if (error instanceof LeaseRejectedError || (error as any)?.code === 'LEASE_REJECTED') {
          const leaseError = error as LeaseRejectedError;
          WriterLeaseService.handleLeaseRejected(
            item.projectId,
            leaseError.holder ?? null,
            leaseError.expiresAt ?? null,
            'replay_queue'
          );
          this.offlineQueue.push(item);
          continue;
        }
        if (error instanceof ProjectConflictError || (error as any)?.code === 'CONFLICT') {
          const conflictUpdatedAt = (error as ProjectConflictError).conflictUpdatedAt ?? null;
          // Auto-recovery: use conflict-returned timestamp to retry once
          let serverUpdatedAt = conflictUpdatedAt;
          if (!serverUpdatedAt) {
            try {
              serverUpdatedAt = await ProjectService.getProjectUpdatedAt(item.projectId);
            } catch (_) { /* best-effort */ }
          }
          if (serverUpdatedAt) {
            try {
              const retryUpdatedAt = await ProjectService.saveProject(
                item.projectId,
                item.data,
                serverUpdatedAt,
                writerId
              );
              useProjectManagerStore.getState().setProjectCloudUpdatedAt(item.projectId, retryUpdatedAt);
              if (import.meta.env.DEV) {
                console.debug('[replayQueue] auto-recovery success', {
                  projectId: item.projectId,
                  updatedAt: retryUpdatedAt
                });
              }
              continue; // success, move to next item
            } catch (retryErr) {
              // Retry also failed — fall through to pause
              if (import.meta.env.DEV) {
                console.debug('[replayQueue] auto-recovery failed', {
                  projectId: item.projectId,
                  error: retryErr
                });
              }
            }
          }
          useCloudSaveConflictStore.getState().pause(item.projectId, conflictUpdatedAt);
          setSavePaused(true, 'autosave_conflict');
          if (import.meta.env.DEV) {
            console.debug('[autosave] paused_conflict set', {
              projectId: item.projectId,
              conflictUpdatedAt
            });
          }
          console.warn('Queued change conflict detected; dropping item');
          continue;
        }
        console.error('Failed to replay queued change:', error)
        // Re-queue failed items
        this.offlineQueue.push(item)
      }
    }
  }
  
  static hasQueuedChanges(): boolean {
    return this.offlineQueue.length > 0
  }
  
  static async saveToLocalStorage(projectId: string, data: ProjectData): Promise<void> {
    console.log('Saving to localStorage:', projectId)
    
    try {
      // Save project data to localStorage using the same keys as the app
      const { LocalStorageManager } = await import('@/utils/localStorageManager');
      const writeRequiredItem = (key: string, value: string): void => {
        const didWrite = LocalStorageManager.setItem(key, value);
        if (!didWrite) {
          throw new Error(`Failed to write localStorage key ${key}`);
        }
      };
      
      // Save pages data in the format expected by the store (wrapped in state object)
      if (data.pages) {
        const pageStoreData = {
          state: {
            pages: data.pages,
            activePageId: data.pages.length > 0 ? data.pages[0].id : null
          }
        };
        writeRequiredItem(`page-storage-project-${projectId}`, JSON.stringify(pageStoreData));
      }
      
      // Save shots data in the format expected by the store (wrapped in state object)
      if (data.shots) {
        const shotStoreData = {
          state: {
            shots: data.shots,
            shotOrder: Array.isArray(data.shotOrder)
              ? data.shotOrder
              : this.deriveShotOrderFromPages(data.pages)
          }
        };
        writeRequiredItem(`shot-storage-project-${projectId}`, JSON.stringify(shotStoreData));
      }
      
      // Save project settings (wrapped in state object)
      if (data.projectSettings) {
        // Ensure project has a name - use project ID as fallback if empty
        // Migration: Add default theme if missing
        const { getDefaultTheme, migrateTheme } = await import('@/styles/storyboardTheme');
        const projectSettings = {
          ...data.projectSettings,
          projectName: data.projectSettings.projectName || `Project ${projectId.slice(0, 8)}`,
          storyboardTheme: data.projectSettings.storyboardTheme 
            ? migrateTheme(data.projectSettings.storyboardTheme)
            : getDefaultTheme()
        };
        
        const projectStoreData = {
          state: projectSettings
        };
        writeRequiredItem(`project-storage-project-${projectId}`, JSON.stringify(projectStoreData));
      }
      
      // Save UI settings (wrapped in state object)
      if (data.uiSettings) {
        const uiStoreData = {
          state: data.uiSettings
        };
        writeRequiredItem(`ui-store-project-${projectId}`, JSON.stringify(uiStoreData));
      }
      
      console.log('Project data saved to localStorage successfully');
    } catch (error) {
      console.error('Failed to save project data to localStorage:', error);
      throw error;
    }
  }
  
  /**
   * Create a cloud project with a specific ID (for guest project migration)
   */
  static async createCloudProject(
    projectId: string,
    name: string,
    description?: string
  ): Promise<string> {
    const { supabase } = await import('@/lib/supabase');
    const user = await supabase.auth.getUser();
    
    if (!user.data.user) {
      throw new Error('Not authenticated');
    }

    // Create project with specific ID
    const { error: projectError } = await supabase
      .from('projects')
      .insert({
        id: projectId,
        user_id: user.data.user.id,
        name,
        description: description || null
      });
    
    if (projectError) {
      throw projectError;
    }

    const now = new Date().toISOString();
    const defaultPageId = crypto.randomUUID();
    const defaultShotId = crypto.randomUUID();

    // Create default project data entry with one empty shot.
    const { error: dataError } = await supabase
      .from('project_data')
      .insert({
        project_id: projectId,
        pages: [{
          id: defaultPageId,
          name: 'Page 1',
          shots: [defaultShotId],
          gridRows: 2,
          gridCols: 4,
          aspectRatio: '16/9',
          createdAt: now,
          updatedAt: now,
        }],
        shots: {
          [defaultShotId]: {
            id: defaultShotId,
            number: '01',
            subShotGroupId: null,
            imageFile: null,
            imageScale: 1.0,
            imageOffsetX: 0,
            imageOffsetY: 0,
            actionText: '',
            scriptText: '',
            createdAt: now,
            updatedAt: now,
          },
        },
        shot_order: [defaultShotId],
        project_settings: {
          projectName: name || 'Project Name',
          projectInfo: 'Project Info',
          projectLogoUrl: null,
          clientAgency: 'Client/Agency',
          jobInfo: 'Job Info',
          pageSizeMode: 'dynamic',
          templateSettings: {
            showLogo: false,
            showProjectName: true,
            showProjectInfo: true,
            showClientAgency: true,
            showJobInfo: true,
            showActionText: true,
            showScriptText: true,
            showPageNumber: true,
            shotNumberFormat: '01',
          },
        },
        ui_settings: {
          isDragging: false,
          isExporting: false,
          showDeleteConfirmation: true,
        },
        updated_at: now
      });
    
    if (dataError) {
      throw dataError;
    }

    this.markProjectAsCloudBacked(projectId);
    if (import.meta.env.DEV) {
      console.log('@@@ BASE SET', {
        projectId,
        value: now,
        source: 'cloudSync.createCloudProject'
      });
    }
    useProjectManagerStore.getState().setProjectCloudUpdatedAt(projectId, now);
    console.log(`Cloud project created with ID: ${projectId}`);
    return now;
  }

  private static isCloudEnabled(): boolean {
    return import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true'
  }
  
  private static isAuthenticated(): boolean {
    try {
      return useAuthStore.getState().isAuthenticated;
    } catch (error) {
      console.warn('Could not check auth status:', error);
      return false;
    }
  }
}
