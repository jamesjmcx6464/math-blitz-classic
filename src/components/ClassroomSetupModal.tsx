import React, { useState } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Clock,
  Target,
  X,
  Play,
  RotateCcw,
  Palette,
  Shuffle,
  Calculator,
} from 'lucide-react';
import {
  ClassroomConfig,
  ClassroomTeam,
  DifficultyLevel,
  MathMode,
  MathOperator,
  TurnConditionType,
} from '../types/game';
import {
  TEAM_COLOR_PALETTES,
  TEAM_NAME_PRESETS,
  createDefaultTeam,
  saveClassroomConfig,
} from '../utils/classroomStorage';
import {
  clampTarget,
  getAllowedOperators,
  isCompositeTarget,
  nearestCompositeTarget,
} from '../utils/mathEngine';
import { TargetPicker } from './TargetPicker';
import { SimpleOperatorPicker } from './SimpleOperatorPicker';

interface ClassroomSetupModalProps {
  initialConfig: ClassroomConfig;
  difficulty: DifficultyLevel;
  onStartMatch: (config: ClassroomConfig) => void;
  onClose: () => void;
  isWide: boolean;
}

export const ClassroomSetupModal: React.FC<ClassroomSetupModalProps> = ({
  initialConfig,
  difficulty,
  onStartMatch,
  onClose,
  isWide,
}) => {
  const [teams, setTeams] = useState<ClassroomTeam[]>(initialConfig.teams);
  const [turnCondition, setTurnCondition] = useState<TurnConditionType>(initialConfig.turnCondition);
  const [turnSeconds, setTurnSeconds] = useState<number>(initialConfig.turnSeconds);
  const [turnEquationsTarget, setTurnEquationsTarget] = useState<number>(
    initialConfig.turnEquationsTarget
  );
  const [totalRounds, setTotalRounds] = useState<number>(initialConfig.totalRounds);
  const [cleanBoardEachTurn, setCleanBoardEachTurn] = useState<boolean>(
    initialConfig.cleanBoardEachTurn
  );
  const [mathMode, setMathMode] = useState<MathMode>(initialConfig.mathMode);
  const [simpleOperator, setSimpleOperator] = useState<MathOperator>(() => {
    const allowed = getAllowedOperators(difficulty);
    return allowed.includes(initialConfig.simpleOperator) ? initialConfig.simpleOperator : '+';
  });
  const [target, setTarget] = useState<number>(() => clampTarget(initialConfig.target));
  const [spawnSeed, setSpawnSeed] = useState<number>(
    initialConfig.spawnSeed || Math.floor(100000 + Math.random() * 900000)
  );
  const [activeTheme, setActiveTheme] = useState<'animals' | 'colors' | 'space' | 'all'>('animals');

  const requiresComposite = mathMode === 'simple' && simpleOperator === '×';
  const isBlockedPrime = requiresComposite && !isCompositeTarget(target);

  const handleChangeSimpleOperator = (op: MathOperator) => {
    setSimpleOperator(op);
    if (op === '×' && !isCompositeTarget(target)) {
      setTarget(nearestCompositeTarget(target));
    }
  };

  const handleApplyPreset = (presetType: 'animals' | 'colors' | 'space' | 'all') => {
    setActiveTheme(presetType);
    if (presetType === 'all') return;
    const preset = TEAM_NAME_PRESETS[presetType];
    const updated = teams.map((team, idx) => {
      const item = preset[idx % preset.length];
      const palette = TEAM_COLOR_PALETTES[idx % TEAM_COLOR_PALETTES.length];
      return {
        ...team,
        name: item.name,
        emoji: item.emoji,
        color: palette.color,
        colorBg: palette.colorBg,
        colorBorder: palette.colorBorder,
        colorText: palette.colorText,
      };
    });
    setTeams(updated);
  };

  const handleAddTeam = () => {
    if (teams.length >= 6) return;
    const themeToUse = activeTheme === 'all' ? 'animals' : activeTheme;
    const newTeam = createDefaultTeam(teams.length, themeToUse);
    setTeams([...teams, newTeam]);
  };

  const handleRemoveTeam = (index: number) => {
    if (teams.length <= 2) return;
    setTeams(teams.filter((_, idx) => idx !== index));
  };

  const handleUpdateTeamName = (index: number, name: string) => {
    const updated = [...teams];
    updated[index] = { ...updated[index], name };
    setTeams(updated);
  };

  const handleCycleColor = (index: number) => {
    const updated = [...teams];
    const currentColor = updated[index].color;
    const paletteIndex = TEAM_COLOR_PALETTES.findIndex((p) => p.color === currentColor);
    const nextPalette = TEAM_COLOR_PALETTES[(paletteIndex + 1) % TEAM_COLOR_PALETTES.length];
    updated[index] = {
      ...updated[index],
      color: nextPalette.color,
      colorBg: nextPalette.colorBg,
      colorBorder: nextPalette.colorBorder,
      colorText: nextPalette.colorText,
    };
    setTeams(updated);
  };

  const handleCycleEmoji = (index: number) => {
    let pool: string[];
    if (activeTheme === 'animals') {
      pool = ['🦁', '🐬', '🦅', '🐼', '🦊', '🐻', '🐯', '🦉', '🦖', '🦄', '🐺', '🐨'];
    } else if (activeTheme === 'colors') {
      pool = ['🔵', '🔴', '🟢', '🟡', '🟣', '🌸', '🟠', '⚪', '⚫', '🟤'];
    } else if (activeTheme === 'space') {
      pool = ['🚀', '☄️', '⭐', '⚡', '🪐', '🔥', '🛰️', '🛸', '🌌', '🌙'];
    } else {
      pool = [
        '🦁', '🐬', '🦅', '🐼', '🦊', '🐻', '🐯', '🦉', '🦖', '🦄',
        '🔵', '🔴', '🟢', '🟡', '🟣', '🌸', '🟠',
        '🚀', '☄️', '⭐', '⚡', '🪐', '🔥', '🛰️', '🛸',
      ];
    }

    const updated = [...teams];
    const currentEmoji = updated[index].emoji;
    const emojiIdx = pool.indexOf(currentEmoji);
    const nextEmoji = pool[(emojiIdx + 1) % pool.length];
    updated[index] = { ...updated[index], emoji: nextEmoji };
    setTeams(updated);
  };

  const handleStart = () => {
    if (isBlockedPrime) return;
    const finalConfig: ClassroomConfig = {
      teams: teams.map((t) => ({
        ...t,
        score: 0,
        equationsFound: [],
        turnsCompleted: 0,
        name: t.name.trim() || `Team ${t.emoji}`,
      })),
      turnCondition,
      turnSeconds,
      turnEquationsTarget,
      totalRounds,
      cleanBoardEachTurn,
      mathMode,
      simpleOperator,
      target: clampTarget(target, requiresComposite),
      spawnSeed: Math.max(1, Math.round(spawnSeed) || 104729),
    };

    saveClassroomConfig(finalConfig);
    onStartMatch(finalConfig);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md select-none text-slate-100 overflow-y-auto no-scrollbar">
      <div
        className={`w-full ${
          isWide ? 'max-w-3xl' : 'max-w-lg'
        } max-h-[92vh] bg-slate-900 border-2 border-indigo-500/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-left`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-black text-white leading-tight">
                Classroom Team Match
              </h2>
              <p className="text-xs sm:text-sm text-indigo-300/90 font-medium">
                Shared target, operator, mode &amp; spawn seed across all teams
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto no-scrollbar flex-1">
          {/* Section 1: Teams & Presets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="font-display font-black text-sm uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span>Teams ({teams.length} of 6)</span>
              </label>

              <div className="flex items-center gap-1.5 text-xs flex-wrap">
                {(['animals', 'colors', 'space', 'all'] as const).map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => handleApplyPreset(theme)}
                    className={`min-h-[44px] px-3 py-1 rounded-xl border font-bold transition-all cursor-pointer active:scale-95 ${
                      activeTheme === theme
                        ? 'bg-indigo-500 text-white border-indigo-400 shadow-sm font-black'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    {theme === 'animals'
                      ? '🐾 Animals'
                      : theme === 'colors'
                      ? '🎨 Colors'
                      : theme === 'space'
                      ? '🚀 Space'
                      : '✨ All'}
                  </button>
                ))}
              </div>
            </div>

            <div className={`grid ${isWide ? 'grid-cols-2 gap-3' : 'grid-cols-1 gap-2.5'}`}>
              {teams.map((team, idx) => (
                <div
                  key={team.id || idx}
                  className="p-3 rounded-2xl bg-slate-800/80 border-2 flex items-center gap-2.5 transition-all"
                  style={{ borderColor: team.color }}
                >
                  <button
                    type="button"
                    onClick={() => handleCycleEmoji(idx)}
                    title="Tap to change team emoji"
                    className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-2xl cursor-pointer hover:scale-105 active:scale-95 transition-transform shrink-0 shadow-inner"
                    style={{ backgroundColor: `${team.color}30` }}
                  >
                    {team.emoji}
                  </button>

                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={team.name}
                      maxLength={18}
                      onChange={(e) => handleUpdateTeamName(idx, e.target.value)}
                      placeholder={`Team ${idx + 1}`}
                      className="w-full min-h-[44px] bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCycleColor(idx)}
                    title="Cycle team color"
                    className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-90 shrink-0 border-2 border-white/40 shadow-sm"
                    style={{ backgroundColor: team.color }}
                  >
                    <Palette className="w-4 h-4 text-white drop-shadow" />
                  </button>

                  {teams.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTeam(idx)}
                      title="Remove team"
                      className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-700/60 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {teams.length < 6 && (
              <button
                type="button"
                onClick={handleAddTeam}
                className="w-full min-h-[44px] py-2.5 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-400 text-slate-400 hover:text-indigo-300 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add another team</span>
              </button>
            )}
          </div>

          {/* Section 2: Shared Math Mode, Operator & Target */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <label className="font-display font-black text-sm uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-sky-400" />
              <span>Shared Math Rules</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMathMode('simple')}
                className={`min-h-[48px] px-4 rounded-2xl border-2 font-bold text-sm transition-all cursor-pointer ${
                  mathMode === 'simple'
                    ? 'bg-sky-400 text-slate-950 border-sky-200 font-black'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Simple Mode
              </button>
              <button
                type="button"
                onClick={() => setMathMode('operator')}
                className={`min-h-[48px] px-4 rounded-2xl border-2 font-bold text-sm transition-all cursor-pointer ${
                  mathMode === 'operator'
                    ? 'bg-violet-500 text-white border-violet-300 font-black'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Operator Mode (2×)
              </button>
            </div>

            {mathMode === 'simple' && (
              <SimpleOperatorPicker
                difficulty={difficulty}
                value={simpleOperator}
                onChange={handleChangeSimpleOperator}
              />
            )}

            <TargetPicker
              difficulty={difficulty}
              target={target}
              onChangeTarget={setTarget}
              requiresComposite={requiresComposite}
            />

            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <span className="font-display font-black text-xs uppercase tracking-wider text-slate-300 block">
                  Shared Spawn Seed
                </span>
                <span className="text-xs text-slate-400">All teams receive the same tile sequence</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min={1}
                  max={999999}
                  value={spawnSeed}
                  onChange={(e) => setSpawnSeed(Number(e.target.value) || 1)}
                  className="w-24 min-h-[44px] px-2.5 rounded-xl bg-slate-900 border border-slate-700 text-center font-mono font-bold text-sm text-white focus:outline-none focus:border-indigo-400"
                />
                <button
                  type="button"
                  onClick={() => setSpawnSeed(Math.floor(100000 + Math.random() * 900000))}
                  aria-label="Randomize seed"
                  className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Turn Rules */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <label className="font-display font-black text-sm uppercase tracking-wider text-slate-300 block">
              Turn Rules
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTurnCondition('timer')}
                className={`min-h-[50px] px-4 rounded-2xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  turnCondition === 'timer'
                    ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 shadow-md font-black'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Timed Turns</span>
              </button>

              <button
                type="button"
                onClick={() => setTurnCondition('equations')}
                className={`min-h-[50px] px-4 rounded-2xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  turnCondition === 'equations'
                    ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 shadow-md font-black'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Target className="w-4 h-4" />
                <span>Equations Goal</span>
              </button>
            </div>

            {turnCondition === 'timer' ? (
              <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/80 space-y-2">
                <span className="text-xs font-semibold text-slate-400 block">
                  Time per student turn:
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {[
                    { sec: 45, label: '45s' },
                    { sec: 60, label: '1:00' },
                    { sec: 120, label: '2:00' },
                    { sec: 180, label: '3:00' },
                    { sec: 300, label: '5:00' },
                  ].map((opt) => (
                    <button
                      key={opt.sec}
                      type="button"
                      onClick={() => setTurnSeconds(opt.sec)}
                      className={`min-h-[44px] rounded-xl font-bold text-sm transition-all cursor-pointer ${
                        turnSeconds === opt.sec
                          ? 'bg-indigo-500 text-white shadow-md font-black'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/80 space-y-2">
                <span className="text-xs font-semibold text-slate-400 block">
                  Equations to solve before passing to next team:
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 5].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setTurnEquationsTarget(cnt)}
                      className={`min-h-[44px] rounded-xl font-bold text-sm transition-all cursor-pointer ${
                        turnEquationsTarget === cnt
                          ? 'bg-indigo-500 text-white shadow-md font-black'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      {cnt} {cnt === 1 ? 'eq' : 'eqs'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Match Length & Board Toggle */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <label className="font-display font-black text-sm uppercase tracking-wider text-slate-300 block">
              Match Length (Rounds)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { val: 1, label: '1 Round' },
                { val: 2, label: '2 Rounds' },
                { val: 3, label: '3 Rounds' },
                { val: 5, label: '5 Rounds' },
              ].map((round) => (
                <button
                  key={round.val}
                  type="button"
                  onClick={() => setTotalRounds(round.val)}
                  className={`min-h-[44px] rounded-xl font-bold text-sm transition-all cursor-pointer ${
                    totalRounds === round.val
                      ? 'bg-indigo-500 text-white shadow-md font-black'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  {round.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setCleanBoardEachTurn(!cleanBoardEachTurn)}
              className={`w-full min-h-[52px] px-4 rounded-2xl border-2 flex items-center justify-between text-left transition-all cursor-pointer ${
                cleanBoardEachTurn
                  ? 'bg-indigo-500/20 border-indigo-400 text-white'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <RotateCcw className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <span className="font-bold text-sm block">
                    Fresh board each turn (Fair play)
                  </span>
                  <span className="text-xs text-slate-400 block">
                    {cleanBoardEachTurn
                      ? 'Clears the pile so each team starts with an empty board'
                      : 'Shared board (pile carries over between teams)'}
                  </span>
                </div>
              </div>
              <span
                className={`font-black text-sm px-3 py-1 rounded-xl ${
                  cleanBoardEachTurn ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'
                }`}
              >
                {cleanBoardEachTurn ? 'FAIR' : 'SHARED'}
              </span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[52px] px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isBlockedPrime}
            onClick={handleStart}
            className={`flex-1 min-h-[52px] px-6 rounded-2xl font-display font-black text-base sm:text-lg flex items-center justify-center gap-2 shadow-xl transition-all ${
              isBlockedPrime
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-indigo-500/25 active:scale-95 cursor-pointer'
            }`}
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Start Classroom Match!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
