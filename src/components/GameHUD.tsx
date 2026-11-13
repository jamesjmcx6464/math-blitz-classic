import React from 'react';
import {
  Pause,
  Volume2,
  VolumeX,
  BookOpen,
  Clock,
  Target,
  Rocket,
  Star,
  Users,
  HelpCircle,
} from 'lucide-react';
import { ViewMode, ClassroomMatchState, MathMode } from '../types/game';
import gsap from 'gsap';

interface GameHUDProps {
  score: number;
  longestEquation: string;
  onPause: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  viewMode: ViewMode;
  timeLeftSec?: number | null;
  isPractice?: boolean;
  freePlaySpeedPct?: number;
  equationCount?: number;
  onOpenEquationHistory?: () => void;
  onOpenHowToPlay?: () => void;
  target: number;
  mathMode: MathMode;
  classroomMatch?: ClassroomMatchState | null;
  onOpenScoreboard?: () => void;
  soloPlayer?: { name: string; logo: string } | null;
}

interface RollingScoreProps {
  value: number;
  prefix?: string;
  className?: string;
}

const RollingScore: React.FC<RollingScoreProps> = ({ value, prefix = '', className = '' }) => {
  const displayRef = React.useRef<HTMLSpanElement>(null);
  const currentValRef = React.useRef<number>(value);

  React.useEffect(() => {
    const el = displayRef.current;
    if (!el) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      el.textContent = `${prefix}${value.toLocaleString()}`;
      currentValRef.current = value;
      return;
    }

    const obj = { val: currentValRef.current };
    const tween = gsap.to(obj, {
      val: value,
      duration: 0.35,
      ease: 'power2.out',
      overwrite: 'auto',
      onUpdate: () => {
        if (el) {
          el.textContent = `${prefix}${Math.round(obj.val).toLocaleString()}`;
        }
      },
      onComplete: () => {
        currentValRef.current = value;
        if (el) {
          el.textContent = `${prefix}${value.toLocaleString()}`;
        }
      },
    });

    return () => {
      tween.kill();
    };
  }, [value, prefix]);

  return (
    <span ref={displayRef} className={`tabular-nums font-mono ${className}`}>
      {prefix}{value.toLocaleString()}
    </span>
  );
};

