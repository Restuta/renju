import { BOARD_SIZE, Stone, Move, GameResult, GameState } from './types';

// Direction vectors: horizontal, vertical, diagonal-down, diagonal-up
const DIRECTIONS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

export function createGame(): GameState {
  const board: Stone[][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    board[r] = new Array(BOARD_SIZE).fill(Stone.Empty);
  }
  return {
    board,
    currentPlayer: Stone.Black,
    moves: [],
    result: GameResult.None,
  };
}

export function cloneBoard(board: Stone[][]): Stone[][] {
  return board.map((row) => row.slice());
}

/** Count consecutive stones in one direction from (r,c) exclusive */
function countDir(
  board: Stone[][],
  r: number,
  c: number,
  dr: number,
  dc: number,
  stone: Stone
): number {
  let count = 0;
  let cr = r + dr;
  let cc = c + dc;
  while (inBounds(cr, cc) && board[cr][cc] === stone) {
    count++;
    cr += dr;
    cc += dc;
  }
  return count;
}

/** Get the full line length through (r,c) in a direction */
function lineLength(
  board: Stone[][],
  r: number,
  c: number,
  dr: number,
  dc: number,
  stone: Stone
): number {
  return 1 + countDir(board, r, c, dr, dc, stone) + countDir(board, r, c, -dr, -dc, stone);
}

// ─── Renju forbidden move detection for Black ───

/**
 * A "row" is the pattern of stones in a line.
 * For Renju, we need to detect:
 *   - Overline: 6+ in a row (forbidden for black)
 *   - Double-four: placing creates two or more "open fours" simultaneously
 *   - Double-three: placing creates two or more "open threes" simultaneously
 *
 * Exactly five is a win and NOT forbidden.
 */

interface LineInfo {
  /** stones in the unbroken line through the placed stone */
  length: number;
  /** is the line "open" on both ends? */
  openEnds: number;
}

function getLineInfo(
  board: Stone[][],
  r: number,
  c: number,
  dr: number,
  dc: number,
  stone: Stone
): LineInfo {
  // Count forward
  let fwd = 0;
  let fr = r + dr;
  let fc = c + dc;
  while (inBounds(fr, fc) && board[fr][fc] === stone) {
    fwd++;
    fr += dr;
    fc += dc;
  }
  const fwdOpen = inBounds(fr, fc) && board[fr][fc] === Stone.Empty ? 1 : 0;

  // Count backward
  let bwd = 0;
  let br = r - dr;
  let bc = c - dc;
  while (inBounds(br, bc) && board[br][bc] === stone) {
    bwd++;
    br -= dr;
    bc -= dc;
  }
  const bwdOpen = inBounds(br, bc) && board[br][bc] === Stone.Empty ? 1 : 0;

  return {
    length: 1 + fwd + bwd,
    openEnds: fwdOpen + bwdOpen,
  };
}

/**
 * Check if placing black at (r,c) creates an "open four" in this direction.
 * An open four = exactly 4 in a row with both ends open (which guarantees a win next move).
 * We also count "half-open fours" (4 with one open end) for the double-four rule,
 * because two fours of any kind (even half-open) are forbidden.
 */
function countFoursInDirection(
  board: Stone[][],
  r: number,
  c: number,
  dr: number,
  dc: number
): number {
  // Place the stone temporarily
  board[r][c] = Stone.Black;

  let fours = 0;

  // Check simple contiguous four
  const info = getLineInfo(board, r, c, dr, dc, Stone.Black);
  if (info.length === 4 && info.openEnds >= 1) {
    fours++;
  }

  // Check broken four patterns: X.XXX, XX.XX, XXX.X
  // A broken four is where there's a gap of one empty cell within a sequence of 4 black stones
  // that would become five if the gap is filled
  if (info.length < 4) {
    // Check forward gap: stone(s) - gap - stone(s)
    const fwd = countDir(board, r, c, dr, dc, Stone.Black);
    const gapR_fwd = r + dr * (fwd + 1);
    const gapC_fwd = c + dc * (fwd + 1);
    if (
      inBounds(gapR_fwd, gapC_fwd) &&
      board[gapR_fwd][gapC_fwd] === Stone.Empty
    ) {
      const afterGap = countDir(
        board,
        gapR_fwd,
        gapC_fwd,
        dr,
        dc,
        Stone.Black
      );
      if (1 + fwd + afterGap === 4) {
        // Check if filling the gap would create exactly 4 (not 5+) with the gap cell
        // This is a broken four
        fours++;
      }
    }

    // Check backward gap
    const bwd = countDir(board, r, c, -dr, -dc, Stone.Black);
    const gapR_bwd = r - dr * (bwd + 1);
    const gapC_bwd = c - dc * (bwd + 1);
    if (
      inBounds(gapR_bwd, gapC_bwd) &&
      board[gapR_bwd][gapC_bwd] === Stone.Empty
    ) {
      const afterGap = countDir(
        board,
        gapR_bwd,
        gapC_bwd,
        -dr,
        -dc,
        Stone.Black
      );
      if (1 + bwd + afterGap === 4) {
        fours++;
      }
    }
  }

  board[r][c] = Stone.Empty;
  return fours;
}

