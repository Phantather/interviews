import type { Answers } from './types';

export const STORAGE_KEY = 'naryn-food-survey-v2';

export type SavedProgress = {
  index: number;
  answers: Answers;
  history: number[];
  startedAt: number;
};

export function loadProgress(): SavedProgress | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedProgress;
    if (typeof parsed?.index !== 'number' || typeof parsed?.answers !== 'object') return null;
    return {
      index: parsed.index,
      answers: parsed.answers ?? {},
      history: Array.isArray(parsed.history) ? parsed.history : [],
      startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveProgress(progress: SavedProgress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* приватный режим — анкета просто не сохранится */
  }
}

export function clearProgress(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* приватный режим */
  }
}
