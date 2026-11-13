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
              <strong className="text-white block">Beginner, Easy, Normal &amp; Hard (Left to Right)</strong>
              <p className="mt-0.5 leading-relaxed">
                Equations are calculated <strong className="text-white">left to right</strong> as a running total (calculator style, no order of operations or parentheses). For example,{' '}
                <span className="font-mono text-slate-100">5 − 3 = 2 → 2 × 3 = 6</span>. Beginner, Easy, and Normal stay at 0 or above;{' '}
                <strong className="text-rose-300">Hard</strong> allows negative totals and negative number tiles.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-xl bg-sky-400 text-slate-950 font-black text-sm flex items-center justify-center shrink-0">
              2
            </span>
            <div>
              <strong className="text-white block">BEDMAS mode &amp; parentheses ( )</strong>
              <p className="mt-0.5 leading-relaxed">
                <strong className="text-white">BEDMAS</strong> difficulty uses real order of operations:{' '}
                <span className="font-mono font-bold text-sky-300">×</span> and{' '}
                <span className="font-mono font-bold text-sky-300">÷</span> before{' '}
                <span className="font-mono font-bold text-amber-300">+</span> and{' '}
                <span className="font-mono font-bold text-amber-300">−</span> (underlined in the bar), and allows negatives. Use the{' '}
                <span className="font-mono font-bold text-indigo-300">( )</span> button to wrap your current equation in parentheses—even more than once!
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-xl bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center shrink-0">
              3
            </span>
            <div>
              <strong className="text-white block">Whole-number division &amp; checking</strong>
              <p className="mt-0.5 leading-relaxed">
                In left-to-right modes, every <span className="font-mono font-bold text-sky-300">÷</span> step must divide evenly (for example,{' '}
                <span className="font-mono text-rose-300">3 ÷ 2 × 4</span> is invalid). In BEDMAS mode, division must give a whole number overall. Press{' '}
                <strong className="text-white">Enter</strong> to check your equation—feedback and points appear after you submit.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-xl bg-violet-400 text-slate-950 font-black text-sm flex items-center justify-center shrink-0">
              4
            </span>
            <div>
              <strong className="text-white block">Scoring &amp; game modes</strong>
              <p className="mt-0.5 leading-relaxed">
                Use 2–6 numbers to hit your target (<span className="font-mono text-slate-100">2–100</span>). Longer equations and{' '}
                <span className="font-mono text-emerald-300">× ÷</span> steps earn more points; cancelling pairs (<span className="font-mono text-slate-100">+3 −3</span>) score 0, while <span className="font-mono text-slate-100">1</span>s score normally. Pick{' '}
                <strong className="text-white">Simple mode</strong> for a chosen operator and matching number pairs, or{' '}
                <strong className="text-white">Equation mode</strong> for mixed operator tiles.
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
