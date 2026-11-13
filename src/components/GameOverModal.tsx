import React, { useEffect } from 'react';
import { Play, Trophy, Home, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { LeaderboardOperator, MathMode } from '../types/game';
import { formatOperatorLabel } from '../utils/highScores';

interface GameOverModalProps {
  finalScore: number;
  longestEquation: string;
  totalEquations: number;
  rank: number;
  isNewHighScore: boolean;
  isPractice?: boolean;
  target: number;
  mathMode: MathMode;
  operator?: LeaderboardOperator;
  onNewGame: () => void;
  onBackToMenu: () => void;
  reason?: string;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  finalScore,
  longestEquation,
  totalEquations,
  rank,
  isNewHighScore,
  isPractice = false,
  target,
  mathMode,
  operator,
  onNewGame,
  onBackToMenu,
  reason = 'The tiles reached the top!',
}) => {
  const isTimeOut = /time/i.test(reason);
  const title = isTimeOut ? "Time's up!" : isPractice ? 'Practice Complete' : 'Nice try!';
  const reasonText = isTimeOut ? reason : reason || 'The tiles reached the top!';

  useEffect(() => {
    if (!isPractice && (isNewHighScore || (rank > 0 && rank <= 3))) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
  }, [isPractice, isNewHighScore, rank]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm select-none animate-fade-in">
      <div className="w-full max-w-md bg-white border-4 border-amber-300 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center text-slate-800">
        {isPractice ? (
          <div className="mb-3 px-4 py-1.5 rounded-full bg-teal-100 border-2 border-teal-400 text-teal-950 text-sm font-black flex items-center gap-2 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span>Unranked Practice (Not Saved)</span>
          </div>
        ) : isNewHighScore ? (
          <div className="mb-3 px-4 py-1.5 rounded-full bg-amber-100 border-2 border-amber-400 text-amber-950 text-sm font-black flex items-center gap-2 uppercase tracking-wider motion-safe:animate-bounce">
            <Sparkles className="w-4 h-4 text-amber-600 fill-amber-500" />
            <span>New high score!</span>
          </div>
        ) : rank > 0 ? (
          <div className="mb-3 px-4 py-1.5 rounded-full bg-emerald-100 border-2 border-emerald-400 text-emerald-950 text-sm font-black flex items-center gap-2 uppercase tracking-wider">
            <Trophy className="w-4 h-4 text-emerald-600" />
            <span>You are #{rank} on the scoreboard!</span>
          </div>
        ) : null}

        <h2 className="text-3xl sm:text-4xl font-display font-black text-slate-900 tracking-tight mb-1">
          {title}
        </h2>
        <p className="text-base text-slate-600 font-medium mb-4">
          {reasonText}
        </p>

        <div className="w-full bg-amber-50 border-4 border-amber-200 rounded-3xl p-5 mb-5 space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
            <span>Make {target}</span>
            <span>·</span>
            <span>{mathMode === 'operator' ? 'Operator Mode' : 'Simple Mode'}</span>
            {operator && (
              <>
                <span>·</span>
                <span>{formatOperatorLabel(operator)}</span>
              </>
            )}
          </div>

          <div>
            <span className="text-sm font-bold text-slate-600 uppercase tracking-wider block">
              You scored
            </span>
            <span className="text-4xl sm:text-5xl font-display font-black text-amber-950 tabular-nums font-mono leading-none my-1 block">
              {finalScore.toLocaleString()}
            </span>
            <span className="text-sm font-bold text-slate-600">points</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t-2 border-amber-200 text-left">
            <div>
              <span className="text-xs uppercase font-bold text-slate-500 block">
                Equations
              </span>
              <span className="text-lg font-black font-mono text-slate-900">
                {totalEquations}
              </span>
            </div>
            <div>
              <span className="text-xs uppercase font-bold text-slate-500 block">
                Best equation
              </span>
              <span className="text-base font-bold font-mono text-slate-900 truncate block">
                {longestEquation || '-'}
              </span>
            </div>
          </div>
        </div>

        <div className="w-full flex flex-col gap-3">
          <button
            type="button"
            onClick={onNewGame}
            className="w-full min-h-[64px] px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-display font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-amber-400/25 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-500"
          >
            <Play className="w-6 h-6 fill-current" />
            <span>Play Again</span>
          </button>

          <button
            type="button"
            onClick={onBackToMenu}
            className="w-full min-h-[56px] px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-display font-black text-lg flex items-center justify-center gap-2.5 border-2 border-slate-300 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400"
          >
            <Home className="w-5 h-5 text-slate-700" />
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
