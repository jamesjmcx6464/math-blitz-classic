import React from 'react';
import { Play } from 'lucide-react';
import { ClassroomMatchState } from '../types/game';

interface TurnTransitionModalProps {
  matchState: ClassroomMatchState;
  onStartTurn: () => void;
  onFinishMatchEarly: () => void;
  isWide: boolean;
}

export const TurnTransitionModal: React.FC<TurnTransitionModalProps> = ({
  matchState,
  onStartTurn,
  onFinishMatchEarly,
  isWide,
}) => {
  const { config, currentTeamIndex, currentRound, lastTurnSummary } = matchState;
  const nextTeam = config.teams[currentTeamIndex];

  const sortedTeams = [...config.teams].sort((a, b) => b.score - a.score);

  const getReasonLabel = (reason?: string) => {
    switch (reason) {
      case 'time_up':
        return 'Time expired!';
      case 'equations_met':
        return 'Equation goal reached!';
      case 'board_filled':
        return 'Pile reached the top!';
      case 'passed':
        return 'Turn passed';
      default:
        return 'Turn completed!';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md select-none text-slate-100 overflow-y-auto no-scrollbar">
      <div
        className={`w-full ${
          isWide ? 'max-w-2xl' : 'max-w-md'
        } bg-slate-900 border-4 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-center`}
        style={{ borderColor: nextTeam.color }}
      >
        {/* Top Banner */}
        <div className="py-2.5 px-4 bg-slate-950/80 border-b border-slate-800 text-xs sm:text-sm font-display font-black uppercase tracking-widest text-slate-400">
          Round {currentRound} of {config.totalRounds} · Make {config.target} ·{' '}
          {config.mathMode === 'operator' ? 'Operator (2×)' : 'Simple'}
        </div>

        <div className="p-5 sm:p-7 space-y-6">
          {/* Previous Turn Summary */}
          {lastTurnSummary ? (
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Previous Turn
                </span>
                <span className="text-xs font-semibold text-amber-400 font-mono">
                  {getReasonLabel(lastTurnSummary.reason)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{lastTurnSummary.teamEmoji}</span>
                  <span className="font-display font-black text-lg text-white">
                    {lastTurnSummary.teamName}
                  </span>
                </div>

                <span className="font-mono font-black text-xl text-emerald-400">
                  +{lastTurnSummary.pointsEarned.toLocaleString()} pts
                </span>
              </div>

              {lastTurnSummary.equationsFound.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {lastTurnSummary.equationsFound.map((eq) => (
                    <span
                      key={eq.id}
                      className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-slate-200 text-xs font-mono font-bold border border-slate-700"
                    >
                      {eq.equation} = {eq.target}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="py-2">
              <span className="text-xs font-black uppercase tracking-widest text-indigo-400 block mb-1">
                Classroom Match Ready
              </span>
              <h2 className="text-2xl sm:text-3xl font-display font-black text-white">
                Get ready for Round 1!
              </h2>
            </div>
          )}

          {/* NEXT TEAM CALLOUT */}
          <div
            className="p-6 sm:p-8 rounded-3xl border-4 shadow-xl text-center space-y-3 relative overflow-hidden"
            style={{
              borderColor: nextTeam.color,
              backgroundColor: `${nextTeam.color}18`,
            }}
          >
            <span
              className="px-3.5 py-1 rounded-full text-xs font-display font-black tracking-wider uppercase inline-block border shadow-sm"
              style={{
                backgroundColor: nextTeam.color,
                color: '#ffffff',
                borderColor: 'rgba(255,255,255,0.3)',
              }}
            >
              Up Next At The Board
            </span>

            <div className="flex items-center justify-center gap-3">
              <span className="text-5xl sm:text-6xl drop-shadow-md">{nextTeam.emoji}</span>
              <h1 className="text-3xl sm:text-4xl font-display font-black text-white tracking-tight">
                {nextTeam.name}
              </h1>
            </div>

            <div className="text-sm font-semibold text-slate-300">
              {config.turnCondition === 'timer' ? (
                <span>
                  {config.turnSeconds}s on the clock · Make {config.target}
                </span>
              ) : (
                <span>
                  Goal: Solve {config.turnEquationsTarget}{' '}
                  {config.turnEquationsTarget === 1 ? 'equation' : 'equations'} for {config.target}
                </span>
              )}
            </div>
          </div>

          {/* Mini Standings */}
          <div className="space-y-2">
            <span className="text-xs font-display font-black uppercase tracking-wider text-slate-400 block text-left">
              Class Standings
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {sortedTeams.map((team, idx) => {
                const isNext = team.id === nextTeam.id;
                return (
                  <div
                    key={team.id}
                    className={`px-3.5 py-2.5 rounded-xl border flex items-center justify-between text-sm transition-all ${
                      isNext
                        ? 'bg-slate-800/90 border-2 font-bold'
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-300'
                    }`}
                    style={isNext ? { borderColor: team.color } : {}}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 text-xs font-mono font-black text-slate-500">
                        #{idx + 1}
                      </span>
                      <span className="text-lg">{team.emoji}</span>
                      <span className="font-bold text-white">{team.name}</span>
                      {isNext && (
                        <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-indigo-500 text-white ml-1">
                          Playing Now
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-black text-base text-amber-400">
                      {team.score.toLocaleString()} pts
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={onStartTurn}
              className="w-full min-h-[64px] sm:min-h-[72px] px-6 rounded-2xl text-white font-display font-black text-xl sm:text-2xl flex items-center justify-center gap-3 shadow-2xl active:scale-[0.98] transition-all cursor-pointer border-2 border-white/20"
              style={{
                backgroundColor: nextTeam.color,
                boxShadow: `0 10px 25px -5px ${nextTeam.color}60`,
              }}
            >
              <Play className="w-7 h-7 fill-current" />
              <span>Start {nextTeam.name}&apos;s Turn!</span>
            </button>

            <button
              type="button"
              onClick={onFinishMatchEarly}
              className="min-h-[44px] px-4 text-xs font-semibold text-slate-400 hover:text-slate-200 underline cursor-pointer"
            >
              Wrap up class early &amp; see final results
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
