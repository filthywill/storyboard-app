import type { StoryboardPage } from '@/store/pageStore';
import type { ProjectState, TemplateSettings } from '@/store/projectStore';
import type { Shot } from '@/store/shotStore';
import type { UIState } from '@/store/uiStore';
import { getDefaultTheme } from '@/styles/storyboardTheme';
import { formatShotNumber } from '@/utils/formatShotNumber';

type FixturePage = Omit<StoryboardPage, 'id' | 'shots' | 'createdAt' | 'updatedAt'> & {
  id: string;
  shots: string[];
};

type FixtureShot = Omit<Shot, 'createdAt' | 'updatedAt' | 'imageFile'> & {
  imageFile?: null;
};

export type SampleStoryboardTemplate = {
  name: string;
  description: string;
  pages: FixturePage[];
  activePageId: string;
  shots: Record<string, FixtureShot>;
  shotOrder: string[];
  projectSettings: Omit<ProjectState, 'projectName' | 'projectLogoFile' | 'projectLogoDataUrl'>;
  uiSettings: Pick<UIState, 'isDragging' | 'isExporting' | 'showDeleteConfirmation'>;
};

export type InstantiatedSampleStoryboard = {
  pages: StoryboardPage[];
  activePageId: string;
  shots: Record<string, Shot>;
  shotOrder: string[];
  projectSettings: Omit<ProjectState, 'projectLogoFile'>;
  uiSettings: Pick<UIState, 'isDragging' | 'isExporting' | 'showDeleteConfirmation'>;
};

const templateSettings: TemplateSettings = {
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

export const sampleStoryboardTemplate: SampleStoryboardTemplate = {
  name: 'Sample Storyboard',
  description: 'A short visual sequence demonstrating storyboard layout and editing.',
  pages: [
    {
      id: 'sample-page-opening',
      name: 'Page 1',
      shots: [
        'sample-shot-01',
        'sample-shot-02',
        'sample-shot-03',
        'sample-shot-04',
      ],
      gridRows: 2,
      gridCols: 2,
      aspectRatio: '16/9',
    },
    {
      id: 'sample-page-resolution',
      name: 'Page 2',
      shots: [
        'sample-shot-05',
        'sample-shot-06',
        'sample-shot-07',
        'sample-shot-08',
      ],
      gridRows: 2,
      gridCols: 2,
      aspectRatio: '16/9',
    },
  ],
  activePageId: 'sample-page-opening',
  shots: {
    'sample-shot-01': {
      id: 'sample-shot-01',
      number: '01',
      subShotGroupId: null,
      imageUrl: '/sample-storyboard/01.png',
      imageScale: 1,
      imageOffsetX: 0,
      imageOffsetY: 0,
      actionText: 'Medium of person grabbing bag of chips and heading to check out.',
      scriptText: '',
    },
    'sample-shot-02': {
      id: 'sample-shot-02',
      number: '02',
      subShotGroupId: null,
      imageUrl: '/sample-storyboard/02.png',
      imageScale: 1,
      imageOffsetX: 0,
      imageOffsetY: 0,
      actionText: 'Dolly from an aisle revealing profile medium CU of person looking back and forth at lines.',
      scriptText: '',
    },
    'sample-shot-03': {
      id: 'sample-shot-03',
      number: '03',
      subShotGroupId: null,
      imageUrl: '/sample-storyboard/03.png',
      imageScale: 1,
      imageOffsetX: 0,
      imageOffsetY: 0,
      actionText: 'Reverse POV looking back and forth',
      scriptText: '',
    },
    'sample-shot-04': {
      id: 'sample-shot-04',
      number: '04',
      subShotGroupId: null,
      imageUrl: '/sample-storyboard/04.png',
      imageScale: 1,
      imageOffsetX: 0,
      imageOffsetY: 0,
      actionText: 'Profile CU as they turn to their right (toward cam) and walking, looking for an opening.',
      scriptText: '',
    },
    'sample-shot-05': {
      id: 'sample-shot-05',
      number: '05',
      subShotGroupId: null,
      imageUrl: '/sample-storyboard/05.png',
      imageScale: 1,
      imageOffsetX: 0,
      imageOffsetY: 0,
      actionText: 'Back to reverse POV (tighter) as they walk, seeing all the people in line with loaded up carts and people unloading them on conveyors.',
      scriptText: '',
    },
    'sample-shot-06': {
      id: 'sample-shot-06',
      number: '06',
      subShotGroupId: null,
      imageUrl: '/sample-storyboard/06.png',
      imageScale: 1,
      imageOffsetX: 0,
      imageOffsetY: 0,
      actionText: 'High angle boom up and rack focus from our person to lane light in foreground going on.',
      scriptText: '',
    },
    'sample-shot-07': {
      id: 'sample-shot-07',
      number: '07',
      subShotGroupId: null,
      imageUrl: '/sample-storyboard/07.png',
      imageScale: 1,
      imageOffsetX: 0,
      imageOffsetY: 0,
      actionText: 'two-shot of person and cashier from bagging area, they unload their cart on conveyor.',
      scriptText: '',
    },
    'sample-shot-08': {
      id: 'sample-shot-08',
      number: '08',
      subShotGroupId: null,
      imageUrl: '/sample-storyboard/08.png',
      imageScale: 1,
      imageOffsetX: 0,
      imageOffsetY: 0,
      actionText: 'Punch in CU, person feeling proud.',
      scriptText: '',
    },
  },
  shotOrder: [
    'sample-shot-01',
    'sample-shot-02',
    'sample-shot-03',
    'sample-shot-04',
    'sample-shot-05',
    'sample-shot-06',
    'sample-shot-07',
    'sample-shot-08',
  ],
  projectSettings: {
    projectInfo: 'StoryboardFlow sample sequence',
    projectLogoUrl: null,
    clientAgency: 'Sample Studio',
    jobInfo: 'Visual development',
    pageSizeMode: 'dynamic',
    templateSettings,
    storyboardTheme: getDefaultTheme(),
  },
  uiSettings: {
    isDragging: false,
    isExporting: false,
    showDeleteConfirmation: true,
  },
};

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) {
    throw new Error(`Invalid sample storyboard template: ${message}`);
  }
};

