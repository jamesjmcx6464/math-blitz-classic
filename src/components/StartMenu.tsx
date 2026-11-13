import React, { useState } from 'react';
import {
  Trophy,
  Volume2,
  VolumeX,
  Play,
  User,
  Users,
  Zap,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Gauge,
  Flame,
  Calculator,
} from 'lucide-react';
import {
  ScreenModeType,
  DifficultyLevel,
  DIFFICULTY_PRESETS,
  MathMode,
  MathOperator,
} from '../types/game';
import { HowToPlayModal } from './HowToPlayModal';
import { TargetPicker } from './TargetPicker';
import { SimpleOperatorPicker } from './SimpleOperatorPicker';
import { isCompositeTarget } from '../utils/mathEngine';

interface StartMenuProps {
  onQuickPlay: () => void;
  onOpenSoloSetup: () => void;
  onOpenTeamSetup: () => void;
  onOpenHighScores: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  screenMode: ScreenModeType;
  difficulty: DifficultyLevel;
  onChangeDifficulty: (level: DifficultyLevel) => void;
  mathMode: MathMode;
  onChangeMathMode: (mode: MathMode) => void;
  simpleOperator: MathOperator;
  onChangeSimpleOperator: (op: MathOperator) => void;
  target: number;
  onChangeTarget: (nextTarget: number) => void;
}

const DIFFICULTY_ORDER: DifficultyLevel[] = ['beginner', 'easy', 'normal', 'hard', 'nightmare'];

const DIFFICULTY_STYLE: Record<
  DifficultyLevel,
  { activeClass: string; badgeText: string }
> = {
  beginner: {
    activeClass: 'bg-sky-400 text-slate-950 border-sky-200 shadow-md shadow-sky-400/20',
    badgeText: 'text-sky-300',
  },
  easy: {
    activeClass: 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md shadow-emerald-500/20',
    badgeText: 'text-emerald-300',
  },
  normal: {
    activeClass: 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/20',
    badgeText: 'text-amber-300',
  },
  hard: {
    activeClass: 'bg-orange-500 text-slate-950 border-orange-300 shadow-md shadow-orange-500/20',
    badgeText: 'text-orange-300',
  },
  nightmare: {
    activeClass: 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/25',
    badgeText: 'text-rose-300',
  },
};

