type PersistableShot = Record<string, any> & {
  imageFile?: File | null;
  imageData?: string;
  imageUrl?: string | null;
};

/**
 * Persistence-only shot serialization.
 *
 * Active in-memory state may keep both imageData and imageUrl for editing/export
 * immediacy, but localStorage should not duplicate URL-backed images as base64.
 */
export const serializeShotForStorage = <T extends PersistableShot>(shot: T): T => {
  const serializedShot = {
    ...shot,
    imageFile: null,
  } as T;

  if (serializedShot.imageUrl && serializedShot.imageData) {
    delete serializedShot.imageData;
  }

  return serializedShot;
};

export const serializeShotsForStorage = <T extends PersistableShot>(
  shots: Record<string, T> = {}
): Record<string, T> => (
  Object.fromEntries(
    Object.entries(shots).map(([id, shot]) => [
      id,
      serializeShotForStorage(shot),
    ])
  ) as Record<string, T>
);
