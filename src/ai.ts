/**
 * Renju AI Engine
 *
 * Alpha-beta pruning with iterative deepening, transposition table,
 * and pattern-based evaluation.
 */

import {
  Board, BOARD_SIZE, BLACK, WHITE, EMPTY, Stone,
  inBounds, opponent, createBoard, Pos, posKey,
} from './types';
import { isForbidden, isFiveOrMore, isExactFive } from './renju-rules';

const DIRS: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];

const WIN_SCORE = 1_000_000;
const FOUR_SCORE = 50_000;
const OPEN_FOUR_SCORE = 100_000;
const THREE_SCORE = 5_000;
const OPEN_THREE_SCORE = 10_000;
const TWO_SCORE = 500;
const OPEN_TWO_SCORE = 1_000;

// Transposition table entry
interface TTEntry {
  depth: number;
  score: number;
  flag: 'exact' | 'lower' | 'upper';
  bestMove: Pos | null;
}

let transTable: Map<string, TTEntry>;
let nodesSearched: number;
let searchAborted: boolean;
let maxTimeMs: number;
let searchStartTime: number;

/**
 * Find the best move for the given player.
 */
export function findBestMove(
  board: Board,
  player: Stone,
  depth: number,
  timeLimitMs: number = 5000,
): Pos {
  transTable = new Map();
  nodesSearched = 0;
  searchAborted = false;
  maxTimeMs = timeLimitMs;
  searchStartTime = Date.now();

  let bestMove: Pos = [-1, -1];

  // Iterative deepening
  for (let d = 1; d <= depth; d++) {
    searchAborted = false;
    const result = alphaBetaRoot(board, player, d);
    if (!searchAborted && result.move[0] !== -1) {
      bestMove = result.move;
    }
    if (searchAborted) break;
    // If we found a winning move, stop immediately
    if (result.score >= WIN_SCORE - 100) break;
  }

  // Fallback: pick any empty cell near existing stones
  if (bestMove[0] === -1) {
    bestMove = fallbackMove(board);
  }

  return bestMove;
}

function alphaBetaRoot(board: Board, player: Stone, depth: number): { move: Pos; score: number } {
  const moves = generateMoves(board, player);
  if (moves.length === 0) return { move: [-1, -1], score: 0 };

  let bestScore = -Infinity;
  let bestMove: Pos = moves[0];

  for (const [r, c] of moves) {
    board[r][c] = player;
    const score = -alphaBeta(board, opponent(player), depth - 1, -Infinity, -bestScore);
    board[r][c] = EMPTY;

    if (searchAborted) return { move: bestMove, score: bestScore };

    if (score > bestScore) {
      bestScore = score;
      bestMove = [r, c];
    }
  }

  return { move: bestMove, score: bestScore };
}

function alphaBeta(board: Board, player: Stone, depth: number, alpha: number, beta: number): number {
  nodesSearched++;

  // Time check every 4096 nodes
  if ((nodesSearched & 4095) === 0) {
    if (Date.now() - searchStartTime > maxTimeMs) {
      searchAborted = true;
      return 0;
    }
  }

  // Check for terminal state: did the opponent just win?
  // The last move was by opponent(player), check if they won
  const opp = opponent(player);
  if (hasWon(board, opp)) {
    return -(WIN_SCORE - (depth > 0 ? depth : 0));
  }

  if (depth <= 0) {
    return evaluate(board, player);
  }

  const key = boardKey(board, player);
  const ttEntry = transTable.get(key);
  if (ttEntry && ttEntry.depth >= depth) {
    if (ttEntry.flag === 'exact') return ttEntry.score;
    if (ttEntry.flag === 'lower') alpha = Math.max(alpha, ttEntry.score);
    if (ttEntry.flag === 'upper') beta = Math.min(beta, ttEntry.score);
    if (alpha >= beta) return ttEntry.score;
  }

  const moves = generateMoves(board, player);
  if (moves.length === 0) return 0;

  // Move ordering: try TT best move first
  if (ttEntry?.bestMove) {
    const [tr, tc] = ttEntry.bestMove;
    const idx = moves.findIndex(([r, c]) => r === tr && c === tc);
    if (idx > 0) {
      moves.splice(idx, 1);
      moves.unshift([tr, tc]);
    }
  }

  let bestScore = -Infinity;
  let bestMove: Pos | null = null;
  let flag: 'exact' | 'lower' | 'upper' = 'upper';

  for (const [r, c] of moves) {
    board[r][c] = player;
    const score = -alphaBeta(board, opp, depth - 1, -beta, -alpha);
    board[r][c] = EMPTY;

    if (searchAborted) return 0;

    if (score > bestScore) {
      bestScore = score;
      bestMove = [r, c];
    }

    if (score > alpha) {
      alpha = score;
      flag = 'exact';
    }

    if (alpha >= beta) {
      flag = 'lower';
      break;
    }
  }

  // Store in transposition table (limit size to avoid memory issues)
  if (transTable.size < 500_000) {
    transTable.set(key, { depth, score: bestScore, flag, bestMove });
  }

  return bestScore;
}

function hasWon(board: Board, player: Stone): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== player) continue;
      if (player === BLACK && isExactFive(board, r, c, BLACK)) return true;
      if (player === WHITE && isFiveOrMore(board, r, c, WHITE)) return true;
    }
  }
  return false;
}

/**
 * Generate candidate moves, sorted by proximity to existing stones
 * and basic threat assessment.
 */
