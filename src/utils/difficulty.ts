import { DifficultyLevel, MathMode } from '../types/game';

const DIFFICULTY_STORAGE_KEY = 'math_blitz_difficulty_v1';
const MATH_MODE_STORAGE_KEY = 'math_blitz_math_mode_v1';

const VALID_DIFFICULTIES: DifficultyLevel[] = ['beginner', 'easy', 'normal', 'hard', 'nightmare'];

export function getSavedDifficulty(): DifficultyLevel {
  try {
    const raw = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    if (raw && VALID_DIFFICULTIES.includes(raw as DifficultyLevel)) {
      return raw as DifficultyLevel;
    }
  } catch {
    // ignore storage errors
  }
  return 'normal';
}

export function saveDifficulty(level: DifficultyLevel): void {
  try {
    localStorage.setItem(DIFFICULTY_STORAGE_KEY, level);
  } catch {
    // ignore storage errors
  }
}

export function getSavedMathMode(): MathMode {
  try {
    const raw = localStorage.getItem(MATH_MODE_STORAGE_KEY);
    if (raw === 'simple' || raw === 'operator') {
      return raw;
    }
  } catch {
    // ignore storage errors
  }
  return 'simple';
}

export function saveMathMode(mode: MathMode): void {
  try {
    localStorage.setItem(MATH_MODE_STORAGE_KEY, mode);
  } catch {
    // ignore storage errors
  }
}
