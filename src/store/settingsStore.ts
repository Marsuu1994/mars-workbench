import {create} from 'zustand';

interface SettingsState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

/**
 * Visibility of the Settings overlay. Store-owned because its two triggers
 * (mobile dock tab, desktop sidebar user row) are breakpoint siblings with
 * no shared parent below AppShell.
 */
export const useSettingsStore = create<SettingsState>()(set => ({
  isOpen: false,
  open: () => set({isOpen: true}),
  close: () => set({isOpen: false}),
}));
