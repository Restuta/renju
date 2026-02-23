import { BOARD_SIZE, Stone, Move, GameResult, GameState } from './types';
import { cloneBoard, makeMove, undoMove, checkWin, isForbiddenMove } from './game';

// ─── Pattern-based evaluation ───

const DIRECTIONS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

/** Read a line of cells centered at (r,c) going in direction (dr,dc), returning stones and bounds */
function readLine(
  board: Stone[][],
  r: number,
  c: number,
  dr: number,
  dc: number,
  stone: Stone
): { count: number; openEnds: number } {
  let fwd = 0;
  let fr = r + dr,
    fc = c + dc;
  while (inBounds(fr, fc) && board[fr][fc] === stone) {
    fwd++;
    fr += dr;
    fc += dc;
  }
  const fwdOpen = inBounds(fr, fc) && board[fr][fc] === Stone.Empty ? 1 : 0;

  let bwd = 0;
  let br = r - dr,
    bc = c - dc;
  while (inBounds(br, bc) && board[br][bc] === stone) {
    bwd++;
    br -= dr;
    bc -= dc;
  }
  const bwdOpen = inBounds(br, bc) && board[br][bc] === Stone.Empty ? 1 : 0;

  return { count: 1 + fwd + bwd, openEnds: fwdOpen + bwdOpen };
}

// Score patterns
const SCORE_FIVE = 1000000;
const SCORE_OPEN_FOUR = 100000;
const SCORE_HALF_FOUR = 10000;
const SCORE_OPEN_THREE = 5000;
const SCORE_HALF_THREE = 500;
const SCORE_OPEN_TWO = 200;
const SCORE_HALF_TWO = 50;

function patternScore(count: number, openEnds: number): number {
  if (count >= 5) return SCORE_FIVE;
  if (count === 4) {
    if (openEnds === 2) return SCORE_OPEN_FOUR;
    if (openEnds === 1) return SCORE_HALF_FOUR;
  }
  if (count === 3) {
    if (openEnds === 2) return SCORE_OPEN_THREE;
    if (openEnds === 1) return SCORE_HALF_THREE;
  }
  if (count === 2) {
    if (openEnds === 2) return SCORE_OPEN_TWO;
    if (openEnds === 1) return SCORE_HALF_TWO;
  }
  return 0;
}

/** Evaluate the board from the perspective of `stone` */
function evaluateBoard(board: Stone[][], aiStone: Stone): number {
  const opponent = aiStone === Stone.Black ? Stone.White : Stone.Black;
  let score = 0;

  // Track evaluated positions to avoid double-counting
  const evaluated = new Set<string>();

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === Stone.Empty) continue;

      const stone = board[r][c];
      const multiplier = stone === aiStone ? 1 : -1.1; // Slightly favor defense

      for (const [dr, dc] of DIRECTIONS) {
        // Find the start of this line to avoid double-counting
        let sr = r,
          sc = c;
        while (
          inBounds(sr - dr, sc - dc) &&
          board[sr - dr][sc - dc] === stone
        ) {
          sr -= dr;
          sc -= dc;
        }
        const key = `${sr},${sc},${dr},${dc}`;
        if (evaluated.has(key)) continue;
        evaluated.add(key);

        const { count, openEnds } = readLine(board, r, c, dr, dc, stone);
        score += multiplier * patternScore(count, openEnds);
      }
    }
  }

  // Center control bonus
  const center = Math.floor(BOARD_SIZE / 2);
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== Stone.Empty) {
        const dist = Math.abs(r - center) + Math.abs(c - center);
        const bonus = Math.max(0, 10 - dist * 2);
        score += board[r][c] === aiStone ? bonus : -bonus;
      }
    }
  }

  return score;
}

// ─── Move generation: only consider moves near existing stones ───

function getCandidateMoves(state: GameState, radius: number = 2): Move[] {
  const { board, currentPlayer } = state;
  const candidates: Move[] = [];
  const hasNeighbor = new Set<string>();

  // If board is empty, play center
  if (state.moves.length === 0) {
    return [{ row: 7, col: 7 }];
  }

  // Find all cells near existing stones
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === Stone.Empty) continue;
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (!inBounds(nr, nc)) continue;
          if (board[nr][nc] !== Stone.Empty) continue;
          const key = `${nr},${nc}`;
          if (hasNeighbor.has(key)) continue;
          // Skip forbidden moves for black
          if (
            currentPlayer === Stone.Black &&
            isForbiddenMove(board, nr, nc)
          )
            continue;
          hasNeighbor.add(key);
          candidates.push({ row: nr, col: nc });
        }
      }
    }
  }

  return candidates;
}