const getExpectedPageShots = (
  pages: Array<Pick<StoryboardPage, 'gridRows' | 'gridCols'>>,
  shotOrder: string[],
): string[][] => {
  assert(pages.length > 0, 'at least one page is required');
  const capacity = pages[0].gridRows * pages[0].gridCols;
  assert(capacity > 0, 'first page capacity must be positive');

  return pages.map((_, index) => shotOrder.slice(index * capacity, (index + 1) * capacity));
};

const validateSnapshotIntegrity = (
  snapshot: Pick<InstantiatedSampleStoryboard, 'pages' | 'activePageId' | 'shots' | 'shotOrder'>,
  options: { allowFixtureSubShotGroupIds?: boolean } = {},
): void => {
  const shotIds = Object.keys(snapshot.shots);
  const orderIds = new Set(snapshot.shotOrder);

  assert(orderIds.size === snapshot.shotOrder.length, 'shotOrder contains duplicate IDs');
  assert(shotIds.length === snapshot.shotOrder.length, 'shotOrder does not contain every shot exactly once');
  snapshot.shotOrder.forEach((shotId) => {
    assert(Boolean(snapshot.shots[shotId]), `shotOrder references missing shot ${shotId}`);
  });

  Object.entries(snapshot.shots).forEach(([shotId, shot]) => {
    assert(shot.id === shotId, `shot map key does not match shot.id for ${shotId}`);
    assert(orderIds.has(shotId), `shot ${shotId} is missing from shotOrder`);
    if (!options.allowFixtureSubShotGroupIds) {
      assert(!shot.subShotGroupId?.startsWith('sample-'), `shot ${shotId} retains a fixture sub-shot group ID`);
    }
  });

  assert(
    snapshot.pages.some((page) => page.id === snapshot.activePageId),
    'activePageId does not reference a page',
  );

  const expectedPageShots = getExpectedPageShots(snapshot.pages, snapshot.shotOrder);
  snapshot.pages.forEach((page, index) => {
    page.shots.forEach((shotId) => {
      assert(Boolean(snapshot.shots[shotId]), `page ${page.id} references missing shot ${shotId}`);
      assert(orderIds.has(shotId), `page ${page.id} references a shot absent from shotOrder`);
    });
    assert(
      page.shots.length === expectedPageShots[index].length &&
        page.shots.every((shotId, shotIndex) => shotId === expectedPageShots[index][shotIndex]),
      `page ${page.id} is not the canonical shotOrder projection`,
    );
  });
};

