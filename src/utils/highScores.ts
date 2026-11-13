import {
  DEFAULT_TARGET,
  DifficultyLevel,
  LeaderboardMode,
  LeaderboardOperator,
  MathMode,
  MathOperator,
  TargetBand,
} from '../types/game';
import { getTargetBand } from './mathEngine';

export interface HighScoreEntry {
  id: string;
  mode: LeaderboardMode;
  mathMode: MathMode;
  operator: LeaderboardOperator; // '+' | '−' | '×' | '÷' for simple mode, 'mixed' for operator mode
  timeBucket: string; // e.g. 'time:60', 'time:120', 'time:180', 'time:300', 'equations:3'
  timeSeconds?: number;
  difficulty: DifficultyLevel;
  target: number;
  targetBand: TargetBand;
  playerName?: string;
  playerLogo?: string;
  score: number;
  longestEquation: string;
  totalEquations: number;
  date: string;
  timestamp: number;
}

const STORAGE_KEY = 'math_blitz_high_scores_v1';

/** Times Table Blitz targets change every answer, so all runs share one leaderboard target slot. */
export const TIMES_TABLE_LEADERBOARD_TARGET = 10;

export function getLeaderboardOperator(
  mathMode: MathMode,
  simpleOperator: MathOperator
): LeaderboardOperator {
  if (mathMode === 'operator') return 'mixed';
  if (mathMode === 'timestable') return '×';
  return simpleOperator;
}

export function getLeaderboardTarget(mathMode: MathMode, target: number): number {
  return mathMode === 'timestable' ? TIMES_TABLE_LEADERBOARD_TARGET : target;
}

export function formatMathModeLabel(mathMode: MathMode): string {
  if (mathMode === 'operator') return 'Equation';
  if (mathMode === 'timestable') return 'Times Table';
  return 'Simple';
}
const MAX_ENTRIES_PER_BUCKET = 30;

export function formatOperatorLabel(op: LeaderboardOperator): string {
  if (op === 'mixed') return 'Mixed (+−×÷)';
  if (op === '+') return '+ Add';
  if (op === '−') return '− Sub';
  if (op === '×') return '× Mul';
  return '÷ Div';
}

export function makeTimeBucketKey(kind: 'timer' | 'equations', value: number): string {
  const safeVal = Number.isFinite(value) && value >= 0 ? Math.round(value) : 180;
  return kind === 'equations' ? `equations:${safeVal}` : `time:${safeVal}`;
}

export function formatTimeBucketLabel(timeBucket: string): string {
  if (timeBucket.startsWith('equations:')) {
    const count = Number(timeBucket.slice('equations:'.length));
    if (count === 1) return '1 Equation Goal';
    return `${count} Equations Goal`;
  }
  if (timeBucket.startsWith('time:')) {
    const sec = Number(timeBucket.slice('time:'.length));
    if (!Number.isFinite(sec) || sec <= 0) return 'Untimed';
    if (sec === 60) return '1:00';
    if (sec < 60 || sec % 60 !== 0) return `${sec}s`;
    const mins = sec / 60;
    return `${mins}:00`;
  }
  return '3:00';
}

export function sortTimeBuckets(buckets: string[]): string[] {
  return [...buckets].sort((a, b) => {
    const aIsEq = a.startsWith('equations:');
    const bIsEq = b.startsWith('equations:');
    if (aIsEq !== bIsEq) return aIsEq ? 1 : -1;

    if (aIsEq && bIsEq) {
      return Number(a.slice('equations:'.length)) - Number(b.slice('equations:'.length));
    }

    const aSec = Number(a.slice('time:'.length));
    const bSec = Number(b.slice('time:'.length));
    if (aSec === 0 && bSec !== 0) return 1;
    if (bSec === 0 && aSec !== 0) return -1;
    return aSec - bSec;
  });
}

function isValidMode(val: unknown): val is LeaderboardMode {
  return val === 'quick' || val === 'solo' || val === 'team';
}

function isValidDifficulty(val: unknown): val is DifficultyLevel {
  return (
    val === 'beginner' ||
    val === 'easy' ||
    val === 'normal' ||
    val === 'hard' ||
    val === 'nightmare'
  );
}

function isValidOperator(val: unknown): val is LeaderboardOperator {
  return val === '+' || val === '−' || val === '×' || val === '÷' || val === 'mixed';
}

function isValidTargetBand(val: unknown): val is TargetBand {
  return (
    val === '10' ||
    val === '5-10' ||
    val === '11-20' ||
    val === '21-40' ||
    val === '41-80' ||
    val === '81+'
  );
}

function getBucketKey(e: HighScoreEntry): string {
  return `${e.mode}::${e.mathMode}::${e.operator}::${e.target}::${e.timeBucket}::${e.difficulty}`;
}

