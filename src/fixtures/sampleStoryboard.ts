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

const defaultStoryboardTheme = getDefaultTheme();

const sampleStoryboardTheme = {
  ...defaultStoryboardTheme,
  scriptText: {
    ...defaultStoryboardTheme.scriptText,
    fontSize: 11,
  },
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
        'sample-shot-05',
        'sample-shot-06',
        'sample-shot-07',
        'sample-shot-08',
      ],
      gridRows: 2,
      gridCols: 4,
      aspectRatio: '16/9',
    },
    {
      id: 'sample-page-resolution',
      name: 'Page 2',
      shots: [
        'sample-shot-09',
        'sample-shot-10',
        'sample-shot-11',
        'sample-shot-12',
      ],
      gridRows: 2,
      gridCols: 4,
      aspectRatio: '16/9',
    },
  ],
  activePageId: 'sample-page-opening',
  shots: {
    'sample-shot-01': {
      id: 'sample-shot-01',
      number: '01',
      subShotGroupId: null,
      imageUrl: '/sample-storyboard/01.jpg',
      imageScale: 1,
      imageOffsetX: 0,
      imageOffsetY: 0,
      actionText: 'Medium Shot of hero in gym',
      scriptText: 'Wrapping hands to prepare for sparring',
    },
    'sample-shot-02': {
      id: 'sample-shot-02',
      number: '02',
      subShotGroupId: null,
      imageUrl: '/sample-storyboard/02.jpg',
      imageScale: 1,
      imageOffsetX: 0,
      imageOffsetY: 0,
      actionText: 'Medium-wide two-shot  ',
      scriptText: 'Hero hitting gloves with trainer',
    },
    'sample-shot-03': {
      id: 'sample-shot-03',
      number: '03',
      subShotGroupId: null,
      imageUrl: '/sample-storyboard/03.jpg',
      imageScale: 1,
      imageOffsetX: 0,
      imageOffsetY: 0,
      actionText: 'Medium-wide two shot',
      scriptText: 'Trainer handing the hero a water',
    },
    'sample-shot-04': {
      id: 'sample-shot-04',
      number: '04',
      subShotGroupId: null,
      imageUrl: '/sample-storyboard/04.jpg',
      imageScale: 1,
      imageOffsetX: 0,
      imageOffsetY: 0,
      actionText: 'Close-up shot, high angle',
      scriptText: 'Wrapping hands up for training',
    },
    'sample-shot-05': {
      id: 'sample-shot-05',
      number: '05',
      subShotGroupId: null,
      imageUrl: '/sample-storyboard/05.jpg',
      imageScale: 1,
      imageOffsetX: 0,
      imageOffsetY: 0,
      actionText: 'Medium-wide profile shot',
      scriptText: 'Hero punching a heavy bag',
    },
    'sample-shot-06': {
      id: 'sample-shot-06',
      number: '06',
      subShotGroupId: null,
      imageUrl: '/sample-storyboard/06.jpg',
      imageScale: 1,
      imageOffsetX: 0,
      imageOffsetY: 0,
      actionText: 'Wide-shot, front quarter angle',
      scriptText: 'Hero jump rope training',
    },
    'sample-shot-07': {
      id: 'sample-shot-07',
      number: '07',
      subShotGroupId: null,
      imageUrl: '/sample-storyboard/07.jpg',
      imageScale: 1,
      imageOffsetX: 0,
      imageOffsetY: 0,
      actionText: 'Extreme-wide, establishing shot',
      scriptText: 'Hero in brightly lit boxing ring',
    },
    'sample-shot-08': {
      id: 'sample-shot-08',
      number: '08',
      subShotGroupId: null,
      imageUrl: '/sample-storyboard/08.jpg',
      imageScale: 1,
      imageOffsetX: 0,
      imageOffsetY: 0,
      actionText: 'Close-up, straight shot',
      scriptText: 'Hero in headgear looking intense',
    },
    'sample-shot-09': {
      id: 'sample-shot-09',
      number: '09',
      subShotGroupId: null,
      imageUrl: '/sample-storyboard/09.jpg',
      imageScale: 1,
      imageOffsetX: 0,
      imageOffsetY: 0,
      actionText: 'Wide-shot, hero in FG',
      scriptText: 'Camera following hero through gate',
    },
    'sample-shot-10': {
      id: 'sample-shot-10',
      number: '10',
      subShotGroupId: null,
      imageUrl: '/sample-storyboard/10.jpg',
      imageScale: 1,
      imageOffsetX: 0,
      imageOffsetY: 0,
      actionText: 'Wide-shot, low angle',
      scriptText: 'Camera follows hero pulling weights',
    },
    'sample-shot-11': {
      id: 'sample-shot-11',
      number: '11',
      subShotGroupId: null,
      imageUrl: '/sample-storyboard/11.jpg',
      imageScale: 1,
      imageOffsetX: 0,
      imageOffsetY: 0,
      actionText: 'Medium-wide shot, profile',
      scriptText: 'Hero looking into mirror, washing up',
    },
    'sample-shot-12': {
      id: 'sample-shot-12',
      number: '12',
      subShotGroupId: null,
      imageUrl: '/sample-storyboard/12.jpg',
      imageScale: 1,
      imageOffsetX: 0,
      imageOffsetY: 0,
      actionText: 'Wide-shot, straight on',
      scriptText: 'Hero walking through mall with friends',
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
    'sample-shot-09',
    'sample-shot-10',
    'sample-shot-11',
    'sample-shot-12',
  ],
  projectSettings: {
    projectInfo: 'StoryboardFlow sample sequence',
    projectLogoUrl: '/sample-storyboard/samplelogo.png',
    clientAgency: 'Sample Studio',
    jobInfo: 'Visual development',
    pageSizeMode: 'dynamic',
    templateSettings,
    storyboardTheme: sampleStoryboardTheme,
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
