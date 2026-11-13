import React, { useState, useEffect } from 'react';
import { Minus, Plus, Shuffle, Target, AlertTriangle } from 'lucide-react';
import { DifficultyLevel, MAX_TARGET, MIN_TARGET } from '../types/game';
import {
  clampTarget,
  isCompositeTarget,
  nearestCompositeTarget,
  pickRandomTarget,
  stepTarget,
} from '../utils/mathEngine';

interface TargetPickerProps {
  difficulty?: DifficultyLevel;
  target: number;
  onChangeTarget: (nextTarget: number) => void;
  requiresComposite?: boolean;
  compact?: boolean;
}

const STANDARD_PRESETS = [5, 10, 12, 24, 50];
const COMPOSITE_PRESETS = [6, 10, 12, 24, 36];

export const TargetPicker: React.FC<TargetPickerProps> = ({
  target,
  onChangeTarget,
  requiresComposite = false,
  compact = false,
}) => {
  const clamped = Math.max(MIN_TARGET, Math.min(MAX_TARGET, Math.round(target)));
  const [inputValue, setInputValue] = useState<string>(String(clamped));

  useEffect(() => {
    setInputValue(String(clamped));
  }, [clamped]);

  const isInvalidPrime = requiresComposite && !isCompositeTarget(clamped);
  const suggestedComposite = isInvalidPrime ? nearestCompositeTarget(clamped) : clamped;
  const presets = requiresComposite ? COMPOSITE_PRESETS : STANDARD_PRESETS;
  const minStepLimit = requiresComposite ? 4 : MIN_TARGET;

  const commitInput = () => {
    const parsed = Number(inputValue);
    if (!Number.isFinite(parsed) || inputValue.trim() === '') {
      setInputValue(String(clamped));
      return;
    }
    const next = clampTarget(parsed, false);
    onChangeTarget(next);
    setInputValue(String(next));
  };

  return (
    <div
      className={`space-y-2 ${
        compact ? '' : 'p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display font-black text-[11px] uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Target className="w-4 h-4 text-amber-400" />
          <span>Target Number</span>
        </span>
        <span className="text-[11px] font-mono font-semibold text-slate-400 tabular-nums">
          Range {MIN_TARGET}–{MAX_TARGET}
        </span>
      </div>

      {/* Stepper + Direct Input + Random */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChangeTarget(stepTarget(clamped, -1, requiresComposite))}
          disabled={clamped <= minStepLimit}
          aria-label="Decrease target"
          className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95 shrink-0"
        >
          <Minus className="w-5 h-5" />
        </button>

        <label className="flex-1 min-h-[44px] rounded-xl bg-slate-900 border-2 border-amber-400/50 focus-within:border-amber-400 flex items-center justify-center gap-1.5 px-3 cursor-text">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 shrink-0">
            Make
          </span>
          <input
            type="number"
            min={MIN_TARGET}
            max={MAX_TARGET}
            inputMode="numeric"
            value={inputValue}
            onChange={(e) => {
              const raw = e.target.value;
              setInputValue(raw);
              const parsed = Number(raw);
              if (Number.isFinite(parsed) && parsed >= MIN_TARGET && parsed <= MAX_TARGET) {
                onChangeTarget(Math.round(parsed));
              }
            }}
            onBlur={commitInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitInput();
                (e.currentTarget as HTMLInputElement).blur();
              }
            }}
            aria-label="Target number"
            className="w-16 bg-transparent text-center font-display font-black text-2xl text-white font-mono tabular-nums focus:outline-none"
          />
        </label>

        <button
          type="button"
          onClick={() => onChangeTarget(stepTarget(clamped, 1, requiresComposite))}
          disabled={clamped >= MAX_TARGET}
          aria-label="Increase target"
          className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => onChangeTarget(pickRandomTarget(requiresComposite))}
          aria-label="Random target"
          className="min-h-[44px] px-3 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 shrink-0"
        >
          <Shuffle className="w-4 h-4" />
          <span className="hidden min-[400px]:inline">Random</span>
        </button>
      </div>

      {isInvalidPrime && (
        <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-400/50 flex items-center justify-between gap-2 text-xs">
          <span className="text-amber-200 font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{clamped} is prime — × needs factors &gt; 1</span>
          </span>
          <button
            type="button"
            onClick={() => onChangeTarget(suggestedComposite)}
            className="min-h-[44px] px-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black cursor-pointer shrink-0"
          >
            Use {suggestedComposite}
          </button>
        </div>
      )}

      {/* Preset Chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {presets.map((val) => {
          const isSelected = clamped === val;
          return (
            <button
              key={val}
              type="button"
              onClick={() => onChangeTarget(val)}
              className={`min-h-[44px] min-w-[44px] flex-1 px-2 rounded-xl border-2 font-mono font-black text-sm transition-all cursor-pointer active:scale-95 tabular-nums ${
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
