import React, { useEffect } from 'react';
import { Trophy, RotateCcw, Users, Home } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ClassroomMatchState } from '../types/game';

interface ClassroomVictoryModalProps {
  matchState: ClassroomMatchState;
  onRematch: () => void;
  onNewMatchSetup: () => void;
  onExitToMenu: () => void;
  isWide: boolean;
}

export const ClassroomVictoryModal: React.FC<ClassroomVictoryModalProps> = ({
  matchState,
  onRematch,
  onNewMatchSetup,
  onExitToMenu,
  isWide,
}) => {
  const { config } = matchState;
  const sortedTeams = [...config.teams].sort((a, b) => b.score - a.score);
  const winner = sortedTeams[0];

  useEffect(() => {
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.35 },
    });
    const timer = setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 120,
        origin: { y: 0.5 },
      });
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const getRankBadge = (rankIndex: number) => {
    if (rankIndex === 0) return { label: '1st', bg: 'bg-amber-400 text-amber-950 border-amber-300' };
    if (rankIndex === 1) return { label: '2nd', bg: 'bg-slate-300 text-slate-900 border-slate-200' };
    if (rankIndex === 2) return { label: '3rd', bg: 'bg-amber-700 text-amber-100 border-amber-600' };
    return { label: `${rankIndex + 1}th`, bg: 'bg-slate-800 text-slate-400 border-slate-700' };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md select-none text-slate-100 overflow-y-auto no-scrollbar">
      <div
        className={`w-full ${
          isWide ? 'max-w-3xl' : 'max-w-md'
        } max-h-[94vh] bg-slate-900 border-4 border-amber-400/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-center`}
      >
        {/* Header */}
        <div className="p-5 sm:p-7 border-b border-slate-800 bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-900 text-center space-y-2 shrink-0">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-amber-400 text-slate-950 shadow-xl shadow-amber-400/30 mb-1">
            <Trophy className="w-9 h-9 sm:w-11 sm:h-11" />
          </div>

          <span className="text-xs sm:text-sm font-display font-black uppercase tracking-widest text-amber-400 block">
            Classroom Champions · Make {config.target} ({config.mathMode === 'operator' ? 'Equation' : 'Simple'})
          </span>

          <h1 className="text-3xl sm:text-4xl font-display font-black text-white tracking-tight">
            {winner.name} Wins!
          </h1>
          <p className="text-sm font-semibold text-slate-300">
            Fantastic math across {config.teams.length} teams and {config.totalRounds}{' '}
            {config.totalRounds === 1 ? 'round' : 'rounds'}!
          </p>
        </div>

        {/* Team Rankings */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto no-scrollbar flex-1">
          <div className="grid grid-cols-1 gap-3">
            {sortedTeams.map((team, idx) => {
              const badge = getRankBadge(idx);
              const isWinner = idx === 0;

              const bestEq = team.equationsFound.reduce(
                (best, eq) =>
                  !best || eq.score > best.score ? eq : best,
                null as (typeof team.equationsFound)[number] | null
              );

              return (
                <div
                  key={team.id}
                  className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left transition-all ${
                    isWinner
                      ? 'bg-amber-400/10 border-amber-400 shadow-lg'
                      : 'bg-slate-800/80 border-slate-700/80'
                  }`}
                  style={!isWinner ? { borderColor: `${team.color}60` } : {}}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-2xl border flex items-center justify-center font-display font-black text-base shrink-0 shadow-sm ${badge.bg}`}
                    >
                      {badge.label}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{team.emoji}</span>
                        <span className="font-display font-black text-xl text-white">
                          {team.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold mt-0.5">
                        <span>{team.equationsFound.length} equations solved</span>
                        {bestEq && (
                          <span className="font-mono">
                            · Best: {bestEq.equation} (+{bestEq.score})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="self-end sm:self-center">
                    <span className="font-mono font-black text-2xl text-amber-300">
                      {team.score.toLocaleString()} pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onExitToMenu}
            className="w-full sm:w-auto min-h-[50px] px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Main Menu</span>
          </button>

          <button
            type="button"
            onClick={onNewMatchSetup}
            className="w-full sm:w-auto min-h-[50px] px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Edit Teams</span>
          </button>

          <button
            type="button"
            onClick={onRematch}
            className="w-full sm:flex-1 min-h-[50px] px-6 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-display font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 active:scale-95 transition-all cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Play Rematch!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
