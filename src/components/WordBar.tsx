import React, { useRef, useState, useEffect, useLayoutEffect, useMemo } from 'react';
import {
  HexTile,
  EquationEntry,
  MathMode,
  MathOperator,
  DifficultyLevel,
} from '../types/game';
import { evaluateLivePreview } from '../utils/mathEngine';
import { Check, RotateCcw, Delete } from 'lucide-react';

interface WordBarProps {
  selectedTiles: HexTile[];
  simpleOperator: MathOperator;
  mathMode: MathMode;
  difficulty: DifficultyLevel;
  target: number;
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
  onClear,
  onSubmit,
  onRemoveTile,
  isShaking,
  errorMessage,
  lastFoundEquation = null,
}) => {
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

  const preview = useMemo(() => {
    if (hasSyntaxMismatch) {
      return {
        liveResult: null,
        liveError: 'Alternate numbers & operators',
        wentNegative: false,
        negativeNumIndices: new Set<number>(),
        mulDivGroupRanges: [],
        potentialScore: 0,
        matchesTarget: false,
        isCompleteValid: false,
      };
    }
    return evaluateLivePreview(nums, ops, { difficulty, mathMode, target });
  }, [hasSyntaxMismatch, nums, ops, difficulty, mathMode, target]);

  const isInMulDivGroup = (numIdx: number): boolean => {
    return preview.mulDivGroupRanges.some(
      (r) => numIdx >= r.startNumIdx && numIdx <= r.endNumIdx
    );
  };

  const isOpInMulDivGroup = (opIdx: number): boolean => {
    return opIdx < ops.length && (ops[opIdx] === '×' || ops[opIdx] === '÷');
  };

  const canSubmit = selectedTiles.length > 0 && nums.length >= 2;

  // Success message flash
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
        setScale(Math.max(0.58, (containerWidth - 8) / contentWidth));
      } else {
        setScale(1);
      }
    };

    computeScale();
    const observer = new ResizeObserver(computeScale);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [selectedTiles, simpleOperator]);

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
              {selectedTiles.map((tile, idx) => {
                const isUnderlined = isInMulDivGroup(idx);
                const isNegStep = preview.negativeNumIndices.has(idx);
                const precedingOp = idx > 0 ? ops[idx - 1] : null;
                const opUnderlined = idx > 0 && isOpInMulDivGroup(idx - 1);

                return (
                  <React.Fragment key={`eq-tile-${tile.id}-${idx}`}>
                    {precedingOp && (
                      <span
                        className={`px-1.5 py-1 text-lg sm:text-xl font-mono font-black ${
                          isNegStep
                            ? 'text-rose-400'
                            : opUnderlined
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
                        isNegStep
                          ? 'bg-rose-500/25 text-rose-200 border-rose-400'
                          : isUnderlined
                          ? 'bg-amber-400 text-amber-950 border-sky-400 ring-2 ring-sky-400/50'
                          : 'bg-amber-400 text-amber-950 border-amber-300'
                      }`}
                    >
                      <span className={isUnderlined ? 'underline decoration-2 underline-offset-2' : ''}>
                        {tile.tile.display}
                      </span>
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-900/90 text-white text-[10px] font-black flex items-center justify-center pointer-events-none">
                        ✕
                      </span>
                    </button>
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

    // Operator Mode: render selected number & operator tiles
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
            {selectedTiles.map((tile, idx) => {
              const isNum = tile.tile.kind === 'number';
              const numIdx = Math.floor(idx / 2);
              const opIdx = Math.floor((idx - 1) / 2);
              const isUnderlined =
                !hasSyntaxMismatch && (isNum ? isInMulDivGroup(numIdx) : isOpInMulDivGroup(opIdx));
              const isNegStep = !hasSyntaxMismatch && isNum && preview.negativeNumIndices.has(numIdx);

              return (
                <button
                  key={`eq-tile-${tile.id}-${idx}`}
                  type="button"
                  onClick={() => onRemoveTile(tile)}
                  title="Tap to remove"
                  aria-label={`Remove ${tile.tile.display}`}
                  className={`relative min-w-[44px] h-[44px] px-2 rounded-xl font-display font-black text-xl border-2 shadow-md flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer animate-letter-spring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 shrink-0 tabular-nums ${
                    isNegStep
                      ? 'bg-rose-500/30 text-rose-200 border-rose-400'
                      : !isNum
                      ? 'bg-slate-800 text-sky-300 border-sky-400/60'
                      : isUnderlined
                      ? 'bg-amber-400 text-amber-950 border-sky-400 ring-2 ring-sky-400/50'
                      : 'bg-amber-400 text-amber-950 border-amber-300'
                  }`}
                >
                  <span className={isUnderlined ? 'underline decoration-2 underline-offset-2' : ''}>
                    {tile.tile.display}
                  </span>
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-900/90 text-white text-[10px] font-black flex items-center justify-center pointer-events-none">
                    ✕
                  </span>
                </button>
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
    if (preview.liveError) {
      return (
        <span className="text-rose-400 text-xs sm:text-sm font-bold truncate max-w-full leading-tight">
          {preview.liveError}
        </span>
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
    if (nums.length < 2) {
      return (
        <span className="text-amber-300 text-xs sm:text-sm font-semibold truncate max-w-full leading-tight">
          {mathMode === 'operator' && selectedTiles.length === 1
            ? 'Pick an operator next'
            : 'Pick 1 more number'}
        </span>
      );
    }
    if (preview.matchesTarget && preview.potentialScore > 0) {
      return (
        <span className="text-emerald-300 text-xs sm:text-sm font-bold truncate max-w-full leading-tight">
          Matches {target}! +{preview.potentialScore} pts on Enter
        </span>
      );
    }
    return (
      <span className="text-slate-300 text-xs sm:text-sm font-semibold truncate max-w-full leading-tight">
        Target: Make {target}
      </span>
    );
  };

  const renderTargetAndLiveResult = () => {
    const res = preview.liveResult;
    const isNeg = res !== null && res < 0;
    const isMatch = preview.matchesTarget;

    return (
      <div className="flex items-center gap-2 shrink-0">
        <div className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 flex items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
            Make
          </span>
          <span className="font-display font-black text-lg text-white font-mono tabular-nums leading-none">
            {target}
          </span>
        </div>

        <div
          className={`px-2.5 py-1 rounded-xl border font-mono font-black text-base tabular-nums leading-none flex items-center gap-1 ${
            res === null
              ? 'bg-slate-900 border-slate-800 text-slate-500'
              : isNeg
              ? 'bg-rose-950/80 border-rose-500/70 text-rose-400'
              : isMatch
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
              : 'bg-slate-900 border-slate-700 text-slate-200'
          }`}
        >
          <span>=</span>
          <span>{res === null ? '?' : res}</span>
        </div>
      </div>
    );
  };

  const renderButtons = () => (
    <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto h-[48px]">
      <button
        type="button"
        onClick={() => {
          if (selectedTiles.length > 0) {
            onRemoveTile(selectedTiles[selectedTiles.length - 1]);
          }
        }}
        disabled={selectedTiles.length === 0}
        aria-label="Backspace last tile"
        className={`min-h-[44px] h-[48px] px-3 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs sm:text-sm border-2 transition-all shrink-0 ${
          selectedTiles.length > 0
            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer active:scale-95'
            : 'bg-slate-900/50 text-slate-600 border-slate-800/60 cursor-not-allowed'
        }`}
      >
        <Delete className="w-4 h-4 shrink-0" />
        <span>Backspace</span>
      </button>

      <button
        type="button"
        onClick={onClear}
        disabled={selectedTiles.length === 0}
        aria-label="Clear selection"
        className={`min-h-[44px] h-[48px] px-3 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs sm:text-sm border-2 transition-all shrink-0 ${
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
        className={`relative overflow-hidden flex-1 sm:flex-initial min-w-[104px] min-h-[44px] h-[48px] px-4 rounded-xl flex items-center justify-center gap-1.5 font-display font-black text-base transition-all shrink-0 ${
          canSubmit
            ? preview.matchesTarget
              ? 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950 shadow-lg shadow-emerald-950/40 cursor-pointer active:scale-95'
              : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md cursor-pointer active:scale-95'
            : 'bg-slate-900/70 text-slate-500 border border-slate-800 cursor-not-allowed'
        }`}
      >
        {canSubmit && preview.matchesTarget && (
          <div className="animate-go-shimmer pointer-events-none" aria-hidden="true" />
        )}
        <Check className="w-5 h-5 shrink-0 stroke-[3] relative z-10" />
        <span className="relative z-10">{canSubmit ? 'Enter' : 'Pick 2+'}</span>
      </button>
    </div>
  );

  return (
    <div className="w-full mx-auto px-1 sm:px-2 mb-1 flex flex-col gap-1.5 shrink-0 select-none">
      <div className="bg-slate-900/90 border-2 border-slate-800 rounded-2xl px-2.5 sm:px-3 py-1.5 flex flex-col gap-1.5 shadow-md">
        {/* Top Row: Target + Live Result + Equation Strip */}
        <div className="flex items-center justify-between gap-2 min-h-[48px]">
          {renderTargetAndLiveResult()}

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

        {/* Status Message */}
        <div aria-live="polite" className="h-[22px] w-full flex items-center justify-center overflow-hidden">
          {renderMessage()}
        </div>

        {/* Controls Row: Read-only Auto Operator Indicator (or Operator Mode badge) + Backspace / Clear / Enter */}
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
              Operator mode (2× score)
            </span>
          )}

          <div className="w-full sm:w-auto">{renderButtons()}</div>
        </div>
      </div>
    </div>
  );
};
