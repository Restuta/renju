import { BOARD_SIZE, getCandidateMoves, getForbiddenReason, idx, isWin } from "./rules.js";

export class RenjuEngine {
  table = new Map();

  findBestMove(board, depth = 2) {
    const moves = this.orderedMoves(board, 2);
    let best = moves[0] ?? { x: Math.floor(BOARD_SIZE / 2), y: Math.floor(BOARD_SIZE / 2) };
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const m of moves) {
      const next = board.slice();
      next[idx(m.x, m.y)] = 2;
      if (isWin(next, m.x, m.y, 2)) return m;
      const score = -this.negamax(next, depth - 1, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, 1);
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
    return best;
  }

  negamax(board, depth, alpha, beta, player) {
    const key = `${player}|${depth}|${board.join("")}`;
    const cached = this.table.get(key);
    if (cached && cached.depth >= depth) return cached.score;

    if (depth === 0) return this.evaluate(board, player);

    const moves = this.orderedMoves(board, player);
    if (moves.length === 0) return 0;

    let best = Number.NEGATIVE_INFINITY;
    for (const m of moves) {
      if (player === 1 && getForbiddenReason(board, m.x, m.y)) continue;
      const next = board.slice();
      next[idx(m.x, m.y)] = player;
      if (isWin(next, m.x, m.y, player)) return 10000 + depth;

      const score = -this.negamax(next, depth - 1, -beta, -alpha, player === 1 ? 2 : 1);
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }

    this.table.set(key, { depth, score: best });
    return best;
  }

  orderedMoves(board, player) {
    const candidates = getCandidateMoves(board);
    return candidates
      .map((m) => ({
        m,
        s: this.localScore(board, m.x, m.y, player) + this.localScore(board, m.x, m.y, player === 1 ? 2 : 1) * 0.8,
      }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 18)
      .map((x) => x.m);
  }

  localScore(board, x, y, player) {
    if (board[idx(x, y)] !== 0) return -9999;
    const next = board.slice();
    next[idx(x, y)] = player;

    const dirs = [
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

      const val = run >= 5 ? 5000 : run * run * 10 + openEnds * 8;
      if (val > best) best = val;
    }

    return best;
  }

  evaluate(board, perspective) {
    let my = 0;
    let opp = 0;
    for (const m of getCandidateMoves(board)) {
      my += this.localScore(board, m.x, m.y, perspective);
      opp += this.localScore(board, m.x, m.y, perspective === 1 ? 2 : 1);
    }
    return my - opp;
  }
}
