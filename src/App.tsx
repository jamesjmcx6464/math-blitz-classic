/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  HexTile,
  FloatingScore,
  GameScreen,
  ViewMode,
  EquationEntry,
  FreePlaySettings,
  DEFAULT_FREE_PLAY_SETTINGS,
  DifficultyLevel,
  DIFFICULTY_PRESETS,
  ScreenModeType,
  ClassroomConfig,
  ClassroomMatchState,
  TurnSummary,
  MathMode,
  MathOperator,
  MathTileInfo,
} from './types/game';
import {
  SPAWN_Y,
  GROUND_Y,
  BOARD_HEIGHT,
  BOARD_WIDTH_WIDE,
  findLandingY,
  findGroundedHexIds,
  computeScreenSpeedMultiplier,
} from './utils/hexPhysics';
import {
  getAllowedOperators,
  clampTarget,
  isCompositeTarget,
  nearestCompositeTarget,
  evaluateEquation,
  evaluateOperatorTokens,
  formatEquationString,
  drawMathTile,
  checkBoardSolvable,
  pickHelperTile,
  computeBoardRescueReplacements,
  createSeededRng,
  getTargetBand,
  BoardTileRef,
} from './utils/mathEngine';
import { soundManager } from './utils/audio';
import { saveHighScore, makeTimeBucketKey } from './utils/highScores';
import {
  getSavedDifficulty,
  saveDifficulty,
  getSavedMathMode,
  saveMathMode,
  getSavedSimpleOperator,
  saveSimpleOperator,
  getSavedTarget,
  saveTarget,
} from './utils/difficulty';
import { recordSoloPlayerResult } from './utils/registeredPlayers';
import { detectDevice } from './utils/screenMode';
import { loadClassroomConfig } from './utils/classroomStorage';

import { FreePlaySettingsModal } from './components/FreePlaySettingsModal';
import { GameHUD } from './components/GameHUD';
import { WordBar } from './components/WordBar';
import { GameBoard } from './components/GameBoard';
import { StartMenu } from './components/StartMenu';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { HighScoresModal, LastSoloResult } from './components/HighScoresModal';
import { WordHistoryModal } from './components/WordHistoryModal';
import { ClassroomSetupModal } from './components/ClassroomSetupModal';
import { TurnTransitionModal } from './components/TurnTransitionModal';
import { ClassroomVictoryModal } from './components/ClassroomVictoryModal';
import { ClassroomScoreboardModal } from './components/ClassroomScoreboardModal';
import { PlayNowModal } from './components/PlayNowModal';
import { SoloPlayerSetupModal } from './components/SoloPlayerSetupModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import confetti from 'canvas-confetti';

