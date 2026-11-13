import React from 'react';
import { Users, X, SkipForward } from 'lucide-react';
import { ClassroomMatchState } from '../types/game';

interface ClassroomScoreboardModalProps {
  matchState: ClassroomMatchState;
  onClose: () => void;
  onPassTurn: () => void;
  onFinishMatchEarly: () => void;
  isWide: boolean;
}

export const ClassroomScoreboardModal: React.FC<ClassroomScoreboardModalProps> = ({
  matchState,
  onClose,
  onPassTurn,
  onFinishMatchEarly,
  isWide,
}) => {
  const { config, currentTeamIndex, currentRound } = matchState;
  const currentTeam = config.teams[currentTeamIndex];
  const sortedTeams = [...config.teams].sort((a, b) => b.score - a.score);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md select-none text-slate-100 overflow-y-auto no-scrollbar">
      <div
        className={`w-full ${
          isWide ? 'max-w-xl' : 'max-w-md'
        } bg-slate-900 border-2 border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-left`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-indigo-400" />
            <h3 className="font-display font-black text-xl text-white">
              Class Scoreboard
            </h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300">
              R{currentRound}/{config.totalRounds} · Make {config.target}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Standings List */}
        <div className="p-4 sm:p-5 space-y-2.5 overflow-y-auto max-h-[55vh] no-scrollbar flex-1">
          {sortedTeams.map((team, idx) => {
            const isTurn = team.id === currentTeam.id;
            return (
              <div
                key={team.id}
                className={`p-3.5 rounded-2xl border-2 flex items-center justify-between gap-3 ${
                  isTurn
                    ? 'bg-slate-800/90 shadow-md font-bold'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-300'
                }`}
                style={{ borderColor: isTurn ? team.color : `${team.color}40` }}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-sm font-mono font-black text-slate-500">
                    #{idx + 1}
                  </span>
                  <span className="text-2xl">{team.emoji}</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-base text-white">{team.name}</span>
                      {isTurn && (
                        <span
                          className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: team.color }}
                        >
                          At The Board
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {team.equationsFound.length}{' '}
                      {team.equationsFound.length === 1 ? 'equation' : 'equations'} solved
                    </span>
                  </div>
                </div>

                <span className="font-mono font-black text-xl text-amber-300">
                  {team.score.toLocaleString()} pts
                </span>
              </div>
            );
          })}
        </div>

        {/* Teacher Controls Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                onClose();
                onPassTurn();
              }}
              className="flex-1 sm:flex-initial min-h-[46px] px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <SkipForward className="w-4 h-4 text-amber-400" />
              <span>Pass Turn</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onFinishMatchEarly();
              }}
              className="flex-1 sm:flex-initial min-h-[46px] px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>End Match</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[46px] px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm cursor-pointer"
          >
            Resume Turn
          </button>
        </div>
      </div>
    </div>
  );
};