/** Score a candidate move for ordering (higher = search first) */
function moveOrderScore(board: Stone[][], move: Move, stone: Stone): number {
  const opponent = stone === Stone.Black ? Stone.White : Stone.Black;
  let score = 0;

  board[move.row][move.col] = stone;
  for (const [dr, dc] of DIRECTIONS) {
    const info = readLine(board, move.row, move.col, dr, dc, stone);
    score += patternScore(info.count, info.openEnds);
  }
  board[move.row][move.col] = Stone.Empty;

  // Also check opponent's threats at this position
  board[move.row][move.col] = opponent;
  for (const [dr, dc] of DIRECTIONS) {
    const info = readLine(board, move.row, move.col, dr, dc, opponent);
    score += patternScore(info.count, info.openEnds) * 0.9;
  }
  board[move.row][move.col] = Stone.Empty;

  // Center preference
  const center = Math.floor(BOARD_SIZE / 2);
  const dist = Math.abs(move.row - center) + Math.abs(move.col - center);
  score += Math.max(0, 14 - dist);

  return score;
}

// ─── Transposition table ───

interface TTEntry {
  depth: number;
  score: number;
  flag: 'exact' | 'lower' | 'upper';
  bestMove?: Move;
}

const TT_SIZE = 1 << 20; // ~1M entries

// ─── Zobrist hashing ───

const zobristTable: bigint[][] = [];
const zobristBlack: bigint[] = [];
const zobristWhite: bigint[] = [];

function initZobrist(): void {
  // Use a simple PRNG for reproducibility
  let seed = 12345n;
  function rand64(): bigint {
    seed = (seed * 6364136223846793005n + 1442695040888963407n) & 0xFFFFFFFFFFFFFFFFn;
    return seed;
  }

  for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
    zobristBlack[i] = rand64();
    zobristWhite[i] = rand64();
  }
}

initZobrist();

function boardHash(board: Stone[][]): number {
  let h = 0n;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const idx = r * BOARD_SIZE + c;
      if (board[r][c] === Stone.Black) h ^= zobristBlack[idx];
      else if (board[r][c] === Stone.White) h ^= zobristWhite[idx];
    }
  }
  return Number(h & BigInt(TT_SIZE - 1));
}

// ─── Alpha-Beta with iterative deepening ───

let nodeCount = 0;
let ttHits = 0;
const transTable = new Map<number, TTEntry>();

function alphaBeta(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  aiStone: Stone,
  deadline: number
): number {
  nodeCount++;

  // Time check every 4096 nodes
  if ((nodeCount & 4095) === 0 && performance.now() > deadline) {
    return maximizing ? -Infinity : Infinity;
  }

  // Check terminal state
  if (state.result !== GameResult.None) {
    if (
      (state.result === GameResult.BlackWin && aiStone === Stone.Black) ||
      (state.result === GameResult.WhiteWin && aiStone === Stone.White)
    ) {
      return SCORE_FIVE * 10 + depth; // Win sooner = better
    }
    if (state.result === GameResult.Draw) return 0;
    return -SCORE_FIVE * 10 - depth; // Lose later = better
  }

  if (depth <= 0) {
    return evaluateBoard(state.board, aiStone);
  }

  // TT lookup
  const hash = boardHash(state.board);
  const ttEntry = transTable.get(hash);
  if (ttEntry && ttEntry.depth >= depth) {
    ttHits++;
    if (ttEntry.flag === 'exact') return ttEntry.score;
    if (ttEntry.flag === 'lower') alpha = Math.max(alpha, ttEntry.score);
    if (ttEntry.flag === 'upper') beta = Math.min(beta, ttEntry.score);
    if (alpha >= beta) return ttEntry.score;
  }

  const candidates = getCandidateMoves(state);
  if (candidates.length === 0) {
    return evaluateBoard(state.board, aiStone);
  }

  // Move ordering
  const scored = candidates.map((m) => ({
    move: m,
    score: moveOrderScore(state.board, m, state.currentPlayer),
  }));
  scored.sort((a, b) => b.score - a.score);

  // Limit branching at deeper levels
  const maxMoves = depth <= 2 ? 12 : depth <= 4 ? 18 : 25;
  const orderedMoves = scored.slice(0, maxMoves).map((s) => s.move);

  // Put TT best move first if available
  if (ttEntry?.bestMove) {
    const idx = orderedMoves.findIndex(
      (m) => m.row === ttEntry.bestMove!.row && m.col === ttEntry.bestMove!.col
    );
    if (idx > 0) {
      const [best] = orderedMoves.splice(idx, 1);
      orderedMoves.unshift(best);
    }
  }

  let bestMove = orderedMoves[0];
  let bestScore: number;

  if (maximizing) {
    bestScore = -Infinity;
    for (const move of orderedMoves) {
      if (!makeMove(state, move)) continue;
      const score = alphaBeta(state, depth - 1, alpha, beta, false, aiStone, deadline);
      undoMove(state);

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, score);
      if (alpha >= beta) break;
    }
  } else {
    bestScore = Infinity;
    for (const move of orderedMoves) {
      if (!makeMove(state, move)) continue;
      const score = alphaBeta(state, depth - 1, alpha, beta, true, aiStone, deadline);
      undoMove(state);

      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
      beta = Math.min(beta, score);
      if (alpha >= beta) break;
    }
  }

  // Store in TT
  let flag: TTEntry['flag'] = 'exact';
  if (bestScore <= alpha) flag = 'upper';
  else if (bestScore >= beta) flag = 'lower';

  transTable.set(hash, { depth, score: bestScore, flag, bestMove });

  // Limit TT size
  if (transTable.size > TT_SIZE) {
    // Evict some entries
    const iter = transTable.keys();
    for (let i = 0; i < TT_SIZE / 4; i++) {
      const key = iter.next().value;
      if (key !== undefined) transTable.delete(key);
    }
  }

  return bestScore;
}