function generateMoves(board: Board, player: Stone): Pos[] {
  const candidates: { pos: Pos; priority: number }[] = [];
  const occupied = new Set<string>();

  // Find all occupied cells
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== EMPTY) occupied.add(posKey(r, c));
    }
  }

  // If board is empty, play center
  if (occupied.size === 0) return [[7, 7]];

  // Generate moves within distance 2 of existing stones
  const seen = new Set<string>();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === EMPTY) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (!inBounds(nr, nc)) continue;
          if (board[nr][nc] !== EMPTY) continue;
          const key = posKey(nr, nc);
          if (seen.has(key)) continue;
          seen.add(key);

          // Skip forbidden moves for black
          if (player === BLACK && isForbidden(board, nr, nc)) continue;

          const priority = scoreMoveCandidate(board, nr, nc, player);
          candidates.push({ pos: [nr, nc], priority });
        }
      }
    }
  }

  // Sort by priority descending
  candidates.sort((a, b) => b.priority - a.priority);

  // Limit candidates to prevent explosion
  const maxCandidates = 20;
  return candidates.slice(0, maxCandidates).map(c => c.pos);
}

/** Quick score for move ordering */
function scoreMoveCandidate(board: Board, r: number, c: number, player: Stone): number {
  let score = 0;
  const opp = opponent(player);

  board[r][c] = player;
  // Check if this is a winning move
  if (player === BLACK ? isExactFive(board, r, c, BLACK) : isFiveOrMore(board, r, c, WHITE)) {
    board[r][c] = EMPTY;
    return 1_000_000;
  }
  board[r][c] = EMPTY;

  // Check if opponent would win here (defensive)
  board[r][c] = opp;
  if (opp === BLACK ? isExactFive(board, r, c, BLACK) : isFiveOrMore(board, r, c, WHITE)) {
    board[r][c] = EMPTY;
    return 900_000;
  }
  board[r][c] = EMPTY;

  // Score based on adjacent stones
  for (const [dr, dc] of DIRS) {
    score += countLineScore(board, r, c, dr, dc, player) * 2;
    score += countLineScore(board, r, c, dr, dc, opp);
  }

  // Prefer moves closer to center
  const centerDist = Math.abs(r - 7) + Math.abs(c - 7);
  score += (14 - centerDist) * 2;

  return score;
}

function countLineScore(board: Board, r: number, c: number, dr: number, dc: number, player: Stone): number {
  const fwd = countDirStones(board, r, c, dr, dc, player);
  const bwd = countDirStones(board, r, c, -dr, -dc, player);
  const total = fwd + bwd;

  if (total >= 4) return 10000;
  if (total === 3) return 1000;
  if (total === 2) return 100;
  if (total === 1) return 10;
  return 0;
}

function countDirStones(board: Board, r: number, c: number, dr: number, dc: number, player: Stone): number {
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
 * Static evaluation: score the board from the perspective of `player`.
 */
function evaluate(board: Board, player: Stone): number {
  return evaluateFor(board, player) - evaluateFor(board, opponent(player));
}

function evaluateFor(board: Board, player: Stone): number {
  let score = 0;
  const counted = new Set<string>();

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== player) continue;

      for (const [dr, dc] of DIRS) {
        const lineKey = `${r},${c},${dr},${dc}`;
        if (counted.has(lineKey)) continue;

        const { length, openEnds } = analyzeLineFrom(board, r, c, dr, dc, player);

        // Mark all stones in this line as counted for this direction
        for (let i = 0; i < length; i++) {
          counted.add(`${r + i * dr},${c + i * dc},${dr},${dc}`);
        }

        if (length >= 5) {
          score += WIN_SCORE;
        } else if (length === 4) {
          score += openEnds === 2 ? OPEN_FOUR_SCORE : openEnds === 1 ? FOUR_SCORE : 0;
        } else if (length === 3) {
          score += openEnds === 2 ? OPEN_THREE_SCORE : openEnds === 1 ? THREE_SCORE : 0;
        } else if (length === 2) {
          score += openEnds === 2 ? OPEN_TWO_SCORE : openEnds === 1 ? TWO_SCORE : 0;
        }
      }
    }
  }

  return score;
}

function analyzeLineFrom(
  board: Board, r: number, c: number, dr: number, dc: number, player: Stone,
): { length: number; openEnds: number } {
  // Check this is the start of a line (previous cell is not the same player)
  const pr = r - dr, pc = c - dc;
  if (inBounds(pr, pc) && board[pr][pc] === player) {
    return { length: 0, openEnds: 0 };
  }

  let length = 0;
  let nr = r, nc = c;
  while (inBounds(nr, nc) && board[nr][nc] === player) {
    length++;
    nr += dr;
    nc += dc;
  }

  let openEnds = 0;
  // Check before
  if (inBounds(pr, pc) && board[pr][pc] === EMPTY) openEnds++;
  // Check after
  if (inBounds(nr, nc) && board[nr][nc] === EMPTY) openEnds++;

  return { length, openEnds };
}

function boardKey(board: Board, player: Stone): string {
  // Use a compact string representation
  let key = player === BLACK ? 'B' : 'W';
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      key += board[r][c];
    }
  }
  return key;
}

function fallbackMove(board: Board): Pos {
  // First: try center
  if (board[7][7] === EMPTY) return [7, 7];

  // Then: find any empty cell near existing stones
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== EMPTY) continue;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (inBounds(nr, nc) && board[nr][nc] !== EMPTY) return [r, c];
        }
      }
    }
  }

  return [7, 7];
}
