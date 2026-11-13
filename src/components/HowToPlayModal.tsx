import React from 'react';
import { X } from 'lucide-react';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="w-full max-w-md max-h-[90vh] bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col overflow-hidden text-left">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <h3 className="font-display font-black text-xl text-white">
            How to play Math Blitz Classic
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
            aria-label="Close rules"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-sm text-slate-300 font-medium">
          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center shrink-0">
              1
            </span>
            <div>
              <strong className="text-white block">Order of operations</strong>
              <p className="mt-0.5 leading-relaxed">
                <span className="font-mono font-bold text-sky-300">×</span> and{' '}
                <span className="font-mono font-bold text-sky-300">÷</span> are solved before{' '}
                <span className="font-mono font-bold text-amber-300">+</span> and{' '}
                <span className="font-mono font-bold text-amber-300">−</span>, left to right (no brackets).{' '}
                <span className="underline decoration-sky-400 decoration-2 underline-offset-4">
                  × ÷ groups are underlined
                </span>{' '}
                in the equation bar.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-xl bg-sky-400 text-slate-950 font-black text-sm flex items-center justify-center shrink-0">
              2
            </span>
            <div>
              <strong className="text-white block">Whole-number division only</strong>
              <p className="mt-0.5 leading-relaxed">
                Every <span className="font-mono font-bold text-sky-300">÷</span> step must divide evenly with no remainder in evaluation order (for example,{' '}
                <span className="font-mono text-rose-300">3 ÷ 2 × 4</span> is not allowed). Beginner, Easy, and Normal cannot dip below 0; Hard and Nightmare allow negative intermediates (shown in red).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-xl bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center shrink-0">
              3
            </span>
            <div>
              <strong className="text-white block">Scoring, 1s &amp; cancelling steps</strong>
              <p className="mt-0.5 leading-relaxed">
                Use 2–6 numbers to hit the target. Longer equations earn more points, and{' '}
                <span className="font-mono text-emerald-300">× ÷</span> steps add a bonus.{' '}
                <strong className="text-amber-200">Null tiles score 0</strong> and don&apos;t count toward the 2-number minimum: any{' '}
                <span className="font-mono text-slate-100">1</span> next to{' '}
                <span className="font-mono text-slate-100">×</span> or{' '}
                <span className="font-mono text-slate-100">÷</span>, and cancelling pairs like{' '}
                <span className="font-mono text-slate-100">+3 −3</span> or{' '}
                <span className="font-mono text-slate-100">×4 ÷4</span>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-xl bg-violet-400 text-slate-950 font-black text-sm flex items-center justify-center shrink-0">
              4
            </span>
            <div>
              <strong className="text-white block">Simple vs. Operator mode</strong>
              <p className="mt-0.5 leading-relaxed">
                In <strong className="text-white">Simple mode</strong>, only numbers fall—tap the operator selector buttons (or press{' '}
                <span className="font-mono text-slate-100">+ - * /</span>) to choose which operator gets inserted before your <em>next</em> number. In{' '}
                <strong className="text-white">Operator mode</strong>, operator tiles fall on the board too, and your score is doubled!
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[48px] rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-black text-base shadow-md cursor-pointer transition-all shrink-0"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};
