import React, { useState, useMemo } from 'react';
import { X, BookOpen, Star, Flame, Hash } from 'lucide-react';
import { EquationEntry } from '../types/game';

interface WordHistoryModalProps {
  equationEntries: EquationEntry[];
  onClose: () => void;
}

type SortOption = 'recent' | 'score' | 'length';

export const WordHistoryModal: React.FC<WordHistoryModalProps> = ({
  equationEntries,
  onClose,
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  const totalPoints = useMemo(
    () => equationEntries.reduce((sum, entry) => sum + entry.score, 0),
    [equationEntries]
  );

  const bestEquation = useMemo(() => {
    if (equationEntries.length === 0) return '-';
    return equationEntries.reduce(
      (best, entry) => (entry.score > best.score ? entry : best),
      equationEntries[0]
    ).equation;
  }, [equationEntries]);

  const sortedList = useMemo(() => {
    const list = [...equationEntries];
    if (sortBy === 'recent') {
      return list.reverse();
    }
    if (sortBy === 'score') {
      return list.sort((a, b) => b.score - a.score || b.timestamp - a.timestamp);
    }
    return list.sort((a, b) => b.numberCount - a.numberCount || b.score - a.score);
  }, [equationEntries, sortBy]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm select-none animate-fade-in">
      <div className="w-full max-w-lg max-h-[92vh] bg-white border-4 border-amber-300 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b-2 border-amber-200 flex items-center justify-between bg-amber-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-black shadow-sm">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-black text-slate-900 leading-tight">
                My Equations
              </h2>
              <p className="text-sm font-medium text-slate-600">
                {equationEntries.length}{' '}
                {equationEntries.length === 1 ? 'equation' : 'equations'} solved this game
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-2xl bg-white hover:bg-slate-100 border-2 border-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
            aria-label="Close equation history"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-left">
          {/* QUICK STATS CARDS */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3">
              <span className="text-xs uppercase font-bold text-slate-500 flex items-center justify-center gap-1">
                <Hash className="w-3.5 h-3.5 text-amber-600" /> Solved
              </span>
              <span className="text-lg sm:text-xl font-display font-black text-amber-950 mt-0.5 block">
                {equationEntries.length}
              </span>
            </div>

            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3">
              <span className="text-xs uppercase font-bold text-slate-500 flex items-center justify-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" /> Points
              </span>
              <span className="text-lg sm:text-xl font-display font-black text-amber-950 mt-0.5 block">
                {totalPoints.toLocaleString()}
              </span>
            </div>

            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3">
              <span className="text-xs uppercase font-bold text-slate-500 flex items-center justify-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-500" /> Best
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-slate-900 mt-0.5 block truncate">
                {bestEquation}
              </span>
            </div>
          </div>

          {/* SORT CONTROLS */}
          {equationEntries.length > 0 && (
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase block mb-1.5">
                Sort equations by:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'recent' as const, label: 'Newest' },
                  { id: 'score' as const, label: 'Most points' },
                  { id: 'length' as const, label: 'Most numbers' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSortBy(s.id)}
                    className={`min-h-[48px] px-2 rounded-xl font-bold text-sm border-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 ${
                      sortBy === s.id
                        ? 'bg-amber-400 border-amber-500 text-amber-950 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* EQUATIONS LIST */}
          <div className="space-y-2">
            <span className="text-base font-display font-black text-slate-900 block">
              Solved Equations
            </span>

            {equationEntries.length === 0 ? (
              <div className="py-8 text-center text-slate-500 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 p-6">
                <BookOpen className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-50" />
                <p className="text-base font-bold text-slate-700">
                  No equations yet. Tap tiles and press Enter!
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[36vh] overflow-y-auto pr-1">
                {sortedList.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-black text-base sm:text-lg text-slate-900 tracking-wide truncate">
                        {entry.equation} = {entry.target}
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-slate-500 shrink-0">
                        ({entry.numberCount} nums)
                      </span>
                    </div>

                    <span className="px-3 py-1 rounded-xl bg-emerald-100 border border-emerald-400 text-emerald-950 font-black text-sm font-mono shrink-0">
                      +{entry.score.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t-2 border-slate-200 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[56px] px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-display font-black text-base shadow-md transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
