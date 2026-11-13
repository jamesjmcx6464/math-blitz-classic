import React from 'react';
import { Minus, Plus, Shuffle, Target } from 'lucide-react';
import { DifficultyLevel, DIFFICULTY_PRESETS } from '../types/game';
import { clampTarget, pickRandomTarget } from '../utils/mathEngine';

interface TargetPickerProps {
  difficulty: DifficultyLevel;
  target: number;
  onChangeTarget: (nextTarget: number) => void;
  compact?: boolean;
}

export const TargetPicker: React.FC<TargetPickerProps> = ({
  difficulty,
  target,
  onChangeTarget,
  compact = false,
}) => {
  const { min, max, presets } = DIFFICULTY_PRESETS[difficulty].targetRange;
  const clamped = clampTarget(difficulty, target);

  return (
    <div className={`space-y-2.5 ${compact ? '' : 'p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-display font-black text-xs uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Target className="w-4 h-4 text-amber-400" />
          <span>Target Number</span>
        </span>
        <span className="text-xs font-mono font-semibold text-slate-400 tabular-nums">
          Range {min}–{max}
        </span>
      </div>

      {/* Stepper + Random */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChangeTarget(clampTarget(difficulty, clamped - 1))}
          disabled={clamped <= min}
          aria-label="Decrease target"
          className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
        >
          <Minus className="w-5 h-5" />
        </button>

        <div className="flex-1 min-h-[44px] rounded-xl bg-slate-900 border-2 border-amber-400/50 flex items-center justify-center gap-2 px-3">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Make</span>
          <span className="font-display font-black text-2xl text-white font-mono tabular-nums">
            {clamped}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onChangeTarget(clampTarget(difficulty, clamped + 1))}
          disabled={clamped >= max}
          aria-label="Increase target"
          className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
        >
          <Plus className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => onChangeTarget(pickRandomTarget(difficulty))}
          aria-label="Random target"
          className="min-h-[44px] px-3 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 shrink-0"
        >
          <Shuffle className="w-4 h-4" />
          <span>Random</span>
        </button>
      </div>

      {/* Preset Chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {presets.map((val) => {
          const isSelected = clamped === val;
          return (
            <button
              key={val}
              type="button"
              onClick={() => onChangeTarget(val)}
              className={`min-h-[44px] min-w-[44px] flex-1 px-2.5 rounded-xl border-2 font-mono font-black text-sm transition-all cursor-pointer active:scale-95 tabular-nums ${
                isSelected
                  ? 'bg-amber-400 border-amber-300 text-slate-950 shadow-sm'
                  : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800'
              }`}
            >
              {val}
            </button>
          );
        })}
      </div>
    </div>
  );
};
