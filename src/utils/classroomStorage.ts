import {
  ClassroomConfig,
  ClassroomTeam,
  DEFAULT_TARGET,
  MAX_TARGET,
  MathOperator,
  MIN_TARGET,
} from '../types/game';

export const TEAM_COLOR_PALETTES = [
  {
    id: 'blue',
    name: 'Blue',
    color: '#3b82f6',
    colorBg: '#eff6ff',
    colorBorder: '#2563eb',
    colorText: '#1e40af',
    badgeClass: 'bg-blue-600 text-white',
  },
  {
    id: 'red',
    name: 'Red',
    color: '#ef4444',
    colorBg: '#fef2f2',
    colorBorder: '#dc2626',
    colorText: '#991b1b',
    badgeClass: 'bg-red-600 text-white',
  },
  {
    id: 'green',
    name: 'Green',
    color: '#10b981',
    colorBg: '#ecfdf5',
    colorBorder: '#059669',
    colorText: '#065f46',
    badgeClass: 'bg-emerald-600 text-white',
  },
  {
    id: 'gold',
    name: 'Gold',
    color: '#f59e0b',
    colorBg: '#fffbeb',
    colorBorder: '#d97706',
    colorText: '#92400e',
    badgeClass: 'bg-amber-500 text-slate-950',
  },
  {
    id: 'purple',
    name: 'Purple',
    color: '#8b5cf6',
    colorBg: '#f5f3ff',
    colorBorder: '#7c3aed',
    colorText: '#5b21b6',
    badgeClass: 'bg-purple-600 text-white',
  },
  {
    id: 'pink',
    name: 'Pink',
    color: '#ec4899',
    colorBg: '#fdf2f8',
    colorBorder: '#db2777',
    colorText: '#9d174d',
    badgeClass: 'bg-pink-600 text-white',
  },
];

export const TEAM_NAME_PRESETS = {
  animals: [
    { name: 'Lions', emoji: '🦁' },
    { name: 'Dolphins', emoji: '🐬' },
    { name: 'Eagles', emoji: '🦅' },
    { name: 'Pandas', emoji: '🐼' },
    { name: 'Foxes', emoji: '🦊' },
    { name: 'Bears', emoji: '🐻' },
  ],
  colors: [
    { name: 'Team Blue', emoji: '🔵' },
    { name: 'Team Red', emoji: '🔴' },
    { name: 'Team Green', emoji: '🟢' },
    { name: 'Team Gold', emoji: '🟡' },
    { name: 'Team Purple', emoji: '🟣' },
    { name: 'Team Pink', emoji: '🌸' },
  ],
  space: [
    { name: 'Rockets', emoji: '🚀' },
    { name: 'Comets', emoji: '☄️' },
    { name: 'Stars', emoji: '⭐' },
    { name: 'Lightning', emoji: '⚡' },
    { name: 'Planets', emoji: '🪐' },
    { name: 'Meteors', emoji: '🔥' },
  ],
};

export function createDefaultTeam(
  index: number,
  presetType: 'animals' | 'colors' | 'space' = 'animals'
): ClassroomTeam {
  const palette = TEAM_COLOR_PALETTES[index % TEAM_COLOR_PALETTES.length];
  const presetList = TEAM_NAME_PRESETS[presetType];
  const item = presetList[index % presetList.length];

  return {
    id: `team_${index + 1}_${Date.now()}`,
    name: item.name,
    emoji: item.emoji,
    color: palette.color,
    colorBg: palette.colorBg,
    colorBorder: palette.colorBorder,
    colorText: palette.colorText,
    score: 0,
    equationsFound: [],
    turnsCompleted: 0,
  };
}

export const DEFAULT_CLASSROOM_CONFIG: ClassroomConfig = {
  teams: [createDefaultTeam(0, 'animals'), createDefaultTeam(1, 'animals')],
  turnCondition: 'timer',
  turnSeconds: 60,
  turnEquationsTarget: 3,
  totalRounds: 3,
  cleanBoardEachTurn: true,
  mathMode: 'simple',
  simpleOperator: '+',
  target: DEFAULT_TARGET,
  spawnSeed: 104729,
};

const STORAGE_KEY_CLASSROOM_CONFIG = 'mathblitz_classroom_config';
const VALID_OPS: MathOperator[] = ['+', '−', '×', '÷'];

export function loadClassroomConfig(): ClassroomConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CLASSROOM_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.teams) && parsed.teams.length >= 2) {
        const op: MathOperator = VALID_OPS.includes(parsed.simpleOperator)
          ? parsed.simpleOperator
          : '+';
        const targetVal =
          typeof parsed.target === 'number' && Number.isFinite(parsed.target)
            ? Math.max(MIN_TARGET, Math.min(MAX_TARGET, Math.round(parsed.target)))
            : DEFAULT_TARGET;
        return {
          ...DEFAULT_CLASSROOM_CONFIG,
          ...parsed,
          turnCondition: parsed.turnCondition === 'equations' ? 'equations' : 'timer',
          mathMode: parsed.mathMode === 'operator' ? 'operator' : 'simple',
          simpleOperator: op,
          target: targetVal,
          spawnSeed:
            typeof parsed.spawnSeed === 'number' && parsed.spawnSeed > 0
              ? parsed.spawnSeed
              : Math.floor(100000 + Math.random() * 900000),
          teams: parsed.teams.map((t: ClassroomTeam) => ({
            ...t,
            score: 0,
            equationsFound: [],
            turnsCompleted: 0,
          })),
        };
      }
    }
  } catch (err) {
    console.error('Error loading classroom config', err);
  }
  return {
    ...DEFAULT_CLASSROOM_CONFIG,
    spawnSeed: Math.floor(100000 + Math.random() * 900000),
  };
}

export function saveClassroomConfig(config: ClassroomConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_CLASSROOM_CONFIG, JSON.stringify(config));
  } catch (err) {
    console.error('Error saving classroom config', err);
  }
}
