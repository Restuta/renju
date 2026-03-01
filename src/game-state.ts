import {
  createBoard,
  getCandidateMoves,
  getForbiddenPoints,
  getForbiddenReason,
  getOpeningMoveViolation,
  idx,
  inBounds,
  isWin,
  type Board,
  type Color,
  type ForbiddenPoint,
  type ForbiddenReason,
  type OpeningViolation,
  type Point,
} from "./rules";

export type MoveFailureReason =
  | "game-over"
  | "out-of-bounds"
  | "out-of-turn"
  | "occupied"
  | "not-ai-turn"
  | "no-legal-move"
  | ForbiddenReason
  | OpeningViolation;

interface MoveError {
  ok: false;
  reason: MoveFailureReason;
}

interface MoveSuccess extends Point {
  ok: true;
  win: boolean;
  color: Color;
}

export type MoveResult = MoveError | MoveSuccess;

interface EngineLike {
  findBestMove(board: Board, depth: number): Point;
}

export class RenjuGameState {
  board: Board;
  turn: Color;
  winner: 0 | Color;
  gameOver: boolean;
  moveCount: number;
  humanColor: Color;
  aiColor: Color;

  constructor({ humanColor = 1 as Color }: { humanColor?: Color } = {}) {
    this.humanColor = humanColor;
    this.aiColor = humanColor === 1 ? 2 : 1;
    this.board = createBoard();
    this.turn = 1;
    this.winner = 0;
    this.gameOver = false;
    this.moveCount = 0;
    this.reset(humanColor);
  }

  reset(humanColor = this.humanColor): void {
    this.humanColor = humanColor;
    this.aiColor = humanColor === 1 ? 2 : 1;
    this.board = createBoard();
    this.turn = 1;
    this.winner = 0;
    this.gameOver = false;
    this.moveCount = 0;
  }

  validateMove(x: number, y: number, color: Color): MoveError | { ok: true } {
    if (this.gameOver) return { ok: false, reason: "game-over" };
    if (!inBounds(x, y)) return { ok: false, reason: "out-of-bounds" };
    if (color !== this.turn) return { ok: false, reason: "out-of-turn" };
    if (this.board[idx(x, y)] !== 0) return { ok: false, reason: "occupied" };

    if (color === 1) {
      const openingViolation = getOpeningMoveViolation(this.board, x, y, color);
      if (openingViolation) return { ok: false, reason: openingViolation };

      const forbidden = getForbiddenReason(this.board, x, y);
      if (forbidden) return { ok: false, reason: forbidden };
    }

    return { ok: true };
  }

  place(x: number, y: number, color: Color = this.turn): MoveResult {
    const valid = this.validateMove(x, y, color);
    if (!valid.ok) return valid;

    this.board[idx(x, y)] = color;
    this.moveCount++;

    if (isWin(this.board, x, y, color)) {
      this.gameOver = true;
      this.winner = color;
      return { ok: true, win: true, x, y, color };
    }

    this.turn = color === 1 ? 2 : 1;
    return { ok: true, win: false, x, y, color };
  }

  getForbiddenPointsForCurrentTurn(): ForbiddenPoint[] {
    if (this.gameOver || this.turn !== 1) return [];
    return getForbiddenPoints(this.board);
  }

  playAIMove(engine: EngineLike, depth: number): MoveResult {
    if (this.gameOver) return { ok: false, reason: "game-over" };
    if (this.turn !== this.aiColor) return { ok: false, reason: "not-ai-turn" };

    let move = engine.findBestMove(this.board, depth);
    let validation = this.validateMove(move.x, move.y, this.aiColor);

    if (!validation.ok) {
      const fallback = getCandidateMoves(this.board).find(
        (candidate) => this.validateMove(candidate.x, candidate.y, this.aiColor).ok
      );
      if (!fallback) return { ok: false, reason: "no-legal-move" };
      move = fallback;
      validation = this.validateMove(move.x, move.y, this.aiColor);
    }

    if (!validation.ok) return validation;
    return this.place(move.x, move.y, this.aiColor);
  }
}

export function moveReasonToMessage(reason: MoveFailureReason): string {
  if (reason === "opening-center") {
    return "Official opening: Black's first move must be the center (H8).";
  }
  if (reason === "double-three" || reason === "double-four" || reason === "overline") {
    return `Forbidden move for Black: ${reason}`;
  }
  if (reason === "occupied") return "That intersection is already occupied.";
  if (reason === "out-of-turn") return "Wait for your turn.";
  if (reason === "game-over") return "Game is already over.";
  return "Illegal move.";
}

export function colorName(color: Color): "Black" | "White" {
  return color === 1 ? "Black" : "White";
}
