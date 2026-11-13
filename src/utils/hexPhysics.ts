import { ViewMode } from '../types/game';

export const HEX_RADIUS = 28;
export const HEX_WIDTH = 2 * HEX_RADIUS; // 56
export const HEX_HEIGHT = Math.sqrt(3) * HEX_RADIUS; // ~48.4974
export const HEX_H = HEX_HEIGHT / 2; // ~24.2487

export const BOARD_WIDTH_NARROW = 420;
export const BOARD_WIDTH_WIDE = 720;
export const BOARD_WIDTH = BOARD_WIDTH_NARROW;
export const BOARD_HEIGHT = 610;

// GROUND_Y = 560 gives 50px clearance above bottom of viewBox (610), so all letters and ground line are 100% visible
export const GROUND_Y = 560;
export const DANGER_Y = 85;
export const SPAWN_Y = -HEX_H - 12;

export function getBoardWidth(mode: ViewMode): number {
  return mode === 'wide' ? BOARD_WIDTH_WIDE : BOARD_WIDTH_NARROW;
}

export const FALL_SPEED_PIXELS_PER_SEC = 260;
export const DROP_GRAVITY_PIXELS_PER_SEC = 260; // Same normal fall rate

export const REFERENCE_PLAY_AREA_WIDTH = BOARD_WIDTH_WIDE; // 720px desktop tuned width
export const REFERENCE_PLAY_AREA_HEIGHT = BOARD_HEIGHT; // 610px desktop tuned height
export const SPEED_MULTIPLIER_MIN = 0.5;
export const SPEED_MULTIPLIER_MAX = 1.5;

/**
 * Computes a proportional falling/moving speed multiplier from the actual play area size,
 * using the desktop size the game was tuned for (720x610) as 1.0, clamped to [0.5, 1.5].
 */
export function computeScreenSpeedMultiplier(
  playAreaWidth: number,
  playAreaHeight: number
): number {
  if (!Number.isFinite(playAreaWidth) || !Number.isFinite(playAreaHeight) || playAreaWidth <= 0 || playAreaHeight <= 0) {
    return 1.0;
  }
  const refArea = REFERENCE_PLAY_AREA_WIDTH * REFERENCE_PLAY_AREA_HEIGHT;
  const actualArea = playAreaWidth * playAreaHeight;
  const raw = Math.sqrt(actualArea / refArea);
  const clamped = Math.max(SPEED_MULTIPLIER_MIN, Math.min(SPEED_MULTIPLIER_MAX, raw));
  return Math.round(clamped * 1000) / 1000;
}

// Regular flat-topped hexagon SVG polygon points around (cx, cy)
export function getHexPolygonPoints(cx: number, cy: number, radius: number = HEX_RADIUS - 0.5): string {
  const h = (Math.sqrt(3) / 2) * radius;
  const halfR = radius / 2;

  // 6 vertices: right tip, bottom-right, bottom-left, left tip, top-left, top-right
  const points = [
    `${cx + radius},${cy}`,
    `${cx + halfR},${cy + h}`,
    `${cx - halfR},${cy + h}`,
    `${cx - radius},${cy}`,
    `${cx - halfR},${cy - h}`,
    `${cx + halfR},${cy - h}`,
  ];

  return points.join(' ');
}

/**
 * Calculates the contact Y coordinate where a falling hexagon at fallingX
 * would make contact with an obstacle hexagon at (obstacleX, obstacleY).
 * Returns null if fallingX cannot collide with obstacleX (|fallingX - obstacleX| >= 2R).
 */
