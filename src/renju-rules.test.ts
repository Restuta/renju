/**
 * Comprehensive tests for Renju forbidden move detection.
 *
 * Each test uses ASCII board diagrams for visual verification.
 * Legend: X = Black, O = White, . = empty
 *
 * Reference examples from https://www.renju.net/advanced/
 */

import { describe, it, expect } from 'vitest';
import {
  Board, BOARD_SIZE, BLACK, WHITE, EMPTY, Stone, createBoard,
} from './types';
import {
  isForbidden, isExactFive, isFiveOrMore, checkWin, getForbiddenMoves,
  checkOpeningRule,
} from './renju-rules';

// ── ASCII Board Helper ──────────────────────────────────────────────

/**
 * Parse an ASCII board into a Board array.
 * Trims leading/trailing blank lines, expects 15 rows of 15 columns.
 * Characters: X = Black(1), O = White(2), . = Empty(0)
 */
function boardFromAscii(ascii: string): Board {
  const lines = ascii
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length !== BOARD_SIZE) {
    throw new Error(`Expected ${BOARD_SIZE} rows, got ${lines.length}`);
  }

  return lines.map((line, row) => {
    const cells = line.split(/\s+/);
    if (cells.length !== BOARD_SIZE) {
      throw new Error(`Row ${row}: expected ${BOARD_SIZE} cols, got ${cells.length}: "${line}"`);
    }
    return cells.map(ch => {
      if (ch === 'X') return BLACK;
      if (ch === 'O') return WHITE;
      if (ch === '.') return EMPTY;
      throw new Error(`Unknown character "${ch}" in board`);
    });
  });
}

/** Place a stone on a board (returns the board for chaining) */
function place(board: Board, r: number, c: number, stone: Stone): Board {
  board[r][c] = stone;
  return board;
}

// ── Win Detection ───────────────────────────────────────────────────

describe('isExactFive', () => {
  it('detects horizontal five for Black', () => {
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . X X X X X . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    // Check from any stone in the five
    expect(isExactFive(board, 7, 5, BLACK)).toBe(true);
    expect(isExactFive(board, 7, 7, BLACK)).toBe(true);
    expect(isExactFive(board, 7, 9, BLACK)).toBe(true);
  });

  it('detects vertical five for Black', () => {
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    expect(isExactFive(board, 5, 7, BLACK)).toBe(true);
  });

  it('detects diagonal five for Black', () => {
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . X . . . . . . . . . . .
      . . . . X . . . . . . . . . .
      . . . . . X . . . . . . . . .
      . . . . . . X . . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    expect(isExactFive(board, 5, 5, BLACK)).toBe(true);
  });

  it('returns false for six in a row (overline is NOT exact five)', () => {
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . X X X X X X . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    expect(isExactFive(board, 7, 6, BLACK)).toBe(false);
  });
});

describe('isFiveOrMore', () => {
  it('White wins with six in a row', () => {
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . O O O O O O . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    expect(isFiveOrMore(board, 7, 6, WHITE)).toBe(true);
  });
});

describe('checkWin', () => {
  it('Black wins with exactly five', () => {
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . X X X X X . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    expect(checkWin(board, 7, 7)).toBe(BLACK);
  });

  it('Black does NOT win with six (overline)', () => {
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . X X X X X X . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    expect(checkWin(board, 7, 6)).toBe(EMPTY);
  });

  it('White wins with six in a row', () => {
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . O O O O O O . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    expect(checkWin(board, 7, 6)).toBe(WHITE);
  });
});

// ── Overline ────────────────────────────────────────────────────────

describe('overline forbidden', () => {
  it('six in a row is forbidden for Black', () => {
    // Black has 5 stones, placing the 6th creates overline
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . X X X X X . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    //                  X X X X X
    // placing at (7,3) would make six: X X X X X X — but that's only if (7,3) extends it
    // Actually (7,3) + (7,4)-(7,8) = 6 in a row? No, (7,3) is col 3, stones at cols 4-8 = 5 stones.
    // (7,3) + cols 4-8 = 6 consecutive → overline → forbidden
    expect(isForbidden(board, 7, 3)).toBe(true);

    // (7,9) + cols 4-8 = 6 consecutive → overline → forbidden
    expect(isForbidden(board, 7, 9)).toBe(true);
  });
});

