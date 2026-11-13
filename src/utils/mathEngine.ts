import {
  DifficultyLevel,
  DIFFICULTY_PRESETS,
  MathMode,
  MathOperator,
  MathTileInfo,
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

export function getTargetRange(difficulty: DifficultyLevel) {
  return DIFFICULTY_PRESETS[difficulty].targetRange;
}

export function clampTarget(difficulty: DifficultyLevel, target: number): number {
  const { min, max } = getTargetRange(difficulty);
  return Math.max(min, Math.min(max, Math.round(target)));
}

export function pickRandomTarget(difficulty: DifficultyLevel, rng: () => number = Math.random): number {
  const { min, max } = getTargetRange(difficulty);
  return min + Math.floor(rng() * (max - min + 1));
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

export interface MulDivGroupRange {
  startNumIdx: number;
  endNumIdx: number;
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
}

export interface EvaluateOptions {
  difficulty: DifficultyLevel;
  mathMode: MathMode;
  target: number;
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

/**
 * Pure safe integer parser, validator, and scorer for Math Blitz Classic.
 * Never uses eval().
 */
export function evaluateEquation(
  nums: number[],
  ops: MathOperator[],
  options: EvaluateOptions
): EquationEvaluation {
  const { difficulty, mathMode, target } = options;
  const allowNeg = allowsNegativeIntermediates(difficulty);
  const allowedOps = getAllowedOperators(difficulty);
  const mulDivGroupRanges = getMulDivGroupRanges(ops);

  const emptyFailure = (error: string, isValidSyntax = false): EquationEvaluation => ({
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
    if (!Number.isInteger(n) || n < 1 || n > 10) {
      return emptyFailure('Invalid number tile');
    }
  }
  for (const op of ops) {
    if (!allowedOps.includes(op)) {
      return emptyFailure(`"${op}" not allowed in ${DIFFICULTY_PRESETS[difficulty].label}`);
    }
  }

  // Step 1: Group and evaluate × and ÷ terms left-to-right (higher precedence)
  interface Term {
    sign: '+' | '−';
    value: number;
    endNumIdx: number;
  }

  const terms: Term[] = [];
  let termSign: '+' | '−' = '+';
  let termVal = nums[0];

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    const nextNum = nums[i + 1];

    if (op === '×') {
      termVal = termVal * nextNum;
    } else if (op === '÷') {
      if (nextNum === 0 || termVal % nextNum !== 0) {
        return emptyFailure('Division must come out even', true);
      }
      termVal = termVal / nextNum;
    } else {
      terms.push({ sign: termSign, value: termVal, endNumIdx: i });
      termSign = op;
      termVal = nextNum;
    }
  }
  terms.push({ sign: termSign, value: termVal, endNumIdx: nums.length - 1 });

  // Step 2: Sum + and − terms left-to-right, tracking intermediate negatives
  let runningTotal = terms[0].value;
  let wentNegative = runningTotal < 0;
  const negativeNumIndices = new Set<number>();
  if (wentNegative) {
    negativeNumIndices.add(terms[0].endNumIdx);
  }

  for (let t = 1; t < terms.length; t++) {
    const term = terms[t];
    if (term.sign === '+') {
      runningTotal += term.value;
    } else {
      runningTotal -= term.value;
    }
    if (runningTotal < 0) {
      wentNegative = true;
      negativeNumIndices.add(term.endNumIdx);
      if (!allowNeg) {
        return {
          isValidSyntax: true,
          isValidMath: false,
          result: runningTotal,
          error: "Can't go below 0",
          wentNegative: true,
          negativeNumIndices,
          mulDivGroupRanges,
          nullTileIndices: new Set<number>(),
          scoringTileCount: 0,
          score: 0,
          matchesTarget: false,
        };
      }
    }
  }

  const result = runningTotal;

  // Step 3: Identify null tiles
  const isNull = new Array<boolean>(nums.length).fill(false);

  // Rule A: A 1 on either side of × or ÷
  for (let i = 0; i < ops.length; i++) {
    if (ops[i] === '×' || ops[i] === '÷') {
      if (nums[i] === 1) isNull[i] = true;
      if (nums[i + 1] === 1) isNull[i + 1] = true;
    }
  }

  // Rule B: Cancel pairs matched left to right without overlap
  // Adjacent steps: (ops[i], nums[i+1]) and (ops[i+1], nums[i+2]); i=-1 models implicit '+' before nums[0]
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
      const plusMinusAllowed = nextOp !== '×' && nextOp !== '÷';

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
      tilePoints += nums[idx] === 1 ? Math.ceil(basePts / 2) : basePts;
    }
  }

  // +2 per non-null ×/÷ step
  let mulDivBonus = 0;
  for (let opIdx = 0; opIdx < ops.length; opIdx++) {
    if ((ops[opIdx] === '×' || ops[opIdx] === '÷') && !isNull[opIdx] && !isNull[opIdx + 1]) {
      mulDivBonus += 2;
    }
  }

  let score = tilePoints + mulDivBonus;
  if (mathMode === 'operator') {
    score *= 2;
  }

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
      mulDivGroupRanges: getMulDivGroupRanges(ops.slice(0, Math.max(0, nums.length - 1))),
      nullTileIndices: new Set<number>(),
      scoringTileCount: 0,
      score: 0,
      matchesTarget: false,
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

export function formatEquationString(nums: number[], ops: MathOperator[]): string {
  if (nums.length === 0) return '';
  let out = String(nums[0]);
  for (let i = 0; i < ops.length; i++) {
    out += ` ${ops[i]}`;
    if (i + 1 < nums.length) {
      out += ` ${nums[i + 1]}`;
    }
  }
  return out;
}

// ============================================================================
// SPAWN WEIGHTS
// ============================================================================

const BASE_WEIGHTS_BEGINNER = [6, 14, 14, 13, 13, 10, 8, 8, 7, 7]; // 1..10
const BASE_WEIGHTS_STANDARD = [4, 12, 12, 11, 11, 10, 10, 10, 10, 10]; // 1..10

const OPERATOR_WEIGHTS_BY_DIFFICULTY: Record<DifficultyLevel, Record<MathOperator, number>> = {
  beginner: { '+': 55, '−': 45, '×': 0, '÷': 0 },
  easy: { '+': 40, '−': 30, '×': 30, '÷': 0 },
  normal: { '+': 30, '−': 25, '×': 30, '÷': 15 },
  hard: { '+': 25, '−': 25, '×': 30, '÷': 20 },
  nightmare: { '+': 20, '−': 20, '×': 30, '÷': 30 },
};

/**
 * Returns normalized probabilities (summing to 1) for numbers 1..10 (index 0..9).
 */
export function getNumberSpawnWeights(
  difficulty: DifficultyLevel,
  target: number
): number[] {
  const base =
    difficulty === 'beginner' ? BASE_WEIGHTS_BEGINNER : BASE_WEIGHTS_STANDARD;
  const allowedOps = getAllowedOperators(difficulty);
  const mulDivAllowed = allowedOps.includes('×') || allowedOps.includes('÷');

  const raw = base.map((w, idx) => {
    const n = idx + 1;
    let weight = w;
    if (mulDivAllowed && target > 0 && target % n === 0) {
      weight *= 1.5;
    }
    if (n > target) {
      weight *= 0.5;
    }
    return weight;
  });

  const sum = raw.reduce((acc, v) => acc + v, 0);
  return raw.map((v) => v / sum);
}

/**
 * Returns normalized operator probabilities for allowed operators.
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

export function drawWeightedNumber(
  difficulty: DifficultyLevel,
  target: number,
  rng: () => number = Math.random
): MathTileInfo {
  const weights = getNumberSpawnWeights(difficulty, target);
  const r = rng();
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (r <= acc) {
      return makeNumberTile(i + 1);
    }
  }
  return makeNumberTile(10);
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
 * Draws next math tile respecting Simple/Operator mode, 60/40 number/operator split,
 * and 30-50% operator board ratio clamp.
 */
export function drawMathTile(params: {
  difficulty: DifficultyLevel;
  mathMode: MathMode;
  target: number;
  boardTiles: MathTileInfo[];
  rng?: () => number;
}): MathTileInfo {
  const { difficulty, mathMode, target, boardTiles, rng = Math.random } = params;
  if (mathMode === 'simple') {
    return drawWeightedNumber(difficulty, target, rng);
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
    : drawWeightedNumber(difficulty, target, rng);
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
 * using tiles on the board (plus incoming ones).
 */
export function checkBoardSolvable(
  boardTiles: BoardTileRef[],
  target: number,
  difficulty: DifficultyLevel,
  mathMode: MathMode,
  options?: {
    maxNumbers?: number;
    timeBudgetMs?: number;
  }
): SolverResult {
  const maxNumbers =
    options?.maxNumbers ??
    (difficulty === 'beginner' || difficulty === 'easy' ? 3 : 6);
  const timeBudgetMs = options?.timeBudgetMs ?? 5;
  const deadline =
    (typeof performance !== 'undefined' ? performance.now() : Date.now()) + timeBudgetMs;
  const nowFn = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  const allowedOps = getAllowedOperators(difficulty);
  const allowNeg = allowsNegativeIntermediates(difficulty);

  // Bucket tile IDs by value for O(1) deduplicated branching
  const numBuckets: string[][] = Array.from({ length: 11 }, () => []);
  const opBuckets: Record<MathOperator, string[]> = {
    '+': [],
    '−': [],
    '×': [],
    '÷': [],
  };

  for (const item of boardTiles) {
    if (item.tile.kind === 'number' && item.tile.numValue !== undefined) {
      const n = item.tile.numValue;
      if (n >= 1 && n <= 10) {
        numBuckets[n].push(item.id);
      }
    } else if (item.tile.kind === 'operator' && item.tile.opValue) {
      if (allowedOps.includes(item.tile.opValue)) {
        opBuckets[item.tile.opValue].push(item.id);
      }
    }
  }

  const numCounts = numBuckets.map((b) => b.length);
  const opCounts: Record<MathOperator, number> = {
    '+': opBuckets['+'].length,
    '−': opBuckets['−'].length,
    '×': opBuckets['×'].length,
    '÷': opBuckets['÷'].length,
  };

  let totalNumsAvailable = 0;
  for (let n = 1; n <= 10; n++) totalNumsAvailable += numCounts[n];
  if (totalNumsAvailable < 2) {
    return { solvable: false, solutionTileIds: [], timedOut: false };
  }

  if (mathMode === 'operator') {
    const totalOpsAvailable = allowedOps.reduce((s, op) => s + opCounts[op], 0);
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
    const usedNumOffset = new Array<number>(11).fill(0);
    const usedOpOffset: Record<MathOperator, number> = { '+': 0, '−': 0, '×': 0, '÷': 0 };
    const ids: string[] = [];

    for (let i = 0; i < chosenNums.length; i++) {
      const n = chosenNums[i];
      const numId = numBuckets[n][usedNumOffset[n]++];
      if (numId) ids.push(numId);

      if (mathMode === 'operator' && i < chosenOps.length) {
        const op = chosenOps[i];
        const opId = opBuckets[op][usedOpOffset[op]++];
        if (opId) ids.push(opId);
      }
    }
    return ids;
  }

  function dfs(
    depth: number,
    runningAdd: number,
    termSign: '+' | '−',
    termVal: number
  ): boolean {
    nodesVisited++;
    if ((nodesVisited & 63) === 0 && nowFn() >= deadline) {
      timedOut = true;
      return false;
    }

    if (depth >= 2) {
      const total = termSign === '+' ? runningAdd + termVal : runningAdd - termVal;
      if (total === target) {
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
      for (let n = 1; n <= 10; n++) {
        if (numCounts[n] === 0) continue;
        numCounts[n]--;
        chosenNums.push(n);
        if (dfs(1, 0, '+', n)) return true;
        chosenNums.pop();
        numCounts[n]++;
        if (timedOut) return false;
      }
      return false;
    }

    for (let oi = 0; oi < allowedOps.length; oi++) {
      const op = allowedOps[oi];
      if (mathMode === 'operator' && opCounts[op] === 0) continue;

      if (op === '+' || op === '−') {
        const nextRunningAdd = termSign === '+' ? runningAdd + termVal : runningAdd - termVal;
        if (!allowNeg && nextRunningAdd < 0) {
          continue;
        }
        if (mathMode === 'operator') opCounts[op]--;
        chosenOps.push(op);

        for (let n = 1; n <= 10; n++) {
          if (numCounts[n] === 0) continue;
          numCounts[n]--;
          chosenNums.push(n);
          if (dfs(depth + 1, nextRunningAdd, op, n)) return true;
          chosenNums.pop();
          numCounts[n]++;
          if (timedOut) break;
        }

        chosenOps.pop();
        if (mathMode === 'operator') opCounts[op]++;
      } else {
        // × or ÷
        if (mathMode === 'operator') opCounts[op]--;
        chosenOps.push(op);

        for (let n = 1; n <= 10; n++) {
          if (numCounts[n] === 0) continue;
          if (op === '÷' && termVal % n !== 0) continue;
          const nextTermVal = op === '×' ? termVal * n : termVal / n;

          numCounts[n]--;
          chosenNums.push(n);
          if (dfs(depth + 1, runningAdd, termSign, nextTermVal)) return true;
          chosenNums.pop();
          numCounts[n]++;
          if (timedOut) break;
        }

        chosenOps.pop();
        if (mathMode === 'operator') opCounts[op]++;
      }

      if (timedOut) return false;
    }

    return false;
  }

  const found = dfs(0, 0, '+', 0);
  if (found) {
    return { solvable: true, solutionTileIds: buildSolutionIds(), timedOut: false };
  }
  return { solvable: false, solutionTileIds: [], timedOut };
}

/**
 * Weighted-random choice among scored candidate entries.
 */
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
 * Selects a weighted-random candidate tile that creates a solution on the board,
 * or falls back to a regular weighted tile if no single tile can solve it yet.
 */
export function pickHelperTile(params: {
  boardTiles: BoardTileRef[];
  target: number;
  difficulty: DifficultyLevel;
  mathMode: MathMode;
  rng?: () => number;
}): { tile: MathTileInfo; createdSolution: boolean } {
  const { boardTiles, target, difficulty, mathMode, rng = Math.random } = params;
  const numWeights = getNumberSpawnWeights(difficulty, target);
  const opWeights = getOperatorSpawnWeights(difficulty);

  const candidates: Array<{ tile: MathTileInfo; weight: number }> = [];
  for (let n = 1; n <= 10; n++) {
    candidates.push({
      tile: makeNumberTile(n),
      weight: numWeights[n - 1] * (mathMode === 'operator' ? 0.6 : 1),
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

  // Respect operator board ratio preference in operator mode when selecting candidates
  let orderedCandidates = [...candidates];
  if (mathMode === 'operator' && boardTiles.length >= 2) {
    const opCount = boardTiles.filter((t) => t.tile.kind === 'operator').length;
    const ratio = opCount / boardTiles.length;
    if (ratio < 0.3) {
      orderedCandidates.sort((a, b) => (a.tile.kind === 'operator' ? -1 : 1) - (b.tile.kind === 'operator' ? -1 : 1));
    } else if (ratio > 0.5) {
      orderedCandidates.sort((a, b) => (a.tile.kind === 'number' ? -1 : 1) - (b.tile.kind === 'number' ? -1 : 1));
    }
  }

  const maxNumbers = difficulty === 'beginner' || difficulty === 'easy' ? 3 : 6;
  const totalBudgetDeadline =
    (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 5.5;
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
      maxNumbers,
      timeBudgetMs: 1.5,
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

  // No single tile creates a solution yet (e.g., board has 0 tiles or needs 2+ tiles)
  return {
    tile: drawMathTile({
      difficulty,
      mathMode,
      target,
      boardTiles: boardTiles.map((b) => b.tile),
      rng,
    }),
    createdSolution: false,
  };
}

/**
 * Generates a small guaranteed 2- or 3-number equation recipe for rescue fallback.
 */
function findConstructive3TileRecipe(
  target: number,
  difficulty: DifficultyLevel,
  mathMode: MathMode,
  existingTiles: BoardTileRef[],
  rng: () => number
): MathTileInfo[] | null {
  const allowedOps = getAllowedOperators(difficulty);
  const evalOptions: EvaluateOptions = { difficulty, mathMode, target };

  // In Operator mode, replacing 3 tiles can directly place [numA, op, numB] for 2-number solutions
  if (mathMode === 'operator') {
    for (let a = 1; a <= 10; a++) {
      for (const op of allowedOps) {
        for (let b = 1; b <= 10; b++) {
          const ev = evaluateEquation([a, b], [op], evalOptions);
          if (ev.isValidMath && ev.matchesTarget) {
            return [makeNumberTile(a), makeOperatorTile(op), makeNumberTile(b)];
          }
        }
      }
    }
    // Otherwise try combining 2 numbers + 1 operator with an existing number/operator on board
    const existingNums = Array.from(
      new Set(
        existingTiles
          .filter((t) => t.tile.kind === 'number' && t.tile.numValue !== undefined)
          .map((t) => t.tile.numValue!)
      )
    );
    const existingOps = Array.from(
      new Set(
        existingTiles
          .filter((t) => t.tile.kind === 'operator' && t.tile.opValue)
          .map((t) => t.tile.opValue!)
          .filter((op) => allowedOps.includes(op))
      )
    );

    if (existingOps.length > 0 && existingNums.length > 0) {
      const op1 = existingOps[0];
      const n1 = existingNums[0];
      for (let a = 1; a <= 10; a++) {
        for (let b = 1; b <= 10; b++) {
          for (const op2 of allowedOps) {
            const ev = evaluateEquation([n1, a, b], [op1, op2], evalOptions);
            if (ev.isValidMath && ev.matchesTarget) {
              return [makeNumberTile(a), makeOperatorTile(op2), makeNumberTile(b)];
            }
            const ev2 = evaluateEquation([a, b, n1], [op2, op1], evalOptions);
            if (ev2.isValidMath && ev2.matchesTarget) {
              return [makeNumberTile(a), makeOperatorTile(op2), makeNumberTile(b)];
            }
          }
        }
      }
    }
    return null;
  }

  // Simple mode: replacing 3 tiles provides 3 numbers!
  // Check 2-number solution first (+ a random weighted 3rd)
  for (let a = 1; a <= 10; a++) {
    for (let b = 1; b <= 10; b++) {
      for (const op of allowedOps) {
        const ev = evaluateEquation([a, b], [op], evalOptions);
        if (ev.isValidMath && ev.matchesTarget) {
          return [makeNumberTile(a), makeNumberTile(b), drawWeightedNumber(difficulty, target, rng)];
        }
      }
    }
  }
  // Check 3-number solution
  for (let a = 1; a <= 10; a++) {
    for (let b = 1; b <= 10; b++) {
      for (let c = 1; c <= 10; c++) {
        for (const op1 of allowedOps) {
          for (const op2 of allowedOps) {
            const ev = evaluateEquation([a, b, c], [op1, op2], evalOptions);
            if (ev.isValidMath && ev.matchesTarget) {
              return [makeNumberTile(a), makeNumberTile(b), makeNumberTile(c)];
            }
          }
        }
      }
    }
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
  rng?: () => number;
}): Array<{ id: string; newTile: MathTileInfo }> {
  const { frozenTiles, target, difficulty, mathMode, rng = Math.random } = params;
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

  // Iteratively pick up to `count` helpers
  const replacements: MathTileInfo[] = [];
  let workingPool = [...remainingPool];

  for (let step = 0; step < count; step++) {
    const picked = pickHelperTile({
      boardTiles: workingPool,
      target,
      difficulty,
      mathMode,
      rng,
    });
    replacements.push(picked.tile);
    workingPool = [
      ...workingPool,
      { id: `__rescue_${step}__`, tile: picked.tile },
    ];
  }

  // Verify the rescued board actually has a solution; if not, apply constructive 3-tile recipe
  const check = checkBoardSolvable(workingPool, target, difficulty, mathMode, {
    maxNumbers,
    timeBudgetMs: 4,
  });

  if (!check.solvable && count === 3) {
    const recipe = findConstructive3TileRecipe(target, difficulty, mathMode, remainingPool, rng);
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
