import { create } from 'zustand';

interface UIStore {
  changelogOpen: boolean;
  openChangelog: () => void;
  closeChangelog: () => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  changelogOpen: false,
  openChangelog: () => set({ changelogOpen: true }),
  closeChangelog: () => set({ changelogOpen: false }),
}));
