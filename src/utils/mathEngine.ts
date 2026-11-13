import {
  DEFAULT_TARGET,
  DifficultyLevel,
  DIFFICULTY_PRESETS,
  MAX_TARGET,
  MathMode,
  MathOperator,
  MathTileInfo,
  MIN_TARGET,
  TargetBand,
} from '../types/game';

export const ALL_OPERATORS: MathOperator[] = ['+', '−', '×', '÷'];

export function makeNumberTile(n: number): MathTileInfo {
  const s = String(n);
  return {
    kind: 'number',
    display: s,
    value: s,
    numValue: n,
  };
}

export function makeOperatorTile(op: MathOperator): MathTileInfo {
  return {
    kind: 'operator',
    display: op,
    value: op,
    opValue: op,
  };
}

export function normalizeOperatorKey(key: string): MathOperator | null {
  if (key === '+') return '+';
  if (key === '-' || key === '−') return '−';
  if (key === '*' || key === 'x' || key === 'X' || key === '×') return '×';
  if (key === '/' || key === '÷') return '÷';
  return null;
}

export function getAllowedOperators(difficulty: DifficultyLevel): MathOperator[] {
  return DIFFICULTY_PRESETS[difficulty].allowedOperators;
}

export function allowsNegativeIntermediates(difficulty: DifficultyLevel): boolean {
  return DIFFICULTY_PRESETS[difficulty].allowNegativeIntermediates;
}

