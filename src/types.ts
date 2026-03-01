export const BOARD_SIZE = 15;
export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

export type Stone = typeof EMPTY | typeof BLACK | typeof WHITE;
export type Board = Stone[][];
export type Pos = [row: number, col: number];

export interface GameState {
  board: Board;
  currentPlayer: Stone;
  moveHistory: Pos[];
  gameOver: boolean;
  winner: Stone;
  forbiddenMoves: Set<string>;
  lastMove: Pos | null;
  playerColor: typeof BLACK | typeof WHITE;
  aiThinking: boolean;
  difficulty: number; // search depth (1-6)
}

export function posKey(r: number, c: number): string {
  return `${r},${c}`;
}

export function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

export function createBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
}

export function opponent(s: Stone): Stone {
  return s === BLACK ? WHITE : s === WHITE ? BLACK : EMPTY;
}