const FREE_PLAY_SETTINGS_KEY = 'math_blitz_free_play_settings';

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('MENU');

  // Solo student identity
  const [currentSoloPlayer, setCurrentSoloPlayer] = useState<{
    name: string;
    logo: string;
  } | null>(null);
  const currentSoloPlayerRef = useRef<{ name: string; logo: string } | null>(null);
  currentSoloPlayerRef.current = currentSoloPlayer;

  const [lastSoloResult, setLastSoloResult] = useState<LastSoloResult | null>(null);

  // Modals
  const [isSoloSetupOpen, setIsSoloSetupOpen] = useState<boolean>(false);
  const [isTeamSetupOpen, setIsTeamSetupOpen] = useState<boolean>(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState<boolean>(false);

  // Persisted difficulty & mathMode
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(() => getSavedDifficulty());
  const difficultyRef = useRef<DifficultyLevel>(difficulty);
  difficultyRef.current = difficulty;

  const [mathMode, setMathMode] = useState<MathMode>(() => getSavedMathMode());
  const mathModeRef = useRef<MathMode>(mathMode);
  mathModeRef.current = mathMode;

  const [simpleOperator, setSimpleOperator] = useState<MathOperator>(() => {
    const savedOp = getSavedSimpleOperator();
    const allowed = getAllowedOperators(getSavedDifficulty());
    return allowed.includes(savedOp) ? savedOp : '+';
  });
  const simpleOperatorRef = useRef<MathOperator>(simpleOperator);
  simpleOperatorRef.current = simpleOperator;

  // Target & Practice flags (saved & chosen pre-game, default 10)
  const [target, setTarget] = useState<number>(() => getSavedTarget());
  const targetRef = useRef<number>(target);
  targetRef.current = target;

  const [isPractice, setIsPractice] = useState<boolean>(false);
  const isPracticeRef = useRef<boolean>(isPractice);
  isPracticeRef.current = isPractice;

  // Pace & timers
  const spawnIntervalRef = useRef<number>(DIFFICULTY_PRESETS[difficulty].spawnIntervalMs);
  const dynamicPaceEnabledRef = useRef<boolean>(true);
  const activeRoundSecondsRef = useRef<number>(180);
  const lastQuickPlayConfigRef = useRef<{
    difficulty: DifficultyLevel;
    mathMode: MathMode;
    simpleOperator: MathOperator;
    target: number;
    timeLimit: number;
  }>({
    difficulty,
    mathMode,
    simpleOperator,
    target,
    timeLimit: 60,
  });

  // Screen mode detection
  const [screenMode, setScreenMode] = useState<ScreenModeType>(() => detectDevice());
  const screenModeRef = useRef<ScreenModeType>(screenMode);
  screenModeRef.current = screenMode;
  const speedMultiplierRef = useRef<number>(1.0);

  useEffect(() => {
    const handleDeviceCheck = () => {
      const detected = detectDevice();
      setScreenMode(detected);
      screenModeRef.current = detected;
    };
    window.addEventListener('resize', handleDeviceCheck);
    window.addEventListener('orientationchange', handleDeviceCheck);
    return () => {
      window.removeEventListener('resize', handleDeviceCheck);
      window.removeEventListener('orientationchange', handleDeviceCheck);
    };
  }, []);

  const viewMode: ViewMode = screenMode === 'pc' ? 'wide' : 'narrow';

  // Score & equation stats
  const [score, setScore] = useState<number>(0);
  const scoreRef = useRef<number>(0);
  scoreRef.current = score;

  const [longestEquation, setLongestEquation] = useState<string>('');
  const longestEquationRef = useRef<string>('');
  longestEquationRef.current = longestEquation;

  const [bestEquationScore, setBestEquationScore] = useState<number>(0);

  const [totalEquationsCleared, setTotalEquationsCleared] = useState<number>(0);
  const totalEquationsClearedRef = useRef<number>(0);
  totalEquationsClearedRef.current = totalEquationsCleared;

  // Audio
  const [soundEnabled, setSoundEnabled] = useState<boolean>(soundManager.enabled);

  // Hexagons state
  const [frozenTiles, setFrozenTiles] = useState<HexTile[]>([]);
  const frozenTilesRef = useRef<HexTile[]>([]);
  frozenTilesRef.current = frozenTiles;

  const [fallingTiles, setFallingTiles] = useState<HexTile[]>([]);
  const fallingTilesRef = useRef<HexTile[]>([]);
  fallingTilesRef.current = fallingTiles;

  const [selectedTiles, setSelectedTiles] = useState<HexTile[]>([]);

  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [pulsingTileIds, setPulsingTileIds] = useState<Set<string>>(new Set());
  const [hintTileIds, setHintTileIds] = useState<Set<string>>(new Set());

  // Submission & feedback
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Game Over summary
  const [gameOverStats, setGameOverStats] = useState<{
    rank: number;
    isNewHighScore: boolean;
  }>({ rank: -1, isNewHighScore: false });
  const [gameOverReason, setGameOverReason] = useState<string>('The tiles reached the top!');

  // Free Play Settings
  const [freePlaySettings, setFreePlaySettings] = useState<FreePlaySettings>(() => {
    try {
      const saved = localStorage.getItem(FREE_PLAY_SETTINGS_KEY);
      if (saved) {
        return { ...DEFAULT_FREE_PLAY_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_FREE_PLAY_SETTINGS;
  });
  const freePlaySettingsRef = useRef<FreePlaySettings>(freePlaySettings);
  freePlaySettingsRef.current = freePlaySettings;

  const freePlaySpeedRef = useRef<number>(freePlaySettings.dropSpeed);
  const [freePlayTimeLeft, setFreePlayTimeLeft] = useState<number | null>(null);

  // Equation History
  const [equationHistory, setEquationHistory] = useState<EquationEntry[]>([]);
  const [isEquationHistoryOpen, setIsEquationHistoryOpen] = useState<boolean>(false);

  // Classroom / Team Match State
  const [classroomMatch, setClassroomMatch] = useState<ClassroomMatchState | null>(null);
  const classroomMatchRef = useRef<ClassroomMatchState | null>(null);
  classroomMatchRef.current = classroomMatch;

  const [isClassroomSetupOpen, setIsClassroomSetupOpen] = useState<boolean>(false);
  const [isClassroomScoreboardOpen, setIsClassroomScoreboardOpen] = useState<boolean>(false);
  const [activeTurnEquations, setActiveTurnEquations] = useState<EquationEntry[]>([]);
  const activeTurnEquationsRef = useRef<EquationEntry[]>(activeTurnEquations);
  activeTurnEquationsRef.current = activeTurnEquations;

  // Settings Modal
  const [isFreePlaySettingsOpen, setIsFreePlaySettingsOpen] = useState<boolean>(false);

  // Solvability Director & PRNG refs
  const rngRef = useRef<() => number>(Math.random);
  const recentHelperFlagsRef = useRef<boolean[]>([]);
  const solvabilityStateRef = useRef<{ solvable: boolean; solutionTileIds: string[] }>({
    solvable: true,
    solutionTileIds: [],
  });
  const lastInputTimeRef = useRef<number>(Date.now());

  const markUserInput = useCallback(() => {
    lastInputTimeRef.current = Date.now();
    setHintTileIds((prev) => (prev.size > 0 ? new Set() : prev));
  }, []);

  const handleUpdateFreePlaySettings = (newSettings: FreePlaySettings) => {
    setFreePlaySettings(newSettings);
    freePlaySettingsRef.current = newSettings;
    try {
      localStorage.setItem(FREE_PLAY_SETTINGS_KEY, JSON.stringify(newSettings));
    } catch {
      // ignore
    }
    if (freePlaySpeedRef.current < newSettings.dropSpeed) {
      freePlaySpeedRef.current = newSettings.dropSpeed;
    }
    if (screen === 'PLAYING' && !classroomMatchRef.current) {
      const nextPractice = newSettings.isPractice || newSettings.timeLimit === 0;
      setIsPractice(nextPractice);
      isPracticeRef.current = nextPractice;
      activeRoundSecondsRef.current = newSettings.timeLimit;
      if (nextPractice) {
        setFreePlayTimeLeft(null);
      }
    }
  };

  const handleResetFreePlaySettings = () => {
    setFreePlaySettings(DEFAULT_FREE_PLAY_SETTINGS);
    freePlaySettingsRef.current = DEFAULT_FREE_PLAY_SETTINGS;
    freePlaySpeedRef.current = DEFAULT_FREE_PLAY_SETTINGS.dropSpeed;
    try {
      localStorage.removeItem(FREE_PLAY_SETTINGS_KEY);
    } catch {
      // ignore
    }
  };

  const handleChangeDifficulty = (level: DifficultyLevel) => {
    setDifficulty(level);
    difficultyRef.current = level;
    saveDifficulty(level);
    const preset = DIFFICULTY_PRESETS[level];
    spawnIntervalRef.current = preset.spawnIntervalMs;
    const allowed = getAllowedOperators(level);
    let nextOp = simpleOperatorRef.current;
    if (!allowed.includes(nextOp)) {
      nextOp = '+';
      setSimpleOperator(nextOp);
      simpleOperatorRef.current = nextOp;
      saveSimpleOperator(nextOp);
    }
    handleUpdateFreePlaySettings({
      ...freePlaySettingsRef.current,
      dropSpeed: preset.dropSpeed,
      tileRadius: preset.tileRadius,
      ceilingHeight: preset.ceilingHeight,
      speedIncreaseRate: preset.speedIncreaseRate,
      simpleOperator: nextOp,
    });
  };

  const handleChangeMathMode = (nextMode: MathMode) => {
    setMathMode(nextMode);
    mathModeRef.current = nextMode;
    saveMathMode(nextMode);
    handleUpdateFreePlaySettings({
      ...freePlaySettingsRef.current,
      mathMode: nextMode,
    });
  };

  const handleChangeSimpleOperator = (op: MathOperator) => {
    const allowed = getAllowedOperators(difficultyRef.current);
    if (!allowed.includes(op)) return;
    setSimpleOperator(op);
    simpleOperatorRef.current = op;
    saveSimpleOperator(op);
    let nextTarget = targetRef.current;
    if (op === '×' && !isCompositeTarget(nextTarget)) {
      nextTarget = nearestCompositeTarget(nextTarget);
      setTarget(nextTarget);
      targetRef.current = nextTarget;
      saveTarget(nextTarget);
    }
    handleUpdateFreePlaySettings({
      ...freePlaySettingsRef.current,
      simpleOperator: op,
      target: nextTarget,
    });
  };

  const handleChangeTarget = (nextTarget: number) => {
    const clamped = clampTarget(nextTarget);
    setTarget(clamped);
    targetRef.current = clamped;
    saveTarget(clamped);
    handleUpdateFreePlaySettings({
      ...freePlaySettingsRef.current,
      target: clamped,
    });
  };

  // Off-render-path Solvability Director check (~5 ms budget)
  useEffect(() => {
    if (screen !== 'PLAYING') return;
    const timer = setTimeout(() => {
      const allRefs: BoardTileRef[] = [
        ...frozenTilesRef.current,
        ...fallingTilesRef.current,
      ]
        .filter((t) => !t.isClearing)
        .map((t) => ({ id: t.id, tile: t.tile }));

      if (allRefs.length < 2) {
        solvabilityStateRef.current = { solvable: false, solutionTileIds: [] };
        return;
      }

      const res = checkBoardSolvable(
        allRefs,
        targetRef.current,
        difficultyRef.current,
        mathModeRef.current,
        {
          simpleOperator: simpleOperatorRef.current,
          timeBudgetMs: 5,
        }
      );
      solvabilityStateRef.current = {
        solvable: res.solvable,
        solutionTileIds: res.solutionTileIds,
      };
      if (!res.solvable) {
        setHintTileIds((prev) => (prev.size > 0 ? new Set() : prev));
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [screen, frozenTiles, fallingTiles, target, difficulty, mathMode, simpleOperator]);

  // Beginner / Easy 15-second idle hint pulse
  useEffect(() => {
    if (screen !== 'PLAYING') {
      setHintTileIds(new Set());
      return;
    }

    const interval = setInterval(() => {
      const diff = difficultyRef.current;
      if (diff !== 'beginner' && diff !== 'easy') return;

      const idleMs = Date.now() - lastInputTimeRef.current;
      if (idleMs >= 15000) {
        const liveIds = new Set(
          [...frozenTilesRef.current, ...fallingTilesRef.current]
            .filter((t) => !t.isClearing)
            .map((t) => t.id)
        );
        const validHintId = solvabilityStateRef.current.solutionTileIds.find((id) =>
          liveIds.has(id)
        );
        if (validHintId) {
          setHintTileIds(new Set([validHintId]));
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [screen]);

  // Animation loop & board sizing refs
  const animFrameId = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  const screenRef = useRef(screen);
  screenRef.current = screen;

  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const availW = Math.max(420, window.innerWidth - 32);
      const availH = Math.max(300, window.innerHeight - 170);
      return Math.max(480, Math.round(BOARD_HEIGHT * (availW / availH)));
    }
    return BOARD_WIDTH_WIDE;
  });
  const boardWidthRef = useRef<number>(boardWidth);
  boardWidthRef.current = boardWidth;

  useEffect(() => {
    const updateDimensions = () => {
      const el = boardContainerRef.current;
      if (!el) {
        if (typeof window !== 'undefined') {
          const estW =
            screenModeRef.current === 'pc'
              ? Math.max(480, Math.min(window.innerWidth * 0.5, window.innerWidth)) - 16
              : Math.max(280, window.innerWidth - 16);
          const estH = Math.max(260, window.innerHeight - 170);
          const computed = Math.max(480, Math.round(BOARD_HEIGHT * (estW / estH)));
          setBoardWidth(computed);
          boardWidthRef.current = computed;
          speedMultiplierRef.current = computeScreenSpeedMultiplier(estW, estH);
        }
        return;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width > 50 && rect.height > 50) {
        const computed = Math.max(480, Math.round(BOARD_HEIGHT * (rect.width / rect.height)));
        setBoardWidth(computed);
        boardWidthRef.current = computed;
        speedMultiplierRef.current = computeScreenSpeedMultiplier(rect.width, rect.height);
      }
    };

    updateDimensions();
    const el = boardContainerRef.current;
    let observer: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateDimensions);
      observer.observe(el);
    }
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
    };
  }, [screen, screenMode]);

  const activeCeilingY = freePlaySettings.ceilingHeight;

  const activeWallBounds = React.useMemo(() => {
    const activeWidth = boardWidth;
    if (freePlaySettings.wallWidthPct < 100) {
      const effectiveWidth = Math.round(activeWidth * (freePlaySettings.wallWidthPct / 100));
      const margin = Math.round((activeWidth - effectiveWidth) / 2);
      return { left: margin, right: margin + effectiveWidth, width: effectiveWidth };
    }
    return { left: 0, right: activeWidth, width: activeWidth };
  }, [boardWidth, freePlaySettings.wallWidthPct]);

  const handleToggleSound = () => {
    const nextState = soundManager.toggle();
    setSoundEnabled(nextState);
  };

  // Pulse feedback on tile press / rescue
  const pulseTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const triggerTilePulse = useCallback((tileId: string) => {
    const existingTimer = pulseTimeoutsRef.current.get(tileId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    setPulsingTileIds((prev) => {
      const next = new Set(prev);
      next.add(tileId);
      return next;
    });
    const timer = setTimeout(() => {
      pulseTimeoutsRef.current.delete(tileId);
      setPulsingTileIds((prev) => {
        const next = new Set(prev);
        next.delete(tileId);
        return next;
      });
    }, 220);
    pulseTimeoutsRef.current.set(tileId, timer);
  }, []);

  // Trigger Game Over (Quick Play & Solo Play)
  const triggerGameOver = useCallback((customReason?: string) => {
    if (screenRef.current !== 'PLAYING') return;

    soundManager.playGameOver();
    const reasonText = customReason || 'The tiles reached the top!';
    setGameOverReason(reasonText);

    const activePlayer = currentSoloPlayerRef.current;
    const roundSec = activeRoundSecondsRef.current;
    const practiceMode = isPracticeRef.current || roundSec <= 0;

    if (practiceMode) {
      setGameOverStats({ rank: -1, isNewHighScore: false });
      setLastSoloResult(null);
      setScreen('GAMEOVER');
      return;
    }

    const timeBucket = makeTimeBucketKey('timer', roundSec);
    const mode = activePlayer ? 'solo' : 'quick';

    if (activePlayer) {
      recordSoloPlayerResult(activePlayer.name, activePlayer.logo, scoreRef.current);
    }

    const stats = saveHighScore({
      mode,
      mathMode: mathModeRef.current,
      simpleOperator: simpleOperatorRef.current,
      timeBucket,
      timeSeconds: roundSec,
      difficulty: difficultyRef.current,
      target: targetRef.current,
      isPractice: false,
      score: scoreRef.current,
      longestEquation: longestEquationRef.current || '-',
      totalEquations: totalEquationsClearedRef.current,
      playerName: activePlayer?.name,
      playerLogo: activePlayer?.logo,
    });
    setGameOverStats({ rank: stats.rank, isNewHighScore: stats.isNewHighScore });

    if (activePlayer) {
      setLastSoloResult({
        entryId: stats.entryId,
        mode: 'solo',
        mathMode: mathModeRef.current,
        operator: mathModeRef.current === 'operator' ? 'mixed' : simpleOperatorRef.current,
        timeBucket,
        difficulty: difficultyRef.current,
        target: targetRef.current,
        targetBand: getTargetBand(targetRef.current, false),
        isPractice: false,
        playerName: activePlayer.name,
        playerLogo: activePlayer.logo,
        score: scoreRef.current,
        totalEquations: totalEquationsClearedRef.current,
        longestEquation: longestEquationRef.current || '-',
        rank: stats.rank,
        isNewHighScore: stats.isNewHighScore,
        reason: reasonText,
      });
      setScreen('HIGHSCORES');
    } else {
      setLastSoloResult(null);
      setScreen('GAMEOVER');
    }
  }, []);

  // Classroom: Complete turn and rotate
  const handleCompleteTurn = useCallback(
    (reason: 'time_up' | 'equations_met' | 'board_filled' | 'passed') => {
      soundManager.playWordSuccess(4);
      if (!classroomMatchRef.current) return;

      const cur = classroomMatchRef.current;
      const curTeamIdx = cur.currentTeamIndex;
      const curTeam = cur.config.teams[curTeamIdx];

      fallingTilesRef.current = [];
      setFallingTiles([]);
      setSelectedTiles([]);

      const turnSummary: TurnSummary = {
        teamName: curTeam.name,
        teamEmoji: curTeam.emoji,
        teamColor: curTeam.color,
        pointsEarned: cur.turnScoreGained,
        equationsFound: [...activeTurnEquationsRef.current],
        reason,
      };

      const updatedTeams = cur.config.teams.map((t, idx) => {
        if (idx === curTeamIdx) {
          return {
            ...t,
            score: t.score + cur.turnScoreGained,
            equationsFound: [...t.equationsFound, ...activeTurnEquationsRef.current],
            turnsCompleted: t.turnsCompleted + 1,
          };
        }
        return t;
      });

      const nextTeamIndex = (curTeamIdx + 1) % updatedTeams.length;
      let nextRound = cur.currentRound;
      if (nextTeamIndex === 0) {
        nextRound += 1;
      }

      const isFinished = cur.config.totalRounds > 0 && nextRound > cur.config.totalRounds;

      const updatedMatch: ClassroomMatchState = {
        ...cur,
        config: {
          ...cur.config,
          teams: updatedTeams,
        },
        currentTeamIndex: nextTeamIndex,
        currentRound: nextRound,
        isMatchFinished: isFinished,
        turnEquationsCount: 0,
        turnScoreGained: 0,
        turnTimeLeft: cur.config.turnSeconds,
        lastTurnSummary: turnSummary,
      };

      setClassroomMatch(updatedMatch);
      classroomMatchRef.current = updatedMatch;

      if (isFinished) {
        const teamBucket =
          cur.config.turnCondition === 'timer'
            ? makeTimeBucketKey('timer', cur.config.turnSeconds)
            : makeTimeBucketKey('equations', cur.config.turnEquationsTarget);
        const teamTimeSec =
          cur.config.turnCondition === 'timer' ? cur.config.turnSeconds : undefined;

        updatedTeams.forEach((team) => {
          const teamBest = team.equationsFound.reduce(
            (best, eq) => (!best || eq.score > best.score ? eq : best),
            null as EquationEntry | null
          );
          saveHighScore({
            mode: 'team',
            mathMode: cur.config.mathMode,
            simpleOperator: cur.config.simpleOperator,
            timeBucket: teamBucket,
            timeSeconds: teamTimeSec,
            difficulty: difficultyRef.current,
            target: cur.config.target,
            isPractice: false,
            score: team.score,
            longestEquation: teamBest?.equation || '-',
            totalEquations: team.equationsFound.length,
            playerName: team.name,
            playerLogo: team.emoji,
            allowZeroScore: true,
          });
        });

        setScreen('CLASSROOM_VICTORY');
      } else {
        setScreen('CLASSROOM_TURN_TRANSITION');
      }
    },
    []
  );

  // If the board would fill with NO solution, replace 3 random tiles with helpers instead of ending the game.
  const tryRescueBoardOnCeiling = useCallback(
    (overflowTileId?: string): boolean => {
      const liveFrozen = frozenTilesRef.current.filter((t) => t.isFrozen && !t.isClearing);
      const checkRefs: BoardTileRef[] = liveFrozen.map((t) => ({ id: t.id, tile: t.tile }));

      const res = checkBoardSolvable(
        checkRefs,
        targetRef.current,
        difficultyRef.current,
        mathModeRef.current,
        {
          simpleOperator: simpleOperatorRef.current,
          timeBudgetMs: 5,
        }
      );

      if (res.solvable) {
        return false; // Solution exists; normal ceiling end
      }

      const curTileH = (Math.sqrt(3) * freePlaySettingsRef.current.tileRadius) / 2;
      const curCeiling = freePlaySettingsRef.current.ceilingHeight;

      // Remove overflowing tile (and any tile protruding above ceiling) so stack stays playable
      const basePool = frozenTilesRef.current.filter(
        (t) => t.id !== overflowTileId && t.y + curTileH > curCeiling
      );
      if (basePool.length < 3) {
        return false;
      }

      const replacements = computeBoardRescueReplacements({
        frozenTiles: basePool.map((t) => ({ id: t.id, tile: t.tile })),
        target: targetRef.current,
        difficulty: difficultyRef.current,
        mathMode: mathModeRef.current,
        simpleOperator: simpleOperatorRef.current,
        rng: rngRef.current,
      });

      if (replacements.length === 0) {
        return false;
      }

      const replaceMap = new Map<string, MathTileInfo>(
        replacements.map((r) => [r.id, r.newTile])
      );

      const nextFrozen = basePool.map((t) =>
        replaceMap.has(t.id) ? { ...t, tile: replaceMap.get(t.id)! } : t
      );

      frozenTilesRef.current = nextFrozen;
      setFrozenTiles(nextFrozen);

      // Clear any selection referencing replaced/removed tiles
      setSelectedTiles((prev) => {
        const filtered = prev.filter((st) => nextFrozen.some((nf) => nf.id === st.id && !replaceMap.has(nf.id)));
        if (filtered.length !== prev.length) {
          return [];
        }
        return prev;
      });

      replacements.forEach((r) => triggerTilePulse(r.id));
      soundManager.playSelect();
      return true;
    },
    [triggerTilePulse]
  );

  // Spawn next falling hexagon using weights + Solvability Director
  const spawnNextHexagon = useCallback(() => {
    if (screenRef.current !== 'PLAYING') return;

    const activeWidth = boardWidthRef.current;
    const curTileRadius = freePlaySettingsRef.current.tileRadius;
    const curTileH = (Math.sqrt(3) * curTileRadius) / 2;

    const wallPct = freePlaySettingsRef.current.wallWidthPct;
    let left = 0;
    let right = activeWidth;
    if (wallPct < 100) {
      const effW = Math.round(activeWidth * (wallPct / 100));
      left = Math.round((activeWidth - effW) / 2);
      right = left + effW;
    }
    let minX = left + curTileRadius + 8;
    let maxX = right - curTileRadius - 8;
    if (minX >= maxX) {
      minX = left + curTileRadius;
      maxX = right - curTileRadius;
    }

    const randomX = minX + rngRef.current() * (maxX - minX);

    // Check ceiling breach
    const curCeilingY = freePlaySettingsRef.current.ceilingHeight;
    const liveFrozen = frozenTilesRef.current.filter((t) => t.isFrozen && !t.isClearing);
    if (liveFrozen.some((t) => t.y + curTileH <= curCeilingY)) {
      const rescued = tryRescueBoardOnCeiling();
      if (!rescued) {
        if (classroomMatchRef.current) {
          handleCompleteTurn('board_filled');
          return;
        }
        triggerGameOver();
        return;
      }
    }

    const allRefs: BoardTileRef[] = [
      ...frozenTilesRef.current,
      ...fallingTilesRef.current,
    ]
      .filter((t) => !t.isClearing)
      .map((t) => ({ id: t.id, tile: t.tile }));

    // Solvability Director: if unsolvable, spawn a helper (capped at <= 1 in 4 spawns)
    const canSpawnHelper = !recentHelperFlagsRef.current.slice(-3).some(Boolean);
    const needsHelper = !solvabilityStateRef.current.solvable && allRefs.length >= 1;

    let drawnTile: MathTileInfo;
    let usedHelper = false;

    if (needsHelper && canSpawnHelper) {
      const picked = pickHelperTile({
        boardTiles: allRefs,
        target: targetRef.current,
        difficulty: difficultyRef.current,
        mathMode: mathModeRef.current,
        simpleOperator: simpleOperatorRef.current,
        rng: rngRef.current,
      });
      drawnTile = picked.tile;
      usedHelper = picked.createdSolution;
    } else {
      drawnTile = drawMathTile({
        difficulty: difficultyRef.current,
        mathMode: mathModeRef.current,
        simpleOperator: simpleOperatorRef.current,
        target: targetRef.current,
        boardTiles: allRefs.map((b) => b.tile),
        rng: rngRef.current,
      });
    }

    recentHelperFlagsRef.current = [...recentHelperFlagsRef.current.slice(-11), usedHelper];

    const newTile: HexTile = {
      id: `tile_${Date.now()}_${Math.floor(rngRef.current() * 1e6)}_${Math.floor(performance.now() * 100)}`,
      tile: drawnTile,
      x: randomX,
      y: SPAWN_Y,
      targetY: SPAWN_Y,
      isFrozen: false,
      isFalling: true,
      isSelected: false,
    };

    const nextList = [...fallingTilesRef.current, newTile];
    fallingTilesRef.current = nextList;
    setFallingTiles(nextList);
  }, [triggerGameOver, handleCompleteTurn, tryRescueBoardOnCeiling]);

  // Free Play Round Timer
  useEffect(() => {
    if (
      screen !== 'PLAYING' ||
      freePlayTimeLeft === null ||
      isPractice ||
      classroomMatch !== null
    ) {
      return;
    }

    const timer = setInterval(() => {
      setFreePlayTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          triggerGameOver("Time's up! Great run!");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [screen, freePlayTimeLeft, isPractice, classroomMatch, triggerGameOver]);

  // Classroom Turn Timer
  useEffect(() => {
    if (
      screen !== 'PLAYING' ||
      !classroomMatch ||
      classroomMatch.config.turnCondition !== 'timer'
    ) {
      return;
    }

    const timer = setInterval(() => {
      setClassroomMatch((prev) => {
        if (!prev) return null;
        if (prev.turnTimeLeft <= 1) {
          clearInterval(timer);
          handleCompleteTurn('time_up');
          return { ...prev, turnTimeLeft: 0 };
        }
        return { ...prev, turnTimeLeft: prev.turnTimeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    screen,
    classroomMatch?.currentTeamIndex,
    classroomMatch?.currentRound,
    classroomMatch?.config.turnCondition,
    handleCompleteTurn,
  ]);

  // Start Solo / Quick game
  const handleStartGame = (overrides?: {
    timeLimit?: number;
    dropSpeed?: number;
    spawnIntervalMs?: number;
    dynamicPace?: boolean;
    mathMode?: MathMode;
    simpleOperator?: MathOperator;
    target?: number;
    isPractice?: boolean;
  }) => {
    setClassroomMatch(null);
    classroomMatchRef.current = null;

    const preset = DIFFICULTY_PRESETS[difficultyRef.current];
    const nextMathMode = overrides?.mathMode ?? mathModeRef.current;
    const allowed = getAllowedOperators(difficultyRef.current);
    const requestedOp = overrides?.simpleOperator ?? simpleOperatorRef.current;
    const nextSimpleOp: MathOperator = allowed.includes(requestedOp) ? requestedOp : '+';
    const requiresComp = nextMathMode === 'simple' && nextSimpleOp === '×';
    const nextTarget = clampTarget(
      overrides?.target ?? targetRef.current,
      requiresComp
    );
    const nextPractice = overrides?.isPractice ?? false;
    const effectiveTimeLimit =
      nextPractice
        ? 0
        : overrides?.timeLimit !== undefined
        ? overrides.timeLimit
        : freePlaySettingsRef.current.timeLimit;

    setMathMode(nextMathMode);
    mathModeRef.current = nextMathMode;
    setSimpleOperator(nextSimpleOp);
    simpleOperatorRef.current = nextSimpleOp;
    setTarget(nextTarget);
    targetRef.current = nextTarget;
    setIsPractice(nextPractice);
    isPracticeRef.current = nextPractice;

    rngRef.current = Math.random;
    recentHelperFlagsRef.current = [];
    solvabilityStateRef.current = { solvable: true, solutionTileIds: [] };
    lastInputTimeRef.current = Date.now();

    setScore(0);
    scoreRef.current = 0;
    setLongestEquation('');
    longestEquationRef.current = '';
    setBestEquationScore(0);
    setTotalEquationsCleared(0);
    totalEquationsClearedRef.current = 0;
    setEquationHistory([]);
    frozenTilesRef.current = [];
    fallingTilesRef.current = [];
    setFrozenTiles([]);
    setFallingTiles([]);
    setSelectedTiles([]);
    setFloatingScores([]);
    setPulsingTileIds(new Set());
    setHintTileIds(new Set());
    setErrorMessage(null);
    setIsShaking(false);
    spawnTimerRef.current = 0;
    lastTimeRef.current = performance.now();

    freePlaySpeedRef.current =
      overrides?.dropSpeed ?? freePlaySettingsRef.current.dropSpeed ?? preset.dropSpeed;
    spawnIntervalRef.current = overrides?.spawnIntervalMs ?? preset.spawnIntervalMs;
    dynamicPaceEnabledRef.current =
      overrides?.dynamicPace ?? freePlaySettingsRef.current.speedIncreaseEnabled;

    activeRoundSecondsRef.current = effectiveTimeLimit;
    if (!nextPractice && effectiveTimeLimit > 0) {
      setFreePlayTimeLeft(effectiveTimeLimit);
    } else {
      setFreePlayTimeLeft(null);
    }

    setScreen('PLAYING');

    setTimeout(() => {
      spawnNextHexagon();
    }, 280);
  };

  // Quick Play: 60s, uses player's chosen Target, Operator, Difficulty & MathMode
  const launchQuickPlayWithConfig = (
    diffLevel: DifficultyLevel,
    mode: MathMode,
    op: MathOperator,
    chosenTarget: number,
    timeLimitSec: number
  ) => {
    setCurrentSoloPlayer(null);
    currentSoloPlayerRef.current = null;
    setLastSoloResult(null);

    const preset = DIFFICULTY_PRESETS[diffLevel];
    const allowed = getAllowedOperators(diffLevel);
    const safeOp: MathOperator = allowed.includes(op) ? op : '+';
    const safeTarget = clampTarget(chosenTarget, mode === 'simple' && safeOp === '×');

    lastQuickPlayConfigRef.current = {
      difficulty: diffLevel,
      mathMode: mode,
      simpleOperator: safeOp,
      target: safeTarget,
      timeLimit: timeLimitSec,
    };

    const quickSettings: FreePlaySettings = {
      ...DEFAULT_FREE_PLAY_SETTINGS,
      dropSpeed: preset.dropSpeed,
      tileRadius: preset.tileRadius,
      ceilingHeight: preset.ceilingHeight,
      speedIncreaseRate: preset.speedIncreaseRate,
      mathMode: mode,
      simpleOperator: safeOp,
      target: safeTarget,
      timeLimit: timeLimitSec,
      isPractice: false,
      speedIncreaseEnabled: true,
    };
    handleUpdateFreePlaySettings(quickSettings);

    handleStartGame({
      timeLimit: timeLimitSec,
      dropSpeed: preset.dropSpeed,
      spawnIntervalMs: preset.spawnIntervalMs,
      dynamicPace: true,
      mathMode: mode,
      simpleOperator: safeOp,
      target: safeTarget,
      isPractice: false,
    });
  };

  const handleQuickPlay = () => {
    launchQuickPlayWithConfig(
      difficultyRef.current,
      mathModeRef.current,
      simpleOperatorRef.current,
      targetRef.current,
      60
    );
  };

  const handleQuickPlayAgain = () => {
    const {
      difficulty: savedDiff,
      mathMode: savedMode,
      simpleOperator: savedOp,
      target: savedTarget,
      timeLimit,
    } = lastQuickPlayConfigRef.current;
    launchQuickPlayWithConfig(savedDiff, savedMode, savedOp, savedTarget, timeLimit);
  };

  // Named Solo Play
  const handleStartNamedSolo = (
    playerName: string,
    playerLogo: string,
    chosenMathMode: MathMode,
    chosenSimpleOp: MathOperator,
    chosenTarget: number,
    roundSeconds: number,
    chosenPractice: boolean
  ) => {
    const player = { name: playerName, logo: playerLogo };
    setCurrentSoloPlayer(player);
    currentSoloPlayerRef.current = player;
    setLastSoloResult(null);
    setIsSoloSetupOpen(false);

    const preset = DIFFICULTY_PRESETS[difficultyRef.current];
    const allowed = getAllowedOperators(difficultyRef.current);
    const safeOp: MathOperator = allowed.includes(chosenSimpleOp) ? chosenSimpleOp : '+';
    const safeTarget = clampTarget(
      chosenTarget,
      chosenMathMode === 'simple' && safeOp === '×'
    );

    saveMathMode(chosenMathMode);
    saveSimpleOperator(safeOp);
    saveTarget(safeTarget);

    const soloSettings: FreePlaySettings = {
      ...freePlaySettingsRef.current,
      dropSpeed: preset.dropSpeed,
      tileRadius: preset.tileRadius,
      ceilingHeight: preset.ceilingHeight,
      speedIncreaseRate: preset.speedIncreaseRate,
      mathMode: chosenMathMode,
      simpleOperator: safeOp,
      target: safeTarget,
      timeLimit: chosenPractice ? 0 : roundSeconds,
      isPractice: chosenPractice,
      speedIncreaseEnabled: true,
    };
    handleUpdateFreePlaySettings(soloSettings);

    handleStartGame({
      timeLimit: chosenPractice ? 0 : roundSeconds,
      dropSpeed: preset.dropSpeed,
      spawnIntervalMs: preset.spawnIntervalMs,
      dynamicPace: true,
      mathMode: chosenMathMode,
      simpleOperator: safeOp,
      target: safeTarget,
      isPractice: chosenPractice,
    });
  };

  // Classroom Match Start
  const handleStartClassroomMatch = (config: ClassroomConfig) => {
    const preset = DIFFICULTY_PRESETS[difficultyRef.current];
    const allowed = getAllowedOperators(difficultyRef.current);
    const safeOp: MathOperator = allowed.includes(config.simpleOperator)
      ? config.simpleOperator
      : '+';
    const safeTarget = clampTarget(
      config.target,
      config.mathMode === 'simple' && safeOp === '×'
    );
    const normalizedConfig: ClassroomConfig = {
      ...config,
      simpleOperator: safeOp,
      target: safeTarget,
    };

    handleUpdateFreePlaySettings({
      ...freePlaySettingsRef.current,
      dropSpeed: preset.dropSpeed,
      tileRadius: preset.tileRadius,
      ceilingHeight: preset.ceilingHeight,
      speedIncreaseRate: preset.speedIncreaseRate,
      mathMode: normalizedConfig.mathMode,
      simpleOperator: normalizedConfig.simpleOperator,
      target: normalizedConfig.target,
      isPractice: false,
    });
    spawnIntervalRef.current = preset.spawnIntervalMs;
    setMathMode(normalizedConfig.mathMode);
    mathModeRef.current = normalizedConfig.mathMode;
    setSimpleOperator(normalizedConfig.simpleOperator);
    simpleOperatorRef.current = normalizedConfig.simpleOperator;
    setTarget(normalizedConfig.target);
    targetRef.current = normalizedConfig.target;
    saveMathMode(normalizedConfig.mathMode);
    saveSimpleOperator(normalizedConfig.simpleOperator);
    saveTarget(normalizedConfig.target);
    setIsPractice(false);
    isPracticeRef.current = false;

    const initialState: ClassroomMatchState = {
      config: normalizedConfig,
      currentTeamIndex: 0,
      currentRound: 1,
      isMatchFinished: false,
      turnEquationsCount: 0,
      turnScoreGained: 0,
      turnTimeLeft: normalizedConfig.turnSeconds,
      lastTurnSummary: null,
    };

    setClassroomMatch(initialState);
    classroomMatchRef.current = initialState;
    setIsClassroomSetupOpen(false);
    setEquationHistory([]);
    setScreen('CLASSROOM_TURN_TRANSITION');
  };

  // Classroom Turn Start (seeded RNG shared per round across all teams)
  const handleStartClassroomTurn = () => {
    if (!classroomMatchRef.current) return;
    const cur = classroomMatchRef.current;
    const activeTeam = cur.config.teams[cur.currentTeamIndex];
    const preset = DIFFICULTY_PRESETS[difficultyRef.current];
    spawnIntervalRef.current = preset.spawnIntervalMs;
    freePlaySpeedRef.current = preset.dropSpeed;

    setMathMode(cur.config.mathMode);
    mathModeRef.current = cur.config.mathMode;
    setSimpleOperator(cur.config.simpleOperator);
    simpleOperatorRef.current = cur.config.simpleOperator;
    setTarget(cur.config.target);
    targetRef.current = cur.config.target;
    setIsPractice(false);
    isPracticeRef.current = false;

    // Seed PRNG deterministically so teams share identical spawn patterns per round
    rngRef.current = createSeededRng(cur.config.spawnSeed + (cur.currentRound - 1) * 997);
    recentHelperFlagsRef.current = [];
    solvabilityStateRef.current = { solvable: true, solutionTileIds: [] };
    lastInputTimeRef.current = Date.now();

    if (cur.config.cleanBoardEachTurn) {
      frozenTilesRef.current = [];
      setFrozenTiles([]);
      fallingTilesRef.current = [];
      setFallingTiles([]);
      setSelectedTiles([]);
      setFloatingScores([]);
      setPulsingTileIds(new Set());
      setHintTileIds(new Set());
    } else {
      fallingTilesRef.current = [];
      setFallingTiles([]);
    }

    setActiveTurnEquations([]);
    activeTurnEquationsRef.current = [];

    setScore(activeTeam.score);
    scoreRef.current = activeTeam.score;

    setClassroomMatch({
      ...cur,
      turnEquationsCount: 0,
      turnScoreGained: 0,
      turnTimeLeft: cur.config.turnSeconds,
    });

    setErrorMessage(null);
    setIsShaking(false);
    lastTimeRef.current = performance.now();

    setScreen('PLAYING');

    setTimeout(() => {
      spawnNextHexagon();
    }, 320);
  };

  const handleClassroomRematch = () => {
    if (!classroomMatchRef.current) return;
    const cur = classroomMatchRef.current;
    const resetTeams = cur.config.teams.map((t) => ({
      ...t,
      score: 0,
      equationsFound: [],
      turnsCompleted: 0,
    }));

    const freshMatch: ClassroomMatchState = {
      ...cur,
      config: {
        ...cur.config,
        teams: resetTeams,
      },
      currentTeamIndex: 0,
      currentRound: 1,
      isMatchFinished: false,
      turnEquationsCount: 0,
      turnScoreGained: 0,
      turnTimeLeft: cur.config.turnSeconds,
      lastTurnSummary: null,
    };

    setClassroomMatch(freshMatch);
    classroomMatchRef.current = freshMatch;
    setEquationHistory([]);
    setScreen('CLASSROOM_TURN_TRANSITION');
  };

  const handleExitClassroomToMenu = () => {
    setClassroomMatch(null);
    classroomMatchRef.current = null;
    setScreen('MENU');
  };

  // Remove specific tile from selection
  const handleRemoveTile = useCallback(
    (tile: HexTile) => {
      markUserInput();
      const idx = selectedTiles.findIndex((t) => t.id === tile.id);
      if (idx === -1) return;

      soundManager.playDeselect();
      triggerTilePulse(tile.id);

      setSelectedTiles((prev) => prev.filter((_, i) => i !== idx));
      setErrorMessage(null);
    },
    [markUserInput, selectedTiles, triggerTilePulse]
  );

  // Tile click toggle
  const handleTileClick = (tile: HexTile) => {
    if (screen !== 'PLAYING' || tile.isClearing) return;
    markUserInput();
    setErrorMessage(null);
    triggerTilePulse(tile.id);

    const existingIdx = selectedTiles.findIndex((t) => t.id === tile.id);
    if (existingIdx !== -1) {
      handleRemoveTile(tile);
      return;
    }

    if (mathModeRef.current === 'simple') {
      if (tile.tile.kind !== 'number') return;
      if (selectedTiles.length >= 6) {
        soundManager.playWordInvalid();
        setIsShaking(true);
        setErrorMessage('Max 6 numbers');
        setTimeout(() => setIsShaking(false), 350);
        return;
      }
      soundManager.playSelect();
      setSelectedTiles((prev) => [...prev, tile]);
    } else {
      const nextNumCount =
        selectedTiles.filter((t) => t.tile.kind === 'number').length +
        (tile.tile.kind === 'number' ? 1 : 0);
      if (nextNumCount > 6 || selectedTiles.length >= 11) {
        soundManager.playWordInvalid();
        setIsShaking(true);
        setErrorMessage('Max 6 numbers');
        setTimeout(() => setIsShaking(false), 350);
        return;
      }
      soundManager.playSelect();
      setSelectedTiles((prev) => [...prev, tile]);
    }
  };

  const handleClearSelection = useCallback(() => {
    markUserInput();
    if (selectedTiles.length === 0) return;
    soundManager.playDeselect();
    selectedTiles.forEach((t) => triggerTilePulse(t.id));
    setSelectedTiles([]);
    setErrorMessage(null);
  }, [markUserInput, selectedTiles, triggerTilePulse]);

  const bumpPaceOnEquation = () => {
    if (
      !classroomMatchRef.current &&
      (dynamicPaceEnabledRef.current || freePlaySettingsRef.current.speedIncreaseEnabled)
    ) {
      const preset = DIFFICULTY_PRESETS[difficultyRef.current];
      const baseSpeed = freePlaySettingsRef.current.dropSpeed || preset.dropSpeed;
      const bump =
        1 + (freePlaySettingsRef.current.speedIncreaseRate || preset.speedIncreaseRate) / 100;
      freePlaySpeedRef.current = Math.min(
        freePlaySpeedRef.current * bump,
        baseSpeed * preset.maxSpeedMultiplier
      );
      spawnIntervalRef.current = Math.max(
        preset.minSpawnIntervalMs,
        Math.round(spawnIntervalRef.current * preset.spawnAccelFactor)
      );
    }
  };

  // Submit current equation
  const handleSubmitEquation = () => {
    if (screen !== 'PLAYING') return;
    markUserInput();

    if (selectedTiles.length === 0) return;

    const activeDiff = difficultyRef.current;
    const activeMath = mathModeRef.current;
    const activeTarget = targetRef.current;

    let eqString = '';
    let numberCount = 0;
    let evalRes;

    if (activeMath === 'simple') {
      const nums = selectedTiles.map((t) => t.tile.numValue ?? 0);
      const ops = new Array<MathOperator>(Math.max(0, nums.length - 1)).fill(
        simpleOperatorRef.current
      );
      eqString = formatEquationString(nums, ops);
      numberCount = nums.length;
      evalRes = evaluateEquation(nums, ops, {
        difficulty: activeDiff,
        mathMode: activeMath,
        target: activeTarget,
      });
    } else {
      const tokens = selectedTiles.map((t) => t.tile);
      eqString = tokens.map((t) => t.display).join(' ');
      numberCount = tokens.filter((t) => t.kind === 'number').length;
      evalRes = evaluateOperatorTokens(tokens, {
        difficulty: activeDiff,
        mathMode: activeMath,
        target: activeTarget,
      });
    }

    if (!evalRes.isValidMath || !evalRes.matchesTarget) {
      soundManager.playWordInvalid();
      setIsShaking(true);
      selectedTiles.forEach((t) => triggerTilePulse(t.id));
      setErrorMessage(
        evalRes.error ||
          (evalRes.result !== null ? `Got ${evalRes.result}, need ${activeTarget}` : 'Invalid equation')
      );
      // Clear selection on failure per spec
      setSelectedTiles([]);
      setTimeout(() => setIsShaking(false), 400);
      return;
    }

    // VALID EQUATION!
    bumpPaceOnEquation();
    const pointsAwarded = evalRes.score;
    const popupText = `+${pointsAwarded}`;

    const newEntry: EquationEntry = {
      id: `eq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      equation: eqString,
      score: pointsAwarded,
      numberCount,
      target: activeTarget,
      timestamp: Date.now(),
    };
    setEquationHistory((prev) => [...prev, newEntry]);

    const newScore = score + pointsAwarded;
    setScore(newScore);
    scoreRef.current = newScore;
    setTotalEquationsCleared((prev) => {
      const next = prev + 1;
      totalEquationsClearedRef.current = next;
      return next;
    });

    if (pointsAwarded >= bestEquationScore) {
      setBestEquationScore(pointsAwarded);
      setLongestEquation(eqString);
      longestEquationRef.current = eqString;
    }

    soundManager.playWordSuccess(numberCount);

    if (numberCount >= 4 || pointsAwarded >= 15) {
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.4 },
      });
    }

    // Floating score popup
    const liveTileLookup = new Map<string, HexTile>();
    for (const t of frozenTilesRef.current) liveTileLookup.set(t.id, t);
    for (const t of fallingTilesRef.current) liveTileLookup.set(t.id, t);
    const liveSelected = selectedTiles.map((t) => liveTileLookup.get(t.id) || t);
    const avgX = liveSelected.reduce((sum, t) => sum + t.x, 0) / liveSelected.length;
    const avgY = liveSelected.reduce((sum, t) => sum + t.y, 0) / liveSelected.length;

    const newScorePopup: FloatingScore = {
      id: 'score_' + Date.now(),
      text: popupText,
      points: pointsAwarded,
      x: avgX,
      y: avgY,
    };
    setFloatingScores((prev) => [...prev, newScorePopup]);
    setTimeout(() => {
      setFloatingScores((prev) => prev.filter((s) => s.id !== newScorePopup.id));
    }, 850);

    // Classroom Match tracking
    let shouldCompleteEquationsGoal = false;
    if (classroomMatchRef.current) {
      const cur = classroomMatchRef.current;
      const nextTurnScore = cur.turnScoreGained + pointsAwarded;
      const nextTurnEq = cur.turnEquationsCount + 1;
      setActiveTurnEquations((prev) => [...prev, newEntry]);
      activeTurnEquationsRef.current = [...activeTurnEquationsRef.current, newEntry];

      const updatedMatch: ClassroomMatchState = {
        ...cur,
        turnScoreGained: nextTurnScore,
        turnEquationsCount: nextTurnEq,
      };
      setClassroomMatch(updatedMatch);
      classroomMatchRef.current = updatedMatch;

      if (
        cur.config.turnCondition === 'equations' &&
        nextTurnEq >= cur.config.turnEquationsTarget
      ) {
        shouldCompleteEquationsGoal = true;
      }
    }

    // Animate & clear selected tiles
    const selectedIds = new Set(selectedTiles.map((t) => t.id));
    frozenTilesRef.current = frozenTilesRef.current.map((t) =>
      selectedIds.has(t.id) ? { ...t, isClearing: true } : t
    );
    fallingTilesRef.current = fallingTilesRef.current.map((t) =>
      selectedIds.has(t.id) ? { ...t, isClearing: true } : t
    );
    setFrozenTiles([...frozenTilesRef.current]);
    setFallingTiles([...fallingTilesRef.current]);
    setSelectedTiles([]);
    setErrorMessage(null);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const collapseDelayMs = prefersReducedMotion ? 40 : 320;

    setTimeout(() => {
      const remainingFalling = fallingTilesRef.current.filter((t) => !selectedIds.has(t.id));
      fallingTilesRef.current = remainingFalling;
      setFallingTiles(remainingFalling);

      const remainingTiles = frozenTilesRef.current.filter((t) => !selectedIds.has(t.id));
      const curTileRadius = freePlaySettingsRef.current.tileRadius;
      const groundedIds = findGroundedHexIds(remainingTiles, GROUND_Y, curTileRadius);

      const updated = remainingTiles.map((t) => {
        const isGrounded = groundedIds.has(t.id);
        return {
          ...t,
          isFrozen: isGrounded,
          isFalling: !isGrounded,
        };
      });

      frozenTilesRef.current = updated;
      setFrozenTiles(updated);

      if (shouldCompleteEquationsGoal) {
        setTimeout(() => {
          handleCompleteTurn('equations_met');
        }, 300);
      }
    }, collapseDelayMs);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        screen !== 'PLAYING' ||
        isEquationHistoryOpen ||
        isHowToPlayOpen ||
        isClassroomScoreboardOpen ||
        isFreePlaySettingsOpen
      ) {
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmitEquation();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClearSelection();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        if (selectedTiles.length > 0) {
          handleRemoveTile(selectedTiles[selectedTiles.length - 1]);
        }
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setScreen('PAUSED');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Main Physics & Falling Loop
  useEffect(() => {
    if (screen !== 'PLAYING') {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }
      return;
    }

    lastTimeRef.current = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = currentTime;

      const curTileRadius = freePlaySettingsRef.current.tileRadius;
      const curTileH = (Math.sqrt(3) * curTileRadius) / 2;
      const curCeiling = freePlaySettingsRef.current.ceilingHeight;
      const effectiveGroundY = GROUND_Y;
      const baseFallSpeed =
        !classroomMatchRef.current &&
        (dynamicPaceEnabledRef.current || freePlaySettingsRef.current.speedIncreaseEnabled)
          ? freePlaySpeedRef.current
          : freePlaySettingsRef.current.dropSpeed;
      const activeFallSpeed = baseFallSpeed * speedMultiplierRef.current;

      // 1. Update falling hexagons
      const currentFallingList = [...fallingTilesRef.current];
      if (currentFallingList.length > 0) {
        currentFallingList.sort((a, b) => b.y - a.y);
        const liveFrozen = frozenTilesRef.current.filter((t) => t.isFrozen);
        const remainingFalling: HexTile[] = [];
        let anyLanded = false;

        for (const tile of currentFallingList) {
          if (tile.isClearing) {
            remainingFalling.push(tile);
            continue;
          }

          const liveLandingY = findLandingY(
            tile.x,
            tile.y,
            liveFrozen,
            effectiveGroundY,
            curTileRadius
          );
          const nextY = tile.y + activeFallSpeed * dt;

          if (nextY >= liveLandingY) {
            soundManager.playTileDrop();
            anyLanded = true;
            const frozenHex: HexTile = {
              ...tile,
              y: liveLandingY,
              isFalling: false,
              isFrozen: true,
            };

            liveFrozen.push(frozenHex);
            if (!frozenTilesRef.current.some((t) => t.id === frozenHex.id)) {
              frozenTilesRef.current = [...frozenTilesRef.current, frozenHex];
            }

            if (frozenHex.y + curTileH <= curCeiling) {
              const rescued = tryRescueBoardOnCeiling(frozenHex.id);
              if (rescued) {
                fallingTilesRef.current = remainingFalling;
                setFallingTiles(remainingFalling);
                animFrameId.current = requestAnimationFrame(loop);
                return;
              }
              setFrozenTiles([...frozenTilesRef.current]);
              fallingTilesRef.current = [];
              setFallingTiles([]);
              if (classroomMatchRef.current) {
                handleCompleteTurn('board_filled');
                return;
              }
              triggerGameOver();
              return;
            }
          } else {
            tile.y = nextY;
            remainingFalling.push(tile);
          }
        }

        fallingTilesRef.current = remainingFalling;
        setFallingTiles(remainingFalling);

        if (anyLanded) {
          setFrozenTiles([...frozenTilesRef.current]);
        }
      }

      // 2. Animate disconnected tiles falling
      const fallingGrounded = frozenTilesRef.current.filter(
        (t) => t.isFalling && !t.isClearing
      );
      if (fallingGrounded.length > 0) {
        fallingGrounded.sort((a, b) => b.y - a.y);
        const liveFrozen = frozenTilesRef.current.filter((t) => t.isFrozen);

        for (const tile of fallingGrounded) {
          const liveLandingY = findLandingY(
            tile.x,
            tile.y,
            liveFrozen,
            effectiveGroundY,
            curTileRadius
          );
          const nextY = tile.y + activeFallSpeed * dt;

          if (nextY >= liveLandingY) {
            tile.y = liveLandingY;
            tile.isFalling = false;
            tile.isFrozen = true;
            liveFrozen.push(tile);
            soundManager.playTileDrop();

            if (tile.y + curTileH <= curCeiling) {
              const rescued = tryRescueBoardOnCeiling(tile.id);
              if (rescued) {
                animFrameId.current = requestAnimationFrame(loop);
                return;
              }
              setFrozenTiles([...frozenTilesRef.current]);
              if (classroomMatchRef.current) {
                handleCompleteTurn('board_filled');
                return;
              }
              triggerGameOver();
              return;
            }
          } else {
            tile.y = nextY;
          }
        }

        setFrozenTiles([...frozenTilesRef.current]);
      }

      // 3. Continuous spawn cadence
      const preset = DIFFICULTY_PRESETS[difficultyRef.current];
      const isWideBoard = boardWidthRef.current > 850;
      const baseInterval = spawnIntervalRef.current || preset.spawnIntervalMs;
      const SPAWN_INTERVAL_MS = Math.max(
        preset.minSpawnIntervalMs,
        isWideBoard ? Math.round(baseInterval * 0.85) : baseInterval
      );
      const baseMaxInFlight = boardWidthRef.current > 1200 ? 5 : isWideBoard ? 4 : 3;
      const MAX_IN_FLIGHT = Math.max(2, baseMaxInFlight + preset.maxInFlightOffset);
      const activeFallingCount = fallingTilesRef.current.filter((t) => !t.isClearing).length;
      if (activeFallingCount < MAX_IN_FLIGHT) {
        if (currentTime >= spawnTimerRef.current) {
          spawnTimerRef.current = currentTime + SPAWN_INTERVAL_MS;
          spawnNextHexagon();
        }
      }

      animFrameId.current = requestAnimationFrame(loop);
    };

    animFrameId.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }
    };
  }, [screen, spawnNextHexagon, triggerGameOver, handleCompleteTurn, tryRescueBoardOnCeiling]);

  const nearCeiling = React.useMemo(() => {
    return frozenTiles.some(
      (t) =>
        t.isFrozen &&
        t.y - (Math.sqrt(3) * freePlaySettings.tileRadius) / 2 <= activeCeilingY + 45
    );
  }, [frozenTiles, activeCeilingY, freePlaySettings.tileRadius]);

  return (
    <main className="w-full h-[100dvh] max-h-[100dvh] flex flex-col items-center justify-between overflow-hidden select-none bg-slate-950 text-slate-100">
      {screen === 'MENU' && (
        <StartMenu
          onQuickPlay={handleQuickPlay}
          onOpenSoloSetup={() => setIsSoloSetupOpen(true)}
          onOpenTeamSetup={() => setIsTeamSetupOpen(true)}
          onOpenHighScores={() => {
            setLastSoloResult(null);
            setScreen('HIGHSCORES');
          }}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          screenMode={screenMode}
          difficulty={difficulty}
          onChangeDifficulty={handleChangeDifficulty}
          mathMode={mathMode}
          onChangeMathMode={handleChangeMathMode}
          simpleOperator={simpleOperator}
          onChangeSimpleOperator={handleChangeSimpleOperator}
          target={target}
          onChangeTarget={handleChangeTarget}
        />
      )}

      {/* Solo Player Setup Modal */}
      <SoloPlayerSetupModal
        isOpen={isSoloSetupOpen}
        onClose={() => setIsSoloSetupOpen(false)}
        onStartSolo={handleStartNamedSolo}
        difficulty={difficulty}
        defaultMathMode={mathMode}
        defaultSimpleOperator={simpleOperator}
        defaultTarget={target}
        isWide={viewMode === 'wide'}
      />

      {/* Team Play Setup Modal */}
      <PlayNowModal
        isOpen={isTeamSetupOpen}
        onClose={() => setIsTeamSetupOpen(false)}
        onLaunchTeamMatch={(config) => {
          setIsTeamSetupOpen(false);
          handleStartClassroomMatch(config);
        }}
        difficulty={difficulty}
        defaultMathMode={mathMode}
        defaultSimpleOperator={simpleOperator}
        defaultTarget={target}
        isWide={viewMode === 'wide'}
      />

      {/* Classroom Setup Modal (from Victory -> Edit Teams) */}
      {isClassroomSetupOpen && (
        <ClassroomSetupModal
          initialConfig={loadClassroomConfig()}
          difficulty={difficulty}
          onStartMatch={handleStartClassroomMatch}
          onClose={() => setIsClassroomSetupOpen(false)}
          isWide={viewMode === 'wide'}
        />
      )}

      {/* Classroom Turn Transition Modal */}
      {screen === 'CLASSROOM_TURN_TRANSITION' && classroomMatch && (
        <TurnTransitionModal
          matchState={classroomMatch}
          onStartTurn={handleStartClassroomTurn}
          onFinishMatchEarly={() => setScreen('CLASSROOM_VICTORY')}
          isWide={viewMode === 'wide'}
        />
      )}

      {/* Classroom Victory Screen */}
      {screen === 'CLASSROOM_VICTORY' && classroomMatch && (
        <ClassroomVictoryModal
          matchState={classroomMatch}
          onRematch={handleClassroomRematch}
          onNewMatchSetup={() => {
            setIsClassroomSetupOpen(true);
            setScreen('MENU');
          }}
          onExitToMenu={handleExitClassroomToMenu}
          isWide={viewMode === 'wide'}
        />
      )}

      {/* Classroom Mid-game Scoreboard Modal */}
      {isClassroomScoreboardOpen && classroomMatch && (
        <ClassroomScoreboardModal
          matchState={classroomMatch}
          onClose={() => setIsClassroomScoreboardOpen(false)}
          onPassTurn={() => {
            setIsClassroomScoreboardOpen(false);
            handleCompleteTurn('passed');
          }}
          onFinishMatchEarly={() => {
            setIsClassroomScoreboardOpen(false);
            setScreen('CLASSROOM_VICTORY');
          }}
          isWide={viewMode === 'wide'}
        />
      )}

      {/* Active Play Viewport */}
      {(screen === 'PLAYING' || screen === 'PAUSED' || screen === 'GAMEOVER') && (
        <div
          className={`w-full h-full ${
            screenMode === 'pc'
              ? 'w-full md:w-[50vw] md:max-w-[50vw] md:min-w-[480px]'
              : 'w-full max-w-full'
          } mx-auto flex flex-col justify-between py-1 px-2 min-h-0 overflow-hidden`}
        >
          <GameHUD
            score={score}
            longestEquation={longestEquation}
            onPause={() => setScreen('PAUSED')}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            viewMode={viewMode}
            timeLeftSec={freePlayTimeLeft}
            isPractice={isPractice}
            freePlaySpeedPct={
              !classroomMatch &&
              (dynamicPaceEnabledRef.current || freePlaySettings.speedIncreaseEnabled)
                ? (freePlaySpeedRef.current / freePlaySettings.dropSpeed) * 100
                : undefined
            }
            equationCount={equationHistory.length}
            onOpenEquationHistory={() => setIsEquationHistoryOpen(true)}
            onOpenHowToPlay={() => setIsHowToPlayOpen(true)}
            target={target}
            mathMode={mathMode}
            simpleOperator={simpleOperator}
            classroomMatch={classroomMatch}
            onOpenScoreboard={() => setIsClassroomScoreboardOpen(true)}
            soloPlayer={currentSoloPlayer}
          />

          <WordBar
            selectedTiles={selectedTiles}
            simpleOperator={simpleOperator}
            mathMode={mathMode}
            difficulty={difficulty}
            target={target}
            onClear={handleClearSelection}
            onSubmit={handleSubmitEquation}
            onRemoveTile={handleRemoveTile}
            isShaking={isShaking}
            errorMessage={errorMessage}
            lastFoundEquation={equationHistory[equationHistory.length - 1] ?? null}
          />

          <div
            ref={boardContainerRef}
            className="flex-1 w-full flex items-center justify-center min-h-0 min-w-0 overflow-hidden pb-1"
          >
            <GameBoard
              boardWidth={boardWidth}
              boardHeight={undefined}
              groundY={undefined}
              frozenTiles={frozenTiles}
              fallingTiles={fallingTiles}
              selectedTiles={selectedTiles}
              floatingScores={floatingScores}
              pulsingTileIds={pulsingTileIds}
              hintTileIds={hintTileIds}
              onTileClick={handleTileClick}
              isPaused={screen === 'PAUSED'}
              nearCeiling={nearCeiling}
              ceilingY={activeCeilingY}
              wallLeft={activeWallBounds.left}
              wallRight={activeWallBounds.right}
              viewMode={viewMode}
              tileRadius={freePlaySettings.tileRadius}
            />
          </div>
        </div>
      )}

      {/* Pause Modal */}
      {screen === 'PAUSED' && (
        <PauseModal
          onResume={() => setScreen('PLAYING')}
          onRestart={
            classroomMatch
              ? handleStartClassroomTurn
              : () => {
                  const preset = DIFFICULTY_PRESETS[difficultyRef.current];
                  if (currentSoloPlayer) {
                    handleStartGame({
                      timeLimit: isPractice ? 0 : freePlaySettingsRef.current.timeLimit || 180,
                      dropSpeed: preset.dropSpeed,
                      spawnIntervalMs: preset.spawnIntervalMs,
                      dynamicPace: true,
                      mathMode: mathModeRef.current,
                      target: targetRef.current,
                      isPractice: isPracticeRef.current,
                    });
                  } else {
                    handleQuickPlayAgain();
                  }
                }
          }
          onQuitToMenu={classroomMatch ? handleExitClassroomToMenu : () => setScreen('MENU')}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          viewMode={viewMode}
          freePlaySettings={freePlaySettings}
          onUpdateFreePlaySettings={handleUpdateFreePlaySettings}
          onResetFreePlaySettings={handleResetFreePlaySettings}
          equationEntries={equationHistory}
          classroomMatch={classroomMatch}
          onPassTurn={() => {
            setScreen('PLAYING');
            handleCompleteTurn('passed');
          }}
          onFinishMatchEarly={() => setScreen('CLASSROOM_VICTORY')}
          onOpenHowToPlay={() => setIsHowToPlayOpen(true)}
        />
      )}

      {/* Game Over Modal */}
      {screen === 'GAMEOVER' && (
        <GameOverModal
          finalScore={score}
          longestEquation={longestEquation}
          totalEquations={totalEquationsCleared}
          rank={gameOverStats.rank}
          isNewHighScore={gameOverStats.isNewHighScore}
          isPractice={isPractice}
          target={target}
          mathMode={mathMode}
          operator={mathMode === 'operator' ? 'mixed' : simpleOperator}
          onNewGame={() => {
            if (currentSoloPlayer) {
              const preset = DIFFICULTY_PRESETS[difficultyRef.current];
              handleStartGame({
                timeLimit: isPractice ? 0 : freePlaySettingsRef.current.timeLimit || 180,
                dropSpeed: preset.dropSpeed,
                spawnIntervalMs: preset.spawnIntervalMs,
                dynamicPace: true,
                mathMode: mathModeRef.current,
                target: targetRef.current,
                isPractice: isPracticeRef.current,
              });
            } else {
              handleQuickPlayAgain();
            }
          }}
          onBackToMenu={() => setScreen('MENU')}
          reason={gameOverReason}
        />
      )}

      {/* High Scores / Leaderboard Modal */}
      {screen === 'HIGHSCORES' && (
        <HighScoresModal
          onBack={() => {
            setLastSoloResult(null);
            setScreen('MENU');
          }}
          onPlayAgain={handleQuickPlay}
          onStartNextStudent={() => {
            setLastSoloResult(null);
            setScreen('MENU');
            setIsSoloSetupOpen(true);
          }}
          lastResult={lastSoloResult}
        />
      )}

      {/* Equation History Modal */}
      {isEquationHistoryOpen && (
        <WordHistoryModal
          equationEntries={equationHistory}
          onClose={() => setIsEquationHistoryOpen(false)}
        />
      )}

      {/* How to Play Modal */}
      {isHowToPlayOpen && <HowToPlayModal onClose={() => setIsHowToPlayOpen(false)} />}

      {/* Free Play Settings Modal */}
      {isFreePlaySettingsOpen && (
        <FreePlaySettingsModal
          settings={freePlaySettings}
          onUpdateSettings={handleUpdateFreePlaySettings}
          onResetSettings={handleResetFreePlaySettings}
          onClose={() => setIsFreePlaySettingsOpen(false)}
          isBeforePlay={screen === 'MENU'}
        />
      )}
    </main>
  );
}
