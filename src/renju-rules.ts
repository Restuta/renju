/**
 * Renju forbidden move detection for Black.
 *
 * Forbidden moves (Black only):
 *  - Double-three: placing a stone creates two or more "open threes" simultaneously
 *  - Double-four: placing a stone creates two or more "fours" simultaneously
 *  - Overline: placing a stone creates a line of 6+ in a row
 *
 * White has no restrictions.
 */

import { Board, BOARD_SIZE, BLACK, WHITE, EMPTY, Stone, inBounds, Pos, posKey } from './types';

const DIRS: [number, number][] = [
  [0, 1],  // horizontal
  [1, 0],  // vertical
  [1, 1],  // diagonal \
  [1, -1], // diagonal /
];

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

/** Check for overline (6+ in a row) — forbidden for Black */
function isOverline(board: Board, r: number, c: number): boolean {
  for (const [dr, dc] of DIRS) {
    const count = 1 + countDir(board, r, c, dr, dc, BLACK) + countDir(board, r, c, -dr, -dc, BLACK);
    if (count >= 6) return true;
  }
  return false;
}

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

/**
 * Count "fours" created by placing Black at (r,c).
 * A four is a line of exactly 4 black stones that can be extended to exactly 5.
 */
function countFours(board: Board, r: number, c: number): number {
  board[r][c] = BLACK;
  let fours = 0;

  for (const [dr, dc] of DIRS) {
    if (isFourInDirection(board, r, c, dr, dc)) {
      fours++;
    }
  }

  board[r][c] = EMPTY;
  return fours;
}

function isFourInDirection(board: Board, r: number, c: number, dr: number, dc: number): boolean {
  // Find the extent of black stones in this direction through (r,c)
  const line = getLineStones(board, r, c, dr, dc, BLACK);
  if (line.length < 4) return false;

  // Check all consecutive groups of 4 or more that include (r,c)
  // A "four" means exactly 4 stones that can become exactly 5
  for (let start = 0; start <= line.length - 4; start++) {
    for (let end = start + 3; end < line.length; end++) {
      const segment = line.slice(start, end + 1);
      if (segment.length === 4) {
        // Check if this group of 4 can extend to 5
        if (canExtendToFive(board, segment, dr, dc)) {
          return true;
        }
      }
    }
  }
  return false;
}

function getLineStones(board: Board, r: number, c: number, dr: number, dc: number, player: Stone): Pos[] {
  const stones: Pos[] = [];
  // Go backwards to find start
  let sr = r, sc = c;
  while (inBounds(sr - dr, sc - dc) && board[sr - dr][sc - dc] === player) {
    sr -= dr;
    sc -= dc;
  }
  // Collect all consecutive stones
  while (inBounds(sr, sc) && board[sr][sc] === player) {
    stones.push([sr, sc]);
    sr += dr;
    sc += dc;
  }
  return stones;
}

function canExtendToFive(board: Board, stones: Pos[], dr: number, dc: number): boolean {
  if (stones.length !== 4) return false;
  const [fr, fc] = stones[0];
  const [lr, lc] = stones[stones.length - 1];

  // Check extending before
  const br = fr - dr, bc = fc - dc;
  if (inBounds(br, bc) && board[br][bc] === EMPTY) {
    return true;
  }
  // Check extending after
  const ar = lr + dr, ac = lc + dc;
  if (inBounds(ar, ac) && board[ar][ac] === EMPTY) {
    return true;
  }
  return false;
}

/**
 * Count "open threes" created by placing Black at (r,c).
 * An open three is a line of 3 that can become an open four
 * (a four that can be completed to five from either end).
 *
 * We use a practical definition: an open three is a configuration of 3 stones
 * where adding one more stone creates a "straight four" (four in a row with
 * both ends open).
 */
function countOpenThrees(board: Board, r: number, c: number): number {
  board[r][c] = BLACK;
  let threes = 0;

  for (const [dr, dc] of DIRS) {
    if (isOpenThreeInDirection(board, r, c, dr, dc)) {
      threes++;
    }
  }

  board[r][c] = EMPTY;
  return threes;
}

function isOpenThreeInDirection(board: Board, r: number, c: number, dr: number, dc: number): boolean {
  // Look at a window around (r,c) in this direction
  // An open three in this direction means we have exactly 3 stones
  // and can make a straight four (4 consecutive with both ends open)

  // Gather the consecutive run through (r,c)
  const stones = getLineStones(board, r, c, dr, dc, BLACK);

  if (stones.length === 3) {
    // Check if both ends are open and the extension won't be forbidden
    return isStraightThree(board, stones, dr, dc);
  }

  return false;
}

function isStraightThree(board: Board, stones: Pos[], dr: number, dc: number): boolean {
  if (stones.length !== 3) return false;

  const [fr, fc] = stones[0];
  const [lr, lc] = stones[stones.length - 1];

  // Both immediate neighbors must be empty
  const br = fr - dr, bc = fc - dc;
  const ar = lr + dr, ac = lc + dc;

  if (!inBounds(br, bc) || !inBounds(ar, ac)) return false;
  if (board[br][bc] !== EMPTY || board[ar][ac] !== EMPTY) return false;

  // The cells beyond those must also be checked — at least one side
  // needs to allow a straight four to form
  // If we extend to after: stones become 4 in a row. Is that a "straight four"?
  // A straight four = 4 in a row with both ends open.

  // Check extending after: place stone at (ar, ac), making 4 in a row.
  const aar = ar + dr, aac = ac + dc;

  // Check extending before: place stone at (br, bc), making 4 in a row.
  const bbr = br - dr, bbc = bc - dc;

  // Does extending create a four with both ends open (a "straight four")?
  const afterFour = inBounds(br, bc) && board[br][bc] === EMPTY &&
    inBounds(aar, aac) && board[aar][aac] === EMPTY;
  const beforeFour = inBounds(bbr, bbc) && board[bbr][bbc] === EMPTY &&
    inBounds(ar, ac) && board[ar][ac] === EMPTY;

  return afterFour || beforeFour;
}

/**
 * Check if placing Black at (r,c) is a forbidden move.
 * Returns true if the move is forbidden.
 */
export function isForbidden(board: Board, r: number, c: number): boolean {
  if (board[r][c] !== EMPTY) return false;

  // Check for exact five and overline together — overline is forbidden
  // even if an exact five exists in another direction.
  board[r][c] = BLACK;
  const hasFive = isExactFive(board, r, c, BLACK);
  const overline = isOverline(board, r, c);
  board[r][c] = EMPTY;

  if (overline) return true;
  if (hasFive) return false;

  // Check double-four
  if (countFours(board, r, c) >= 2) return true;

  // Check double-three
  if (countOpenThrees(board, r, c) >= 2) return true;

  return false;
}

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
