import { create } from 'zustand';

export type WriterLeaseMode = 'unknown' | 'writer' | 'read_only';

interface WriterLeaseState {
  projectId: string | null;
  mode: WriterLeaseMode;
  holder: string | null;
  expiresAt: string | null;
  setLeaseState: (state: {
    projectId: string;
    mode: WriterLeaseMode;
    holder?: string | null;
    expiresAt?: string | null;
  }) => void;
  clearLease: () => void;
}

export const useWriterLeaseStore = create<WriterLeaseState>((set) => ({
  projectId: null,
  mode: 'unknown',
  holder: null,
  expiresAt: null,
  setLeaseState: ({ projectId, mode, holder, expiresAt }) =>
    set({
      projectId,
      mode,
      holder: holder ?? null,
      expiresAt: expiresAt ?? null
    }),
  clearLease: () =>
    set({
      projectId: null,
      mode: 'unknown',
      holder: null,
      expiresAt: null
    })
}));
