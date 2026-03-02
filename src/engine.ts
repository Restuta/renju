import { BOARD_SIZE, getCandidateMoves, getForbiddenReason, idx, isWin, type Board, type Color, type Point } from "./rules";

interface CachedScore {
  depth: number;
  score: number;
}

interface SearchOptions {
  maxDepth?: number;
  timeLimitMs?: number;
}

interface RenjuEngineOptions {
  now?: () => number;
}

interface DepthSearchResult {
  move: Point;
  completed: boolean;
}

class SearchTimeoutError extends Error {}

export class RenjuEngine {
  private table = new Map<string, CachedScore>();
  private readonly now: () => number;

  constructor(options: RenjuEngineOptions = {}) {
    this.now =
      options.now ??
      (() => {
        if (typeof performance !== "undefined" && typeof performance.now === "function") {
          return performance.now();
        }
        return Date.now();
      });
  }

  findBestMove(board: Board, depth = 2): Point {
    return this.searchAtDepth(board, depth).move;
  }

  findBestMoveIterative(board: Board, options: SearchOptions = {}): Point {
    const maxDepth = Math.max(1, options.maxDepth ?? 4);
    const timeLimitMs = Math.max(1, options.timeLimitMs ?? 100);
    const deadline = this.now() + timeLimitMs;

    let best = this.searchAtDepth(board, 1).move;
    for (let depth = 2; depth <= maxDepth; depth++) {
      if (this.now() >= deadline) break;

      const result = this.searchAtDepth(board, depth, deadline);
      if (!result.completed) break;
      best = result.move;
    }

    return best;
  }

  private throwIfTimedOut(deadline?: number): void {
    if (deadline !== undefined && this.now() >= deadline) {
      throw new SearchTimeoutError();
    }
  }

  private searchAtDepth(board: Board, depth: number, deadline?: number): DepthSearchResult {
    const moves = this.orderedMoves(board, 2);
    let best = moves[0] ?? { x: Math.floor(BOARD_SIZE / 2), y: Math.floor(BOARD_SIZE / 2) };
    let bestScore = Number.NEGATIVE_INFINITY;

    try {
      for (const m of moves) {
        this.throwIfTimedOut(deadline);

        const next = board.slice();
        next[idx(m.x, m.y)] = 2;
        if (isWin(next, m.x, m.y, 2)) {
          return { move: m, completed: true };
        }

        const score = -this.negamax(
          next,
          depth - 1,
          Number.NEGATIVE_INFINITY,
          Number.POSITIVE_INFINITY,
          1,
          deadline
        );

        if (score > bestScore) {
          bestScore = score;
          best = m;
        }
      }

      return { move: best, completed: true };
    } catch (error) {
      if (error instanceof SearchTimeoutError) {
        return { move: best, completed: false };
      }
      throw error;
    }
  }

  private negamax(
    board: Board,
    depth: number,
    alpha: number,
    beta: number,
    player: Color,
    deadline?: number
  ): number {
    this.throwIfTimedOut(deadline);

    const key = `${player}|${depth}|${board.join("")}`;
    const cached = this.table.get(key);
    if (cached && cached.depth >= depth) return cached.score;

    if (depth === 0) return this.evaluate(board, player);

    const moves = this.orderedMoves(board, player);
    if (moves.length === 0) return 0;

    let best = Number.NEGATIVE_INFINITY;
    for (const m of moves) {
      this.throwIfTimedOut(deadline);

      if (player === 1 && getForbiddenReason(board, m.x, m.y)) continue;

      const next = board.slice();
      next[idx(m.x, m.y)] = player;
      if (isWin(next, m.x, m.y, player)) return 10000 + depth;

      const score = -this.negamax(next, depth - 1, -beta, -alpha, player === 1 ? 2 : 1, deadline);
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }

    this.table.set(key, { depth, score: best });
    return best;
  }

  private orderedMoves(board: Board, player: Color): Point[] {
    const candidates = getCandidateMoves(board);
    return candidates
      .map((m) => ({
        m,
        s: this.localScore(board, m.x, m.y, player) + this.localScore(board, m.x, m.y, player === 1 ? 2 : 1) * 0.8,
      }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 18)
      .map((entry) => entry.m);
  }

  private localScore(board: Board, x: number, y: number, player: Color): number {
    if (board[idx(x, y)] !== 0) return -9999;

    const next = board.slice();
    next[idx(x, y)] = player;

    const dirs: ReadonlyArray<readonly [number, number]> = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ];

    let best = 0;
    for (const [dx, dy] of dirs) {
      let run = 1;
      let openEnds = 0;

      let nx = x + dx;
      let ny = y + dy;
      while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && next[idx(nx, ny)] === player) {
        run++;
        nx += dx;
        ny += dy;
      }
      if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && next[idx(nx, ny)] === 0) openEnds++;

      nx = x - dx;
      ny = y - dy;
      while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && next[idx(nx, ny)] === player) {
        run++;
        nx -= dx;
        ny -= dy;
      }
      if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && next[idx(nx, ny)] === 0) openEnds++;

      const value = run >= 5 ? 5000 : run * run * 10 + openEnds * 8;
      if (value > best) best = value;
    }

    return best;
  }

  private evaluate(board: Board, perspective: Color): number {
    let my = 0;
    let opp = 0;
    for (const m of getCandidateMoves(board)) {
      my += this.localScore(board, m.x, m.y, perspective);
      opp += this.localScore(board, m.x, m.y, perspective === 1 ? 2 : 1);
    }
    return my - opp;
  }
}
