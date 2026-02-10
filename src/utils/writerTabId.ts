let writerTabId: string | null = null;

export const getWriterTabId = (): string => {
  if (!writerTabId) {
    writerTabId = crypto.randomUUID();
  }
  return writerTabId;
};