// ── Simple Double-Three (forbidden) ─────────────────────────────────

describe('simple double-three (forbidden)', () => {
  it('two open threes crossing at the placed stone', () => {
    //   Placing at (7,7) creates:
    //     Horizontal three: (7,6), (7,7), (7,8)
    //     Vertical three:   (6,7), (7,7), (8,7)
    //   Both are open (empty on both sides) → forbidden
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . X . X . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    expect(isForbidden(board, 7, 7)).toBe(true);
  });

  it('double-three with diagonal and horizontal', () => {
    //   Placing at (7,7) creates:
    //     Horizontal three: (7,5), (7,6), (7,7)
    //     Diagonal ↘ three: (5,5), (6,6), (7,7)
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . X . . . . . . . . .
      . . . . . . X . . . . . . . .
      . . . . . X X . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    expect(isForbidden(board, 7, 7)).toBe(true);
  });
});

// ── Simple Double-Four (forbidden) ──────────────────────────────────

describe('simple double-four (forbidden)', () => {
  it('two fours crossing at the placed stone', () => {
    //   Placing at (7,7) creates:
    //     Horizontal four: (7,5), (7,6), (7,7), (7,8)
    //     Vertical four:   (5,7), (6,7), (7,7), (8,7)
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . X X . X . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    expect(isForbidden(board, 7, 7)).toBe(true);
  });
});

// ── Five Overrides Forbidden ────────────────────────────────────────

describe('five overrides forbidden patterns', () => {
  it('move that creates five AND double-three is ALLOWED', () => {
    //   Placing at (7,7) creates exactly five horizontally: (7,5)-(7,9)
    //   It also creates a vertical three, but five overrides everything
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . X X . X X . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    // Five in row: (7,5), (7,6), (7,7), (7,8), (7,9)
    expect(isForbidden(board, 7, 7)).toBe(false);
  });

  it('move that creates five AND double-four is ALLOWED', () => {
    //   Placing at (7,7) creates five horizontally
    //   Would also create two fours, but five overrides
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . X X . X X . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    expect(isForbidden(board, 7, 7)).toBe(false);
  });
});

// ── Broken Patterns ─────────────────────────────────────────────────

describe('broken three detection', () => {
  it('X_XX is a three (gap between first and second stone)', () => {
    //   Placing at (7,7) creates:
    //     Horizontal broken three: (7,5), ., (7,7) + existing (7,8) → X . X X
    //     Vertical three: (5,7), (6,7), (7,7) → X X X
    //   The broken horizontal three _X_XX_ CAN become a straight four
    //   by filling the gap at (7,6): _XXXX_
    //   So this is a double-three → forbidden
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . X . . X . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    // Placing at (7,7): vertical three (5,7),(6,7),(7,7) + broken horizontal
    // three via (7,5), gap at (7,6), (7,7),(7,8) → X . X X pattern
    // Filling gap at (7,6) makes _XXXX_ (straight four) → it's a real three
    expect(isForbidden(board, 7, 7)).toBe(true);
  });

  it('XX_X is a three (gap between second and third stone)', () => {
    //   Placing at (7,7) creates:
    //     Horizontal broken three: (7,6), (7,7), ., (7,9) → X X . X
    //     Vertical three: (5,7), (6,7), (7,7)
    //   Filling gap at (7,8) makes _XXXX_ → real three → double-three → forbidden
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . X . . X . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    expect(isForbidden(board, 7, 7)).toBe(true);
  });
});