export function isPrimeNumber(n: number): boolean {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i * i <= n; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

export function isCompositeTarget(n: number): boolean {
  return Number.isInteger(n) && n >= 4 && !isPrimeNumber(n);
}

export function nearestCompositeTarget(target: number): number {
  const base = Math.max(4, Math.min(MAX_TARGET, Math.round(target)));
  if (isCompositeTarget(base)) return base;
  for (let offset = 1; offset <= MAX_TARGET; offset++) {
    if (base + offset <= MAX_TARGET && isCompositeTarget(base + offset)) {
      return base + offset;
    }
    if (base - offset >= 4 && isCompositeTarget(base - offset)) {
      return base - offset;
    }
  }
  return 10;
}

export function getTargetRange(_difficulty?: DifficultyLevel) {
  return { min: MIN_TARGET, max: MAX_TARGET, defaultTarget: DEFAULT_TARGET };
}

export function clampTarget(target: number, requireComposite = false): number {
  const clamped = Math.max(MIN_TARGET, Math.min(MAX_TARGET, Math.round(target)));
  if (requireComposite && !isCompositeTarget(clamped)) {
    return nearestCompositeTarget(clamped);
  }
  return clamped;
}

export function stepTarget(current: number, delta: -1 | 1, requireComposite = false): number {
  let next = Math.max(MIN_TARGET, Math.min(MAX_TARGET, Math.round(current) + delta));
  if (!requireComposite) return next;
  while (next >= 4 && next <= MAX_TARGET && !isCompositeTarget(next)) {
    next += delta;
  }
  if (next < 4) return 4;
  if (next > MAX_TARGET) return 100;
  return isCompositeTarget(next) ? next : nearestCompositeTarget(next);
}

export function pickRandomTarget(
  requireComposite = false,
  rng: () => number = Math.random
): number {
  const pool: number[] = [];
  for (let n = MIN_TARGET; n <= MAX_TARGET; n++) {
    if (!requireComposite || isCompositeTarget(n)) {
      pool.push(n);
    }
  }
  return pool[Math.floor(rng() * pool.length)] ?? DEFAULT_TARGET;
}

export function getTargetBand(target: number, isQuickPlay: boolean): TargetBand {
  if (isQuickPlay && target === 10) return '10';
  if (target <= 10) return '5-10';
  if (target <= 20) return '11-20';
  if (target <= 40) return '21-40';
  if (target <= 80) return '41-80';
  return '81+';
}

export function formatTargetBandLabel(band: TargetBand): string {
  if (band === '10') return 'Target 10';
  if (band === '81+') return '81+';
  return `Target ${band.replace('-', '–')}`;
}

export function createSeededRng(seed: number): () => number {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type EvaluationMode = 'left-to-right' | 'bedmas';

export function getEvaluationMode(difficulty: DifficultyLevel): EvaluationMode {
  return difficulty === 'nightmare' ? 'bedmas' : 'left-to-right';
}

export interface MulDivGroupRange {
  startNumIdx: number;
  endNumIdx: number;
}

export interface LeftToRightStep {
  left: number;
  op: MathOperator;
  right: number;
  result: number;
}

export interface EquationEvaluation {
  isValidSyntax: boolean;
  isValidMath: boolean;
  result: number | null;
  error: string | null;
  wentNegative: boolean;
  negativeNumIndices: Set<number>;
  mulDivGroupRanges: MulDivGroupRange[];
  nullTileIndices: Set<number>;
  scoringTileCount: number;
  score: number;
  matchesTarget: boolean;
  evaluationMode: EvaluationMode;
  stepResults: LeftToRightStep[];
}

export interface EvaluateOptions {
  difficulty: DifficultyLevel;
  mathMode: MathMode;
  target: number;
  parenWraps?: number[];
}

/**
 * Finds contiguous ×/÷ groups across number indices for visual underlining.
 */
export function getMulDivGroupRanges(ops: MathOperator[]): MulDivGroupRange[] {
  const ranges: MulDivGroupRange[] = [];
  let start: number | null = null;
  for (let i = 0; i < ops.length; i++) {
    if (ops[i] === '×' || ops[i] === '÷') {
      if (start === null) {
        start = i;
      }
    } else if (start !== null) {
      ranges.push({ startNumIdx: start, endNumIdx: i });
      start = null;
    }
  }
  if (start !== null) {
    ranges.push({ startNumIdx: start, endNumIdx: ops.length });
  }
  return ranges;
}

export function normalizeParenWraps(
  parenWraps: number[] | undefined,
  numCount: number
): number[] {
  if (!parenWraps || parenWraps.length === 0 || numCount < 2) return [];
  return Array.from(
    new Set(
      parenWraps.filter((w) => Number.isInteger(w) && w >= 1 && w < numCount)
    )
  ).sort((a, b) => a - b);
}

/**
 * Computes auto-parenthesization counts for honest left-to-right equation display
 * whenever an earlier +/− expression is followed by ×/÷.
 */
export function getLeftToRightWrapCounts(ops: MathOperator[]): {
  openAtStart: number;
  closeAfterNum: number[];
} {
  const closeAfterNum = new Array<number>(ops.length + 1).fill(0);
  let openAtStart = 0;
  let hasTopLevelAddSub = false;

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if ((op === '×' || op === '÷') && hasTopLevelAddSub) {
      openAtStart += 1;
      closeAfterNum[i] += 1;
      hasTopLevelAddSub = false;
    } else if (op === '+' || op === '−') {
      hasTopLevelAddSub = true;
    }
  }

  return { openAtStart, closeAfterNum };
}

interface Fraction {
  num: number;
  den: number;
}

function gcdInt(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

function reduceFrac(num: number, den: number): Fraction | null {
  if (den === 0 || !Number.isFinite(num) || !Number.isFinite(den)) return null;
  if (num === 0) return { num: 0, den: 1 };
  let n = num;
  let d = den;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcdInt(n, d);
  return { num: n / g, den: d / g };
}

function addFracs(a: Fraction, b: Fraction, sign: '+' | '−'): Fraction | null {
  const rhsNum = sign === '+' ? b.num : -b.num;
  return reduceFrac(a.num * b.den + rhsNum * a.den, a.den * b.den);
}

function evalBedmasAtoms(
  atoms: Fraction[],
  ops: MathOperator[]
): { ok: true; value: Fraction; wentNegative: boolean } | { ok: false; error: string } {
  const terms: Array<{ sign: '+' | '−'; frac: Fraction }> = [];
  let termSign: '+' | '−' = '+';
  let termFrac: Fraction = atoms[0];

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    const nextAtom = atoms[i + 1];
    if (op === '×') {
      const prod = reduceFrac(termFrac.num * nextAtom.num, termFrac.den * nextAtom.den);
      if (!prod) return { ok: false, error: 'Overflow' };
      termFrac = prod;
    } else if (op === '÷') {
      if (nextAtom.num === 0) {
        return { ok: false, error: "Can't divide by 0" };
      }
      const quot = reduceFrac(termFrac.num * nextAtom.den, termFrac.den * nextAtom.num);
      if (!quot) return { ok: false, error: 'Division must come out even' };
      termFrac = quot;
    } else {
      terms.push({ sign: termSign, frac: termFrac });
      termSign = op;
      termFrac = nextAtom;
    }
  }
  terms.push({ sign: termSign, frac: termFrac });

  let acc = terms[0].frac;
  let wentNegative = acc.num < 0;
  for (let t = 1; t < terms.length; t++) {
    const nextAcc = addFracs(acc, terms[t].frac, terms[t].sign);
    if (!nextAcc) return { ok: false, error: 'Overflow' };
    acc = nextAcc;
    if (acc.num < 0) wentNegative = true;
  }

  return { ok: true, value: acc, wentNegative };
}

export function computeLeftToRightSteps(
  nums: number[],
  ops: MathOperator[],
  allowNegative: boolean
): {
  steps: LeftToRightStep[];
  runningTotal: number | null;
  error: string | null;
  wentNegative: boolean;
  negativeNumIndices: Set<number>;
} {
  if (nums.length === 0) {
    return {
      steps: [],
      runningTotal: null,
      error: null,
      wentNegative: false,
      negativeNumIndices: new Set<number>(),
    };
  }

  const steps: LeftToRightStep[] = [];
  let running = nums[0];
  let wentNegative = running < 0;
  const negativeNumIndices = new Set<number>();
  if (wentNegative) {
    negativeNumIndices.add(0);
    if (!allowNegative) {
      return {
        steps,
        runningTotal: running,
        error: "Can't go below 0",
        wentNegative: true,
        negativeNumIndices,
      };
    }
  }

  const stepCount = Math.min(ops.length, nums.length - 1);
  for (let i = 0; i < stepCount; i++) {
    const left = running;
    const op = ops[i];
    const right = nums[i + 1];

    if (op === '+') {
      running = left + right;
    } else if (op === '−') {
      running = left - right;
    } else if (op === '×') {
      running = left * right;
    } else {
      if (right === 0 || left % right !== 0) {
        return {
          steps,
          runningTotal: null,
          error: 'Division must come out even',
          wentNegative,
          negativeNumIndices,
        };
      }
      running = left / right;
    }

    steps.push({ left, op, right, result: running });

    if (running < 0) {
      wentNegative = true;
      negativeNumIndices.add(i + 1);
      if (!allowNegative) {
        return {
          steps,
          runningTotal: running,
          error: "Can't go below 0",
          wentNegative: true,
          negativeNumIndices,
        };
      }
    }
  }

  return {
    steps,
    runningTotal: running,
    error: null,
    wentNegative,
    negativeNumIndices,
  };
}

/**
 * Pure safe integer/rational parser, validator, and scorer for Math Blitz Classic.
 * - Beginner, Easy, Normal, Hard: left-to-right running total, whole-number division at every step.
 * - BEDMAS (id: 'nightmare'): real BEDMAS precedence with ( ) wraps and whole-number division overall.
 * Never uses eval().
 */
export function evaluateEquation(
  nums: number[],
  ops: MathOperator[],
  options: EvaluateOptions
): EquationEvaluation {
  const { difficulty, target, parenWraps } = options;
  const evalMode = getEvaluationMode(difficulty);
  const allowNeg = allowsNegativeIntermediates(difficulty);
  const allowedOps = getAllowedOperators(difficulty);
  const mulDivGroupRanges = evalMode === 'bedmas' ? getMulDivGroupRanges(ops) : [];

  const emptyFailure = (
    error: string,
    isValidSyntax = false,
    stepResults: LeftToRightStep[] = []
  ): EquationEvaluation => ({
    isValidSyntax,
    isValidMath: false,
    result: null,
    error,
    wentNegative: false,
    negativeNumIndices: new Set<number>(),
    mulDivGroupRanges,
    nullTileIndices: new Set<number>(),
    scoringTileCount: 0,
    score: 0,
    matchesTarget: false,
    evaluationMode: evalMode,
    stepResults,
  });

  if (nums.length < 2) {
    return emptyFailure('Pick 2+ numbers');
  }
  if (nums.length > 6) {
    return emptyFailure('Max 6 numbers');
  }
  if (ops.length !== nums.length - 1) {
    return emptyFailure('Alternate numbers & operators');
  }
  for (const n of nums) {
    if (!Number.isInteger(n) || n === 0 || Math.abs(n) > 2000) {
      return emptyFailure('Invalid number tile');
    }
    if (n < 0 && !allowNeg) {
      return emptyFailure("Can't go below 0", true);
    }
  }
  for (const op of ops) {
    if (!allowedOps.includes(op)) {
      return emptyFailure(`"${op}" not allowed in ${DIFFICULTY_PRESETS[difficulty].label}`);
    }
  }

  let result = 0;
  let wentNegative = false;
  let negativeNumIndices = new Set<number>();
  let stepResults: LeftToRightStep[] = [];

  if (evalMode === 'left-to-right') {
    const ltr = computeLeftToRightSteps(nums, ops, allowNeg);
    stepResults = ltr.steps;
    wentNegative = ltr.wentNegative;
    negativeNumIndices = ltr.negativeNumIndices;

    if (ltr.error) {
      return {
        isValidSyntax: true,
        isValidMath: false,
        result: ltr.runningTotal,
        error: ltr.error,
        wentNegative,
        negativeNumIndices,
        mulDivGroupRanges: [],
        nullTileIndices: new Set<number>(),
        scoringTileCount: 0,
        score: 0,
        matchesTarget: false,
        evaluationMode: evalMode,
        stepResults,
      };
    }
    result = ltr.runningTotal ?? 0;
  } else {
    // BEDMAS mode: exact rational evaluation across nested (0..w) wraps, checking whole number overall
    const validWraps = normalizeParenWraps(parenWraps, nums.length);
    let currentAtom: Fraction = { num: nums[0], den: 1 };
    let cursor = 0;

    for (const w of validWraps) {
      const subAtoms: Fraction[] = [currentAtom];
      for (let k = cursor + 1; k <= w; k++) {
        subAtoms.push({ num: nums[k], den: 1 });
      }
      const subOps = ops.slice(cursor, w);
      const segRes = evalBedmasAtoms(subAtoms, subOps);
      if (!segRes.ok) {
        return emptyFailure(segRes.error, true);
      }
      if (segRes.wentNegative) wentNegative = true;
      currentAtom = segRes.value;
      cursor = w;
    }

    const tailAtoms: Fraction[] = [currentAtom];
    for (let k = cursor + 1; k < nums.length; k++) {
      tailAtoms.push({ num: nums[k], den: 1 });
    }
    const tailOps = ops.slice(cursor);
    const finalSeg = evalBedmasAtoms(tailAtoms, tailOps);
    if (!finalSeg.ok) {
      return emptyFailure(finalSeg.error, true);
    }
    if (finalSeg.wentNegative) wentNegative = true;

    if (finalSeg.value.den !== 1) {
      return emptyFailure('Division must come out even', true);
    }
    result = finalSeg.value.num;
  }

  // Identify null tiles (cancelling pairs; 1s next to × or ÷ score normally)
  const isNull = new Array<boolean>(nums.length).fill(false);

  // Cancel pairs matched left to right without overlap
  let i = -1;
  while (i + 1 < ops.length) {
    const opA: MathOperator = i === -1 ? '+' : ops[i];
    const numA = nums[i + 1];
    const opB = ops[i + 1];
    const numB = nums[i + 2];

    if (numA === numB) {
      const isPlusMinus = (opA === '+' && opB === '−') || (opA === '−' && opB === '+');
      const isMulDiv = i >= 0 && ((opA === '×' && opB === '÷') || (opA === '÷' && opB === '×'));
      const nextOp = i + 2 < ops.length ? ops[i + 2] : null;
      const plusMinusAllowed =
        evalMode === 'left-to-right' || (nextOp !== '×' && nextOp !== '÷');

      if ((isPlusMinus && plusMinusAllowed) || isMulDiv) {
        isNull[i + 1] = true;
        isNull[i + 2] = true;
        i += 2;
        continue;
      }
    }
    i += 1;
  }

  const nullTileIndices = new Set<number>();
  let scoringTileCount = 0;
  let tilePoints = 0;

  for (let idx = 0; idx < nums.length; idx++) {
    if (isNull[idx]) {
      nullTileIndices.add(idx);
    } else {
      scoringTileCount += 1;
      const basePts = 2 * scoringTileCount - 1;
      tilePoints += Math.abs(nums[idx]) === 1 ? Math.ceil(basePts / 2) : basePts;
    }
  }

  // +2 per non-null ×/÷ step
  let mulDivBonus = 0;
  for (let opIdx = 0; opIdx < ops.length; opIdx++) {
    if ((ops[opIdx] === '×' || ops[opIdx] === '÷') && !isNull[opIdx] && !isNull[opIdx + 1]) {
      mulDivBonus += 2;
    }
  }

  const score = tilePoints + mulDivBonus;

  if (scoringTileCount < 2) {
    return {
      isValidSyntax: true,
      isValidMath: false,
      result,
      error: 'Only repeats numbers',
      wentNegative,
      negativeNumIndices,
      mulDivGroupRanges,
      nullTileIndices,
      scoringTileCount,
      score: 0,
      matchesTarget: false,
      evaluationMode: evalMode,
      stepResults,
    };
  }

  const matchesTarget = result === target;
  const error = matchesTarget ? null : `Got ${result}, need ${target}`;

  return {
    isValidSyntax: true,
    isValidMath: true,
    result,
    error,
    wentNegative,
    negativeNumIndices,
    mulDivGroupRanges,
    nullTileIndices,
    scoringTileCount,
    score,
    matchesTarget,
    evaluationMode: evalMode,
    stepResults,
  };
}

/**
 * Evaluates an Operator-mode token sequence (which may be incomplete or non-alternating).
 */
export function evaluateOperatorTokens(
  tokens: MathTileInfo[],
  options: EvaluateOptions
): EquationEvaluation {
  if (tokens.length === 0) {
    return evaluateEquation([], [], options);
  }
  const nums: number[] = [];
  const ops: MathOperator[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (i % 2 === 0) {
      if (t.kind !== 'number' || t.numValue === undefined) {
        return {
          isValidSyntax: false,
          isValidMath: false,
          result: null,
          error: 'Alternate numbers & operators',
          wentNegative: false,
          negativeNumIndices: new Set<number>(),
          mulDivGroupRanges: [],
          nullTileIndices: new Set<number>(),
          scoringTileCount: 0,
          score: 0,
          matchesTarget: false,
          evaluationMode: getEvaluationMode(options.difficulty),
          stepResults: [],
        };
      }
      nums.push(t.numValue);
    } else {
      if (t.kind !== 'operator' || !t.opValue) {
        return {
          isValidSyntax: false,
          isValidMath: false,
          result: null,
          error: 'Alternate numbers & operators',
          wentNegative: false,
          negativeNumIndices: new Set<number>(),
          mulDivGroupRanges: [],
          nullTileIndices: new Set<number>(),
          scoringTileCount: 0,
          score: 0,
          matchesTarget: false,
          evaluationMode: getEvaluationMode(options.difficulty),
          stepResults: [],
        };
      }
      ops.push(t.opValue);
    }
  }
  if (nums.length !== ops.length + 1) {
    return {
      isValidSyntax: false,
      isValidMath: false,
      result: null,
      error: 'Finish with a number',
      wentNegative: false,
      negativeNumIndices: new Set<number>(),
      mulDivGroupRanges:
        getEvaluationMode(options.difficulty) === 'bedmas'
          ? getMulDivGroupRanges(ops.slice(0, Math.max(0, nums.length - 1)))
          : [],
      nullTileIndices: new Set<number>(),
      scoringTileCount: 0,
      score: 0,
      matchesTarget: false,
      evaluationMode: getEvaluationMode(options.difficulty),
      stepResults: [],
    };
  }
  return evaluateEquation(nums, ops, options);
}

/**
 * Live preview evaluation while building an equation (handles 1 number or trailing operator).
 */
export function evaluateLivePreview(
  nums: number[],
  ops: MathOperator[],
  options: EvaluateOptions
): {
  liveResult: number | null;
  liveError: string | null;
  wentNegative: boolean;
  negativeNumIndices: Set<number>;
  mulDivGroupRanges: MulDivGroupRange[];
  potentialScore: number;
  matchesTarget: boolean;
  isCompleteValid: boolean;
} {
  if (nums.length === 0) {
    return {
      liveResult: null,
      liveError: null,
      wentNegative: false,
      negativeNumIndices: new Set(),
      mulDivGroupRanges: [],
      potentialScore: 0,
      matchesTarget: false,
      isCompleteValid: false,
    };
  }
  if (nums.length === 1) {
    return {
      liveResult: nums[0],
      liveError: null,
      wentNegative: false,
      negativeNumIndices: new Set(),
      mulDivGroupRanges: [],
      potentialScore: 0,
      matchesTarget: false,
      isCompleteValid: false,
    };
  }

  const trimmedOps = ops.slice(0, nums.length - 1);
  const evalRes = evaluateEquation(nums, trimmedOps, options);
  const hasTrailingOp = ops.length >= nums.length;

  return {
    liveResult: evalRes.result,
    liveError:
      evalRes.error === 'Only repeats numbers' ||
      evalRes.error === 'Division must come out even' ||
      evalRes.error === "Can't go below 0"
        ? evalRes.error
        : null,
    wentNegative: evalRes.wentNegative,
    negativeNumIndices: evalRes.negativeNumIndices,
    mulDivGroupRanges: evalRes.mulDivGroupRanges,
    potentialScore: evalRes.isValidMath && !hasTrailingOp ? evalRes.score : 0,
    matchesTarget: !hasTrailingOp && evalRes.isValidMath && evalRes.matchesTarget,
    isCompleteValid: !hasTrailingOp && evalRes.isValidMath && evalRes.matchesTarget,
  };
}

function formatNumberToken(n: number, afterOperator: boolean): string {
  if (n < 0 && afterOperator) {
    return `(${n})`;
  }
  return String(n);
}

/**
 * Formats an equation string honestly for the active evaluation mode:
 * - Left-to-right modes: auto-wraps earlier +/− expressions before ×/÷, e.g. "(5 − 3) × 3".
 * - BEDMAS mode: inserts explicit ( ) wraps from parenWraps.
 */
export function formatEquationString(
  nums: number[],
  ops: MathOperator[],
  options?: {
    difficulty?: DifficultyLevel;
    parenWraps?: number[];
  }
): string {
  if (nums.length === 0) return '';
  const evalMode = options?.difficulty ? getEvaluationMode(options.difficulty) : 'left-to-right';

  if (evalMode === 'left-to-right') {
    const wraps = getLeftToRightWrapCounts(ops.slice(0, Math.max(0, nums.length - 1)));
    let out = '('.repeat(wraps.openAtStart) + formatNumberToken(nums[0], false);
    if (wraps.closeAfterNum[0] > 0) {
      out += ')'.repeat(wraps.closeAfterNum[0]);
    }
    for (let i = 0; i < ops.length; i++) {
      out += ` ${ops[i]}`;
      if (i + 1 < nums.length) {
        out += ` ${formatNumberToken(nums[i + 1], true)}`;
        if (wraps.closeAfterNum[i + 1] > 0) {
          out += ')'.repeat(wraps.closeAfterNum[i + 1]);
        }
      }
    }
    return out;
  }

  const validWraps = normalizeParenWraps(options?.parenWraps, nums.length);
  const closeCounts = new Map<number, number>();
  for (const w of validWraps) {
    closeCounts.set(w, (closeCounts.get(w) ?? 0) + 1);
  }

  let out = '('.repeat(validWraps.length) + formatNumberToken(nums[0], false);
  for (let i = 0; i < ops.length; i++) {
    out += ` ${ops[i]}`;
    if (i + 1 < nums.length) {
      out += ` ${formatNumberToken(nums[i + 1], true)}`;
      const closes = closeCounts.get(i + 1) ?? 0;
      if (closes > 0) {
        out += ')'.repeat(closes);
      }
    }
  }
  return out;
}

export function formatChainedStepsString(steps: LeftToRightStep[]): string {
  if (steps.length === 0) return '';
  return steps
    .map(
      (s) =>
        `${formatNumberToken(s.left, false)} ${s.op} ${formatNumberToken(s.right, true)} = ${s.result}`
    )
    .join(' → ');
}

// ============================================================================
// TARGET-DRIVEN NUMBER POOLS & SPAWN WEIGHTS
// ============================================================================

export interface WeightedNumberCandidate {
  value: number;
  weight: number; // normalized probabilities summing to 1
}

const OPERATOR_WEIGHTS_BY_DIFFICULTY: Record<DifficultyLevel, Record<MathOperator, number>> = {
  beginner: { '+': 45, '−': 40, '×': 0, '÷': 15 },
  easy: { '+': 35, '−': 25, '×': 25, '÷': 15 },
  normal: { '+': 30, '−': 25, '×': 30, '÷': 15 },
  hard: { '+': 25, '−': 25, '×': 30, '÷': 20 },
  nightmare: { '+': 20, '−': 20, '×': 30, '÷': 30 },
};

export function getProperFactors(n: number): number[] {
  const factors: number[] = [];
  for (let d = 2; d < n; d++) {
    if (n % d === 0) factors.push(d);
  }
  return factors;
}

function shuffleWithRng<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Generates a fixed round pool of at most 12 numbers (up to 6 randomly chosen pairs)
 * that reach target T with the chosen Simple-mode operator:
 * - Addition (+): pairs (a, T - a) with 1 <= a <= T - 1
 * - Subtraction (−): pairs (a, a - T) with every number between 1 and 4*T
 * - Multiplication (×): proper factor pairs (a, T / a)
 * - Division (÷): pairs (a, a / T) = (k*T, k) with 2 <= k <= 12 (max 12*T)
 */
export function generateSimpleRoundPool(params: {
  target: number;
  simpleOperator: MathOperator;
  difficulty?: DifficultyLevel;
  rng?: () => number;
}): number[] {
  const { simpleOperator, difficulty = 'normal', rng = Math.random } = params;
  const T = clampTarget(params.target);
  const includeNegatives = difficulty === 'hard';
  const posPairs: Array<[number, number]> = [];
  const negPairs: Array<[number, number]> = [];

  if (simpleOperator === '+') {
    const maxA = Math.floor(T / 2);
    for (let a = 1; a <= maxA; a++) {
      const b = T - a;
      if (b >= 1 && b <= T - 1) {
        posPairs.push([a, b]);
      }
    }
    if (includeNegatives) {
      const maxNeg = Math.max(6, Math.min(20, T));
      for (let k = 1; k <= maxNeg; k++) {
        negPairs.push([T + k, -k]);
      }
    }
  } else if (simpleOperator === '−') {
    // a - b = T with 1 <= a <= 4*T and 1 <= b <= 4*T => 1 <= b <= 3*T and a = b + T
    const maxB = 3 * T;
    for (let b = 1; b <= maxB; b++) {
      posPairs.push([b + T, b]);
    }
    if (includeNegatives) {
      for (let a = 1; a <= T - 1; a++) {
        negPairs.push([a, a - T]);
      }
      const maxK = Math.max(4, Math.min(20, 3 * T));
      for (let k = 1; k <= maxK; k++) {
        negPairs.push([-k, -k - T]);
      }
    }
  } else if (simpleOperator === '×') {
    const limit = Math.floor(Math.sqrt(T));
    for (let a = 2; a <= limit; a++) {
      if (T % a === 0) {
        posPairs.push([a, T / a]);
        if (includeNegatives) {
          negPairs.push([-a, -(T / a)]);
        }
      }
    }
    if (posPairs.length === 0) {
      posPairs.push([1, T]);
    }
  } else {
    // Simple ÷: pairs (k * T, k) for 2 <= k <= 12 (reasonable max 12 * T)
    for (let k = 2; k <= 12; k++) {
      posPairs.push([k * T, k]);
      if (includeNegatives) {
        negPairs.push([-(k * T), -k]);
      }
    }
  }

  let chosen: Array<[number, number]>;
  if (includeNegatives && negPairs.length > 0) {
    const negPicked = shuffleWithRng(negPairs, rng).slice(0, 2);
    const posNeeded = Math.max(0, 6 - negPicked.length);
    const posPicked = shuffleWithRng(posPairs, rng).slice(0, posNeeded);
    chosen = shuffleWithRng([...posPicked, ...negPicked], rng).slice(0, 6);
  } else {
    chosen = shuffleWithRng(posPairs, rng).slice(0, 6);
  }

  const pool: number[] = [];
  for (const [a, b] of chosen) {
    pool.push(a, b);
  }
  return pool;
}

/**
 * Builds the valid number pool and normalized weights for the given mode, operator, and target T:
 * - Simple mode: strictly draws from the fixed round pool (up to 12 numbers from <= 6 pairs).
 * - Equation mode ('operator'): numbers 1 .. T-1 weighted toward factors of T, keeping 1 rare;
 *   in Hard mode also includes helpful negative number tiles.
 */
export function getNumberSpawnCandidates(params: {
  difficulty: DifficultyLevel;
  mathMode: MathMode;
  simpleOperator?: MathOperator;
  target: number;
  simpleRoundPool?: number[];
}): WeightedNumberCandidate[] {
  const { difficulty, mathMode, simpleOperator = '+', target, simpleRoundPool } = params;
  const T = clampTarget(target);
  const entries: Array<{ value: number; rawWeight: number }> = [];

  if (mathMode === 'operator') {
    if (T <= 2) {
      entries.push({ value: 1, rawWeight: 1 });
      if (difficulty === 'hard') {
        entries.push({ value: -1, rawWeight: 0.25 }, { value: -2, rawWeight: 0.2 });
      }
    } else {
      const properFactors = new Set(getProperFactors(T));
      const factorBoost =
        properFactors.size > 0
          ? Math.max(2.5, Math.min(6.0, (T - 1) / (properFactors.size * 2.2)))
          : 1.0;

      let posWeightSum = 0;
      for (let n = 1; n <= T - 1; n++) {
        let w = n === 1 ? 0.35 : 1.0;
        if (properFactors.has(n)) {
          w *= factorBoost;
        }
        entries.push({ value: n, rawWeight: w });
        posWeightSum += w;
      }

      if (difficulty === 'hard') {
        const negMax = Math.max(4, T - 1);
        const negEntries: Array<{ value: number; rawWeight: number }> = [];
        let negRawSum = 0;
        for (let k = 1; k <= negMax; k++) {
          let w = k === 1 ? 0.35 : 1.0;
          if (properFactors.has(k)) {
            w *= factorBoost;
          }
          negEntries.push({ value: -k, rawWeight: w });
          negRawSum += w;
        }
        // Scale negative numbers to ~25% of total number weight in Hard Equation mode
        const scale = negRawSum > 0 ? (posWeightSum * (0.25 / 0.75)) / negRawSum : 1;
        for (const ne of negEntries) {
          entries.push({ value: ne.value, rawWeight: ne.rawWeight * scale });
        }
      }
    }
  } else {
    const activePool =
      simpleRoundPool && simpleRoundPool.length > 0
        ? simpleRoundPool
        : generateSimpleRoundPool({ target: T, simpleOperator, difficulty });
    const counts = new Map<number, number>();
    for (const val of activePool) {
      counts.set(val, (counts.get(val) ?? 0) + 1);
    }
    for (const [val, cnt] of counts.entries()) {
      entries.push({ value: val, rawWeight: cnt });
    }
  }

  const sum = entries.reduce((acc, e) => acc + e.rawWeight, 0);
  if (sum <= 0) {
    return [{ value: 1, weight: 1 }];
  }
  return entries.map((e) => ({ value: e.value, weight: e.rawWeight / sum }));
}

/**
 * Returns normalized operator probabilities for allowed operators (Equation mode).
 */
export function getOperatorSpawnWeights(
  difficulty: DifficultyLevel
): Array<{ op: MathOperator; weight: number }> {
  const table = OPERATOR_WEIGHTS_BY_DIFFICULTY[difficulty];
  const entries = ALL_OPERATORS.filter((op) => table[op] > 0).map((op) => ({
    op,
    weight: table[op],
  }));
  const sum = entries.reduce((acc, e) => acc + e.weight, 0);
  return entries.map((e) => ({ op: e.op, weight: e.weight / sum }));
}

export function drawWeightedNumber(params: {
  difficulty: DifficultyLevel;
  mathMode: MathMode;
  simpleOperator?: MathOperator;
  target: number;
  simpleRoundPool?: number[];
  rng?: () => number;
}): MathTileInfo {
  const {
    difficulty,
    mathMode,
    simpleOperator = '+',
    target,
    simpleRoundPool,
    rng = Math.random,
  } = params;
  const candidates = getNumberSpawnCandidates({
    difficulty,
    mathMode,
    simpleOperator,
    target,
    simpleRoundPool,
  });
  const r = rng();
  let acc = 0;
  for (const c of candidates) {
    acc += c.weight;
    if (r <= acc) {
      return makeNumberTile(c.value);
    }
  }
  return makeNumberTile(candidates[candidates.length - 1].value);
}

export function drawWeightedOperator(
  difficulty: DifficultyLevel,
  rng: () => number = Math.random
): MathTileInfo {
  const weights = getOperatorSpawnWeights(difficulty);
  const r = rng();
  let acc = 0;
  for (const item of weights) {
    acc += item.weight;
    if (r <= acc) {
      return makeOperatorTile(item.op);
    }
  }
  return makeOperatorTile(weights[weights.length - 1].op);
}

/**
 * Draws next math tile respecting Simple/Equation mode, 60/40 number/operator split,
 * and 30-50% operator board ratio clamp.
 */
export function drawMathTile(params: {
  difficulty: DifficultyLevel;
  mathMode: MathMode;
  simpleOperator?: MathOperator;
  target: number;
  boardTiles: MathTileInfo[];
  simpleRoundPool?: number[];
  rng?: () => number;
}): MathTileInfo {
  const {
    difficulty,
    mathMode,
    simpleOperator = '+',
    target,
    boardTiles,
    simpleRoundPool,
    rng = Math.random,
  } = params;

  if (mathMode === 'simple') {
    return drawWeightedNumber({
      difficulty,
      mathMode,
      simpleOperator,
      target,
      simpleRoundPool,
      rng,
    });
  }

  const total = boardTiles.length;
  const opCount = boardTiles.filter((t) => t.kind === 'operator').length;

  let spawnOperator: boolean;
  if (total === 1 && opCount === 1) {
    spawnOperator = false;
  } else if (total >= 2) {
    const opRatio = opCount / total;
    if (opRatio < 0.3) {
      spawnOperator = true;
    } else if (opRatio > 0.5) {
      spawnOperator = false;
    } else {
      spawnOperator = rng() < 0.4;
    }
  } else {
    spawnOperator = rng() < 0.4;
  }

  return spawnOperator
    ? drawWeightedOperator(difficulty, rng)
    : drawWeightedNumber({
        difficulty,
        mathMode,
        simpleOperator,
        target,
        simpleRoundPool,
        rng,
      });
}

// ============================================================================
// SOLVABILITY DIRECTOR (Time-boxed DFS, Helpers, Rescue)
// ============================================================================

export interface BoardTileRef {
  id: string;
  tile: MathTileInfo;
}

export interface SolverResult {
  solvable: boolean;
  solutionTileIds: string[];
  timedOut: boolean;
}

/**
 * Time-boxed (~5 ms) DFS solver confirming at least one valid equation equals target
 * using tiles on the board for the chosen mode and operator(s).
 */
export function checkBoardSolvable(
  boardTiles: BoardTileRef[],
  target: number,
  difficulty: DifficultyLevel,
  mathMode: MathMode,
  options?: {
    simpleOperator?: MathOperator;
    maxNumbers?: number;
    timeBudgetMs?: number;
  }
): SolverResult {
  const simpleOp = options?.simpleOperator ?? '+';
  const maxNumbers =
    options?.maxNumbers ??
    (difficulty === 'beginner' || difficulty === 'easy' ? 3 : 6);
  const timeBudgetMs = options?.timeBudgetMs ?? 5;
  const deadline =
    (typeof performance !== 'undefined' ? performance.now() : Date.now()) + timeBudgetMs;
  const nowFn = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  const diffAllowedOps = getAllowedOperators(difficulty);
  const effectiveAllowedOps: MathOperator[] =
    mathMode === 'simple'
      ? [diffAllowedOps.includes(simpleOp) ? simpleOp : '+']
      : diffAllowedOps;
  const allowNeg = allowsNegativeIntermediates(difficulty);

  // Dynamic bucketing by distinct number value present on board (handles any range)
  const numBuckets = new Map<number, string[]>();
  const opBuckets: Record<MathOperator, string[]> = {
    '+': [],
    '−': [],
    '×': [],
    '÷': [],
  };

  const evalMode = getEvaluationMode(difficulty);

  for (const item of boardTiles) {
    if (item.tile.kind === 'number' && item.tile.numValue !== undefined) {
      const n = item.tile.numValue;
      if (n !== 0 && Math.abs(n) <= 2000 && (allowNeg || n > 0)) {
        const list = numBuckets.get(n);
        if (list) list.push(item.id);
        else numBuckets.set(n, [item.id]);
      }
    } else if (item.tile.kind === 'operator' && item.tile.opValue) {
      if (effectiveAllowedOps.includes(item.tile.opValue)) {
        opBuckets[item.tile.opValue].push(item.id);
      }
    }
  }

  const distinctNums = Array.from(numBuckets.keys()).sort((a, b) => a - b);
  const numCounts = distinctNums.map((n) => numBuckets.get(n)!.length);
  const totalNumsAvailable = numCounts.reduce((s, c) => s + c, 0);
  const hasNegativeNums = distinctNums.some((n) => n < 0);

  if (totalNumsAvailable < 2) {
    return { solvable: false, solutionTileIds: [], timedOut: false };
  }

  const opCounts: Record<MathOperator, number> = {
    '+': opBuckets['+'].length,
    '−': opBuckets['−'].length,
    '×': opBuckets['×'].length,
    '÷': opBuckets['÷'].length,
  };

  if (mathMode === 'operator') {
    const totalOpsAvailable = effectiveAllowedOps.reduce((s, op) => s + opCounts[op], 0);
    if (totalOpsAvailable < 1) {
      return { solvable: false, solutionTileIds: [], timedOut: false };
    }
  }

  const chosenNums: number[] = [];
  const chosenOps: MathOperator[] = [];
  let nodesVisited = 0;
  let timedOut = false;

  const evalOptions: EvaluateOptions = { difficulty, mathMode, target };

  function buildSolutionIds(): string[] {
    const usedNumOffset = new Map<number, number>();
    const usedOpOffset: Record<MathOperator, number> = { '+': 0, '−': 0, '×': 0, '÷': 0 };
    const ids: string[] = [];

    for (let i = 0; i < chosenNums.length; i++) {
      const n = chosenNums[i];
      const off = usedNumOffset.get(n) ?? 0;
      const bucket = numBuckets.get(n);
      if (bucket && bucket[off]) {
        ids.push(bucket[off]);
      }
      usedNumOffset.set(n, off + 1);

      if (mathMode === 'operator' && i < chosenOps.length) {
        const op = chosenOps[i];
        const opId = opBuckets[op][usedOpOffset[op]++];
        if (opId) ids.push(opId);
      }
    }
    return ids;
  }

  function dfsLeftToRight(depth: number, runningTotal: number, isBedmasParenFallback: boolean): boolean {
    nodesVisited++;
    if ((nodesVisited & 63) === 0 && nowFn() >= deadline) {
      timedOut = true;
      return false;
    }

    if (depth >= 2 && runningTotal === target) {
      const parenWraps = isBedmasParenFallback
        ? Array.from({ length: Math.max(0, chosenNums.length - 2) }, (_, idx) => idx + 1)
        : undefined;
      const res = evaluateEquation(chosenNums, chosenOps, { ...evalOptions, parenWraps });
      if (res.isValidMath && res.matchesTarget) {
        return true;
      }
    }

    if (depth >= maxNumbers) {
      return false;
    }

    if (depth === 0) {
      for (let i = 0; i < distinctNums.length; i++) {
        if (numCounts[i] === 0) continue;
        const n = distinctNums[i];
        if (!allowNeg && n < 0) continue;
        numCounts[i]--;
        chosenNums.push(n);
        if (dfsLeftToRight(1, n, isBedmasParenFallback)) return true;
        chosenNums.pop();
        numCounts[i]++;
        if (timedOut) return false;
      }
      return false;
    }

    for (let oi = 0; oi < effectiveAllowedOps.length; oi++) {
      const op = effectiveAllowedOps[oi];
      if (mathMode === 'operator' && opCounts[op] === 0) continue;

      if (mathMode === 'operator') opCounts[op]--;
      chosenOps.push(op);

      for (let i = 0; i < distinctNums.length; i++) {
        if (numCounts[i] === 0) continue;
        const n = distinctNums[i];

        let nextTotal: number;
        if (op === '+') {
          nextTotal = runningTotal + n;
        } else if (op === '−') {
          nextTotal = runningTotal - n;
        } else if (op === '×') {
          nextTotal = runningTotal * n;
        } else {
          if (n === 0 || runningTotal % n !== 0) continue;
          nextTotal = runningTotal / n;
        }

        if (!allowNeg && nextTotal < 0) continue;

        if (
          !isBedmasParenFallback &&
          mathMode === 'simple' &&
          effectiveAllowedOps.length === 1 &&
          !allowNeg &&
          !hasNegativeNums
        ) {
          if (op === '+' && nextTotal > target) continue;
          if (op === '−' && nextTotal < target) continue;
          if (op === '×' && nextTotal > target) continue;
          if (op === '÷' && nextTotal < target) continue;
        }

        numCounts[i]--;
        chosenNums.push(n);
        if (dfsLeftToRight(depth + 1, nextTotal, isBedmasParenFallback)) return true;
        chosenNums.pop();
        numCounts[i]++;
        if (timedOut) break;
      }

      chosenOps.pop();
      if (mathMode === 'operator') opCounts[op]++;
      if (timedOut) return false;
    }

    return false;
  }

  function dfsBedmas(
    depth: number,
    addNum: number,
    addDen: number,
    termSign: '+' | '−',
    termNum: number,
    termDen: number
  ): boolean {
    nodesVisited++;
    if ((nodesVisited & 63) === 0 && nowFn() >= deadline) {
      timedOut = true;
      return false;
    }

    if (depth >= 2) {
      const combined = addFracs({ num: addNum, den: addDen }, { num: termNum, den: termDen }, termSign);
      if (combined && combined.den === 1 && combined.num === target) {
        const res = evaluateEquation(chosenNums, chosenOps, evalOptions);
        if (res.isValidMath && res.matchesTarget) {
          return true;
        }
      }
    }

    if (depth >= maxNumbers) {
      return false;
    }

    if (depth === 0) {
      for (let i = 0; i < distinctNums.length; i++) {
        if (numCounts[i] === 0) continue;
        const n = distinctNums[i];
        numCounts[i]--;
        chosenNums.push(n);
        if (dfsBedmas(1, 0, 1, '+', n, 1)) return true;
        chosenNums.pop();
        numCounts[i]++;
        if (timedOut) return false;
      }
      return false;
    }

    for (let oi = 0; oi < effectiveAllowedOps.length; oi++) {
      const op = effectiveAllowedOps[oi];
      if (mathMode === 'operator' && opCounts[op] === 0) continue;

      if (op === '+' || op === '−') {
        const nextAdd = addFracs({ num: addNum, den: addDen }, { num: termNum, den: termDen }, termSign);
        if (!nextAdd) continue;
        if (mathMode === 'operator') opCounts[op]--;
        chosenOps.push(op);

        for (let i = 0; i < distinctNums.length; i++) {
          if (numCounts[i] === 0) continue;
          const n = distinctNums[i];
          if (
            mathMode === 'simple' &&
            effectiveAllowedOps.length === 1 &&
            !hasNegativeNums &&
            nextAdd.den === 1
          ) {
            if (op === '+' && nextAdd.num + n > target) continue;
            if (op === '−' && nextAdd.num - n < target) continue;
          }
          numCounts[i]--;
          chosenNums.push(n);
          if (dfsBedmas(depth + 1, nextAdd.num, nextAdd.den, op, n, 1)) return true;
          chosenNums.pop();
          numCounts[i]++;
          if (timedOut) break;
        }

        chosenOps.pop();
        if (mathMode === 'operator') opCounts[op]++;
      } else {
        if (mathMode === 'operator') opCounts[op]--;
        chosenOps.push(op);

        for (let i = 0; i < distinctNums.length; i++) {
          if (numCounts[i] === 0) continue;
          const n = distinctNums[i];
          if (op === '÷' && n === 0) continue;
          const nextFrac =
            op === '×' ? reduceFrac(termNum * n, termDen) : reduceFrac(termNum, termDen * n);
          if (!nextFrac) continue;
          if (
            mathMode === 'simple' &&
            effectiveAllowedOps.length === 1 &&
            !hasNegativeNums &&
            nextFrac.den === 1
          ) {
            if (op === '×' && nextFrac.num > target) continue;
            if (op === '÷' && nextFrac.num < target) continue;
          }

          numCounts[i]--;
          chosenNums.push(n);
          if (dfsBedmas(depth + 1, addNum, addDen, termSign, nextFrac.num, nextFrac.den)) {
            return true;
          }
          chosenNums.pop();
          numCounts[i]++;
          if (timedOut) break;
        }

        chosenOps.pop();
        if (mathMode === 'operator') opCounts[op]++;
      }

      if (timedOut) return false;
    }

    return false;
  }

  let found = false;
  if (evalMode === 'left-to-right') {
    found = dfsLeftToRight(0, 0, false);
  } else {
    found = dfsBedmas(0, 0, 1, '+', 0, 1);
    if (!found && !timedOut && mathMode === 'operator') {
      // BEDMAS allows ( ) prefix wrapping at any step
      found = dfsLeftToRight(0, 0, true);
    }
  }

  if (found) {
    return { solvable: true, solutionTileIds: buildSolutionIds(), timedOut: false };
  }
  return { solvable: false, solutionTileIds: [], timedOut };
}

function pickWeightedCandidate<T>(
  items: Array<{ item: T; weight: number }>,
  rng: () => number
): T {
  const total = items.reduce((s, x) => s + x.weight, 0);
  if (total <= 0) return items[0].item;
  const r = rng() * total;
  let acc = 0;
  for (const entry of items) {
    acc += entry.weight;
    if (r <= acc) return entry.item;
  }
  return items[items.length - 1].item;
}

/**
 * Computes direct completion numbers implied by current board tiles to keep helper selection < 1ms
 * even when T is large (e.g. T=100).
 */
function getPrioritizedCompletionNumbers(params: {
  boardTiles: BoardTileRef[];
  target: number;
  mathMode: MathMode;
  simpleOperator: MathOperator;
  validNumberSet: Set<number>;
}): number[] {
  const { boardTiles, target, mathMode, simpleOperator, validNumberSet } = params;
  const boardNums = boardTiles
    .filter((b) => b.tile.kind === 'number' && b.tile.numValue !== undefined)
    .map((b) => b.tile.numValue!);

  const suggestions = new Set<number>();
  const addIfValid = (v: number) => {
    if (Number.isInteger(v) && validNumberSet.has(v)) {
      suggestions.add(v);
    }
  };

  for (const a of boardNums) {
    if (mathMode === 'simple') {
      if (simpleOperator === '+') {
        addIfValid(target - a);
      } else if (simpleOperator === '−') {
        addIfValid(target + a);
        addIfValid(a - target);
      } else if (simpleOperator === '×') {
        if (target % a === 0 && a !== 0) addIfValid(target / a);
      } else if (simpleOperator === '÷') {
        if (a !== 0) addIfValid(a * target);
        if (Math.abs(a) >= target && a % target === 0) addIfValid(a / target);
      }
    } else {
      addIfValid(target - a);
      addIfValid(a - target);
      if (target % a === 0 && a !== 0) addIfValid(target / a);
      if (Math.abs(a) >= target && a % target === 0) addIfValid(a / target);
    }
  }

  return Array.from(suggestions);
}

/**
 * Selects a weighted-random candidate tile that creates a solution on the board,
 * or falls back to a regular weighted tile if no single tile can solve it yet.
 */
export function pickHelperTile(params: {
  boardTiles: BoardTileRef[];
  target: number;
  difficulty: DifficultyLevel;
  mathMode: MathMode;
  simpleOperator?: MathOperator;
  simpleRoundPool?: number[];
  rng?: () => number;
}): { tile: MathTileInfo; createdSolution: boolean } {
  const {
    boardTiles,
    target,
    difficulty,
    mathMode,
    simpleOperator = '+',
    simpleRoundPool,
    rng = Math.random,
  } = params;

  const numCandidates = getNumberSpawnCandidates({
    difficulty,
    mathMode,
    simpleOperator,
    target,
    simpleRoundPool,
  });
  const opWeights = getOperatorSpawnWeights(difficulty);
  const validNumMap = new Map<number, number>(numCandidates.map((c) => [c.value, c.weight]));
  const validNumSet = new Set<number>(numCandidates.map((c) => c.value));

  const prioritizedNums = getPrioritizedCompletionNumbers({
    boardTiles,
    target,
    mathMode,
    simpleOperator,
    validNumberSet: validNumSet,
  });

  // Assemble probe list capped cleanly (~28 candidates) with direct algebraic matches first
  const candidates: Array<{ tile: MathTileInfo; weight: number }> = [];
  const addedNum = new Set<number>();

  for (const pn of prioritizedNums) {
    addedNum.add(pn);
    candidates.push({
      tile: makeNumberTile(pn),
      weight: (validNumMap.get(pn) ?? 0.05) * (mathMode === 'operator' ? 0.6 : 1),
    });
  }

  // Add weighted sample from remaining pool
  const remainingPool = numCandidates
    .filter((c) => !addedNum.has(c.value))
    .sort((a, b) => b.weight - a.weight);

  for (const c of remainingPool.slice(0, 20)) {
    candidates.push({
      tile: makeNumberTile(c.value),
      weight: c.weight * (mathMode === 'operator' ? 0.6 : 1),
    });
  }

  if (mathMode === 'operator') {
    for (const ow of opWeights) {
      candidates.push({
        tile: makeOperatorTile(ow.op),
        weight: ow.weight * 0.4,
      });
    }
  }

  let orderedCandidates = [...candidates];
  if (mathMode === 'operator' && boardTiles.length >= 2) {
    const opCount = boardTiles.filter((t) => t.tile.kind === 'operator').length;
    const ratio = opCount / boardTiles.length;
    if (ratio < 0.3) {
      orderedCandidates.sort(
        (a, b) => (a.tile.kind === 'operator' ? 0 : 1) - (b.tile.kind === 'operator' ? 0 : 1)
      );
    } else if (ratio > 0.5) {
      orderedCandidates.sort(
        (a, b) => (a.tile.kind === 'number' ? 0 : 1) - (b.tile.kind === 'number' ? 0 : 1)
      );
    }
  }

  const maxNumbers = difficulty === 'beginner' || difficulty === 'easy' ? 3 : 6;
  const totalBudgetDeadline =
    (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 5.0;
  const nowFn = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  const solvingCandidates: Array<{ tile: MathTileInfo; weight: number }> = [];

  for (const cand of orderedCandidates) {
    if (nowFn() >= totalBudgetDeadline && solvingCandidates.length > 0) {
      break;
    }
    const virtualBoard: BoardTileRef[] = [
      ...boardTiles,
      { id: '__helper_probe__', tile: cand.tile },
    ];
    const res = checkBoardSolvable(virtualBoard, target, difficulty, mathMode, {
      simpleOperator,
      maxNumbers,
      timeBudgetMs: 1.2,
    });
    if (res.solvable) {
      solvingCandidates.push(cand);
    }
  }

  if (solvingCandidates.length > 0) {
    return {
      tile: pickWeightedCandidate(
        solvingCandidates.map((c) => ({ item: c.tile, weight: c.weight })),
        rng
      ),
      createdSolution: true,
    };
  }

  return {
    tile: drawMathTile({
      difficulty,
      mathMode,
      simpleOperator,
      target,
      boardTiles: boardTiles.map((b) => b.tile),
      simpleRoundPool,
      rng,
    }),
    createdSolution: false,
  };
}

/**
 * Generates a guaranteed 2- or 3-tile recipe strictly within the active pool for rescue fallback.
 */
function findConstructive3TileRecipe(
  target: number,
  difficulty: DifficultyLevel,
  mathMode: MathMode,
  simpleOperator: MathOperator,
  simpleRoundPool: number[] | undefined,
  rng: () => number
): MathTileInfo[] | null {
  const evalOptions: EvaluateOptions = { difficulty, mathMode, target };
  const numCandidates = getNumberSpawnCandidates({
    difficulty,
    mathMode,
    simpleOperator,
    target,
    simpleRoundPool,
  })
    .map((c) => c.value);

  const fallbackPool =
    numCandidates.length > 0 ? numCandidates : [1, Math.max(1, target - 1)];

  if (mathMode === 'operator') {
    const allowedOps = getAllowedOperators(difficulty);
    for (let attempt = 0; attempt < 150; attempt++) {
      const a = fallbackPool[Math.floor(rng() * fallbackPool.length)];
      const b = fallbackPool[Math.floor(rng() * fallbackPool.length)];
      const op = allowedOps[Math.floor(rng() * allowedOps.length)];
      const ev = evaluateEquation([a, b], [op], evalOptions);
      if (ev.isValidMath && ev.matchesTarget) {
        return [makeNumberTile(a), makeOperatorTile(op), makeNumberTile(b)];
      }
    }
    if (target >= 2) {
      const a = Math.max(1, Math.floor(target / 2));
      const b = target - a;
      const ev = evaluateEquation([a, b], ['+'], evalOptions);
      if (ev.isValidMath && ev.matchesTarget) {
        return [makeNumberTile(a), makeOperatorTile('+'), makeNumberTile(b)];
      }
    }
    return null;
  }

  // Simple mode: pick a valid solving pair directly from simpleRoundPool (or candidate pool) + 3rd pool filler
  const activePool =
    simpleRoundPool && simpleRoundPool.length > 0
      ? simpleRoundPool
      : generateSimpleRoundPool({ target, simpleOperator, difficulty, rng });

  const filler = drawWeightedNumber({
    difficulty,
    mathMode,
    simpleOperator,
    target,
    simpleRoundPool: activePool,
    rng,
  });

  const validPairs: Array<[number, number]> = [];
  for (let i = 0; i < activePool.length; i++) {
    for (let j = 0; j < activePool.length; j++) {
      if (i === j) continue;
      const a = activePool[i];
      const b = activePool[j];
      const ev = evaluateEquation([a, b], [simpleOperator], evalOptions);
      if (ev.isValidMath && ev.matchesTarget) {
        validPairs.push([a, b]);
      }
    }
  }

  if (validPairs.length > 0) {
    const [a, b] = validPairs[Math.floor(rng() * validPairs.length)];
    return [makeNumberTile(a), makeNumberTile(b), filler];
  }

  return null;
}

/**
 * Picks 3 random tiles from frozenTiles and computes 3 helper replacement tiles
 * that ensure the board has a valid solution.
 */
export function computeBoardRescueReplacements(params: {
  frozenTiles: BoardTileRef[];
  target: number;
  difficulty: DifficultyLevel;
  mathMode: MathMode;
  simpleOperator?: MathOperator;
  simpleRoundPool?: number[];
  rng?: () => number;
}): Array<{ id: string; newTile: MathTileInfo }> {
  const {
    frozenTiles,
    target,
    difficulty,
    mathMode,
    simpleOperator = '+',
    simpleRoundPool,
    rng = Math.random,
  } = params;
  if (frozenTiles.length === 0) return [];

  const count = Math.min(3, frozenTiles.length);
  const indices = frozenTiles.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }
  const chosenIndices = indices.slice(0, count);
  const chosenSet = new Set(chosenIndices);

  const remainingPool: BoardTileRef[] = frozenTiles.filter((_, idx) => !chosenSet.has(idx));
  const maxNumbers = difficulty === 'beginner' || difficulty === 'easy' ? 3 : 6;

  const replacements: MathTileInfo[] = [];
  let workingPool = [...remainingPool];

  for (let step = 0; step < count; step++) {
    const picked = pickHelperTile({
      boardTiles: workingPool,
      target,
      difficulty,
      mathMode,
      simpleOperator,
      simpleRoundPool,
      rng,
    });
    replacements.push(picked.tile);
    workingPool = [
      ...workingPool,
      { id: `__rescue_${step}__`, tile: picked.tile },
    ];
  }

  const check = checkBoardSolvable(workingPool, target, difficulty, mathMode, {
    simpleOperator,
    maxNumbers,
    timeBudgetMs: 4,
  });

  if (!check.solvable && count === 3) {
    const recipe = findConstructive3TileRecipe(
      target,
      difficulty,
      mathMode,
      simpleOperator,
      simpleRoundPool,
      rng
    );
    if (recipe && recipe.length === 3) {
      return chosenIndices.map((boardIdx, k) => ({
        id: frozenTiles[boardIdx].id,
        newTile: recipe[k],
      }));
    }
  }

  return chosenIndices.map((boardIdx, k) => ({
    id: frozenTiles[boardIdx].id,
    newTile: replacements[k],
  }));
}