export function getHexContactY(
  fallingX: number,
  obstacle: { x: number; y: number },
  radius: number = HEX_RADIUS
): number | null {
  const dx = Math.abs(fallingX - obstacle.x);
  const twoR = 2 * radius;

  if (dx >= twoR - 0.001) {
    return null; // Cannot collide horizontally
  }

  const twoH = Math.sqrt(3) * radius;

  if (dx <= radius) {
    // Horizontal edge overlap: flat bottom of falling hex hits flat top of obstacle
    return obstacle.y - twoH;
  }

  // Slanted edge/corner contact:
  // Derived via Minkowski difference of two regular flat-topped hexagons
  const contactY = obstacle.y - Math.sqrt(3) * (twoR - dx);
  return contactY;
}

/**
 * Finds the highest landing Y position for a hexagon falling straight down at fallingX,
 * given a list of frozen/obstacle hexagons and the flat ground.
 */
export function findLandingY(
  fallingX: number,
  startY: number,
  obstacles: Array<{ x: number; y: number }>,
  groundY: number = GROUND_Y,
  radius: number = HEX_RADIUS
): number {
  const hexH = (Math.sqrt(3) * radius) / 2;
  // Ground is a flat line at groundY. Every hex resting on ground has center at groundY - hexH
  let targetY = groundY - hexH;

  for (const obs of obstacles) {
    const contactY = getHexContactY(fallingX, obs, radius);
    if (contactY !== null && contactY >= startY - 4.0) {
      if (contactY < targetY) {
        targetY = contactY;
      }
    }
  }

  return targetY;
}

/**
 * Checks whether a hexagon is resting on the flat ground
 */
export function isHexOnGround(
  hex: { y: number },
  tolerance = 2.0,
  groundY: number = GROUND_Y,
  radius: number = HEX_RADIUS
): boolean {
  const hexH = (Math.sqrt(3) * radius) / 2;
  return Math.abs(hex.y - (groundY - hexH)) <= tolerance;
}

/**
 * Checks whether two hexagons are touching each other (polygon-vs-polygon contact)
 */
export function areHexesTouching(
  a: { x: number; y: number },
  b: { x: number; y: number },
  tolerance = 2.5,
  radius: number = HEX_RADIUS
): boolean {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  const twoR = 2 * radius;
  const twoH = Math.sqrt(3) * radius;

  if (dx > twoR + tolerance || dy > twoH + tolerance) {
    return false;
  }

  if (dx <= radius) {
    return Math.abs(dy - twoH) <= tolerance;
  }

  const expectedDy = Math.sqrt(3) * (twoR - dx);
  return Math.abs(dy - expectedDy) <= tolerance * 1.5;
}

/**
 * Finds all hexagons connected to the ground through a chain of touching hexagons
 */
export function findGroundedHexIds<T extends { id: string; x: number; y: number }>(
  hexes: T[],
  groundY: number = GROUND_Y,
  radius: number = HEX_RADIUS
): Set<string> {
  const grounded = new Set<string>();
  const queue: T[] = [];

  // 1. Direct ground contact
  for (const hex of hexes) {
    if (isHexOnGround(hex, 2.0, groundY, radius)) {
      grounded.add(hex.id);
      queue.push(hex);
    }
  }

  // 2. BFS graph traversal of touching hexagons
  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const other of hexes) {
      if (!grounded.has(other.id)) {
        if (areHexesTouching(curr, other, 2.5, radius)) {
          grounded.add(other.id);
          queue.push(other);
        }
      }
    }
  }

  return grounded;
}

/**
 * Exact point-in-hexagon test (including all edges and corners).
 * Returns true if (px, py) is inside the regular flat-topped hexagon centered at (cx, cy).
 */
export function isPointInHex(
  px: number,
  py: number,
  cx: number,
  cy: number,
  radius: number = HEX_RADIUS
): boolean {
  const dx = Math.abs(px - cx);
  const dy = Math.abs(py - cy);
  const h = (Math.sqrt(3) / 2) * radius;

  // 1. Outside horizontal/vertical extents
  if (dx > radius + 0.5 || dy > h + 0.5) {
    return false;
  }

  // 2. Exact 6-sided polygon boundary test
  return Math.sqrt(3) * dx + dy <= 2 * h + 0.5;
}