describe('broken four detection', () => {
  it('X_XXX broken four creates double-four with vertical four', () => {
    //   Placing at (7,7) creates:
    //     Vertical four: (4,7),(5,7),(6,7),(7,7) — four consecutive
    //     Horizontal broken four: (7,5), gap at (7,6), (7,7),(7,8),(7,9) → X _ X X X
    //       From (7,7), findEmptyPoint left → (7,6)=empty
    //       Filling gap at (7,6) makes (7,5)-(7,9) = 5 → it's a four
    //   Two fours → double-four → forbidden
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . X . . X X . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    expect(isForbidden(board, 7, 7)).toBe(true);
  });

  it('XX_XX broken four creates double-four with vertical four', () => {
    //   Placing at (7,5) creates:
    //     Vertical four: (4,5),(5,5),(6,5),(7,5) — four consecutive
    //     Horizontal broken four: (7,5),(7,6), gap at (7,7), (7,8),(7,9) → X X _ X X
    //       From (7,5), findEmptyPoint right → past (7,6)=X → (7,7)=empty
    //       Filling gap at (7,7) makes (7,5)-(7,9) = 5 → it's a four
    //   Two fours → double-four → forbidden
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . X . . . . . . . . .
      . . . . . X . . . . . . . . .
      . . . . . X . . . . . . . . .
      . . . . . . X . X X . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    expect(isForbidden(board, 7, 5)).toBe(true);
  });
});

// ── False Forbidden: Not Actually Forbidden ─────────────────────────

