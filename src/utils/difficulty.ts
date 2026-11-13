import {
  DEFAULT_TARGET,
  DifficultyLevel,
  MAX_TARGET,
  MathMode,
  MathOperator,
  MIN_TARGET,
} from '../types/game';

const DIFFICULTY_STORAGE_KEY = 'math_blitz_difficulty_v1';
const MATH_MODE_STORAGE_KEY = 'math_blitz_math_mode_v1';
const SIMPLE_OPERATOR_STORAGE_KEY = 'math_blitz_simple_op_v1';
const TARGET_STORAGE_KEY = 'math_blitz_target_v1';

const VALID_DIFFICULTIES: DifficultyLevel[] = ['beginner', 'easy', 'normal', 'hard', 'nightmare'];
const VALID_OPERATORS: MathOperator[] = ['+', '−', '×', '÷'];

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

export function getSavedSimpleOperator(): MathOperator {
  try {
    const raw = localStorage.getItem(SIMPLE_OPERATOR_STORAGE_KEY);
    if (raw && VALID_OPERATORS.includes(raw as MathOperator)) {
      return raw as MathOperator;
    }
  } catch {
    // ignore storage errors
  }
  return '+';
}

export function saveSimpleOperator(op: MathOperator): void {
  try {
    localStorage.setItem(SIMPLE_OPERATOR_STORAGE_KEY, op);
  } catch {
    // ignore storage errors
  }
}

export function getSavedTarget(): number {
  try {
    const raw = localStorage.getItem(TARGET_STORAGE_KEY);
    if (raw) {
      const n = Number(raw);
      if (Number.isFinite(n)) {
        return Math.max(MIN_TARGET, Math.min(MAX_TARGET, Math.round(n)));
      }
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_TARGET;
}

export function saveTarget(target: number): void {
  try {
    const clamped = Math.max(MIN_TARGET, Math.min(MAX_TARGET, Math.round(target)));
    localStorage.setItem(TARGET_STORAGE_KEY, String(clamped));
  } catch {
    // ignore storage errors
  }
}
