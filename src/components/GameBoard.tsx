import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { HexTile, FloatingScore, ViewMode, MathOperator } from '../types/game';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  DANGER_Y,
  GROUND_Y,
  HEX_RADIUS,
  getHexPolygonPoints,
  isPointInHex,
} from '../utils/hexPhysics';

interface GameBoardProps {
  boardWidth?: number;
  boardHeight?: number;
  groundY?: number;
  frozenTiles: HexTile[];
  fallingTile?: HexTile | null;
  fallingTiles?: HexTile[];
  selectedTiles: HexTile[];
  floatingScores: FloatingScore[];
  pulsingTileIds: Set<string>;
  hintTileIds?: Set<string>;
  onTileClick: (tile: HexTile) => void;
  isPaused: boolean;
  nearCeiling: boolean;
  ceilingY?: number;
  wallLeft?: number;
  wallRight?: number;
  viewMode?: ViewMode;
  tileRadius?: number;
}

function getOperatorVisuals(op: MathOperator, isFalling: boolean) {
  switch (op) {
    case '+':
      return {
        fill: isFalling ? 'url(#opPlusFalling)' : 'url(#opPlusFrozen)',
        stroke: '#10b981',
        textFill: '#ecfdf5',
      };
    case '−':
      return {
        fill: isFalling ? 'url(#opMinusFalling)' : 'url(#opMinusFrozen)',
        stroke: '#f43f5e',
        textFill: '#fff1f2',
      };
    case '×':
      return {
        fill: isFalling ? 'url(#opMulFalling)' : 'url(#opMulFrozen)',
        stroke: '#8b5cf6',
        textFill: '#f5f3ff',
      };
    case '÷':
      return {
        fill: isFalling ? 'url(#opDivFalling)' : 'url(#opDivFrozen)',
        stroke: '#f97316',
        textFill: '#fff7ed',
      };
  }
}