export const validateInstantiatedSampleStoryboard = (
  snapshot: Pick<InstantiatedSampleStoryboard, 'pages' | 'activePageId' | 'shots' | 'shotOrder'>,
): void => {
  validateSnapshotIntegrity(snapshot);
};

const renumberShots = (shots: Record<string, Shot>, shotOrder: string[], shotNumberFormat: string): void => {
  let mainShotCounter = 0;
  let subLetterCode = 'a'.charCodeAt(0);

  shotOrder.forEach((shotId, index) => {
    const shot = shots[shotId];
    const previousShot = index > 0 ? shots[shotOrder[index - 1]] : null;
    const continuesSubShotGroup =
      Boolean(shot.subShotGroupId) && shot.subShotGroupId === previousShot?.subShotGroupId;

    if (!continuesSubShotGroup) {
      mainShotCounter += 1;
      subLetterCode = 'a'.charCodeAt(0);
    }

    shot.number = shot.subShotGroupId
      ? formatShotNumber(mainShotCounter, shotNumberFormat, String.fromCharCode(subLetterCode++))
      : formatShotNumber(mainShotCounter, shotNumberFormat);
  });
};

export const instantiateSampleStoryboard = (
  template: SampleStoryboardTemplate = sampleStoryboardTemplate,
): InstantiatedSampleStoryboard => {
  validateSnapshotIntegrity({
    pages: template.pages as StoryboardPage[],
    activePageId: template.activePageId,
    shots: template.shots as Record<string, Shot>,
    shotOrder: template.shotOrder,
  }, { allowFixtureSubShotGroupIds: true });

  const now = new Date();
  const pageIds = new Map(template.pages.map((page) => [page.id, crypto.randomUUID()]));
  const shotIds = new Map(template.shotOrder.map((shotId) => [shotId, crypto.randomUUID()]));
  const subShotGroupIds = new Map<string, string>();

  const shots = Object.fromEntries(
    template.shotOrder.map((fixtureShotId) => {
      const fixtureShot = template.shots[fixtureShotId];
      const id = shotIds.get(fixtureShotId);
      assert(id, `missing remapped ID for ${fixtureShotId}`);

      const subShotGroupId = fixtureShot.subShotGroupId
        ? subShotGroupIds.get(fixtureShot.subShotGroupId) ??
          (() => {
            const groupId = crypto.randomUUID();
            subShotGroupIds.set(fixtureShot.subShotGroupId!, groupId);
            return groupId;
          })()
        : null;

      return [
        id,
        {
          ...fixtureShot,
          id,
          subShotGroupId,
          imageFile: null,
          createdAt: now,
          updatedAt: now,
        } satisfies Shot,
      ];
    }),
  ) as Record<string, Shot>;

  const shotOrder = template.shotOrder.map((fixtureShotId) => {
    const id = shotIds.get(fixtureShotId);
    assert(id, `missing remapped shot order ID for ${fixtureShotId}`);
    return id;
  });
  const expectedPageShots = getExpectedPageShots(template.pages, shotOrder);
  const pages = template.pages.map((fixturePage, index) => {
    const id = pageIds.get(fixturePage.id);
    assert(id, `missing remapped page ID for ${fixturePage.id}`);
    return {
      ...fixturePage,
      id,
      shots: expectedPageShots[index],
      createdAt: now,
      updatedAt: now,
    } satisfies StoryboardPage;
  });
  const activePageId = pageIds.get(template.activePageId);
  assert(activePageId, 'missing remapped active page ID');

  renumberShots(shots, shotOrder, template.projectSettings.templateSettings.shotNumberFormat);

  const snapshot: InstantiatedSampleStoryboard = {
    pages,
    activePageId,
    shots,
    shotOrder,
    projectSettings: {
      ...template.projectSettings,
      projectName: template.name,
      projectLogoFile: null,
      projectLogoDataUrl: null,
      templateSettings: { ...template.projectSettings.templateSettings },
      storyboardTheme: { ...template.projectSettings.storyboardTheme },
    },
    uiSettings: { ...template.uiSettings },
  };

  validateSnapshotIntegrity(snapshot);
  return snapshot;
};
