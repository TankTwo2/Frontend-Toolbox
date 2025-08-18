import { STORAGE_KEYS } from './constants';

export const storage = {
  async get<T>(key: string): Promise<T | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key] || null);
      });
    });
  },

  async set<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  },

  async remove(key: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, () => {
        resolve();
      });
    });
  },

  async clear(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        resolve();
      });
    });
  }
};

export const getSettings = () => storage.get(STORAGE_KEYS.SETTINGS);
export const setSettings = (settings: any) => storage.set(STORAGE_KEYS.SETTINGS, settings);

export const getRecordings = () => storage.get(STORAGE_KEYS.RECORDINGS);
export const setRecordings = (recordings: any) => storage.set(STORAGE_KEYS.RECORDINGS, recordings);

export const getSavedStyles = () => storage.get(STORAGE_KEYS.SAVED_STYLES);
export const setSavedStyles = (styles: any) => storage.set(STORAGE_KEYS.SAVED_STYLES, styles);