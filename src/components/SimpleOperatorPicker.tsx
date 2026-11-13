import React from 'react';
import { DifficultyLevel, MathOperator } from '../types/game';
import { ALL_OPERATORS, getAllowedOperators } from '../utils/mathEngine';

interface SimpleOperatorPickerProps {
  difficulty: DifficultyLevel;
  value: MathOperator;
  onChange: (op: MathOperator) => void;
  compact?: boolean;
}

const OP_META: Record<
  MathOperator,
  { name: string; activeClass: string; idleClass: string; minDiffLabel?: string }
> = {
  '+': {
    name: 'Add',
    activeClass: 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md shadow-emerald-500/25',
    idleClass: 'bg-slate-800/80 hover:bg-slate-800 text-emerald-300 border-slate-700',
  },
  '−': {
    name: 'Sub',
    activeClass: 'bg-rose-500 text-white border-rose-300 shadow-md shadow-rose-500/25',
    idleClass: 'bg-slate-800/80 hover:bg-slate-800 text-rose-300 border-slate-700',
  },
  '×': {
    name: 'Mul',
    activeClass: 'bg-violet-500 text-white border-violet-300 shadow-md shadow-violet-500/25',
    idleClass: 'bg-slate-800/80 hover:bg-slate-800 text-violet-300 border-slate-700',
    minDiffLabel: 'Easy+',
  },
  '÷': {
    name: 'Div',
    activeClass: 'bg-orange-500 text-slate-950 border-orange-300 shadow-md shadow-orange-500/25',
    idleClass: 'bg-slate-800/80 hover:bg-slate-800 text-orange-300 border-slate-700',
  },
};

export const SimpleOperatorPicker: React.FC<SimpleOperatorPickerProps> = ({
  difficulty,
  value,
  onChange,
  compact = false,
}) => {
  const allowed = getAllowedOperators(difficulty);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-display font-black uppercase tracking-wider text-slate-400">
          Round Operator (Auto-Inserted)
        </span>
        <span className="text-[11px] font-semibold text-slate-400">
          Used all round
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {ALL_OPERATORS.map((op) => {
          const isAllowed = allowed.includes(op);
          const isSelected = value === op;
          const meta = OP_META[op];

          return (
            <button
              key={op}
              type="button"
              disabled={!isAllowed}
              onClick={() => isAllowed && onChange(op)}
              aria-label={`Select operator ${meta.name} (${op})`}
              aria-pressed={isSelected}
              className={`min-h-[44px] ${
                compact ? 'py-1' : 'py-1.5'
              } px-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                !isAllowed
                  ? 'bg-slate-900/50 border-slate-800/70 text-slate-600 cursor-not-allowed'
                  : isSelected
                  ? `${meta.activeClass} cursor-pointer active:scale-95`
                  : `${meta.idleClass} cursor-pointer active:scale-95`
              }`}
            >
              <span className="font-display font-black text-lg leading-none">{op}</span>
              <span className="text-[10px] font-bold leading-tight mt-0.5 opacity-85">
                {!isAllowed && meta.minDiffLabel ? meta.minDiffLabel : meta.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