export interface AIResult {
  move: Move;
  score: number;
  depth: number;
  nodes: number;
  timeMs: number;
}

export function findBestMove(
  state: GameState,
  timeLimitMs: number = 3000,
  maxDepth: number = 12
): AIResult {
  const startTime = performance.now();
  const deadline = startTime + timeLimitMs;
  const aiStone = state.currentPlayer;

  // If first move, play center
  if (state.moves.length === 0) {
    return {
      move: { row: 7, col: 7 },
      score: 0,
      depth: 0,
      nodes: 0,
      timeMs: 0,
    };
  }

  // If second move, play near center
  if (state.moves.length === 1) {
    const first = state.moves[0];
    const offsets = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 1],
      [1, -1], [1, 0], [1, 1],
    ];
    // Pick a random adjacent cell
    const idx = Math.floor(Math.random() * offsets.length);
    const [dr, dc] = offsets[idx];
    const r = first.row + dr;
    const c = first.col + dc;
    if (inBounds(r, c)) {
      return {
        move: { row: r, col: c },
        score: 0,
        depth: 0,
        nodes: 0,
        timeMs: performance.now() - startTime,
      };
    }
  }

  nodeCount = 0;
  ttHits = 0;

  let bestMove: Move = { row: 7, col: 7 };
  let bestScore = -Infinity;
  let completedDepth = 0;

  // Quick win/threat check
  const candidates = getCandidateMoves(state);

  // Check for immediate wins
  for (const move of candidates) {
    if (makeMove(state, move)) {
      if (state.result !== GameResult.None) {
        undoMove(state);
        return {
          move,
          score: SCORE_FIVE * 10,
          depth: 1,
          nodes: 1,
          timeMs: performance.now() - startTime,
        };
      }
      undoMove(state);
    }
  }

  // Check if opponent wins next move and block
  const opponent = aiStone === Stone.Black ? Stone.White : Stone.Black;
  const tmpState: GameState = {
    board: state.board,
    currentPlayer: opponent,
    moves: [...state.moves],
    result: GameResult.None,
  };
  for (const move of getCandidateMoves(tmpState)) {
    tmpState.board[move.row][move.col] = opponent;
    if (checkWin(tmpState.board, move.row, move.col, opponent)) {
      tmpState.board[move.row][move.col] = Stone.Empty;
      // Must block here
      if (
        aiStone !== Stone.Black ||
        !isForbiddenMove(state.board, move.row, move.col)
      ) {
        return {
          move,
          score: SCORE_FIVE,
          depth: 1,
          nodes: candidates.length,
          timeMs: performance.now() - startTime,
        };
      }
    }
    tmpState.board[move.row][move.col] = Stone.Empty;
  }

  // Iterative deepening
  for (let depth = 2; depth <= maxDepth; depth += 1) {
    if (performance.now() > deadline) break;

    const score = alphaBeta(
      state,
      depth,
      -Infinity,
      Infinity,
      true,
      aiStone,
      deadline
    );

    // If we ran out of time, don't trust this depth's result
    if (performance.now() > deadline && depth > 2) break;

    // Get best move from TT
    const hash = boardHash(state.board);
    const entry = transTable.get(hash);
    if (entry?.bestMove) {
      bestMove = entry.bestMove;
      bestScore = score;
      completedDepth = depth;
    }

    // If we found a forced win, stop searching
    if (Math.abs(score) > SCORE_FIVE * 5) break;
  }

  return {
    move: bestMove,
    score: bestScore,
    depth: completedDepth,
    nodes: nodeCount,
    timeMs: performance.now() - startTime,
  };
}