describe('false double-three (actually allowed)', () => {
  it('one three blocked by opponent stone → only one real three → allowed', () => {
    //   Placing at (7,7) creates:
    //     Horizontal three: (7,6), (7,7), (7,8) — but (7,5) is White!
    //       Extend left: (7,5)=O → blocked. Extend right to (7,9): four=(7,6)-(7,9)
    //       but left end (7,5)=O → only one way to make five → NOT straight four
    //     Vertical three: (6,7), (7,7), (8,7) — both ends open → real three
    //   Only 1 real three → allowed
    //
    //   Ref: Similar to renju.net/advanced/ Point I — "both ends are blocked"
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . O X . X . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    expect(isForbidden(board, 7, 7)).toBe(false);
  });

  it('one three half-open (only one end) → not a straight four → allowed', () => {
    //   Placing at (7,7) creates:
    //     Horizontal three: (7,6), (7,7), (7,8)
    //       Left end (7,5) is empty, right end... let's put a wall
    //       Extend right to (7,9): four=(7,6)-(7,9), left=(7,5)=empty, right=(7,10)=O
    //       Only 1 way to make five → regular four, NOT straight four
    //       Extend left to (7,5): four=(7,5)-(7,8), left=(7,4)=empty, right=(7,9)=empty
    //       Both ways to make five → straight four!
    //   Hmm, that means one extension DOES work → it IS a real three.
    //   I need BOTH extensions to fail for the three to not be real.
    //
    //   Better: block both ends with opponent stones
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . O X X . X O . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    // Placing at (7,7):
    //   Horizontal three: (7,5),(7,6),(7,7) — but extending:
    //     Right to (7,8): four=(7,5)-(7,8). Ends: (7,4)=O, (7,9)=O → blocked both sides
    //     Hmm wait, (7,8) already has a stone X. So the line is (7,5),(7,6),(7,7),(7,8) = four.
    //     That's a four not a three. Let me fix.
    //
    //   Actually the horizontal stones are at (7,5),(7,6) left of gap, and (7,8) right.
    //   After placing (7,7): (7,5),(7,6),(7,7),(7,8) = four consecutive.
    //   With O at (7,4) and O at (7,9) → can't extend either way → dead four.
    //
    //   And vertical three: (6,7),(7,7),(8,7) → this IS a real three (both ends open)
    //   Only 1 real three → allowed. But we also have a dead four. That four doesn't
    //   count for double-four since it can't make five.
    expect(isForbidden(board, 7, 7)).toBe(false);
  });

  it('apparent double-three near board edge → one three too close to edge → allowed', () => {
    //   Placing at (0,2) creates:
    //     Horizontal three: (0,0), (0,1), (0,2) — top edge blocks one end
    //       Extend left: off board → can't extend
    //       Extend right to (0,3): four=(0,0)-(0,3), left=off board → only 1 way → NOT straight
    //     Vertical three: need stones at (1,2),(2,2)
    //   Only one direction → not a real double-three
    const board = boardFromAscii(`
      X X . . . . . . . . . . . . .
      . . X . . . . . . . . . . . .
      . . X . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    expect(isForbidden(board, 0, 2)).toBe(false);
  });
});

// ── Recursive False Double-Three ────────────────────────────────────
// Ref: renju.net/advanced/ Point J — "diagonal three cannot become an
// open four because point K is blocked by 4x4 rule"

describe('recursive false double-three (extension point is itself forbidden)', () => {
  it('three whose extension point is forbidden (double-four) → not a real three → allowed', () => {
    //   This is the verified example from our analysis.
    //
    //   Board:
    //     (5,5)=X  (6,6)=X  — diagonal ↘ stones
    //     (7,4)=O  (7,5)=X  (7,6)=X  — horizontal stones + White blocker
    //     (8,7)=X  (9,6)=X  (10,5)=X — stones that make (7,8) a double-four
    //
    //   Placing at (7,7):
    //     Three A (horizontal): (7,5),(7,6),(7,7)
    //       Extension left: blocked by O at (7,4) → None
    //       Extension right to (7,8): placing Black at (7,8) creates:
    //         - Horizontal four: (7,5),(7,6),(7,7),(7,8)
    //         - Diagonal ↙ four: (7,8),(8,7),(9,6),(10,5)
    //         → double-four → (7,8) is FORBIDDEN
    //       → Three A is NOT a real three
    //
    //     Three B (diagonal ↘): (5,5),(6,6),(7,7)
    //       Extension to (8,8): legal, creates straight four → real three
    //
    //   Result: 1 real three → NOT forbidden → ALLOWED
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . X . . . . . . . . .
      . . . . . . X . . . . . . . .
      . . . . O X X . . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . X . . . . . . . .
      . . . . . X . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    expect(isForbidden(board, 7, 7)).toBe(false);
  });

  it('verify the extension point IS actually forbidden (double-four)', () => {
    //   Using the same board as above, but checking (7,8) directly.
    //   Place Black at (7,7) first (to simulate the context), then check (7,8).
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . X . . . . . . . . .
      . . . . . . X . . . . . . . .
      . . . . O X X X . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . X . . . . . . . .
      . . . . . X . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    // (7,7) is already placed. Now (7,8) creates:
    //   Horizontal four: (7,5),(7,6),(7,7),(7,8)
    //   Diagonal ↙ four: (7,8),(8,7),(9,6),(10,5)
    //   → double-four → forbidden
    expect(isForbidden(board, 7, 8)).toBe(true);
  });
});

// ── False Double-Four (overline blocks) ─────────────────────────────
// Ref: renju.net/advanced/ Point F — "diagonal four cannot become
// winning 5 in a row on the next move (because of overline)"

describe('false double-four due to overline', () => {
  it('four that would create overline if extended → not a real four → allowed', () => {
    //   Placing at (7,7) creates:
    //     Vertical four: (4,7),(5,7),(6,7),(7,7) — can extend to (8,7) for five ✓
    //     Horizontal: (7,3),(7,4),(7,5),(7,6),(7,7),(7,8),(7,9)... wait,
    //       I need a horizontal four where extending creates 6+ (overline).
    //
    //   Setup: horizontal has X X X . X X X pattern.
    //   After placing at gap: X X X X X X X = 7 → overline → can't win
    //   So the "four" on each side isn't a real four (can't make exactly five).
    //
    //   Let me create: horizontal stones at (7,4),(7,5),(7,6) and (7,8),(7,9)
    //   Placing at (7,7) creates: (7,4),(7,5),(7,6),(7,7),(7,8),(7,9) = 6 → overline → forbidden
    //   Hmm, that's just an overline, caught by the overline check directly.
    //
    //   The Point F case is: a four in one direction where EXTENDING it would
    //   create overline (6+), so that four "doesn't exist."
    //   Combined with a real four in another direction → only 1 real four → not double-four.
    //
    //   Setup:
    //     Vertical: (5,7),(6,7),(7,7),(8,7) — four that can make five at (4,7) or (9,7) ✓
    //     Diagonal: (7,7) plus stones making a four in diagonal, but the diagonal
    //       has extra stones that would make it 6+ if extended.
    //
    //   Diagonal ↘: stones at (4,4),(5,5),(6,6) and also (8,8),(9,9)
    //   After placing (7,7): line is (4,4),(5,5),(6,6),(7,7),(8,8),(9,9) = 6 → overline
    //   But that's caught by overline check, not by "false four."
    //
    //   I need: diagonal four through (7,7) that DOESN'T create overline at (7,7)
    //   but would create overline if extended to five.
    //   Stones at (5,5),(6,6),(8,8) — after placing (7,7): four = (5,5),(6,6),(7,7),(8,8)
    //   Extend to (4,4): five = (4,4)-(8,8) ✓ — this works, not overline
    //   Extend to (9,9): five = (5,5)-(9,9) ✓ — also works
    //   That's a normal four.
    //
    //   For overline to block: stones at (3,3),(4,4),(5,5),(6,6),(8,8)
    //   After placing (7,7): (3,3),(4,4),(5,5),(6,6),(7,7),(8,8) = 6 → direct overline
    //
    //   Hmm. The "false four due to overline" only works when the four has EXACTLY
    //   4 stones but extending to five would go through a 6th stone.
    //   Example: stones at (5,5),(6,6),(8,8),(9,9) and place at (7,7)
    //   That makes: (5,5),(6,6),(7,7) and (7,7),(8,8),(9,9) — two groups connected at (7,7)
    //   Full line: (5,5),(6,6),(7,7),(8,8),(9,9) = five! → that's a win, not forbidden.
    //
    //   OK, the Point F case specifically is about a four that exists BEFORE the move,
    //   and the move completes it BUT the five would be 6+. Let me set it up differently.
    //   Three stones in diagonal + one separated by gap, and the move makes a "four"
    //   but extending that four hits an overline.
    //
    //   Stones at (4,4),(5,5),(6,6) in diagonal, and (7,7) would extend to four.
    //   Plus extra stone at (3,3). Now (3,3),(4,4),(5,5),(6,6),(7,7) = five → win.
    //   Still five = allowed.
    //
    //   I think the actual Point F case involves a BROKEN four where one end
    //   has extra stones. E.g.:
    //     Stones at (3,3),(4,4),(5,5), gap, (7,7) in diagonal.
    //     (7,7) with (3,3),(4,4),(5,5) — the four would be (3,3)-(5,5)+(7,7) with gap at (6,6).
    //     Filling gap: (3,3),(4,4),(5,5),(6,6),(7,7) = five → valid four.
    //     But if there's also (2,2): then filling gap creates (2,2)-(7,7) = 6 → overline
    //     → can't make five → not a real four!
    //
    //   YES! That's the case. Let me build it:
    //     Diagonal ↘ stones: (2,2),(3,3),(4,4),(5,5), gap at (6,6), place at (7,7)
    //     After placing (7,7): line includes (2,2),(3,3),(4,4),(5,5),gap,(7,7)
    //     Filling gap at (6,6): (2,2)-(7,7) = 6 → overline → NOT a valid five
    //     So this "four" can't make exactly five → not a real four.
    //     Combined with a real four in vertical → only 1 four → not double-four → allowed.
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . X . . . . . . . . . . . .
      . . . X . . . . . . . . . . .
      . . . . X . . X . . . . . . .
      . . . . . X . X . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    // Placing at (7,7):
    //   Diagonal ↘: (2,2),(3,3),(4,4),(5,5), gap at (6,6), (7,7)
    //     This is a "four" (4 stones in the row) but filling gap at (6,6) makes:
    //     (2,2),(3,3),(4,4),(5,5),(6,6),(7,7) = 6 → overline → NOT a valid five
    //     → not a real four
    //   Vertical: (4,7),(5,7),(6,7),(7,7) = four consecutive
    //     Extend to (3,7) or (8,7) → five → real four
    //   Only 1 real four → not double-four → ALLOWED
    expect(isForbidden(board, 7, 7)).toBe(false);
  });
});

// ── Not Forbidden: Single Three or Four ─────────────────────────────

describe('single three or four is allowed', () => {
  it('single open three is allowed', () => {
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . X . X . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    // Placing at (7,7) creates a single horizontal three → allowed
    expect(isForbidden(board, 7, 7)).toBe(false);
  });

  it('single four is allowed', () => {
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . X X . X . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    // Placing at (7,7) creates a single horizontal four → allowed
    expect(isForbidden(board, 7, 7)).toBe(false);
  });
});

// ── Empty/trivial cases ─────────────────────────────────────────────

describe('edge cases', () => {
  it('placing on an occupied cell is not forbidden (just invalid)', () => {
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    expect(isForbidden(board, 7, 7)).toBe(false);
  });

  it('first move at center is not forbidden', () => {
    const board = createBoard();
    expect(isForbidden(board, 7, 7)).toBe(false);
  });

  it('single stone placement is not forbidden', () => {
    const board = createBoard();
    board[7][7] = BLACK;
    expect(isForbidden(board, 6, 6)).toBe(false);
  });
});

// ── getForbiddenMoves ───────────────────────────────────────────────

describe('getForbiddenMoves', () => {
  it('returns all forbidden positions on a board with a double-three setup', () => {
    const board = boardFromAscii(`
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . X . X . . . . . .
      . . . . . . . X . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
      . . . . . . . . . . . . . . .
    `);
    const forbidden = getForbiddenMoves(board);
    // (7,7) should be in the forbidden set
    expect(forbidden.has('7,7')).toBe(true);
  });
});

// ── Opening Rules ───────────────────────────────────────────────────

describe('checkOpeningRule', () => {
  describe('move 1 (Black): must be center (7,7)', () => {
    it('center is valid', () => {
      expect(checkOpeningRule(1, 7, 7)).toBeNull();
    });

    it('off-center is invalid', () => {
      expect(checkOpeningRule(1, 7, 8)).not.toBeNull();
      expect(checkOpeningRule(1, 6, 7)).not.toBeNull();
      expect(checkOpeningRule(1, 0, 0)).not.toBeNull();
    });
  });

  describe('move 2 (White): must be within 3×3 center (rows 6-8, cols 6-8)', () => {
    it('adjacent to center is valid', () => {
      // All 9 cells in the 3×3 area
      for (let r = 6; r <= 8; r++) {
        for (let c = 6; c <= 8; c++) {
          expect(checkOpeningRule(2, r, c)).toBeNull();
        }
      }
    });

    it('outside 3×3 is invalid', () => {
      expect(checkOpeningRule(2, 5, 7)).not.toBeNull();
      expect(checkOpeningRule(2, 9, 7)).not.toBeNull();
      expect(checkOpeningRule(2, 7, 5)).not.toBeNull();
      expect(checkOpeningRule(2, 7, 9)).not.toBeNull();
      expect(checkOpeningRule(2, 0, 0)).not.toBeNull();
    });
  });

  describe('move 3 (Black): must be within 5×5 center (rows 5-9, cols 5-9)', () => {
    it('within 5×5 is valid', () => {
      expect(checkOpeningRule(3, 5, 5)).toBeNull();
      expect(checkOpeningRule(3, 9, 9)).toBeNull();
      expect(checkOpeningRule(3, 7, 7)).toBeNull();
      expect(checkOpeningRule(3, 5, 9)).toBeNull();
    });

    it('outside 5×5 is invalid', () => {
      expect(checkOpeningRule(3, 4, 7)).not.toBeNull();
      expect(checkOpeningRule(3, 10, 7)).not.toBeNull();
      expect(checkOpeningRule(3, 7, 4)).not.toBeNull();
      expect(checkOpeningRule(3, 7, 10)).not.toBeNull();
    });
  });

  describe('move 4+: anywhere is valid', () => {
    it('any position is valid for move 4 and beyond', () => {
      expect(checkOpeningRule(4, 0, 0)).toBeNull();
      expect(checkOpeningRule(4, 14, 14)).toBeNull();
      expect(checkOpeningRule(5, 3, 12)).toBeNull();
      expect(checkOpeningRule(100, 0, 14)).toBeNull();
    });
  });
});