export const StartMenu: React.FC<StartMenuProps> = ({
  onQuickPlay,
  onOpenSoloSetup,
  onOpenTeamSetup,
  onOpenHighScores,
  soundEnabled,
  onToggleSound,
  screenMode,
  difficulty,
  onChangeDifficulty,
  mathMode,
  onChangeMathMode,
  simpleOperator,
  onChangeSimpleOperator,
  target,
  onChangeTarget,
}) => {
  const isWide = screenMode === 'pc';
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const activePreset = DIFFICULTY_PRESETS[difficulty];
  const requiresComposite = mathMode === 'simple' && simpleOperator === '×';
  const quickPlayBlockedByPrime = requiresComposite && !isCompositeTarget(target);

  return (
    <div
      className={`w-full h-full ${
        isWide
          ? 'w-full md:w-[50vw] md:max-w-[50vw] md:min-w-[480px] px-6 py-4'
          : 'w-full max-w-full px-4 py-3.5'
      } mx-auto flex flex-col justify-between select-none text-slate-100 no-scrollbar overflow-y-auto`}
    >
      {/* Top Header */}
      <header className="w-full flex items-center justify-between pb-2.5 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-3">
          {/* Hex Math Logo */}
          <div className="relative">
            <svg width="44" height="50" viewBox="0 0 84 96" className="drop-shadow-md">
              <polygon
                points="42,4 80,26 80,70 42,92 4,70 4,26"
                fill="#f59e0b"
                stroke="#d97706"
                strokeWidth="5"
              />
              <text
                x="42"
                y="50"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="36"
                fontWeight="900"
                fill="#0f172a"
                className="font-display select-none"
              >
                +×
              </text>
            </svg>
          </div>

          <div>
            <span className="font-display font-black text-2xl sm:text-3xl tracking-tight text-white block leading-tight">
              Math Blitz Classic
            </span>
          </div>
        </div>

        {/* Header Action: Sound Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSound}
            aria-label="Turn sound on or off"
            className="min-h-[44px] min-w-[44px] px-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 flex items-center justify-center gap-2 font-bold text-sm shadow-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 active:scale-95"
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5 text-amber-400" />
            ) : (
              <VolumeX className="w-5 h-5 text-slate-500" />
            )}
            <span className="hidden sm:inline">{soundEnabled ? 'Sound' : 'Muted'}</span>
          </button>
        </div>
      </header>

      {/* Main Section */}
      <main className="flex-1 flex flex-col items-center justify-center py-3 sm:py-4 space-y-2.5">
        {/* 1. Leaderboard Button */}
        <div className="w-full">
          <button
            type="button"
            onClick={onOpenHighScores}
            className="w-full min-h-[50px] px-4 py-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border-2 border-amber-400/40 hover:border-amber-400 text-amber-200 flex items-center justify-between shadow-lg shadow-amber-500/10 transition-all cursor-pointer active:scale-[0.99] group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform">
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-left">
                <span className="font-display font-black text-base sm:text-lg text-white block leading-tight">
                  Leaderboard
                </span>
                <span className="text-xs text-amber-400/80 font-semibold block leading-none">
                  Comparable by Target &amp; Operator
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-400/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>View Ranks</span>
            </div>
          </button>
        </div>

        {/* 2. Quick Play Button */}
        <div className="w-full">
          <button
            type="button"
            disabled={quickPlayBlockedByPrime}
            onClick={onQuickPlay}
            className={`w-full min-h-[82px] sm:min-h-[88px] p-4 rounded-3xl border-3 flex items-center justify-between shadow-2xl transition-all group ${
              quickPlayBlockedByPrime
                ? 'bg-slate-800 border-slate-700 text-slate-400 cursor-not-allowed opacity-70'
                : 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-amber-400 border-amber-300 text-slate-950 shadow-amber-500/25 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-12 h-12 rounded-2xl bg-slate-950/20 flex items-center justify-center shrink-0">
                <Zap className="w-7 h-7 fill-current" />
              </div>
              <div>
                <span className="font-display font-black text-2xl sm:text-3xl tracking-tight block leading-tight">
                  Quick Play
                </span>
                <span className="text-xs sm:text-sm font-extrabold opacity-85 block mt-0.5">
                  1:00 · Make {target} · {activePreset.label} ·{' '}
                  {mathMode === 'operator' ? 'Equation' : `Simple (${simpleOperator})`}
                </span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0 group-hover:translate-x-1 transition-transform">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
          </button>
        </div>

        {/* 3. Solo Play & Team Play Buttons */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Solo Play */}
          <button
            type="button"
            onClick={onOpenSoloSetup}
            className="w-full min-h-[66px] p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border-2 border-indigo-500/40 hover:border-indigo-400 text-white flex items-center gap-3 shadow-md shadow-indigo-500/10 transition-all cursor-pointer active:scale-[0.98] text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/50 flex items-center justify-center text-indigo-400 shrink-0 group-hover:scale-105 transition-transform">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-display font-black text-base text-white block leading-tight">
                  Solo Play
                </span>
                <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <span className="text-xs text-indigo-300 font-semibold block mt-0.5 truncate">
                Target, Operator &amp; Practice
              </span>
            </div>
          </button>

          {/* Team Play */}
          <button
            type="button"
            onClick={onOpenTeamSetup}
            className="w-full min-h-[66px] p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border-2 border-emerald-500/40 hover:border-emerald-400 text-white flex items-center gap-3 shadow-md shadow-emerald-500/10 transition-all cursor-pointer active:scale-[0.98] text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-display font-black text-base text-white block leading-tight">
                  Team Play
                </span>
                <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <span className="text-xs text-emerald-300 font-semibold block mt-0.5 truncate">
                Shared Target &amp; Seed
              </span>
            </div>
          </button>
        </div>

        {/* 4. Math Mode & Pre-Game Operator */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-sky-400" />
              <span className="text-[11px] font-display font-black uppercase tracking-widest text-slate-300">
                Math Mode
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {mathMode === 'operator'
                ? 'Operators & numbers fall as tiles'
                : `Auto-inserts "${simpleOperator}" all round`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onChangeMathMode('simple')}
              className={`min-h-[44px] px-3 py-1.5 rounded-xl border-2 font-display font-black text-xs sm:text-sm transition-all cursor-pointer active:scale-95 ${
                mathMode === 'simple'
                  ? 'bg-sky-400 text-slate-950 border-sky-200 shadow-md shadow-sky-400/20'
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Simple Mode
            </button>
            <button
              type="button"
              onClick={() => onChangeMathMode('operator')}
              className={`min-h-[44px] px-3 py-1.5 rounded-xl border-2 font-display font-black text-xs sm:text-sm transition-all cursor-pointer active:scale-95 ${
                mathMode === 'operator'
                  ? 'bg-violet-500 text-white border-violet-300 shadow-md shadow-violet-500/25'
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Equation Mode
            </button>
          </div>

          {mathMode === 'simple' && (
            <SimpleOperatorPicker
              difficulty={difficulty}
              value={simpleOperator}
              onChange={onChangeSimpleOperator}
              compact
            />
          )}
        </div>

        {/* 5. Target Number Picker (2–100, default 10) */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-sm">
          <TargetPicker
            difficulty={difficulty}
            target={target}
            onChangeTarget={onChangeTarget}
            requiresComposite={requiresComposite}
            compact
          />
        </div>

        {/* 6. Difficulty Menu (Beginner, Easy, Normal, Hard, Nightmare) */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-sm space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {difficulty === 'nightmare' ? (
                <Flame className="w-4 h-4 text-rose-400" />
              ) : (
                <Gauge className="w-4 h-4 text-amber-400" />
              )}
              <span className="text-[11px] font-display font-black uppercase tracking-widest text-slate-300">
                Difficulty
              </span>
            </div>
            <span className={`text-xs font-bold ${DIFFICULTY_STYLE[difficulty].badgeText}`}>
              {activePreset.description}
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {DIFFICULTY_ORDER.map((lvl) => {
              const preset = DIFFICULTY_PRESETS[lvl];
              const isSelected = difficulty === lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => onChangeDifficulty(lvl)}
                  className={`min-h-[44px] px-1.5 py-1.5 rounded-xl border-2 font-display font-black text-xs transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? DIFFICULTY_STYLE[lvl].activeClass
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer Row */}
      <footer className="w-full flex items-center justify-between pt-2.5 border-t border-slate-800/80 shrink-0 gap-4">
        <button
          type="button"
          onClick={onOpenHighScores}
          className="min-h-[44px] px-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 font-bold text-xs sm:text-sm text-slate-200 flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Leaderboard</span>
        </button>

        <button
          type="button"
          onClick={() => setShowHowToPlay(true)}
          className="min-h-[44px] px-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 font-bold text-xs sm:text-sm text-slate-200 flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <HelpCircle className="w-4 h-4 text-sky-400" />
          <span>How to Play</span>
        </button>
      </footer>

      {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
    </div>
  );
};
