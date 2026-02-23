export const BOARD_SIZE = 15;

export const enum Stone {
  Empty = 0,
  Black = 1,
  White = 2,
}

export interface Move {
  row: number;
  col: number;
}

export const enum GameResult {
  None = 0,
  BlackWin = 1,
  WhiteWin = 2,
  Draw = 3,
}

export interface GameState {
  board: Stone[][];
  currentPlayer: Stone.Black | Stone.White;
  moves: Move[];
  result: GameResult;
}
