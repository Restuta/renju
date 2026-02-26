/**
 * Renju forbidden move detection for Black.
 *
 * Forbidden moves (Black only):
 *  - Overline: placing a stone creates a line of 6+ consecutive stones
 *  - Double-four: placing creates two or more "fours" across different directions
 *  - Double-three: placing creates two or more "open threes" (recursive check)
 *
 * White has no restrictions.
 *
 * Key definitions (RIF compliant):
 *  - Row: stones of same color in a line, may have gaps (no opponent stones between)
 *  - Three: a row of 3 where adding 1 stone makes a "straight four" (without making five)
 *  - Straight four (open four): 4 consecutive stones, extendable to five from BOTH ends
 *  - Four: a row of 4 where adding 1 stone makes exactly five (includes broken fours)
 *
 * Reference: https://github.com/onetwothr1/AlphaZero_Gomoku_Renju_Rule
 */

import { Board, BOARD_SIZE, BLACK, WHITE, EMPTY, Stone, inBounds, Pos, posKey } from './types';

const DIRS: [number, number][] = [
  [0, 1],  // horizontal
  [1, 0],  // vertical
  [1, 1],  // diagonal \
  [1, -1], // diagonal /
];

// ── Consecutive stone counting ──────────────────────────────────────

/** Count consecutive same-color stones starting from (r+dr, c+dc) */
function countDir(board: Board, r: number, c: number, dr: number, dc: number, player: Stone): number {
  let count = 0;
  let nr = r + dr, nc = c + dc;
  while (inBounds(nr, nc) && board[nr][nc] === player) {
    count++;
    nr += dr;
    nc += dc;
  }
  return count;
}

/** Count consecutive stones through (r,c) in a direction (both ways) */
function consecutiveThrough(board: Board, r: number, c: number, dr: number, dc: number): number {
  return 1 + countDir(board, r, c, dr, dc, BLACK) + countDir(board, r, c, -dr, -dc, BLACK);
}

// ── Five / overline detection ───────────────────────────────────────

/** Check if exactly 5 in a row (not 6+) for the given player at (r,c) */
export function isExactFive(board: Board, r: number, c: number, player: Stone): boolean {
  for (const [dr, dc] of DIRS) {
    const count = 1 + countDir(board, r, c, dr, dc, player) + countDir(board, r, c, -dr, -dc, player);
    if (count === 5) return true;
  }
  return false;
}

/** Check if 5+ in a row for given player */
export function isFiveOrMore(board: Board, r: number, c: number, player: Stone): boolean {
  for (const [dr, dc] of DIRS) {
    const count = 1 + countDir(board, r, c, dr, dc, player) + countDir(board, r, c, -dr, -dc, player);
    if (count >= 5) return true;
  }
  return false;
}

/** Check for overline (6+ consecutive) — forbidden for Black */
function isOverline(board: Board, r: number, c: number): boolean {
  for (const [dr, dc] of DIRS) {
    if (consecutiveThrough(board, r, c, dr, dc) >= 6) return true;
  }
  return false;
}

/** Does (r,c) make exactly 5 in the given direction? Stone must be placed. */
function isFiveInDir(board: Board, r: number, c: number, dr: number, dc: number): boolean {
  return consecutiveThrough(board, r, c, dr, dc) === 5;
}

// ── findEmptyPoint ──────────────────────────────────────────────────

/**
 * Walk from (r,c) in direction (dr,dc), scanning past same-color (BLACK)
 * stones, and return the first EMPTY cell found. Returns null if we hit
 * an opponent stone, the board edge, or never find empty.
 *
 * This is the key helper that enables broken pattern detection:
 * for X_XX, scanning right from the first X skips over the gap
 * (which is empty, returned immediately) or skips over BLACK stones
 * to find the empty beyond.
 */
function findEmptyPoint(board: Board, r: number, c: number, dr: number, dc: number): Pos | null {
  let nr = r + dr, nc = c + dc;
  while (inBounds(nr, nc) && board[nr][nc] === BLACK) {
    nr += dr;
    nc += dc;
  }
  if (inBounds(nr, nc) && board[nr][nc] === EMPTY) {
    return [nr, nc];
  }
  return null;
}

// ── Four detection ──────────────────────────────────────────────────

/**
 * Is there a "four" through (r,c) in the given direction?
 * A four = adding one stone at an empty point makes exactly 5 in a row.
 * Handles broken fours (e.g., X_XXX) via findEmptyPoint.
 * Stone must already be placed at (r,c).
 */
function isFour(board: Board, r: number, c: number, dr: number, dc: number): boolean {
  for (const sign of [1, -1]) {
    const ep = findEmptyPoint(board, r, c, sign * dr, sign * dc);
    if (ep) {
      const [er, ec] = ep;
      board[er][ec] = BLACK;
      const makesFive = isFiveInDir(board, er, ec, dr, dc);
      board[er][ec] = EMPTY;
      if (makesFive) return true;
    }
  }
  return false;
}

/**
 * Is there an "open four" (straight four) through (r,c) in the given direction?
 * Open four = 4 CONSECUTIVE stones where BOTH ends extend to exactly five.
 * Stone must already be placed at (r,c).
 */
function isOpenFour(board: Board, r: number, c: number, dr: number, dc: number): boolean {
  const consecutive = consecutiveThrough(board, r, c, dr, dc);

  // Must be exactly 4 consecutive (not 5+ which is already a win/overline)
  if (consecutive !== 4) return false;

  let ways = 0;
  for (const sign of [1, -1]) {
    const ep = findEmptyPoint(board, r, c, sign * dr, sign * dc);
    if (ep) {
      const [er, ec] = ep;
      board[er][ec] = BLACK;
      if (isFiveInDir(board, er, ec, dr, dc)) {
        ways++;
      }
      board[er][ec] = EMPTY;
    }
  }

  return ways === 2;
}

