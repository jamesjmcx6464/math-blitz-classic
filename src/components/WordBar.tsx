import React, { useRef, useState, useEffect, useLayoutEffect, useMemo } from 'react';
import {
  HexTile,
  EquationEntry,
  MathMode,
  MathOperator,
  DifficultyLevel,
} from '../types/game';
import {
  allowsNegativeIntermediates,
  computeLeftToRightSteps,
  evaluateEquation,
  formatChainedStepsString,
  getEvaluationMode,
  getLeftToRightWrapCounts,
  getMulDivGroupRanges,
  normalizeParenWraps,
} from '../utils/mathEngine';
import { Check, RotateCcw, Delete } from 'lucide-react';

interface WordBarProps {
  selectedTiles: HexTile[];
  simpleOperator: MathOperator;
  mathMode: MathMode;
  difficulty: DifficultyLevel;
  target: number;
  parenWraps?: number[];
  onWrapParens?: () => void;
  onUnwrapParen?: (wrapEndIdx: number) => void;
  onClear: () => void;
  onSubmit: () => void;
  onRemoveTile: (tile: HexTile) => void;
  isShaking: boolean;
  errorMessage: string | null;
  lastFoundEquation?: EquationEntry | null;
}

const PRAISES = ['Nice!', 'Great math!', 'Spot on!', 'Sharp!', 'Awesome!'];

const OP_BADGE_STYLES: Record<MathOperator, string> = {
  '+': 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50',
  '−': 'bg-rose-500/20 text-rose-300 border-rose-400/50',
  '×': 'bg-violet-500/20 text-violet-300 border-violet-400/50',
  '÷': 'bg-orange-500/20 text-orange-300 border-orange-400/50',
};

const OP_NAMES: Record<MathOperator, string> = {
  '+': 'Addition',
  '−': 'Subtraction',
  '×': 'Multiplication',
  '÷': 'Division',
};

