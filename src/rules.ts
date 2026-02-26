export const BOARD_SIZE = 15;

export type Stone = 0 | 1 | 2;
export type Color = 1 | 2;

export interface Point {
  x: number;
  y: number;
}

export interface ForbiddenPoint extends Point {
  reason: ForbiddenReason;
}

export type Board = Stone[];
export type ForbiddenReason = "double-three" | "double-four" | "overline";
export type OpeningViolation = "opening-center";

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

export function idx(x: number, y: number): number {
  return y * BOARD_SIZE + x;
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

export function createBoard(): Board {
  return new Array<Stone>(BOARD_SIZE * BOARD_SIZE).fill(0);
}

export function countConsecutive(
  board: ReadonlyArray<Stone>,
  x: number,
  y: number,
  color: Color,
  dx: number,
  dy: number
): number {
  let total = 1;
  let nx = x + dx;
  let ny = y + dy;
  while (inBounds(nx, ny) && board[idx(nx, ny)] === color) {
    total++;
    nx += dx;
    ny += dy;
  }
  nx = x - dx;
  ny = y - dy;
  while (inBounds(nx, ny) && board[idx(nx, ny)] === color) {
    total++;
    nx -= dx;
    ny -= dy;
  }
  return total;
}

function hasExactFiveAtMove(board: ReadonlyArray<Stone>, x: number, y: number, color: Color): boolean {
  for (const [dx, dy] of DIRS) {
    if (countConsecutive(board, x, y, color, dx, dy) === 5) return true;
  }
  return false;
}

function hasOverlineAtMove(board: ReadonlyArray<Stone>, x: number, y: number, color: Color): boolean {
  for (const [dx, dy] of DIRS) {
    if (countConsecutive(board, x, y, color, dx, dy) > 5) return true;
  }
  return false;
}

export function isWin(board: ReadonlyArray<Stone>, x: number, y: number, color: Color): boolean {
  if (color === 1) return hasExactFiveAtMove(board, x, y, 1);

  for (const [dx, dy] of DIRS) {
    if (countConsecutive(board, x, y, color, dx, dy) >= 5) return true;
  }
  return false;
}

function lineThrough(x: number, y: number, dx: number, dy: number): Point[] {
  let sx = x;
  let sy = y;
  while (inBounds(sx - dx, sy - dy)) {
    sx -= dx;
    sy -= dy;
  }

  const line: Point[] = [];
  while (inBounds(sx, sy)) {
    line.push({ x: sx, y: sy });
    sx += dx;
    sy += dy;
  }
  return line;
}

function indexInLine(line: ReadonlyArray<Point>, x: number, y: number): number {
  for (let i = 0; i < line.length; i++) {
    if (line[i].x === x && line[i].y === y) return i;
  }
  return -1;
}

function hasExactFiveSegment(values: Stone[], color: Color, requiredIndices: number[]): boolean {
  for (let start = 0; start <= values.length - 5; start++) {
    let allColor = true;
    for (let k = 0; k < 5; k++) {
      if (values[start + k] !== color) {
        allColor = false;
        break;
      }
    }
    if (!allColor) continue;

    const before = start - 1 >= 0 ? values[start - 1] : -1;
    const after = start + 5 < values.length ? values[start + 5] : -1;
    if (before === color || after === color) continue;

    let includesAllRequired = true;
    for (const req of requiredIndices) {
      if (req < start || req > start + 4) {
        includesAllRequired = false;
        break;
      }
    }
    if (includesAllRequired) return true;
  }
  return false;
}

function getCompletionIndices(values: Stone[], color: Color, baseRequiredIndices: number[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (values[i] !== 0) continue;

    values[i] = color;
    const required = [...baseRequiredIndices, i];
    if (hasExactFiveSegment(values, color, required)) result.push(i);
    values[i] = 0;
  }
  return result;
}

function analyzeDirection(board: ReadonlyArray<Stone>, x: number, y: number, dx: number, dy: number): { hasFour: boolean; hasOpenThree: boolean } {
  const line = lineThrough(x, y, dx, dy);
  const moveIndex = indexInLine(line, x, y);
  const values = line.map((p) => board[idx(p.x, p.y)]);

  const completions = getCompletionIndices(values, 1, [moveIndex]);
  const hasFour = completions.length >= 1;

  let hasOpenThree = false;
  for (let i = 0; i < values.length; i++) {
    if (values[i] !== 0) continue;

    values[i] = 1;
    const fourCompletions = getCompletionIndices(values, 1, [moveIndex, i]);
    values[i] = 0;

    if (fourCompletions.length >= 2) {
      hasOpenThree = true;
      break;
    }
  }

  return {
    hasFour,
    hasOpenThree,
  };
}

export function getOpeningMoveViolation(
  board: ReadonlyArray<Stone>,
  x: number,
  y: number,
  color: Color
): OpeningViolation | null {
  if (color !== 1) return null;
  const stoneCount = board.reduce<number>((n, v) => (v === 0 ? n : n + 1), 0);
  if (stoneCount !== 0) return null;

  const center = Math.floor(BOARD_SIZE / 2);
  if (x !== center || y !== center) return "opening-center";
  return null;
}

export function getForbiddenReason(board: ReadonlyArray<Stone>, x: number, y: number): ForbiddenReason | null {
  if (!inBounds(x, y)) return null;
  if (board[idx(x, y)] !== 0) return null;

  const next = board.slice();
  next[idx(x, y)] = 1;

  const exactFive = hasExactFiveAtMove(next, x, y, 1);
  if (exactFive) return null;

  if (hasOverlineAtMove(next, x, y, 1)) return "overline";

  let fourCount = 0;
  let openThreeCount = 0;
  for (const [dx, dy] of DIRS) {
    const analysis = analyzeDirection(next, x, y, dx, dy);
    if (analysis.hasFour) fourCount++;
    if (analysis.hasOpenThree) openThreeCount++;
  }

  if (fourCount >= 2) return "double-four";
  if (openThreeCount >= 2) return "double-three";
  return null;
}

export function getForbiddenPoints(board: ReadonlyArray<Stone>): ForbiddenPoint[] {
  const points: ForbiddenPoint[] = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[idx(x, y)] !== 0) continue;
      const reason = getForbiddenReason(board, x, y);
      if (reason) points.push({ x, y, reason });
    }
  }
  return points;
}

export function getCandidateMoves(board: ReadonlyArray<Stone>): Point[] {
  const stones: Point[] = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[idx(x, y)] !== 0) stones.push({ x, y });
    }
  }
  if (stones.length === 0) {
    const m = Math.floor(BOARD_SIZE / 2);
    return [{ x: m, y: m }];
  }

  const moves: Point[] = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[idx(x, y)] !== 0) continue;
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++) {
        for (let dx = -2; dx <= 2 && !near; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (inBounds(nx, ny) && board[idx(nx, ny)] !== 0) near = true;
        }
      }
      if (near) moves.push({ x, y });
    }
  }
  return moves;
}
