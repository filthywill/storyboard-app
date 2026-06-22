import { StoryboardTheme, migrateTheme } from '@/styles/storyboardTheme';

export type ProjectSettingsInput = Record<string, unknown> & {
  storyboardTheme?: unknown;
};

export type ProjectSettingsWithTheme<T extends ProjectSettingsInput = ProjectSettingsInput> = T & {
  storyboardTheme: StoryboardTheme;
};

export const normalizeProjectSettings = <T extends ProjectSettingsInput = ProjectSettingsInput>(
  settings: T | null | undefined
): ProjectSettingsWithTheme<T> => {
  const safeSettings = settings && typeof settings === 'object'
    ? settings
    : ({} as T);

  return {
    ...safeSettings,
    storyboardTheme: migrateTheme(safeSettings.storyboardTheme),
  };
};
