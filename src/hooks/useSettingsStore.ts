import { create } from 'zustand';
import { SettingsRepository } from '../repositories/SettingsRepository';
import { Logger } from '../utils/Logger';

interface SettingsState {
  isDarkMode: boolean;
  currency: string;
  isLoading: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  isDarkMode: true,
  currency: 'INR',
  isLoading: false,
  error: null,
  
  loadSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const allSettings = await SettingsRepository.getAll();
      set({
        isDarkMode: allSettings['isDarkMode'] === 'true' || allSettings['isDarkMode'] === undefined, // default true
        currency: allSettings['currency'] || 'INR',
        isLoading: false
      });
    } catch (error: any) {
      Logger.error('SettingsStore', 'Failed to load settings', error);
      set({ error: error.message, isLoading: false });
    }
  },

  updateSetting: async (key: string, value: string) => {
    set({ isLoading: true, error: null });
    try {
      await SettingsRepository.set(key, value);
      await get().loadSettings();
    } catch (error: any) {
      Logger.error('SettingsStore', 'Failed to update setting', error);
      set({ error: error.message, isLoading: false });
    }
  }
}));