/**
 * Check if placing black at (r,c) creates an "open three" in this direction.
 * An open three = exactly 3 in a row that can become an open four in one move.
 */
function isOpenThreeInDirection(
  board: Stone[][],
  r: number,
  c: number,
  dr: number,
  dc: number
): boolean {
  board[r][c] = Stone.Black;

  const info = getLineInfo(board, r, c, dr, dc, Stone.Black);

  if (info.length === 3 && info.openEnds === 2) {
    // Verify it can become a non-forbidden open four
    // Check each empty adjacent cell to see if placing there makes a four
    // that itself isn't forbidden
    const fwd = countDir(board, r, c, dr, dc, Stone.Black);

    // Try extending forward
    const extR = r + dr * (fwd + 1);
    const extC = c + dc * (fwd + 1);
    if (inBounds(extR, extC) && board[extR][extC] === Stone.Empty) {
      board[extR][extC] = Stone.Black;
      const extInfo = getLineInfo(board, extR, extC, dr, dc, Stone.Black);
      board[extR][extC] = Stone.Empty;
      if (extInfo.length === 4 && extInfo.openEnds >= 1) {
        board[r][c] = Stone.Empty;
        return true;
      }
    }

    // Try extending backward
    const bwd = countDir(board, r, c, -dr, -dc, Stone.Black);
    const extR2 = r - dr * (bwd + 1);
    const extC2 = c - dc * (bwd + 1);
    if (inBounds(extR2, extC2) && board[extR2][extC2] === Stone.Empty) {
      board[extR2][extC2] = Stone.Black;
      const extInfo = getLineInfo(board, extR2, extC2, dr, dc, Stone.Black);
      board[extR2][extC2] = Stone.Empty;
      if (extInfo.length === 4 && extInfo.openEnds >= 1) {
        board[r][c] = Stone.Empty;
        return true;
      }
    }
  }

  // Also check broken three: XX.X or X.XX patterns with both outer ends open
  if (info.length < 3) {
    const fwd = countDir(board, r, c, dr, dc, Stone.Black);
    // Forward gap check
    const gapR = r + dr * (fwd + 1);
    const gapC = c + dc * (fwd + 1);
    if (inBounds(gapR, gapC) && board[gapR][gapC] === Stone.Empty) {
      const afterGap = countDir(board, gapR, gapC, dr, dc, Stone.Black);
      if (1 + fwd + afterGap === 3) {
        // Check if this broken three has both ends open
        const bwd = countDir(board, r, c, -dr, -dc, Stone.Black);
        const endR1 = r - dr * (bwd + 1);
        const endC1 = c - dc * (bwd + 1);
        const farR = gapR + dr * (afterGap + 1);
        const farC = gapC + dc * (afterGap + 1);
        const end1Open =
          inBounds(endR1, endC1) && board[endR1][endC1] === Stone.Empty;
        const end2Open =
          inBounds(farR, farC) && board[farR][farC] === Stone.Empty;
        if (end1Open && end2Open) {
          board[r][c] = Stone.Empty;
          return true;
        }
      }
    }

    // Backward gap check
    const bwd = countDir(board, r, c, -dr, -dc, Stone.Black);
    const gapR2 = r - dr * (bwd + 1);
    const gapC2 = c - dc * (bwd + 1);
    if (inBounds(gapR2, gapC2) && board[gapR2][gapC2] === Stone.Empty) {
      const afterGap = countDir(board, gapR2, gapC2, -dr, -dc, Stone.Black);
      if (1 + bwd + afterGap === 3) {
        const endR1 = r + dr * (fwd + 1);
        const endC1 = c + dc * (fwd + 1);
        const farR = gapR2 - dr * (afterGap + 1);
        const farC = gapC2 - dc * (afterGap + 1);
        const end1Open =
          inBounds(endR1, endC1) && board[endR1][endC1] === Stone.Empty;
        const end2Open =
          inBounds(farR, farC) && board[farR][farC] === Stone.Empty;
        if (end1Open && end2Open) {
          board[r][c] = Stone.Empty;
          return true;
        }
      }
    }
  }

  board[r][c] = Stone.Empty;
  return false;
}