export const GameHUD: React.FC<GameHUDProps> = ({
  score,
  longestEquation,
  onPause,
  soundEnabled,
  onToggleSound,
  viewMode,
  timeLeftSec,
  isPractice = false,
  freePlaySpeedPct,
  onOpenEquationHistory,
  onOpenHowToPlay,
  target,
  mathMode,
  classroomMatch,
  onOpenScoreboard,
  soloPlayer,
}) => {
  const isWide = viewMode === 'wide';

  if (classroomMatch) {
    const currentTeam = classroomMatch.config.teams[classroomMatch.currentTeamIndex];
    const isTimer = classroomMatch.config.turnCondition === 'timer';

    return (
      <header className="w-full h-14 sm:h-16 px-2 sm:px-3 flex items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-950 select-none shrink-0 text-white">
        <div className="flex items-center gap-2 sm:gap-3 text-left min-w-0">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl border-2 shadow-sm shrink-0"
            style={{
              backgroundColor: `${currentTeam.color}25`,
              borderColor: currentTeam.color,
            }}
          >
            <span className="text-xl sm:text-2xl drop-shadow">{currentTeam.emoji}</span>
            <div className="min-w-0">
              <span className="font-display font-black text-sm sm:text-base text-white block leading-tight truncate max-w-[110px] sm:max-w-[160px]">
                {currentTeam.name}
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-slate-300 block leading-none">
                R{classroomMatch.currentRound}/{classroomMatch.config.totalRounds} · Make {target}
              </span>
            </div>
          </div>

          <div className="pl-1 sm:pl-2">
            <span className="text-[10px] sm:text-xs font-bold text-amber-400 block leading-tight">
              Team Total
            </span>
            <div className="text-lg sm:text-xl font-display font-black text-amber-300 font-mono leading-none">
              <RollingScore value={score} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isTimer ? (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border-2 font-mono font-black text-base sm:text-lg ${
                classroomMatch.turnTimeLeft <= 10
                  ? 'bg-rose-500/20 border-rose-400 text-rose-300 motion-safe:animate-pulse'
                  : 'bg-slate-900 border-slate-700 text-slate-100'
              }`}
            >
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {Math.floor(classroomMatch.turnTimeLeft / 60)}:
                {(classroomMatch.turnTimeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-indigo-500/20 border-2 border-indigo-400 text-indigo-300 font-bold text-xs sm:text-sm">
              <Target className="w-4 h-4 text-indigo-300 shrink-0" />
              <span>
                {classroomMatch.turnEquationsCount}/{classroomMatch.config.turnEquationsTarget} eq
              </span>
            </div>
          )}

          {classroomMatch.turnScoreGained > 0 && (
            <span className="hidden min-[520px]:inline px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-mono font-bold text-xs">
              +{classroomMatch.turnScoreGained}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenScoreboard && (
            <button
              type="button"
              onClick={onOpenScoreboard}
              className="min-h-[44px] px-3 rounded-2xl bg-indigo-600/90 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
            >
              <Users className="w-4 h-4" />
              <span className="hidden min-[440px]:inline">Scores</span>
            </button>
          )}

          {onOpenEquationHistory && (
            <button
              type="button"
              onClick={onOpenEquationHistory}
              aria-label="My Equations"
              className="min-h-[44px] min-w-[44px] px-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border-2 border-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Equations</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
            className="min-h-[44px] min-w-[44px] rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border-2 border-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-amber-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          <button
            type="button"
            onClick={onPause}
            aria-label="Pause game"
            className="min-h-[44px] min-w-[44px] rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border-2 border-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="w-full h-14 sm:h-16 px-2 sm:px-3 flex items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-950 select-none shrink-0 text-white">
      <div className="flex items-center gap-3 sm:gap-4 text-left min-w-0">
        {soloPlayer && (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-2xl bg-indigo-500/20 border-2 border-indigo-400/50 shrink-0">
            <span className="text-xl drop-shadow">{soloPlayer.logo}</span>
            <div className="min-w-0">
              <span className="font-display font-black text-xs sm:text-sm text-white block leading-tight truncate max-w-[85px] sm:max-w-[120px]">
                {soloPlayer.name}
              </span>
              <span className="text-[10px] font-bold text-indigo-300 block leading-none">
                {mathMode === 'operator' ? 'Operator' : 'Simple'}
              </span>
            </div>
          </div>
        )}

        <div>
          <div className="text-xs sm:text-sm font-bold text-amber-400 flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>Points</span>
          </div>
          <div className="text-xl sm:text-2xl font-display font-black text-amber-300 font-mono leading-none">
            <RollingScore value={score} />
          </div>
        </div>

        {isPractice ? (
          <div className="pl-3 border-l border-slate-800">
            <span className="text-xs font-bold text-teal-300 block">Practice</span>
            <span className="text-xs font-semibold text-slate-400 block">Untimed · Unranked</span>
          </div>
        ) : timeLeftSec !== undefined && timeLeftSec !== null ? (
          <div className="pl-3 border-l border-slate-800">
            <div className="text-xs sm:text-sm font-bold text-amber-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{timeLeftSec <= 15 ? 'Almost done!' : 'Time'}</span>
            </div>
            <div
              className={`text-lg sm:text-xl font-mono font-black ${
                timeLeftSec <= 15
                  ? 'text-amber-300 motion-safe:animate-pulse'
                  : 'text-slate-100'
              }`}
            >
              {Math.floor(timeLeftSec / 60)}:{(timeLeftSec % 60).toString().padStart(2, '0')}
            </div>
          </div>
        ) : null}

        {freePlaySpeedPct !== undefined && freePlaySpeedPct > 105 && (
          <div className="pl-3 border-l border-slate-800 hidden min-[560px]:flex items-center gap-1.5 text-purple-300 font-bold text-xs sm:text-sm">
            <Rocket className="w-4 h-4 text-purple-400" />
            <span>Speeding up</span>
          </div>
        )}

        {isWide && longestEquation && (
          <div className="pl-3 border-l border-slate-800 hidden md:block">
            <span className="text-xs text-slate-400 font-medium block">Best equation</span>
            <span className="text-sm font-bold font-mono text-slate-200 truncate max-w-[140px] block">
              {longestEquation}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {onOpenHowToPlay && (
          <button
            type="button"
            onClick={onOpenHowToPlay}
            aria-label="How to Play"
            className="min-h-[44px] min-w-[44px] rounded-2xl bg-slate-800 hover:bg-slate-700 text-sky-400 border-2 border-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        )}

        {onOpenEquationHistory && (
          <button
            type="button"
            onClick={onOpenEquationHistory}
            aria-label="My Equations"
            className="min-h-[44px] min-w-[44px] px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border-2 border-slate-700 font-bold text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
          >
            <BookOpen className="w-5 h-5 text-amber-400" />
            <span className="hidden sm:inline">Equations</span>
          </button>
        )}

        <button
          type="button"
          onClick={onToggleSound}
          aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
          className="min-h-[44px] min-w-[44px] rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border-2 border-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          {soundEnabled ? (
            <Volume2 className="w-5 h-5 text-amber-400" />
          ) : (
            <VolumeX className="w-5 h-5 text-slate-500" />
          )}
        </button>

        <button
          type="button"
          onClick={onPause}
          aria-label="Pause game"
          className="min-h-[44px] min-w-[44px] rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border-2 border-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          <Pause className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
