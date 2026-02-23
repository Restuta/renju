export const BOARD_SIZE = 15;

const DIRS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

export function idx(x, y) {
  return y * BOARD_SIZE + x;
}

export function inBounds(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

export function createBoard() {
  return new Array(BOARD_SIZE * BOARD_SIZE).fill(0);
}

export function countConsecutive(board, x, y, color, dx, dy) {
  let total = 1;
  let nx = x + dx;
  let ny = y + dy;
  while (inBounds(nx, ny) && board[idx(nx, ny)] === color) {
    total++;
    nx += dx;
    ny += dy;
  }
  nx = x - dx;
  ny = y - dy;
  while (inBounds(nx, ny) && board[idx(nx, ny)] === color) {
    total++;
    nx -= dx;
    ny -= dy;
  }
  return total;
}

export function isWin(board, x, y, color) {
  for (const [dx, dy] of DIRS) {
    const n = countConsecutive(board, x, y, color, dx, dy);
    if (color === 1) {
      if (n === 5) return true;
    } else if (n >= 5) {
      return true;
    }
  }
  return false;
}

function lineString(board, x, y, color, dx, dy) {
  let s = "";
  for (let k = -4; k <= 4; k++) {
    const nx = x + k * dx;
    const ny = y + k * dy;
    if (!inBounds(nx, ny)) {
      s += "#";
      continue;
    }
    const cell = nx === x && ny === y ? color : board[idx(nx, ny)];
    if (cell === 0) s += ".";
    else if (cell === color) s += "X";
    else s += "O";
  }
  return s;
}

function countOpenPattern(line, patterns) {
  return patterns.reduce((acc, p) => (line.includes(p) ? acc + 1 : acc), 0);
}

function detectOpenThreesAndFours(board, x, y, color) {
  let threes = 0;
  let fours = 0;
  const threePatterns = [".XXX.", ".XX.X.", ".X.XX."];
  const fourPatterns = [".XXXX.", "XXXX.", ".XXXX", "XXX.X", "XX.XX", "X.XXX"];

  for (const [dx, dy] of DIRS) {
    const line = lineString(board, x, y, color, dx, dy);
    threes += countOpenPattern(line, threePatterns);
    fours += countOpenPattern(line, fourPatterns);
  }

  return { threes, fours };
}

export function getForbiddenReason(board, x, y) {
  if (board[idx(x, y)] !== 0) return null;
  const next = board.slice();
  next[idx(x, y)] = 1;

  for (const [dx, dy] of DIRS) {
    if (countConsecutive(next, x, y, 1, dx, dy) > 5) return "overline";
  }

  const { threes, fours } = detectOpenThreesAndFours(board, x, y, 1);
  if (fours >= 2) return "double-four";
  if (threes >= 2) return "double-three";
  return null;
}

export function getCandidateMoves(board) {
  const stones = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[idx(x, y)] !== 0) stones.push({ x, y });
    }
  }
  if (stones.length === 0) {
    const m = Math.floor(BOARD_SIZE / 2);
    return [{ x: m, y: m }];
  }

  const moves = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[idx(x, y)] !== 0) continue;
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++) {
        for (let dx = -2; dx <= 2 && !near; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (inBounds(nx, ny) && board[idx(nx, ny)] !== 0) near = true;
        }
      }
      if (near) moves.push({ x, y });
    }
  }
  return moves;
}