export function isForbiddenMove(board: Stone[][], r: number, c: number): boolean {
  if (board[r][c] !== Stone.Empty) return true;

  // Only black has forbidden moves in Renju
  // Temporarily place the stone to check
  board[r][c] = Stone.Black;

  // Check for exactly five first — this is NEVER forbidden
  for (const [dr, dc] of DIRECTIONS) {
    if (lineLength(board, r, c, dr, dc, Stone.Black) === 5) {
      board[r][c] = Stone.Empty;
      return false;
    }
  }

  // Check overline (6+)
  for (const [dr, dc] of DIRECTIONS) {
    if (lineLength(board, r, c, dr, dc, Stone.Black) >= 6) {
      board[r][c] = Stone.Empty;
      return true;
    }
  }

  board[r][c] = Stone.Empty;

  // Check double-four
  let fourCount = 0;
  for (const [dr, dc] of DIRECTIONS) {
    fourCount += countFoursInDirection(board, r, c, dr, dc);
    if (fourCount >= 2) return true;
  }

  // Check double-three
  let threeCount = 0;
  for (const [dr, dc] of DIRECTIONS) {
    if (isOpenThreeInDirection(board, r, c, dr, dc)) {
      threeCount++;
      if (threeCount >= 2) return true;
    }
  }

  return false;
}

export function checkWin(board: Stone[][], r: number, c: number, stone: Stone): boolean {
  for (const [dr, dc] of DIRECTIONS) {
    const len = lineLength(board, r, c, dr, dc, stone);
    if (stone === Stone.Black) {
      // Black must have exactly 5 (overline is forbidden, checked before placing)
      if (len === 5) return true;
    } else {
      // White wins with 5 or more
      if (len >= 5) return true;
    }
  }
  return false;
}

export function makeMove(state: GameState, move: Move): boolean {
  const { board, currentPlayer } = state;
  const { row, col } = move;

  if (!inBounds(row, col) || board[row][col] !== Stone.Empty) return false;
  if (state.result !== GameResult.None) return false;

  // Check forbidden move for black
  if (currentPlayer === Stone.Black && isForbiddenMove(board, row, col)) {
    return false;
  }

  board[row][col] = currentPlayer;
  state.moves.push(move);

  // Check win
  if (checkWin(board, row, col, currentPlayer)) {
    state.result =
      currentPlayer === Stone.Black ? GameResult.BlackWin : GameResult.WhiteWin;
  } else if (state.moves.length === BOARD_SIZE * BOARD_SIZE) {
    state.result = GameResult.Draw;
  }

  state.currentPlayer =
    currentPlayer === Stone.Black ? Stone.White : Stone.Black;

  return true;
}

export function undoMove(state: GameState): Move | null {
  if (state.moves.length === 0) return null;

  const move = state.moves.pop()!;
  state.board[move.row][move.col] = Stone.Empty;
  state.result = GameResult.None;
  state.currentPlayer =
    state.currentPlayer === Stone.Black ? Stone.White : Stone.Black;

  return move;
}

export function getLegalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  const { board, currentPlayer } = state;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== Stone.Empty) continue;
      if (currentPlayer === Stone.Black && isForbiddenMove(board, r, c))
        continue;
      moves.push({ row: r, col: c });
    }
  }
  return moves;
}
