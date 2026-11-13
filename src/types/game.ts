export type MathMode = 'simple' | 'operator';

export type MathOperator = '+' | '−' | '×' | '÷';

export type LeaderboardOperator = MathOperator | 'mixed';

export const MIN_TARGET = 2;
export const MAX_TARGET = 100;
export const DEFAULT_TARGET = 10;

export interface MathTileInfo {
  kind: 'number' | 'operator';
  display: string;
  value: string;
  numValue?: number;
  opValue?: MathOperator;
}

export interface HexTile {
  id: string;
  tile: MathTileInfo;
  x: number;
  y: number;
  targetY: number;
  isFrozen: boolean;
  isFalling: boolean;
  isSelected: boolean;
  selectionIndex?: number;
  isClearing?: boolean;
}

export interface FloatingScore {
  id: string;
  text: string;
  points: number;
  x: number;
  y: number;
}

export type GameScreen =
  | 'MENU'
  | 'PLAYING'
  | 'PAUSED'
  | 'GAMEOVER'
  | 'HIGHSCORES'
  | 'CLASSROOM_SETUP'
  | 'CLASSROOM_TURN_TRANSITION'
  | 'CLASSROOM_VICTORY';

export type ScreenModeType = 'pc' | 'phone';

export type ViewMode = 'narrow' | 'wide';

export interface GameSettings {
  soundEnabled: boolean;
  viewMode: ViewMode;
}

export interface EquationEntry {
  id: string;
  equation: string;
  score: number;
  numberCount: number;
  target: number;
  timestamp: number;
}

export type DifficultyLevel = 'beginner' | 'easy' | 'normal' | 'hard' | 'nightmare';

export type LeaderboardMode = 'quick' | 'solo' | 'team';

export type TargetBand = '10' | '5-10' | '11-20' | '21-40' | '41-80' | '81+';

export interface FreePlaySettings {
  dropSpeed: number; // pixels/sec
  spawnDelayMs: number;
  timeLimit: number; // 0 = untimed practice, or seconds (60, 120, 180, 300, etc.)
  tileRadius: number;
  speedIncreaseEnabled: boolean;
  speedIncreaseRate: number;
  wallWidthPct: number;
  ceilingHeight: number;
  mathMode: MathMode;
  simpleOperator: MathOperator;
  target: number;
  isPractice: boolean;
}

export interface DifficultyConfig {
  id: DifficultyLevel;
  label: string;
  description: string;
  dropSpeed: number;
  spawnIntervalMs: number;
  minSpawnIntervalMs: number;
  spawnAccelFactor: number;
  speedIncreaseRate: number;
  maxSpeedMultiplier: number;
  ceilingHeight: number;
  tileRadius: number;
  maxInFlightOffset: number;
  allowedOperators: MathOperator[];
  allowNegativeIntermediates: boolean;
  targetRange: { min: number; max: number; defaultTarget: number; presets: number[] };
}

