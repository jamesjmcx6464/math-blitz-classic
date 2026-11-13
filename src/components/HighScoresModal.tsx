import React, { useState, useEffect, useMemo } from 'react';
import {
  getHighScores,
  clearHighScores,
  formatTimeBucketLabel,
  sortTimeBuckets,
  HighScoreEntry,
} from '../utils/highScores';
import { formatTargetBandLabel } from '../utils/mathEngine';
import {
  DifficultyLevel,
  DIFFICULTY_PRESETS,
  LeaderboardMode,
  MathMode,
  TargetBand,
} from '../types/game';
import {
  Trophy,
  ArrowLeft,
  Trash2,
  UserPlus,
  Play,
  Sparkles,
  Zap,
  User,
  Users,
  Clock,
  Target,
  Calculator,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export interface LastSoloResult {
  entryId?: string;
  mode?: LeaderboardMode;
  mathMode?: MathMode;
  timeBucket?: string;
  difficulty?: DifficultyLevel;
  target?: number;
  targetBand?: TargetBand;
  isPractice?: boolean;
  playerName: string;
  playerLogo: string;
  score: number;
  totalEquations: number;
  longestEquation: string;
  rank: number;
  isNewHighScore: boolean;
  reason?: string;
}

interface HighScoresModalProps {
  onBack: () => void;
  onPlayAgain?: () => void;
  onStartNextStudent?: () => void;
  lastResult?: LastSoloResult | null;
}

const MODE_META: Record<
  LeaderboardMode,
  { label: string; icon: React.ReactNode; activeClasses: string }
> = {
  quick: {
    label: 'Quick Play',
    icon: <Zap className="w-3.5 h-3.5" />,
    activeClasses: 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20',
  },
  solo: {
    label: 'Solo Play',
    icon: <User className="w-3.5 h-3.5" />,
    activeClasses: 'bg-indigo-500 text-white border-indigo-400 shadow-md shadow-indigo-500/20',
  },
  team: {
    label: 'Team Play',
    icon: <Users className="w-3.5 h-3.5" />,
    activeClasses: 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20',
  },
};

const MODE_ORDER: LeaderboardMode[] = ['quick', 'solo', 'team'];
const MATH_MODE_ORDER: MathMode[] = ['simple', 'operator'];
const DIFFICULTY_ORDER: DifficultyLevel[] = ['beginner', 'easy', 'normal', 'hard', 'nightmare'];
const TARGET_BAND_ORDER: TargetBand[] = ['10', '5-10', '11-20', '21-40', '41-80', '81+'];

export const HighScoresModal: React.FC<HighScoresModalProps> = ({
  onBack,
  onPlayAgain,
  onStartNextStudent,
  lastResult = null,
}) => {
  const [scores, setScores] = useState<HighScoreEntry[]>(() => getHighScores());
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const availableModes = useMemo(() => {
    return MODE_ORDER.filter((m) => scores.some((s) => s.mode === m));
  }, [scores]);

  const [activeMode, setActiveMode] = useState<LeaderboardMode>(() => {
    if (lastResult?.mode && availableModes.includes(lastResult.mode)) {
      return lastResult.mode;
    }
    return availableModes[0] || 'quick';
  });

  const availableMathModes = useMemo(() => {
    const modeScores = scores.filter((s) => s.mode === activeMode);
    return MATH_MODE_ORDER.filter((mm) => modeScores.some((s) => s.mathMode === mm));
  }, [scores, activeMode]);

  const [activeMathMode, setActiveMathMode] = useState<MathMode>(() => {
    if (lastResult?.mathMode && availableMathModes.includes(lastResult.mathMode)) {
      return lastResult.mathMode;
    }
    return availableMathModes[0] || 'simple';
  });

  const availableTimeBuckets = useMemo(() => {
    const sub = scores.filter((s) => s.mode === activeMode && s.mathMode === activeMathMode);
    return sortTimeBuckets(Array.from(new Set<string>(sub.map((s) => s.timeBucket))));
  }, [scores, activeMode, activeMathMode]);

  const [activeTimeBucket, setActiveTimeBucket] = useState<string>(() => {
    if (lastResult?.timeBucket && availableTimeBuckets.includes(lastResult.timeBucket)) {
      return lastResult.timeBucket;
    }
    return availableTimeBuckets[0] || '';
  });

  const availableDifficulties = useMemo(() => {
    const sub = scores.filter(
      (s) =>
        s.mode === activeMode &&
        s.mathMode === activeMathMode &&
        (!activeTimeBucket || s.timeBucket === activeTimeBucket)
    );
    return DIFFICULTY_ORDER.filter((d) => sub.some((s) => s.difficulty === d));
  }, [scores, activeMode, activeMathMode, activeTimeBucket]);

  const [activeDifficulty, setActiveDifficulty] = useState<DifficultyLevel>(() => {
    if (lastResult?.difficulty && availableDifficulties.includes(lastResult.difficulty)) {
      return lastResult.difficulty;
    }
    return availableDifficulties[0] || 'normal';
  });

  const availableTargetBands = useMemo(() => {
    const sub = scores.filter(
      (s) =>
        s.mode === activeMode &&
        s.mathMode === activeMathMode &&
        (!activeTimeBucket || s.timeBucket === activeTimeBucket) &&
        s.difficulty === activeDifficulty
    );
    return TARGET_BAND_ORDER.filter((b) => sub.some((s) => s.targetBand === b));
  }, [scores, activeMode, activeMathMode, activeTimeBucket, activeDifficulty]);

  const [activeTargetBand, setActiveTargetBand] = useState<TargetBand>(() => {
    if (lastResult?.targetBand && availableTargetBands.includes(lastResult.targetBand)) {
      return lastResult.targetBand;
    }
    return availableTargetBands[0] || '10';
  });

  // Sync defaults when lastResult updates
  useEffect(() => {
    const fresh = getHighScores();
    setScores(fresh);

    const presentModes = MODE_ORDER.filter((m) => fresh.some((s) => s.mode === m));
    const nextMode =
      lastResult?.mode && presentModes.includes(lastResult.mode)
        ? lastResult.mode
        : presentModes[0] || 'quick';
    setActiveMode(nextMode);

    const presentMath = MATH_MODE_ORDER.filter((mm) =>
      fresh.some((s) => s.mode === nextMode && s.mathMode === mm)
    );
    const nextMath =
      lastResult?.mathMode && presentMath.includes(lastResult.mathMode)
        ? lastResult.mathMode
        : presentMath[0] || 'simple';
    setActiveMathMode(nextMath);

    const buckets = sortTimeBuckets(
      Array.from(
        new Set<string>(
          fresh
            .filter((s) => s.mode === nextMode && s.mathMode === nextMath)
            .map((s) => s.timeBucket)
        )
      )
    );
    const nextBucket =
      lastResult?.timeBucket && buckets.includes(lastResult.timeBucket)
        ? lastResult.timeBucket
        : buckets[0] || '';
    setActiveTimeBucket(nextBucket);

    const diffs = DIFFICULTY_ORDER.filter((d) =>
      fresh.some(
        (s) =>
          s.mode === nextMode &&
          s.mathMode === nextMath &&
          (!nextBucket || s.timeBucket === nextBucket) &&
          s.difficulty === d
      )
    );
    const nextDiff =
      lastResult?.difficulty && diffs.includes(lastResult.difficulty)
        ? lastResult.difficulty
        : diffs[0] || 'normal';
    setActiveDifficulty(nextDiff);

    const bands = TARGET_BAND_ORDER.filter((b) =>
      fresh.some(
        (s) =>
          s.mode === nextMode &&
          s.mathMode === nextMath &&
          (!nextBucket || s.timeBucket === nextBucket) &&
          s.difficulty === nextDiff &&
          s.targetBand === b
      )
    );
    const nextBand =
      lastResult?.targetBand && bands.includes(lastResult.targetBand)
        ? lastResult.targetBand
        : bands[0] || '10';
    setActiveTargetBand(nextBand);

    if (
      lastResult &&
      !lastResult.isPractice &&
      (lastResult.isNewHighScore || (lastResult.rank > 0 && lastResult.rank <= 3))
    ) {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.55 },
      });
    }
  }, [lastResult]);

  // Keep selections valid when cascading filters change
  useEffect(() => {
    if (availableModes.length > 0 && !availableModes.includes(activeMode)) {
      setActiveMode(availableModes[0]);
    }
  }, [availableModes, activeMode]);

  useEffect(() => {
    if (availableMathModes.length > 0 && !availableMathModes.includes(activeMathMode)) {
      setActiveMathMode(availableMathModes[0]);
    }
  }, [availableMathModes, activeMathMode]);

  useEffect(() => {
    if (availableTimeBuckets.length === 0) {
      setActiveTimeBucket('');
    } else if (!availableTimeBuckets.includes(activeTimeBucket)) {
      setActiveTimeBucket(availableTimeBuckets[0]);
    }
  }, [availableTimeBuckets, activeTimeBucket]);

  useEffect(() => {
    if (availableDifficulties.length > 0 && !availableDifficulties.includes(activeDifficulty)) {
      setActiveDifficulty(availableDifficulties[0]);
    }
  }, [availableDifficulties, activeDifficulty]);

  useEffect(() => {
    if (availableTargetBands.length > 0 && !availableTargetBands.includes(activeTargetBand)) {
      setActiveTargetBand(availableTargetBands[0]);
    }
  }, [availableTargetBands, activeTargetBand]);

  const filteredScores = useMemo(() => {
    if (!activeTimeBucket) return [];
    return scores
      .filter(
        (s) =>
          s.mode === activeMode &&
          s.mathMode === activeMathMode &&
          s.timeBucket === activeTimeBucket &&
          s.difficulty === activeDifficulty &&
          s.targetBand === activeTargetBand
      )
      .sort((a, b) => b.score - a.score || b.timestamp - a.timestamp);
  }, [scores, activeMode, activeMathMode, activeTimeBucket, activeDifficulty, activeTargetBand]);

  const handleClear = () => {
    clearHighScores();
    setScores([]);
    setShowConfirmClear(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md select-none text-slate-100 overflow-y-auto no-scrollbar animate-fade-in">
      <div className="w-full max-w-xl bg-slate-900 border-2 border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-black text-white">
                Leaderboard
              </h2>
              <span className="text-xs font-semibold text-amber-400/90 block">
                Bucketed by Mode, Math Mode, Time, Difficulty &amp; Target
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Back to menu"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Bucket Filter Controls */}
        {availableModes.length > 0 && (
          <div className="pt-3.5 space-y-2 shrink-0">
            {/* 1. Mode Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {availableModes.map((mode) => {
                const meta = MODE_META[mode];
                const isSelected = activeMode === mode;
                const modeCount = scores.filter((s) => s.mode === mode).length;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setActiveMode(mode)}
                    className={`flex-1 min-w-[100px] min-h-[44px] py-2 px-3 rounded-xl border font-display font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? meta.activeClasses
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {meta.icon}
                    <span>{meta.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                        isSelected ? 'bg-slate-950/25' : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {modeCount}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 2. Math Mode + Time + Difficulty + Target Band Sub-Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              {availableMathModes.map((mm) => {
                const isSelected = activeMathMode === mm;
                return (
                  <button
                    key={mm}
                    type="button"
                    onClick={() => setActiveMathMode(mm)}
                    className={`min-h-[44px] px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? mm === 'operator'
                          ? 'bg-violet-500 text-white border-violet-300'
                          : 'bg-sky-400 text-slate-950 border-sky-200'
                        : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>{mm === 'operator' ? 'Operator' : 'Simple'}</span>
                  </button>
                );
              })}

              {availableTimeBuckets.map((bucket) => {
                const isSelected = activeTimeBucket === bucket;
                return (
                  <button
                    key={bucket}
                    type="button"
                    onClick={() => setActiveTimeBucket(bucket)}
                    className={`min-h-[44px] px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-100 text-slate-950 border-white shadow-sm'
                        : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatTimeBucketLabel(bucket)}</span>
                  </button>
                );
              })}

              {availableDifficulties.map((diff) => {
                const isSelected = activeDifficulty === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setActiveDifficulty(diff)}
                    className={`min-h-[44px] px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {DIFFICULTY_PRESETS[diff].label}
                  </button>
                );
              })}

              {availableTargetBands.map((band) => {
                const isSelected = activeTargetBand === band;
                return (
                  <button
                    key={band}
                    type="button"
                    onClick={() => setActiveTargetBand(band)}
                    className={`min-h-[44px] px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-400 text-slate-950 border-emerald-200'
                        : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>{formatTargetBandLabel(band)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Just-Completed Run Banner */}
        {lastResult && (
          <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-400/15 to-slate-900 border-2 border-amber-400/60 flex items-center justify-between gap-3 shrink-0 shadow-lg shadow-amber-500/10">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-3xl shrink-0 drop-shadow">{lastResult.playerLogo}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-black text-base text-white truncate">
                    {lastResult.playerName}
                  </span>
                  {lastResult.isPractice ? (
                    <span className="px-2 py-0.5 rounded-lg bg-teal-400 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                      Unranked Practice
                    </span>
                  ) : lastResult.isNewHighScore ? (
                    <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                      #1 High Score!
                    </span>
                  ) : lastResult.rank > 0 ? (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 font-black text-[10px] uppercase tracking-wider">
                      Rank #{lastResult.rank}
                    </span>
                  ) : null}
                </div>
                <span className="text-xs text-slate-300 font-medium block truncate">
                  {lastResult.totalEquations} equations · Best: {lastResult.longestEquation || '-'}
                  {lastResult.target ? ` · Make ${lastResult.target}` : ''}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="font-display font-black text-2xl text-amber-300 font-mono block leading-none">
                {lastResult.score.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-amber-400/80 uppercase">pts</span>
            </div>
          </div>
        )}

        {/* Next Student Action */}
        {onStartNextStudent && (
          <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-indigo-900/50 via-purple-900/40 to-slate-900 border border-indigo-500/40 flex items-center justify-between gap-3 shrink-0 shadow-sm">
            <div className="min-w-0">
              <span className="font-display font-extrabold text-sm text-indigo-200 block truncate">
                Next student ready?
              </span>
              <span className="text-xs text-slate-400 block truncate">
                Pick a player or add your name &amp; logo!
              </span>
            </div>
            <button
              type="button"
              onClick={onStartNextStudent}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-display font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-indigo-500/25 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Next Student</span>
            </button>
          </div>
        )}

        {/* Scores Table */}
        <div className="flex-1 overflow-y-auto py-3.5 space-y-2.5 my-1">
          {filteredScores.length === 0 ? (
            <div className="py-14 text-center text-slate-500 text-sm space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 mx-auto flex items-center justify-center text-slate-600">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-400 text-base">No high scores yet</p>
              <p className="text-xs text-slate-500">
                Finish a ranked game to set the first record!
              </p>
            </div>
          ) : (
            filteredScores.map((entry, idx) => {
              const isJustAdded = lastResult?.entryId && entry.id === lastResult.entryId;
              const fallbackName =
                entry.mode === 'team'
                  ? 'Team'
                  : entry.mode === 'solo'
                  ? 'Student'
                  : 'Quick Player';
              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                    isJustAdded
                      ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/15 ring-1 ring-amber-400/60 text-amber-100'
                      : idx === 0
                      ? 'bg-amber-500/15 border-amber-400/50 shadow-md shadow-amber-500/10 text-amber-200'
                      : idx === 1
                      ? 'bg-slate-800/90 border-slate-700 text-slate-200'
                      : idx === 2
                      ? 'bg-slate-800/60 border-slate-800 text-slate-300'
                      : 'bg-slate-900/50 border-slate-800/60 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950 shadow-sm'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-950'
                          : idx === 2
                          ? 'bg-amber-700 text-amber-100'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </span>

                    {entry.playerLogo && (
                      <span className="text-2xl shrink-0 drop-shadow">{entry.playerLogo}</span>
                    )}

                    <div className="min-w-0">
                      <div className="text-sm sm:text-base font-display font-black text-white truncate flex items-center gap-1.5">
                        <span>{entry.playerName || fallbackName}</span>
                        {isJustAdded && (
                          <span className="text-[10px] font-black uppercase bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-md">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium truncate">
                        Make {entry.target} · Best:{' '}
                        <span className="font-mono font-bold text-slate-300">
                          {entry.longestEquation}
                        </span>{' '}
                        · {entry.totalEquations} eq
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    <div className="text-base sm:text-lg font-display font-black tabular-nums tracking-tight text-amber-300 font-mono">
                      {entry.score.toLocaleString()}{' '}
                      <span className="text-xs font-bold text-amber-400/80">pts</span>
                    </div>
                    <div className="text-[10px] text-slate-500 tabular-nums">{entry.date}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          {showConfirmClear ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-400 font-bold">Clear all scores?</span>
              <button
                type="button"
                onClick={handleClear}
                className="min-h-[44px] px-3 text-xs font-black rounded-xl bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
              >
                Yes, clear
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmClear(false)}
                className="min-h-[44px] px-2.5 text-xs rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : scores.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowConfirmClear(true)}
              className="min-h-[44px] px-2 text-xs font-semibold text-slate-500 hover:text-rose-400 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Reset all high scores"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Leaderboard</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 ml-auto">
            {onPlayAgain && (
              <button
                type="button"
                onClick={onPlayAgain}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-display font-black text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Quick Play</span>
              </button>
            )}
            <button
              type="button"
              onClick={onBack}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold active:scale-95 transition-all cursor-pointer"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
