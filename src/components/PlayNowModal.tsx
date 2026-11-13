import React, { useState, useEffect } from 'react';
import {
  Users,
  ArrowRight,
  ArrowLeft,
  X,
  Play,
  Plus,
  Trash2,
  Clock,
  Target,
  RotateCcw,
  Palette,
  Calculator,
  Shuffle,
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
  loadClassroomConfig,
} from '../utils/classroomStorage';
import {
  clampTarget,
  getAllowedOperators,
  isCompositeTarget,
  nearestCompositeTarget,
} from '../utils/mathEngine';
import { TargetPicker } from './TargetPicker';
import { SimpleOperatorPicker } from './SimpleOperatorPicker';

interface PlayNowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchTeamMatch: (config: ClassroomConfig) => void;
  difficulty: DifficultyLevel;
  defaultMathMode: MathMode;
  defaultSimpleOperator: MathOperator;
  defaultTarget: number;
  isWide: boolean;
}

export const PlayNowModal: React.FC<PlayNowModalProps> = ({
  isOpen,
  onClose,
  onLaunchTeamMatch,
  difficulty,
  defaultMathMode,
  defaultSimpleOperator,
  defaultTarget,
  isWide,
}) => {
  const [step, setStep] = useState<'team_setup' | 'math_setup'>('team_setup');

  const [classroomConfig, setClassroomConfig] = useState<ClassroomConfig>(() =>
    loadClassroomConfig()
  );
  const [teams, setTeams] = useState<ClassroomTeam[]>(() => classroomConfig.teams);
  const [turnCondition, setTurnCondition] = useState<TurnConditionType>(
    () => classroomConfig.turnCondition
  );
  const [turnSeconds, setTurnSeconds] = useState<number>(() => classroomConfig.turnSeconds);
  const [turnEquationsTarget, setTurnEquationsTarget] = useState<number>(
    () => classroomConfig.turnEquationsTarget
  );
  const [totalRounds, setTotalRounds] = useState<number>(() => classroomConfig.totalRounds);
  const [cleanBoardEachTurn, setCleanBoardEachTurn] = useState<boolean>(
    () => classroomConfig.cleanBoardEachTurn
  );
  const [mathMode, setMathMode] = useState<MathMode>(defaultMathMode);
  const [simpleOperator, setSimpleOperator] = useState<MathOperator>(defaultSimpleOperator);
  const [target, setTarget] = useState<number>(() => clampTarget(defaultTarget));
  const [spawnSeed, setSpawnSeed] = useState<number>(() => classroomConfig.spawnSeed);
  const [activeTheme, setActiveTheme] = useState<'animals' | 'colors' | 'space' | 'all'>(
    'animals'
  );

  useEffect(() => {
    if (isOpen) {
      const fresh = loadClassroomConfig();
      setClassroomConfig(fresh);
      setTeams(fresh.teams);
      setTurnCondition(fresh.turnCondition);
      setTurnSeconds(fresh.turnSeconds);
      setTurnEquationsTarget(fresh.turnEquationsTarget);
      setTotalRounds(fresh.totalRounds);
      setCleanBoardEachTurn(fresh.cleanBoardEachTurn);
      setMathMode(defaultMathMode);
      const allowed = getAllowedOperators(difficulty);
      setSimpleOperator(allowed.includes(defaultSimpleOperator) ? defaultSimpleOperator : '+');
      setTarget(clampTarget(defaultTarget));
      setSpawnSeed(fresh.spawnSeed || Math.floor(100000 + Math.random() * 900000));
      setStep('team_setup');
    }
  }, [isOpen, difficulty, defaultMathMode, defaultSimpleOperator, defaultTarget]);

  if (!isOpen) return null;

  const requiresComposite = mathMode === 'simple' && simpleOperator === '×';
  const isBlockedPrime = requiresComposite && !isCompositeTarget(target);

  const handleChangeSimpleOperator = (op: MathOperator) => {
    setSimpleOperator(op);
    if (op === '×' && !isCompositeTarget(target)) {
      setTarget(nearestCompositeTarget(target));
    }
  };

  const buildUpdatedConfig = (): ClassroomConfig => ({
    ...classroomConfig,
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
  });

  const handleProceedToMathSetup = () => {
    const updated = buildUpdatedConfig();
    setClassroomConfig(updated);
    saveClassroomConfig(updated);
    setStep('math_setup');
  };

  const handleLaunch = () => {
    if (isBlockedPrime) return;
    const finalConfig = buildUpdatedConfig();
    saveClassroomConfig(finalConfig);
    onLaunchTeamMatch(finalConfig);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md select-none text-slate-100 overflow-y-auto no-scrollbar animate-fade-in">
      <div
        className={`w-full ${
          isWide ? (step === 'team_setup' ? 'max-w-3xl' : 'max-w-2xl') : 'max-w-lg'
        } max-h-[94vh] bg-slate-900 border-2 border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-left`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {step === 'math_setup' && (
              <button
                type="button"
                onClick={() => setStep('team_setup')}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <span>Team Play</span>
                <span>›</span>
                <span>{step === 'team_setup' ? 'Teams' : 'Target & Seed'}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-display font-black text-white leading-tight">
                {step === 'team_setup' ? 'Organize Teams' : 'Shared Match Setup'}
              </h2>
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

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto no-scrollbar flex-1">
          {step === 'team_setup' && (
            <div className="space-y-5">
              {/* Teams & Presets */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-display font-black text-sm uppercase tracking-wider text-slate-300">
                    Teams ({teams.length} of 6)
                  </span>

                  <div className="flex items-center gap-1.5 text-xs flex-wrap">
                    {(['animals', 'colors', 'space', 'all'] as const).map((theme) => (
                      <button
                        key={theme}
                        type="button"
                        onClick={() => handleApplyPreset(theme)}
                        className={`min-h-[44px] px-3 py-1 rounded-xl border font-bold transition-all cursor-pointer active:scale-95 ${
                          activeTheme === theme
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm font-black'
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

                {/* Team Cards */}
                <div className={`grid ${isWide ? 'grid-cols-2 gap-2.5' : 'grid-cols-1 gap-2.5'}`}>
                  {teams.map((team, idx) => (
                    <div
                      key={team.id || idx}
                      className="p-3 rounded-2xl bg-slate-800/80 border-2 flex items-center gap-2.5 transition-all"
                      style={{ borderColor: team.color }}
                    >
                      <button
                        type="button"
                        onClick={() => handleCycleEmoji(idx)}
                        title="Tap to change emoji"
                        className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-2xl cursor-pointer hover:scale-105 active:scale-95 transition-transform shrink-0"
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
                          className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCycleColor(idx)}
                        title="Cycle color"
                        className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-90 shrink-0 border border-white/40"
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
                    className="w-full min-h-[44px] py-2 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-400 text-slate-400 hover:text-indigo-300 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Add Team</span>
                  </button>
                )}
              </div>

              {/* Turn Rules */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <span className="font-display font-black text-sm uppercase tracking-wider text-slate-300 block">
                  Turn Rules
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTurnCondition('timer')}
                    className={`min-h-[48px] px-3 rounded-2xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      turnCondition === 'timer'
                        ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 font-black'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Timer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTurnCondition('equations')}
                    className={`min-h-[48px] px-3 rounded-2xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      turnCondition === 'equations'
                        ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 font-black'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Target className="w-4 h-4" />
                    <span>Equations Goal</span>
                  </button>
                </div>

                {turnCondition === 'timer' ? (
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
                            ? 'bg-indigo-500 text-white font-black'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 5].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setTurnEquationsTarget(cnt)}
                        className={`min-h-[44px] rounded-xl font-bold text-sm transition-all cursor-pointer ${
                          turnEquationsTarget === cnt
                            ? 'bg-indigo-500 text-white font-black'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                        }`}
                      >
                        {cnt} {cnt === 1 ? 'eq' : 'eqs'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Match Length */}
              <div className="space-y-2 pt-3 border-t border-slate-800">
                <span className="font-display font-black text-sm uppercase tracking-wider text-slate-300 block">
                  Match Length
                </span>
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
                          ? 'bg-indigo-500 text-white font-black'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      {round.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Board Clean Toggle */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCleanBoardEachTurn(!cleanBoardEachTurn)}
                  className={`w-full min-h-[48px] px-4 rounded-2xl border-2 flex items-center justify-between transition-all cursor-pointer ${
                    cleanBoardEachTurn
                      ? 'bg-indigo-500/20 border-indigo-400 text-white'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="font-bold text-sm">Fresh board each turn</span>
                  </div>
                  <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-indigo-500 text-white">
                    {cleanBoardEachTurn ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleProceedToMathSetup}
                  className="w-full min-h-[56px] px-6 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-display font-black text-lg flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer"
                >
                  <span>Next: Shared Target &amp; Mode</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {step === 'math_setup' && (
            <div className="space-y-4">
              {/* Header summary */}
              <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span className="text-slate-400 font-medium">Teams:</span>
                  <strong className="text-white">{teams.length} Teams</strong>
                </div>

                <button
                  type="button"
                  onClick={() => setStep('team_setup')}
                  className="min-h-[44px] px-2 text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                >
                  Edit Teams
                </button>
              </div>

              <p className="text-xs font-medium text-slate-400">
                All teams share the same target, operator, math mode, and spawn seed on every round.
              </p>

              {/* Math Mode + Pre-Game Operator */}
              <div className="space-y-2.5">
                <label className="font-display font-black text-xs uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-sky-400" />
                  <span>Shared Math Mode</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setMathMode('simple')}
                    className={`min-h-[52px] p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      mathMode === 'simple'
                        ? 'bg-sky-500/15 border-sky-400 text-white'
                        : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-display font-black text-base block">Simple Mode</span>
                    <span className="text-xs text-slate-400">Numbers fall · auto operator</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMathMode('operator')}
                    className={`min-h-[52px] p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      mathMode === 'operator'
                        ? 'bg-violet-500/20 border-violet-400 text-white'
                        : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-display font-black text-base block">Operator Mode</span>
                    <span className="text-xs text-violet-300">Ops fall on board (2× score)</span>
                  </button>
                </div>

                {mathMode === 'simple' && (
                  <SimpleOperatorPicker
                    difficulty={difficulty}
                    value={simpleOperator}
                    onChange={handleChangeSimpleOperator}
                  />
                )}
              </div>

              {/* Shared Target */}
              <TargetPicker
                difficulty={difficulty}
                target={target}
                onChangeTarget={setTarget}
                requiresComposite={requiresComposite}
              />

              {/* Shared Spawn Seed */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <span className="font-display font-black text-xs uppercase tracking-wider text-slate-300 block">
                    Shared Spawn Seed
                  </span>
                  <span className="text-xs text-slate-400">
                    Guarantees identical tile sequence for each team&apos;s turn
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={999999}
                    value={spawnSeed}
                    onChange={(e) => setSpawnSeed(Number(e.target.value) || 1)}
                    aria-label="Shared spawn seed"
                    className="w-24 min-h-[44px] px-2.5 rounded-xl bg-slate-900 border border-slate-700 text-center font-mono font-bold text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setSpawnSeed(Math.floor(100000 + Math.random() * 900000))}
                    aria-label="New random seed"
                    className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={isBlockedPrime}
                  onClick={handleLaunch}
                  className={`w-full min-h-[56px] sm:min-h-[60px] px-6 rounded-2xl font-display font-black text-lg sm:text-xl flex items-center justify-center gap-2.5 shadow-xl transition-all ${
                    isBlockedPrime
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      : 'cursor-pointer active:scale-[0.98] bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-indigo-500/25'
                  }`}
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start Team Match!</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