function migrateEntry(raw: Record<string, unknown>): HighScoreEntry | null {
  const mode: LeaderboardMode = isValidMode(raw.mode) ? raw.mode : 'quick';
  const mathMode: MathMode =
    raw.mathMode === 'operator' || raw.mathMode === 'timestable' ? raw.mathMode : 'simple';
  const operator: LeaderboardOperator = isValidOperator(raw.operator)
    ? mathMode === 'operator'
      ? 'mixed'
      : mathMode === 'timestable'
      ? '×'
      : raw.operator === 'mixed'
      ? '+'
      : raw.operator
    : mathMode === 'operator'
    ? 'mixed'
    : '+';
  const difficulty: DifficultyLevel = isValidDifficulty(raw.difficulty) ? raw.difficulty : 'normal';
  const rawTimeBucket = typeof raw.timeBucket === 'string' ? raw.timeBucket : 'time:60';
  const timeSeconds =
    typeof raw.timeSeconds === 'number'
      ? raw.timeSeconds
      : rawTimeBucket.startsWith('time:')
      ? Number(rawTimeBucket.slice('time:'.length))
      : undefined;

  const target =
    typeof raw.target === 'number' && Number.isFinite(raw.target) && raw.target >= 2
      ? Math.round(raw.target)
      : DEFAULT_TARGET;
  const targetBand: TargetBand = isValidTargetBand(raw.targetBand)
    ? raw.targetBand
    : getTargetBand(target, mode === 'quick');

  return {
    id:
      typeof raw.id === 'string' && raw.id.length > 0
        ? raw.id
        : 'score_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    mode,
    mathMode,
    operator,
    timeBucket: rawTimeBucket,
    timeSeconds,
    difficulty,
    target,
    targetBand,
    playerName:
      typeof raw.playerName === 'string' && raw.playerName.trim().length > 0
        ? raw.playerName.trim()
        : undefined,
    playerLogo:
      typeof raw.playerLogo === 'string' && raw.playerLogo.length > 0
        ? raw.playerLogo
        : undefined,
    score: typeof raw.score === 'number' ? raw.score : 0,
    longestEquation:
      typeof raw.longestEquation === 'string' && raw.longestEquation
        ? raw.longestEquation
        : '-',
    totalEquations: typeof raw.totalEquations === 'number' ? raw.totalEquations : 0,
    date:
      typeof raw.date === 'string' && raw.date
        ? raw.date
        : new Date().toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
    timestamp: typeof raw.timestamp === 'number' ? raw.timestamp : Date.now(),
  };
}

function capBuckets(entries: HighScoreEntry[]): HighScoreEntry[] {
  const byBucket = new Map<string, HighScoreEntry[]>();
  for (const e of entries) {
    const key = getBucketKey(e);
    const arr = byBucket.get(key) || [];
    arr.push(e);
    byBucket.set(key, arr);
  }
  const result: HighScoreEntry[] = [];
  for (const arr of byBucket.values()) {
    arr.sort((a, b) => b.score - a.score || b.timestamp - a.timestamp);
    result.push(...arr.slice(0, MAX_ENTRIES_PER_BUCKET));
  }
  result.sort((a, b) => b.score - a.score || b.timestamp - a.timestamp);
  return result;
}

export function getHighScores(): HighScoreEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const entries: HighScoreEntry[] = [];
    for (const item of parsed) {
      if (item && typeof item === 'object') {
        const entry = migrateEntry(item as Record<string, unknown>);
        if (entry) entries.push(entry);
      }
    }
    return capBuckets(entries);
  } catch (err) {
    console.error('Failed to read high scores:', err);
  }
  return [];
}

export function getClaimedSoloScoreLogos(): Map<string, string> {
  const scores = getHighScores();
  const claimed = new Map<string, string>();
  for (const entry of scores) {
    if (entry.mode === 'solo' && entry.playerLogo && !claimed.has(entry.playerLogo)) {
      claimed.set(entry.playerLogo, entry.playerName || 'Student');
    }
  }
  return claimed;
}

export interface SaveHighScoreParams {
  mode: LeaderboardMode;
  mathMode: MathMode;
  simpleOperator?: MathOperator;
  timeBucket: string;
  timeSeconds?: number;
  difficulty: DifficultyLevel;
  target: number;
  isPractice?: boolean;
  score: number;
  longestEquation: string;
  totalEquations: number;
  playerName?: string;
  playerLogo?: string;
  allowZeroScore?: boolean;
}

export function saveHighScore(
  params: SaveHighScoreParams
): { isNewHighScore: boolean; rank: number; entryId?: string } {
  const {
    mode,
    mathMode,
    simpleOperator = '+',
    timeBucket,
    timeSeconds,
    difficulty,
    target: rawTarget,
    isPractice = false,
    score,
    longestEquation,
    totalEquations,
    playerName,
    playerLogo,
    allowZeroScore = false,
  } = params;

  // Practice runs are NEVER saved
  if (isPractice || (timeBucket === 'time:0' && mode !== 'team')) {
    return { isNewHighScore: false, rank: -1 };
  }

  const hasPlayer = Boolean(playerName?.trim());
  if (score <= 0 && !hasPlayer && !allowZeroScore) {
    return { isNewHighScore: false, rank: -1 };
  }

  const operator = getLeaderboardOperator(mathMode, simpleOperator);
  const target = getLeaderboardTarget(mathMode, rawTarget);
  const targetBand = getTargetBand(target, mode === 'quick');
  const scores = getHighScores();
  const entry: HighScoreEntry = {
    id: 'score_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    mode,
    mathMode,
    operator,
    timeBucket,
    timeSeconds,
    difficulty,
    target,
    targetBand,
    playerName: playerName?.trim() || undefined,
    playerLogo: playerLogo || undefined,
    score,
    longestEquation: longestEquation || '-',
    totalEquations,
    date: new Date().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    timestamp: Date.now(),
  };

  scores.push(entry);
  const capped = capBuckets(scores);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
  } catch (err) {
    console.error('Failed to save high scores:', err);
  }

  const bucketScores = capped
    .filter(
      (s) =>
        s.mode === mode &&
        s.mathMode === mathMode &&
        s.operator === operator &&
        s.target === target &&
        s.timeBucket === timeBucket &&
        s.difficulty === difficulty
    )
    .sort((a, b) => b.score - a.score || b.timestamp - a.timestamp);

  const rank = bucketScores.findIndex((s) => s.id === entry.id);
  const isNewHighScore = rank === 0 && score > 0;

  return { isNewHighScore, rank: rank !== -1 ? rank + 1 : -1, entryId: entry.id };
}

export function clearHighScores() {
  localStorage.removeItem(STORAGE_KEY);
}