// ── Double-four ─────────────────────────────────────────────────────

/**
 * Does placing Black at (r,c) create a double-four?
 * Counts directions with fours; 2+ = double-four.
 */
function isDoubleFour(board: Board, r: number, c: number): boolean {
  board[r][c] = BLACK;
  let fourCount = 0;

  for (const [dr, dc] of DIRS) {
    if (isFour(board, r, c, dr, dc)) {
      fourCount++;
    }
  }

  board[r][c] = EMPTY;
  return fourCount >= 2;
}

// ── Open three detection (recursive) ────────────────────────────────

/**
 * Is there an "open three" through (r,c) in the given direction?
 *
 * An open three is a row of 3 stones where you can add one more stone
 * to create a straight four (open four), AND that extension point is
 * NOT itself a forbidden move for Black.
 *
 * This is the RECURSIVE core of forbidden move detection:
 *   isOpenThree → isForbiddenInner → isDoubleThree → isOpenThree → ...
 *
 * Stone must already be placed at (r,c).
 */
function isOpenThree(
  board: Board, r: number, c: number,
  dr: number, dc: number,
  depth: number,
): boolean {
  if (depth > 10) return false; // Safety limit against infinite recursion

  for (const sign of [1, -1]) {
    const ep = findEmptyPoint(board, r, c, sign * dr, sign * dc);
    if (ep) {
      const [er, ec] = ep;

      // Temporarily place stone at extension point
      board[er][ec] = BLACK;
      const createsOpenFour = isOpenFour(board, er, ec, dr, dc);
      board[er][ec] = EMPTY;

      if (createsOpenFour) {
        // RECURSIVE CHECK: is the extension point NOT itself forbidden?
        // If it IS forbidden, this three can never legally become a
        // straight four, so it's not a "real" three.
        if (!isForbiddenInner(board, er, ec, depth + 1)) {
          return true;
        }
      }
    }
  }
  return false;
}

// ── Double-three ────────────────────────────────────────────────────

/**
 * Does placing Black at (r,c) create a double-three?
 * Counts directions with open threes; 2+ = double-three.
 */
function isDoubleThree(board: Board, r: number, c: number, depth: number): boolean {
  board[r][c] = BLACK;
  let threeCount = 0;

  for (const [dr, dc] of DIRS) {
    if (isOpenThree(board, r, c, dr, dc, depth)) {
      threeCount++;
    }
  }

  board[r][c] = EMPTY;
  return threeCount >= 2;
}

// ── Main forbidden check ────────────────────────────────────────────

/**
 * Internal forbidden check with recursion depth tracking.
 * Cell (r,c) must be EMPTY.
 */
function isForbiddenInner(board: Board, r: number, c: number, depth: number): boolean {
  if (board[r][c] !== EMPTY) return false;

  // Check five and overline (stone must be placed for these checks)
  board[r][c] = BLACK;
  const hasFive = isExactFive(board, r, c, BLACK);
  const overline = isOverline(board, r, c);
  board[r][c] = EMPTY;

  // Overline is forbidden even if exact five exists in another direction
  if (overline) return true;

  // Five in a row overrides all other forbidden patterns
  if (hasFive) return false;

  // Check double-four
  if (isDoubleFour(board, r, c)) return true;

  // Check double-three (recursive)
  if (isDoubleThree(board, r, c, depth)) return true;

  return false;
}

/**
 * Check if placing Black at (r,c) is a forbidden move.
 * Returns true if the move is forbidden.
 */
export function isForbidden(board: Board, r: number, c: number): boolean {
  return isForbiddenInner(board, r, c, 0);
}

// ── Public helpers ──────────────────────────────────────────────────

/** Get all forbidden positions for Black on the current board */
export function getForbiddenMoves(board: Board): Set<string> {
  const forbidden = new Set<string>();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === EMPTY && isForbidden(board, r, c)) {
        forbidden.add(posKey(r, c));
      }
    }
  }
  return forbidden;
}

// ── Opening rules ───────────────────────────────────────────────────

const CENTER = Math.floor(BOARD_SIZE / 2); // 7

/**
 * Check if a move is valid under Renju opening rules.
 * Returns null if valid, or a message describing the constraint if invalid.
 *
 * Classical Renju opening:
 *   Move 1 (Black): must be at center (7,7)
 *   Move 2 (White): must be adjacent to center — within 3×3 center (rows 6-8, cols 6-8)
 *   Move 3 (Black): must be within 5×5 center (rows 5-9, cols 5-9)
 *   Move 4+: anywhere
 */
export function checkOpeningRule(moveNumber: number, row: number, col: number): string | null {
  if (moveNumber === 1) {
    if (row !== CENTER || col !== CENTER) {
      return 'First move must be at the center of the board';
    }
  } else if (moveNumber === 2) {
    if (Math.abs(row - CENTER) > 1 || Math.abs(col - CENTER) > 1) {
      return 'Second move must be within the 3×3 center area';
    }
  } else if (moveNumber === 3) {
    if (Math.abs(row - CENTER) > 2 || Math.abs(col - CENTER) > 2) {
      return 'Third move must be within the 5×5 center area';
    }
  }
  return null;
}

/** Check if the game has a winner after the last move at (r,c) */
export function checkWin(board: Board, r: number, c: number): Stone {
  const player = board[r][c];
  if (player === EMPTY) return EMPTY;

  if (player === BLACK) {
    // Black must have exactly 5
    return isExactFive(board, r, c, BLACK) ? BLACK : EMPTY;
  } else {
    // White wins with 5 or more
    return isFiveOrMore(board, r, c, WHITE) ? WHITE : EMPTY;
  }
}