export const WordBar: React.FC<WordBarProps> = ({
  selectedTiles,
  simpleOperator,
  mathMode,
  difficulty,
  target,
  parenWraps = [],
  onWrapParens,
  onUnwrapParen,
  onClear,
  onSubmit,
  onRemoveTile,
  isShaking,
  errorMessage,
  lastFoundEquation = null,
}) => {
  const evalMode = getEvaluationMode(difficulty);
  const allowNegative = allowsNegativeIntermediates(difficulty);

  // Extract numbers and operators from current selection
  const { nums, ops, hasSyntaxMismatch } = useMemo(() => {
    if (mathMode === 'simple') {
      const n = selectedTiles.map((t) => t.tile.numValue ?? 0);
      return {
        nums: n,
        ops: new Array<MathOperator>(Math.max(0, n.length - 1)).fill(simpleOperator),
        hasSyntaxMismatch: false,
      };
    }

    const n: number[] = [];
    const o: MathOperator[] = [];
    let mismatch = false;
    for (let i = 0; i < selectedTiles.length; i++) {
      const t = selectedTiles[i].tile;
      if (i % 2 === 0) {
        if (t.kind === 'number' && t.numValue !== undefined) n.push(t.numValue);
        else mismatch = true;
      } else {
        if (t.kind === 'operator' && t.opValue) o.push(t.opValue);
        else mismatch = true;
      }
    }
    return { nums: n, ops: o, hasSyntaxMismatch: mismatch };
  }, [mathMode, selectedTiles, simpleOperator]);

  const completeOps = useMemo(
    () => ops.slice(0, Math.max(0, nums.length - 1)),
    [ops, nums.length]
  );

  // Running total / current value (neutral display; never shows target match or score before submit)
  const ltrState = useMemo(() => {
    if (evalMode !== 'left-to-right' || hasSyntaxMismatch) {
      return {
        steps: [],
        runningTotal: null as number | null,
        error: null as string | null,
        wentNegative: false,
      };
    }
    return computeLeftToRightSteps(nums, completeOps, allowNegative);
  }, [evalMode, hasSyntaxMismatch, nums, completeOps, allowNegative]);

  const ltrWraps = useMemo(() => {
    if (evalMode !== 'left-to-right' || hasSyntaxMismatch || nums.length < 2) {
      return { openAtStart: 0, closeAfterNum: [] as number[] };
    }
    return getLeftToRightWrapCounts(completeOps);
  }, [evalMode, hasSyntaxMismatch, nums.length, completeOps]);

  const activeBedmasWraps = useMemo(() => {
    if (evalMode !== 'bedmas' || hasSyntaxMismatch) return [];
    return normalizeParenWraps(parenWraps, nums.length);
  }, [evalMode, hasSyntaxMismatch, parenWraps, nums.length]);

  const bedmasCloseCountMap = useMemo(() => {
    const m = new Map<number, number>();
    for (const w of activeBedmasWraps) {
      m.set(w, (m.get(w) ?? 0) + 1);
    }
    return m;
  }, [activeBedmasWraps]);

  const bedmasPreview = useMemo(() => {
    if (evalMode !== 'bedmas' || hasSyntaxMismatch || nums.length === 0) {
      return { value: null as number | null, error: null as string | null };
    }
    if (nums.length === 1) {
      return { value: nums[0], error: null };
    }
    const res = evaluateEquation(nums, completeOps, {
      difficulty,
      mathMode,
      target,
      parenWraps: activeBedmasWraps,
    });
    return {
      value: res.result,
      error: res.isValidMath ? null : res.error,
    };
  }, [
    evalMode,
    hasSyntaxMismatch,
    nums,
    completeOps,
    difficulty,
    mathMode,
    target,
    activeBedmasWraps,
  ]);

  const runningTotalDisplay = useMemo(() => {
    if (selectedTiles.length === 0 || hasSyntaxMismatch) {
      return { text: '—', isNegative: false, isError: false };
    }
    if (evalMode === 'left-to-right') {
      if (ltrState.error && ltrState.runningTotal === null) {
        return { text: 'err', isNegative: false, isError: true };
      }
      if (ltrState.runningTotal === null) {
        return { text: '—', isNegative: false, isError: false };
      }
      return {
        text: String(ltrState.runningTotal),
        isNegative: ltrState.runningTotal < 0,
        isError: Boolean(ltrState.error),
      };
    }
    if (bedmasPreview.value !== null) {
      return {
        text: String(bedmasPreview.value),
        isNegative: bedmasPreview.value < 0,
        isError: false,
      };
    }
    return {
      text: bedmasPreview.error ? 'err' : '—',
      isNegative: false,
      isError: Boolean(bedmasPreview.error),
    };
  }, [selectedTiles.length, hasSyntaxMismatch, evalMode, ltrState, bedmasPreview]);

  const mulDivGroupRanges = useMemo(
    () =>
      evalMode === 'bedmas' && !hasSyntaxMismatch
        ? getMulDivGroupRanges(completeOps)
        : [],
    [evalMode, hasSyntaxMismatch, completeOps]
  );

  const isInMulDivGroup = (numIdx: number): boolean => {
    return mulDivGroupRanges.some(
      (r) => numIdx >= r.startNumIdx && numIdx <= r.endNumIdx
    );
  };

  const isOpInMulDivGroup = (opIdx: number): boolean => {
    return (
      evalMode === 'bedmas' &&
      opIdx < ops.length &&
      (ops[opIdx] === '×' || ops[opIdx] === '÷')
    );
  };

  const canWrapParens =
    evalMode === 'bedmas' &&
    !hasSyntaxMismatch &&
    nums.length >= 2 &&
    nums.length === ops.length + 1 &&
    !activeBedmasWraps.includes(nums.length - 1);

  const canSubmit = selectedTiles.length > 0 && nums.length >= 2;

  // Post-submission success flash only
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const lastFoundIdRef = useRef<string | null>(null);
  const isFirstRenderRef = useRef<boolean>(true);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      if (lastFoundEquation) lastFoundIdRef.current = lastFoundEquation.id;
      return;
    }

    if (lastFoundEquation && lastFoundEquation.id !== lastFoundIdRef.current) {
      lastFoundIdRef.current = lastFoundEquation.id;
      const praise = PRAISES[Math.floor(Math.random() * PRAISES.length)];
      setSuccessMessage(
        `${praise} ${lastFoundEquation.equation} = ${lastFoundEquation.target} (+${lastFoundEquation.score})`
      );
      const timer = setTimeout(() => setSuccessMessage(null), 2200);
      return () => clearTimeout(timer);
    }
  }, [lastFoundEquation]);

  // Dynamic scale calculation for long equations
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const computeScale = () => {
      if (!containerRef.current || !contentRef.current) {
        setScale(1);
        return;
      }
      const containerWidth = containerRef.current.clientWidth;
      const contentWidth = contentRef.current.scrollWidth;
      if (containerWidth > 0 && contentWidth > 0 && contentWidth > containerWidth - 8) {
        setScale(Math.max(0.55, (containerWidth - 8) / contentWidth));
      } else {
        setScale(1);
      }
    };

    computeScale();
    const observer = new ResizeObserver(computeScale);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [selectedTiles, simpleOperator, activeBedmasWraps, difficulty]);

  const openParenCount =
    evalMode === 'bedmas' ? activeBedmasWraps.length : ltrWraps.openAtStart;

  const renderClosingParens = (numIdx: number) => {
    if (evalMode === 'bedmas') {
      const count = bedmasCloseCountMap.get(numIdx) ?? 0;
      if (count <= 0) return null;
      return (
        <button
          type="button"
          onClick={() => onUnwrapParen?.(numIdx)}
          title="Tap to remove parenthesis level"
          aria-label="Remove parenthesis wrap"
          className="px-1.5 min-h-[38px] rounded-lg bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-400/50 text-indigo-200 font-mono font-black text-xl flex items-center justify-center cursor-pointer transition-colors shrink-0"
        >
          {')'.repeat(count)}
        </button>
      );
    }

    const count = ltrWraps.closeAfterNum[numIdx] ?? 0;
    if (count <= 0) return null;
    return (
      <span className="px-0.5 font-mono font-black text-xl text-slate-300 select-none shrink-0">
        {')'.repeat(count)}
      </span>
    );
  };

  const renderEquationTokens = () => {
    if (mathMode === 'simple') {
      return (
        <div
          ref={containerRef}
          className="flex-1 min-w-0 h-full flex items-center justify-center overflow-hidden"
        >
          <div
            style={{
              transform: scale < 1 ? `scale(${scale})` : undefined,
              transformOrigin: 'center center',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            className="transition-transform duration-100 ease-out"
          >
            <div ref={contentRef} className="flex flex-nowrap items-center justify-center gap-1">
              {openParenCount > 0 && (
                <span
                  className={`px-0.5 font-mono font-black text-xl select-none shrink-0 ${
                    evalMode === 'bedmas' ? 'text-indigo-300' : 'text-slate-300'
                  }`}
                >
                  {'('.repeat(openParenCount)}
                </span>
              )}

              {selectedTiles.map((tile, idx) => {
                const isUnderlined = isInMulDivGroup(idx);
                const precedingOp = idx > 0 ? ops[idx - 1] : null;
                const opUnderlined = idx > 0 && isOpInMulDivGroup(idx - 1);
                const isNeg = (tile.tile.numValue ?? 0) < 0;
                const labelText =
                  isNeg && idx > 0 ? `(${tile.tile.display})` : tile.tile.display;

                return (
                  <React.Fragment key={`eq-tile-${tile.id}-${idx}`}>
                    {precedingOp && (
                      <span
                        className={`px-1.5 py-1 text-lg sm:text-xl font-mono font-black ${
                          opUnderlined
                            ? 'text-sky-300 border-b-2 border-sky-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {precedingOp}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveTile(tile)}
                      title="Tap to remove"
                      aria-label={`Remove ${tile.tile.display}`}
                      className={`relative min-w-[44px] h-[44px] px-2 rounded-xl font-display font-black text-xl border-2 shadow-md flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer animate-letter-spring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 shrink-0 tabular-nums ${
                        isNeg
                          ? 'bg-rose-200 text-rose-950 border-rose-400'
                          : isUnderlined
                          ? 'bg-amber-400 text-amber-950 border-sky-400 ring-2 ring-sky-400/50'
                          : 'bg-amber-400 text-amber-950 border-amber-300'
                      }`}
                    >
                      <span className={isUnderlined ? 'underline decoration-2 underline-offset-2' : ''}>
                        {labelText}
                      </span>
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-900/90 text-white text-[10px] font-black flex items-center justify-center pointer-events-none">
                        ✕
                      </span>
                    </button>
                    {renderClosingParens(idx)}
                  </React.Fragment>
                );
              })}

              {selectedTiles.length > 0 && selectedTiles.length < 6 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-lg bg-slate-800/80 border border-dashed border-slate-600 text-slate-400 font-mono font-black text-sm">
                  {simpleOperator} ?
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Equation Mode: render selected number & operator tiles
    return (
      <div
        ref={containerRef}
        className="flex-1 min-w-0 h-full flex items-center justify-center overflow-hidden"
      >
        <div
          style={{
            transform: scale < 1 ? `scale(${scale})` : undefined,
            transformOrigin: 'center center',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          className="transition-transform duration-100 ease-out"
        >
          <div ref={contentRef} className="flex flex-nowrap items-center justify-center gap-1">
            {openParenCount > 0 && (
              <span
                className={`px-0.5 font-mono font-black text-xl select-none shrink-0 ${
                  evalMode === 'bedmas' ? 'text-indigo-300' : 'text-slate-300'
                }`}
              >
                {'('.repeat(openParenCount)}
              </span>
            )}

            {selectedTiles.map((tile, idx) => {
              const isNum = tile.tile.kind === 'number';
              const numIdx = Math.floor(idx / 2);
              const opIdx = Math.floor((idx - 1) / 2);
              const isUnderlined =
                !hasSyntaxMismatch && (isNum ? isInMulDivGroup(numIdx) : isOpInMulDivGroup(opIdx));
              const isNeg = isNum && (tile.tile.numValue ?? 0) < 0;
              const labelText =
                isNeg && idx > 0 ? `(${tile.tile.display})` : tile.tile.display;

              return (
                <React.Fragment key={`eq-tile-${tile.id}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => onRemoveTile(tile)}
                    title="Tap to remove"
                    aria-label={`Remove ${tile.tile.display}`}
                    className={`relative min-w-[44px] h-[44px] px-2 rounded-xl font-display font-black text-xl border-2 shadow-md flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer animate-letter-spring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 shrink-0 tabular-nums ${
                      !isNum
                        ? 'bg-slate-800 text-sky-300 border-sky-400/60'
                        : isNeg
                        ? 'bg-rose-200 text-rose-950 border-rose-400'
                        : isUnderlined
                        ? 'bg-amber-400 text-amber-950 border-sky-400 ring-2 ring-sky-400/50'
                        : 'bg-amber-400 text-amber-950 border-amber-300'
                    }`}
                  >
                    <span className={isUnderlined ? 'underline decoration-2 underline-offset-2' : ''}>
                      {labelText}
                    </span>
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-900/90 text-white text-[10px] font-black flex items-center justify-center pointer-events-none">
                      ✕
                    </span>
                  </button>
                  {isNum && !hasSyntaxMismatch && renderClosingParens(numIdx)}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderMessage = () => {
    if (errorMessage) {
      return (
        <div
          className={`px-2.5 py-0.5 rounded-lg bg-rose-950/90 border border-rose-400/60 text-rose-200 font-bold text-xs sm:text-sm text-center truncate max-w-full leading-tight ${
            isShaking ? 'motion-safe:animate-shake' : ''
          }`}
        >
          {errorMessage}
        </div>
      );
    }
    if (successMessage) {
      return (
        <div className="px-2.5 py-0.5 rounded-lg bg-emerald-900/80 border border-emerald-400/50 text-emerald-200 font-bold text-xs sm:text-sm text-center truncate max-w-full leading-tight">
          {successMessage}
        </div>
      );
    }
    if (selectedTiles.length === 0) {
      return (
        <span className="text-slate-400 text-xs sm:text-sm font-medium truncate max-w-full leading-tight">
          {mathMode === 'simple'
            ? `Tap numbers (${simpleOperator} auto-inserted) to make ${target}`
            : `Tap number, operator, number to make ${target}`}
        </span>
      );
    }
    if (evalMode === 'left-to-right' && ltrState.error && !hasSyntaxMismatch) {
      return (
        <span className="text-rose-300 text-xs sm:text-sm font-semibold truncate max-w-full leading-tight">
          {ltrState.error}
        </span>
      );
    }
    if (evalMode === 'left-to-right' && ltrState.steps.length > 0 && !hasSyntaxMismatch) {
      return (
        <span className="text-slate-300 text-xs sm:text-sm font-mono font-semibold truncate max-w-full leading-tight tabular-nums">
          {formatChainedStepsString(ltrState.steps)}
        </span>
      );
    }
    if (nums.length < 2) {
      return (
        <span className="text-slate-300 text-xs sm:text-sm font-semibold truncate max-w-full leading-tight">
          {mathMode === 'operator' && selectedTiles.length === 1
            ? 'Pick an operator next'
            : 'Pick 1 more number'}
        </span>
      );
    }
    return (
      <span className="text-slate-300 text-xs sm:text-sm font-semibold truncate max-w-full leading-tight">
        {evalMode === 'bedmas'
          ? `Press Enter to check for ${target} (or wrap with ( ))`
          : `Press Enter to check for ${target}`}
      </span>
    );
  };

  const renderTargetBadge = () => (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className="px-2 py-1 rounded-xl bg-slate-800 border border-slate-700 flex items-center gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
          Make
        </span>
        <span className="font-display font-black text-lg text-white font-mono tabular-nums leading-none">
          {target}
        </span>
      </div>

      <div
        className={`px-2 py-1 rounded-xl border flex items-center gap-1 ${
          runningTotalDisplay.isError || runningTotalDisplay.isNegative
            ? 'bg-rose-950/60 border-rose-500/50 text-rose-300'
            : 'bg-slate-800/90 border-slate-700 text-sky-200'
        }`}
        title={evalMode === 'bedmas' ? 'Current equation value' : 'Running total (left to right)'}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          =
        </span>
        <span className="font-display font-black text-base font-mono tabular-nums leading-none min-w-[18px] text-center">
          {runningTotalDisplay.text}
        </span>
      </div>
    </div>
  );

  const renderButtons = () => (
    <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto h-[48px]">
      {evalMode === 'bedmas' && (
        <button
          type="button"
          onClick={onWrapParens}
          disabled={!canWrapParens}
          title="Wrap current equation in parentheses"
          aria-label="Wrap current equation in parentheses"
          className={`min-w-[48px] min-h-[44px] h-[48px] px-3 rounded-xl flex items-center justify-center font-mono font-black text-base border-2 transition-all shrink-0 ${
            canWrapParens
              ? 'bg-indigo-600/80 hover:bg-indigo-500 text-white border-indigo-400 cursor-pointer active:scale-95 shadow-sm'
              : 'bg-slate-900/50 text-slate-600 border-slate-800/60 cursor-not-allowed'
          }`}
        >
          ( )
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          if (selectedTiles.length > 0) {
            onRemoveTile(selectedTiles[selectedTiles.length - 1]);
          }
        }}
        disabled={selectedTiles.length === 0}
        aria-label="Backspace last tile"
        className={`min-h-[44px] h-[48px] px-2.5 sm:px-3 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs sm:text-sm border-2 transition-all shrink-0 ${
          selectedTiles.length > 0
            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer active:scale-95'
            : 'bg-slate-900/50 text-slate-600 border-slate-800/60 cursor-not-allowed'
        }`}
      >
        <Delete className="w-4 h-4 shrink-0" />
        <span className="hidden xs:inline sm:inline">Backspace</span>
      </button>

      <button
        type="button"
        onClick={onClear}
        disabled={selectedTiles.length === 0}
        aria-label="Clear selection"
        className={`min-h-[44px] h-[48px] px-2.5 sm:px-3 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs sm:text-sm border-2 transition-all shrink-0 ${
          selectedTiles.length > 0
            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer active:scale-95'
            : 'bg-slate-900/50 text-slate-600 border-slate-800/60 cursor-not-allowed'
        }`}
      >
        <RotateCcw className="w-4 h-4 shrink-0" />
        <span>Clear</span>
      </button>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        aria-label="Submit equation"
        className={`relative overflow-hidden flex-1 sm:flex-initial min-w-[96px] sm:min-w-[104px] min-h-[44px] h-[48px] px-3 sm:px-4 rounded-xl flex items-center justify-center gap-1.5 font-display font-black text-base transition-all shrink-0 ${
          canSubmit
            ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md cursor-pointer active:scale-95'
            : 'bg-slate-900/70 text-slate-500 border border-slate-800 cursor-not-allowed'
        }`}
      >
        <Check className="w-5 h-5 shrink-0 stroke-[3] relative z-10" />
        <span className="relative z-10">{canSubmit ? 'Enter' : 'Pick 2+'}</span>
      </button>
    </div>
  );

  return (
    <div className="w-full mx-auto px-1 sm:px-2 mb-1 flex flex-col gap-1.5 shrink-0 select-none">
      <div className="bg-slate-900/90 border-2 border-slate-800 rounded-2xl px-2.5 sm:px-3 py-1.5 flex flex-col gap-1.5 shadow-md">
        {/* Top Row: Target + Running Total + Equation Strip */}
        <div className="flex items-center justify-between gap-2 min-h-[48px]">
          {renderTargetBadge()}

          <div className="flex-1 min-w-0 h-[48px] flex items-center justify-center overflow-hidden">
            {selectedTiles.length > 0 ? (
              renderEquationTokens()
            ) : (
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="w-8 h-9 rounded-lg border-2 border-dashed border-slate-800 flex items-center justify-center text-xs font-bold">
                  _
                </span>
                <span className="text-xs font-bold text-slate-500 font-mono">
                  {mathMode === 'simple' ? simpleOperator : 'op'}
                </span>
                <span className="w-8 h-9 rounded-lg border-2 border-dashed border-slate-800 flex items-center justify-center text-xs font-bold">
                  _
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Status Message (chained steps / neutral prompt; correctness feedback only after submit) */}
        <div aria-live="polite" className="h-[22px] w-full flex items-center justify-center overflow-hidden">
          {renderMessage()}
        </div>

        {/* Controls Row: Read-only Mode/Operator Indicator + ( ) / Backspace / Clear / Enter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 pt-1 border-t border-slate-800/80">
          {mathMode === 'simple' ? (
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`px-2.5 py-1 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${OP_BADGE_STYLES[simpleOperator]}`}
              >
                <span className="font-mono font-black text-base leading-none">{simpleOperator}</span>
                <span>{OP_NAMES[simpleOperator]}</span>
              </span>
            </div>
          ) : (
            <span className="text-xs font-semibold text-sky-300 hidden sm:inline">
              Equation mode
            </span>
          )}

          <div className="w-full sm:w-auto">{renderButtons()}</div>
        </div>
      </div>
    </div>
  );
};