export const DIFFICULTY_PRESETS: Record<DifficultyLevel, DifficultyConfig> = {
  beginner: {
    id: 'beginner',
    label: 'Beginner',
    description: '+ − ÷ · Largest tiles',
    dropSpeed: 85,
    spawnIntervalMs: 2200,
    minSpawnIntervalMs: 900,
    spawnAccelFactor: 0.98,
    speedIncreaseRate: 2,
    maxSpeedMultiplier: 1.6,
    ceilingHeight: 45,
    tileRadius: 34,
    maxInFlightOffset: -2,
    allowedOperators: ['+', '−', '÷'],
    allowNegativeIntermediates: false,
    targetRange: { min: MIN_TARGET, max: MAX_TARGET, defaultTarget: DEFAULT_TARGET, presets: [5, 10, 12, 20, 24] },
  },
  easy: {
    id: 'easy',
    label: 'Easy',
    description: 'All 4 ops · Big tiles',
    dropSpeed: 120,
    spawnIntervalMs: 1650,
    minSpawnIntervalMs: 650,
    spawnAccelFactor: 0.97,
    speedIncreaseRate: 3,
    maxSpeedMultiplier: 1.9,
    ceilingHeight: 50,
    tileRadius: 32,
    maxInFlightOffset: -1,
    allowedOperators: ['+', '−', '×', '÷'],
    allowNegativeIntermediates: false,
    targetRange: { min: MIN_TARGET, max: MAX_TARGET, defaultTarget: DEFAULT_TARGET, presets: [6, 10, 12, 20, 24] },
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    description: 'All 4 ops · Balanced pace',
    dropSpeed: 170,
    spawnIntervalMs: 1200,
    minSpawnIntervalMs: 480,
    spawnAccelFactor: 0.96,
    speedIncreaseRate: 5,
    maxSpeedMultiplier: 2.2,
    ceilingHeight: 60,
    tileRadius: 31,
    maxInFlightOffset: -1,
    allowedOperators: ['+', '−', '×', '÷'],
    allowNegativeIntermediates: false,
    targetRange: { min: MIN_TARGET, max: MAX_TARGET, defaultTarget: DEFAULT_TARGET, presets: [8, 10, 12, 24, 36] },
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    description: 'Standard speed · Negatives OK',
    dropSpeed: 170,
    spawnIntervalMs: 850,
    minSpawnIntervalMs: 300,
    spawnAccelFactor: 0.92,
    speedIncreaseRate: 5,
    maxSpeedMultiplier: 2.2,
    ceilingHeight: 85,
    tileRadius: 28,
    maxInFlightOffset: 0,
    allowedOperators: ['+', '−', '×', '÷'],
    allowNegativeIntermediates: true,
    targetRange: { min: MIN_TARGET, max: MAX_TARGET, defaultTarget: DEFAULT_TARGET, presets: [10, 18, 24, 48, 60] },
  },
  nightmare: {
    id: 'nightmare',
    label: 'Nightmare',
    description: 'Standard speed · Rapid spawn · Negatives OK',
    dropSpeed: 170,
    spawnIntervalMs: 580,
    minSpawnIntervalMs: 210,
    spawnAccelFactor: 0.89,
    speedIncreaseRate: 5,
    maxSpeedMultiplier: 2.2,
    ceilingHeight: 115,
    tileRadius: 26,
    maxInFlightOffset: 1,
    allowedOperators: ['+', '−', '×', '÷'],
    allowNegativeIntermediates: true,
    targetRange: { min: MIN_TARGET, max: MAX_TARGET, defaultTarget: DEFAULT_TARGET, presets: [10, 24, 48, 60, 100] },
  },
};

export const DEFAULT_FREE_PLAY_SETTINGS: FreePlaySettings = {
  dropSpeed: 170,
  spawnDelayMs: 80,
  timeLimit: 180,
  tileRadius: 31,
  speedIncreaseEnabled: true,
  speedIncreaseRate: 5,
  wallWidthPct: 100,
  ceilingHeight: 60,
  mathMode: 'simple',
  simpleOperator: '+',
  target: DEFAULT_TARGET,
  isPractice: false,
};

// Classroom / Team Mode Types
export interface ClassroomTeam {
  id: string;
  name: string;
  color: string;
  colorBg: string;
  colorBorder: string;
  colorText: string;
  emoji: string;
  score: number;
  equationsFound: EquationEntry[];
  turnsCompleted: number;
}

export type TurnConditionType = 'timer' | 'equations';

export interface ClassroomConfig {
  teams: ClassroomTeam[];
  turnCondition: TurnConditionType;
  turnSeconds: number; // e.g. 30, 45, 60, 90, 120, 180
  turnEquationsTarget: number; // e.g. 1, 2, 3, 5
  totalRounds: number; // 1, 2, 3, 5 rounds
  cleanBoardEachTurn: boolean;
  mathMode: MathMode;
  simpleOperator: MathOperator;
  target: number;
  spawnSeed: number;
}

export interface TurnSummary {
  teamName: string;
  teamEmoji: string;
  teamColor: string;
  pointsEarned: number;
  equationsFound: EquationEntry[];
  reason: 'time_up' | 'equations_met' | 'board_filled' | 'passed';
}

export interface ClassroomMatchState {
  config: ClassroomConfig;
  currentTeamIndex: number;
  currentRound: number;
  isMatchFinished: boolean;
  turnEquationsCount: number;
  turnScoreGained: number;
  turnTimeLeft: number;
  lastTurnSummary: TurnSummary | null;
}