export const GameBoard: React.FC<GameBoardProps> = ({
  boardWidth = BOARD_WIDTH,
  boardHeight = BOARD_HEIGHT,
  groundY = GROUND_Y,
  frozenTiles,
  fallingTile = null,
  fallingTiles: propFallingTiles,
  selectedTiles,
  floatingScores,
  pulsingTileIds,
  hintTileIds,
  onTileClick,
  nearCeiling,
  ceilingY = DANGER_Y,
  wallLeft = 0,
  wallRight = boardWidth,
  viewMode,
  tileRadius = HEX_RADIUS,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const isPhone = viewMode === 'narrow' || (typeof window !== 'undefined' && window.innerWidth < 640);

  // Scaled for tileRadius (default HEX_RADIUS = 28) — shrink font for 2/3/4-digit numbers so they fit cleanly
  const scale = tileRadius / 28;
  const singleCharFontSize = (isPhone ? 17.5 * scale : 24.0 * scale).toFixed(1);
  const twoCharFontSize = (isPhone ? 13.8 * scale : 19.0 * scale).toFixed(1);
  const threeCharFontSize = (isPhone ? 10.6 * scale : 14.5 * scale).toFixed(1);
  const fourCharFontSize = (isPhone ? 8.8 * scale : 12.0 * scale).toFixed(1);
  const operatorFontSize = (isPhone ? 20.5 * scale : 27.5 * scale).toFixed(1);

  const uniqueFrozenTiles = React.useMemo(() => {
    const seen = new Set<string>();
    return frozenTiles.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [frozenTiles]);

  const selectedMap = new Map<string, number>();
  selectedTiles.forEach((tile, index) => {
    selectedMap.set(tile.id, index + 1);
  });

  const activeFalling = React.useMemo(() => {
    const raw = propFallingTiles
      ? propFallingTiles
      : fallingTile
      ? [fallingTile]
      : [];
    const seen = new Set<string>();
    return raw.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [propFallingTiles, fallingTile]);

  const handleBoardPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const screenCTM = svg.getScreenCTM();
    if (!screenCTM) return;

    const svgCoord = pt.matrixTransform(screenCTM.inverse());
    const px = svgCoord.x;
    const py = svgCoord.y;

    let bestTile: HexTile | null = null;
    let minDistanceSq = Infinity;

    for (const tile of [...activeFalling, ...uniqueFrozenTiles]) {
      if (tile.isClearing) continue;

      if (isPointInHex(px, py, tile.x, tile.y, tileRadius)) {
        const distSq = (px - tile.x) * (px - tile.x) + (py - tile.y) * (py - tile.y);
        if (distSq < minDistanceSq) {
          minDistanceSq = distSq;
          bestTile = tile;
        }
      }
    }

    if (bestTile) {
      onTileClick(bestTile);
    }
  };

  const clearingAnimatedRef = useRef<Set<string>>(new Set());
  const prevFallingIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const allTiles = [...uniqueFrozenTiles, ...activeFalling];
    const clearingTiles = allTiles.filter((t) => t.isClearing);
    if (clearingTiles.length === 0) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    clearingTiles.forEach((tile) => {
      if (clearingAnimatedRef.current.has(tile.id)) return;
      clearingAnimatedRef.current.add(tile.id);

      const el = document.getElementById(`hex-tile-${tile.id}`);
      if (!el) return;

      if (prefersReducedMotion) {
        gsap.to(el, { opacity: 0, duration: 0.15, overwrite: 'auto' });
        return;
      }

      const tl = gsap.timeline();
      tl.to(el, {
        scale: 1.25,
        duration: 0.1,
        ease: 'power2.out',
        transformOrigin: `${tile.x}px ${tile.y}px`,
      });
      tl.to(el, {
        scale: 0,
        rotation: 45,
        opacity: 0,
        duration: 0.22,
        ease: 'back.in(1.6)',
        transformOrigin: `${tile.x}px ${tile.y}px`,
      });
    });

    const liveIds = new Set(allTiles.map((t) => t.id));
    for (const id of clearingAnimatedRef.current) {
      if (!liveIds.has(id)) {
        clearingAnimatedRef.current.delete(id);
      }
    }
  }, [uniqueFrozenTiles, activeFalling]);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const currentFallingIds = new Set(
      uniqueFrozenTiles.filter((t) => t.isFalling).map((t) => t.id)
    );

    uniqueFrozenTiles.forEach((tile) => {
      if (tile.isFrozen && !tile.isClearing && prevFallingIdsRef.current.has(tile.id)) {
        const el = document.getElementById(`hex-tile-${tile.id}`);
        if (el && !prefersReducedMotion) {
          gsap.fromTo(
            el,
            { y: -7 },
            {
              y: 0,
              duration: 0.25,
              ease: 'back.out(1.4)',
              overwrite: 'auto',
            }
          );
        }
      }
    });

    prevFallingIdsRef.current = currentFallingIds;
  }, [uniqueFrozenTiles]);

  const hasSideWalls = wallLeft > 2 || wallRight < boardWidth - 2;

  const renderTile = (tile: HexTile, isFallingStyle: boolean) => {
    const isSelected = selectedMap.has(tile.id);
    const selectionNum = selectedMap.get(tile.id);
    const isClearing = tile.isClearing;
    const isPulsing = pulsingTileIds.has(tile.id);
    const isHinted = hintTileIds?.has(tile.id) ?? false;
    const isOperator = tile.tile.kind === 'operator' && tile.tile.opValue;
    const isNegativeNum = tile.tile.kind === 'number' && (tile.tile.numValue ?? 0) < 0;

    let fill: string;
    let stroke: string;
    let textFill: string;
    let filterEffect: string;

    if (isClearing) {
      fill = 'url(#clearingGradient)';
      stroke = '#22c55e';
      textFill = '#14532d';
      filterEffect = 'url(#tileShadow)';
    } else if (isSelected) {
      fill = 'url(#selectedGradient)';
      stroke = '#ca8a04';
      textFill = '#713f12';
      filterEffect = 'url(#selectGlow)';
    } else if (isOperator && tile.tile.opValue) {
      const opVis = getOperatorVisuals(tile.tile.opValue, isFallingStyle);
      fill = opVis.fill;
      stroke = opVis.stroke;
      textFill = opVis.textFill;
      filterEffect = isFallingStyle ? 'url(#fallingGlow)' : 'url(#tileShadow)';
    } else if (isNegativeNum) {
      fill = isFallingStyle ? 'url(#negFallingGradient)' : 'url(#negTileGradient)';
      stroke = '#e11d48';
      textFill = '#881337';
      filterEffect = isFallingStyle ? 'url(#fallingGlow)' : 'url(#tileShadow)';
    } else if (isFallingStyle) {
      fill = 'url(#fallingGradient)';
      stroke = '#0891b2';
      textFill = '#083344';
      filterEffect = 'url(#fallingGlow)';
    } else {
      fill = 'url(#tileGradient)';
      stroke = '#94a3b8';
      textFill = '#0f172a';
      filterEffect = 'url(#tileShadow)';
    }

    const charLen = tile.tile.display.length;
    const fontSize = isOperator
      ? operatorFontSize
      : charLen >= 4
      ? fourCharFontSize
      : charLen === 3
      ? threeCharFontSize
      : charLen === 2
      ? twoCharFontSize
      : singleCharFontSize;

    return (
      <g id={`hex-tile-${tile.id}`} key={tile.id}>
        {/* Hint glow ring for Beginner/Easy 15s idle prompt */}
        {isHinted && !isSelected && !isClearing && (
          <polygon
            points={getHexPolygonPoints(tile.x, tile.y, tileRadius + 3 * scale)}
            fill="none"
            stroke="#fbbf24"
            strokeWidth="3"
            className="animate-pulse"
            pointerEvents="none"
          />
        )}

        <polygon
          points={getHexPolygonPoints(tile.x, tile.y, tileRadius - 0.5)}
          fill={fill}
          stroke={isPulsing ? '#fef08a' : isHinted && !isSelected ? '#fbbf24' : stroke}
          strokeWidth={isPulsing || isSelected || isHinted ? '2.5' : isFallingStyle ? '2' : '1.5'}
          filter={filterEffect}
        />

        <polygon
          points={getHexPolygonPoints(tile.x, tile.y, Math.max(1, tileRadius - 3 * scale))}
          fill="none"
          stroke="#ffffff"
          strokeWidth={isPulsing ? '1.8' : '1'}
          opacity={isPulsing ? 0.9 : isOperator ? 0.35 : 0.45}
        />

        {isPulsing && (
          <polygon
            points={getHexPolygonPoints(tile.x, tile.y, tileRadius - 0.5)}
            fill="url(#pressFlashGradient)"
            stroke="#ffffff"
            strokeWidth="2"
            className="animate-hex-flash"
            pointerEvents="none"
          />
        )}

        <text
          x={tile.x}
          y={tile.y + (isOperator ? 0.5 : 1)}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
          fontWeight="900"
          fill={textFill}
          className="font-display select-none tracking-tight tabular-nums"
        >
          {tile.tile.display}
        </text>

        {isSelected && (
          <g>
            <circle
              cx={tile.x + tileRadius - 9 * scale}
              cy={tile.y - 12 * scale}
              r={(isPhone ? 6.5 : 8) * scale}
              fill="#0f172a"
              stroke="#facc15"
              strokeWidth={isPhone ? 1.5 * scale : 1.8 * scale}
            />
            <text
              x={tile.x + tileRadius - 9 * scale}
              y={tile.y - 11.5 * scale}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={((isPhone ? 7.5 : 9) * scale).toFixed(1)}
              fontWeight="900"
              fill="#facc15"
              className="font-mono select-none"
            >
              {selectionNum}
            </text>
          </g>
        )}
      </g>
    );
  };

  return (
    <div className="relative w-full h-full min-h-0 min-w-0 flex items-center justify-center select-none touch-none overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${boardWidth} ${boardHeight}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={handleBoardPointerDown}
        style={{ touchAction: 'none' }}
        className="w-full h-full max-h-full max-w-full rounded-2xl shadow-2xl bg-slate-900/95 border border-slate-800 cursor-pointer"
      >
        <defs>
          <radialGradient id="boardGlow" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0b1120" stopOpacity="1" />
          </radialGradient>

          {/* Frozen number tile gradient */}
          <linearGradient id="tileGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="60%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>

          {/* Falling number tile gradient */}
          <linearGradient id="fallingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="70%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>

          {/* Negative frozen number tile gradient */}
          <linearGradient id="negTileGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fff1f2" />
            <stop offset="60%" stopColor="#ffe4e6" />
            <stop offset="100%" stopColor="#fecdd3" />
          </linearGradient>

          {/* Negative falling number tile gradient */}
          <linearGradient id="negFallingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fda4af" />
            <stop offset="70%" stopColor="#fb7185" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>

          {/* Operator + (Emerald) */}
          <linearGradient id="opPlusFrozen" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#065f46" />
          </linearGradient>
          <linearGradient id="opPlusFalling" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          {/* Operator − (Rose) */}
          <linearGradient id="opMinusFrozen" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#9f1239" />
          </linearGradient>
          <linearGradient id="opMinusFalling" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#be123c" />
          </linearGradient>

          {/* Operator × (Violet) */}
          <linearGradient id="opMulFrozen" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#5b21b6" />
          </linearGradient>
          <linearGradient id="opMulFalling" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6d28d9" />
          </linearGradient>

          {/* Operator ÷ (Orange/Amber) */}
          <linearGradient id="opDivFrozen" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#9a3412" />
          </linearGradient>
          <linearGradient id="opDivFalling" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>

          {/* Selected tile gradient */}
          <linearGradient id="selectedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="60%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>

          {/* Clearing tile gradient */}
          <linearGradient id="clearingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="100%" stopColor="#4ade80" />
          </linearGradient>

          {/* Press flash shimmer gradient */}
          <linearGradient id="pressFlashGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#fef9c3" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#fde047" stopOpacity="0.7" />
          </linearGradient>

          <filter id="tileShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#000000" floodOpacity="0.45" />
          </filter>

          <filter id="selectGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="4.5" floodColor="#eab308" floodOpacity="0.8" />
          </filter>

          <filter id="fallingGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#06b6d4" floodOpacity="0.6" />
          </filter>

          <radialGradient id="dangerCeilingVignette" cx="50%" cy="0%" r="85%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
            <stop offset="35%" stopColor="#ef4444" stopOpacity="0.2" />
            <stop offset="70%" stopColor="#dc2626" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width={boardWidth} height={boardHeight} fill="url(#boardGlow)" />

        <rect
          width={boardWidth}
          height={boardHeight}
          fill="url(#dangerCeilingVignette)"
          pointerEvents="none"
          className={`transition-opacity duration-300 ${
            nearCeiling ? 'opacity-100 animate-danger-vignette' : 'opacity-0'
          }`}
          style={{ willChange: 'opacity' }}
        />

        {hasSideWalls && (
          <g pointerEvents="none">
            <rect x="0" y="0" width={wallLeft} height={groundY} fill="#020617" opacity="0.55" />
            <line
              x1={wallLeft}
              y1="0"
              x2={wallLeft}
              y2={groundY}
              stroke="#06b6d4"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.75"
            />
            <rect
              x={wallRight}
              y="0"
              width={boardWidth - wallRight}
              height={groundY}
              fill="#020617"
              opacity="0.55"
            />
            <line
              x1={wallRight}
              y1="0"
              x2={wallRight}
              y2={groundY}
              stroke="#06b6d4"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.75"
            />
          </g>
        )}

        <g className={nearCeiling ? 'animate-pulse' : ''} pointerEvents="none">
          <line
            x1={hasSideWalls ? wallLeft : 12}
            y1={ceilingY}
            x2={hasSideWalls ? wallRight : boardWidth - 12}
            y2={ceilingY}
            stroke={nearCeiling ? '#ef4444' : '#64748b'}
            strokeWidth={nearCeiling ? '2.5' : '1.8'}
            strokeDasharray={nearCeiling ? '5 5' : '3 3'}
            opacity={nearCeiling ? 0.95 : 0.65}
          />
          <text
            x={hasSideWalls ? wallRight - 8 : boardWidth - 18}
            y={ceilingY - 6}
            textAnchor="end"
            fontSize="10"
            fontWeight="700"
            fill={nearCeiling ? '#ef4444' : '#64748b'}
            opacity={nearCeiling ? 1 : 0.8}
            className="tracking-wider uppercase"
          >
            {nearCeiling ? 'Danger · Ceiling' : 'Ceiling'}
          </text>
        </g>

        <g pointerEvents="none">
          <line x1="0" y1={groundY} x2={boardWidth} y2={groundY} stroke="#475569" strokeWidth="3.5" />
          <rect x="0" y={groundY} width={boardWidth} height={boardHeight - groundY} fill="#0f172a" opacity="0.9" />
          <text
            x={boardWidth / 2}
            y={groundY + 18}
            textAnchor="middle"
            fontSize="9"
            fontWeight="600"
            fill="#64748b"
            className="tracking-widest uppercase select-none"
          >
            Ground
          </text>
        </g>

        <g pointerEvents="none">
          {uniqueFrozenTiles.map((tile) => renderTile(tile, false))}
        </g>

        <g pointerEvents="none">
          {activeFalling.map((ft) => renderTile(ft, true))}
        </g>

        <g pointerEvents="none">
          {floatingScores.map((score) => (
            <text
              key={score.id}
              x={score.x}
              y={score.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="20"
              fontWeight="900"
              fill="#4ade80"
              stroke="#052e16"
              strokeWidth="3.5"
              paintOrder="stroke"
              className="font-display animate-score-float select-none"
            >
              {score.text}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
};
