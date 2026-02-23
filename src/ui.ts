import { BOARD_SIZE, Stone, GameResult, Move, GameState } from './types';
import { createGame, makeMove, undoMove, isForbiddenMove } from './game';
import { findBestMove, AIResult } from './ai';

// ─── Constants ───

const BOARD_PADDING = 24;
const STONE_RADIUS_RATIO = 0.42;
const STAR_RADIUS = 3;
const STAR_POINTS = [
  [3, 3], [3, 7], [3, 11],
  [7, 3], [7, 7], [7, 11],
  [11, 3], [11, 7], [11, 11],
];
const COORD_LABELS = 'ABCDEFGHJKLMNOP'; // I is traditionally skipped

// ─── State ───

let game: GameState;
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let cellSize: number;
let boardOriginX: number;
let boardOriginY: number;
let aiThinking = false;
let playerColor: Stone.Black | Stone.White = Stone.Black;
let showForbidden = true;
let lastAIResult: AIResult | null = null;
let hoverPos: { row: number; col: number } | null = null;
let animatingStone: { row: number; col: number; progress: number } | null = null;

// ─── Drawing ───

function getCanvasSize(): number {
  const maxW = window.innerWidth - 16;
  const maxH = window.innerHeight - 140;
  return Math.min(maxW, maxH, 600);
}

function resizeCanvas(): void {
  const size = getCanvasSize();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  cellSize = (size - BOARD_PADDING * 2) / (BOARD_SIZE - 1);
  boardOriginX = BOARD_PADDING;
  boardOriginY = BOARD_PADDING;

  drawBoard();
}

function boardX(col: number): number {
  return boardOriginX + col * cellSize;
}

function boardY(row: number): number {
  return boardOriginY + row * cellSize;
}

function drawBoard(): void {
  const size = getCanvasSize();

  // Background - warm wood color
  ctx.fillStyle = '#DEB887';
  ctx.fillRect(0, 0, size, size);

  // Wood grain effect
  ctx.strokeStyle = 'rgba(139, 90, 43, 0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i < size; i += 4) {
    ctx.beginPath();
    ctx.moveTo(0, i + Math.sin(i * 0.05) * 3);
    ctx.lineTo(size, i + Math.sin(i * 0.05 + 2) * 3);
    ctx.stroke();
  }

  // Grid lines
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 0.8;

  for (let i = 0; i < BOARD_SIZE; i++) {
    // Horizontal
    ctx.beginPath();
    ctx.moveTo(boardX(0), boardY(i));
    ctx.lineTo(boardX(BOARD_SIZE - 1), boardY(i));
    ctx.stroke();

    // Vertical
    ctx.beginPath();
    ctx.moveTo(boardX(i), boardY(0));
    ctx.lineTo(boardX(i), boardY(BOARD_SIZE - 1));
    ctx.stroke();
  }

  // Edge lines thicker
  ctx.lineWidth = 1.5;
  ctx.strokeRect(
    boardX(0),
    boardY(0),
    cellSize * (BOARD_SIZE - 1),
    cellSize * (BOARD_SIZE - 1)
  );

  // Star points
  ctx.fillStyle = '#333';
  for (const [r, c] of STAR_POINTS) {
    ctx.beginPath();
    ctx.arc(boardX(c), boardY(r), STAR_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  // Coordinate labels
  ctx.fillStyle = '#555';
  ctx.font = `${Math.max(9, cellSize * 0.35)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let c = 0; c < BOARD_SIZE; c++) {
    ctx.fillText(COORD_LABELS[c], boardX(c), boardY(BOARD_SIZE - 1) + 6);
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let r = 0; r < BOARD_SIZE; r++) {
    ctx.fillText(`${BOARD_SIZE - r}`, boardX(0) - 6, boardY(r));
  }

  // Forbidden move markers (small red X for black's turn)
  if (
    showForbidden &&
    game.currentPlayer === Stone.Black &&
    playerColor === Stone.Black &&
    game.result === GameResult.None
  ) {
    ctx.strokeStyle = 'rgba(220, 40, 40, 0.5)';
    ctx.lineWidth = 1.5;
    const markerSize = cellSize * 0.15;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (game.board[r][c] === Stone.Empty && isForbiddenMove(game.board, r, c)) {
          const x = boardX(c);
          const y = boardY(r);
          ctx.beginPath();
          ctx.moveTo(x - markerSize, y - markerSize);
          ctx.lineTo(x + markerSize, y + markerSize);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + markerSize, y - markerSize);
          ctx.lineTo(x - markerSize, y + markerSize);
          ctx.stroke();
        }
      }
    }
  }

  // Stones
  const stoneRadius = cellSize * STONE_RADIUS_RATIO;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (game.board[r][c] === Stone.Empty) continue;

      // Skip animating stone
      if (animatingStone && animatingStone.row === r && animatingStone.col === c) continue;

      drawStone(boardX(c), boardY(r), stoneRadius, game.board[r][c]);
    }
  }

  // Animating stone
  if (animatingStone) {
    const { row, col, progress } = animatingStone;
    const scale = progress;
    drawStone(
      boardX(col),
      boardY(row),
      stoneRadius * scale,
      game.board[row][col]
    );
  }

  // Last move marker
  if (game.moves.length > 0) {
    const last = game.moves[game.moves.length - 1];
    const stoneColor = game.board[last.row][last.col];
    ctx.strokeStyle = stoneColor === Stone.Black ? '#fff' : '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(boardX(last.col), boardY(last.row), stoneRadius * 0.35, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Move numbers on stones
  if (game.moves.length > 0) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fontSize = Math.max(8, cellSize * 0.28);
    ctx.font = `${fontSize}px sans-serif`;

    // Only show last move number
    const last = game.moves[game.moves.length - 1];
    const stoneColor = game.board[last.row][last.col];
    ctx.fillStyle = stoneColor === Stone.Black ? '#ccc' : '#444';
    ctx.fillText(
      `${game.moves.length}`,
      boardX(last.col),
      boardY(last.row)
    );
  }

  // Hover preview
  if (
    hoverPos &&
    !aiThinking &&
    game.result === GameResult.None &&
    game.board[hoverPos.row][hoverPos.col] === Stone.Empty
  ) {
    const forbidden =
      game.currentPlayer === Stone.Black &&
      isForbiddenMove(game.board, hoverPos.row, hoverPos.col);
    if (!forbidden) {
      ctx.globalAlpha = 0.3;
      drawStone(
        boardX(hoverPos.col),
        boardY(hoverPos.row),
        stoneRadius,
        game.currentPlayer
      );
      ctx.globalAlpha = 1;
    }
  }
}

function drawStone(x: number, y: number, radius: number, stone: Stone): void {
  if (stone === Stone.Black) {
    // Black stone with gradient
    const grad = ctx.createRadialGradient(
      x - radius * 0.3,
      y - radius * 0.3,
      radius * 0.1,
      x,
      y,
      radius
    );
    grad.addColorStop(0, '#555');
    grad.addColorStop(1, '#111');
    ctx.fillStyle = grad;
  } else {
    // White stone with gradient
    const grad = ctx.createRadialGradient(
      x - radius * 0.3,
      y - radius * 0.3,
      radius * 0.1,
      x,
      y,
      radius
    );
    grad.addColorStop(0, '#fff');
    grad.addColorStop(1, '#ccc');
    ctx.fillStyle = grad;
  }

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Subtle border
  ctx.strokeStyle = stone === Stone.Black ? '#000' : '#999';
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

// ─── Animation ───

function animateStone(row: number, col: number): Promise<void> {
  return new Promise((resolve) => {
    animatingStone = { row, col, progress: 0 };
    const startTime = performance.now();
    const duration = 150;

    function frame(now: number): void {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Ease out
      animatingStone!.progress = 1 - (1 - t) * (1 - t);
      drawBoard();
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        animatingStone = null;
        drawBoard();
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

// ─── Input handling ───

function getGridPos(clientX: number, clientY: number): { row: number; col: number } | null {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  const col = Math.round((x - boardOriginX) / cellSize);
  const row = Math.round((y - boardOriginY) / cellSize);

  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;

  // Check if click is close enough to intersection
  const dist = Math.sqrt(
    Math.pow(x - boardX(col), 2) + Math.pow(y - boardY(row), 2)
  );
  if (dist > cellSize * 0.5) return null;

  return { row, col };
}

async function handlePlayerMove(row: number, col: number): Promise<void> {
  if (aiThinking) return;
  if (game.result !== GameResult.None) return;
  if (game.currentPlayer !== playerColor) return;

  if (!makeMove(game, { row, col })) return;

  await animateStone(row, col);
  updateStatus();

  if (game.result !== GameResult.None) return;

  // AI's turn
  aiThinking = true;
  updateStatus();

  // Use setTimeout to allow UI to update
  setTimeout(async () => {
    const result = findBestMove(game, 3000, 12);
    lastAIResult = result;

    if (makeMove(game, result.move)) {
      await animateStone(result.move.row, result.move.col);
    }

    aiThinking = false;
    updateStatus();
    drawBoard();
  }, 50);
}

// ─── Status bar ───

function updateStatus(): void {
  const statusEl = document.getElementById('status')!;
  const infoEl = document.getElementById('info')!;

  if (game.result === GameResult.BlackWin) {
    statusEl.textContent = 'Black wins!';
    statusEl.className = 'status win';
  } else if (game.result === GameResult.WhiteWin) {
    statusEl.textContent = 'White wins!';
    statusEl.className = 'status win';
  } else if (game.result === GameResult.Draw) {
    statusEl.textContent = 'Draw!';
    statusEl.className = 'status';
  } else if (aiThinking) {
    statusEl.textContent = 'AI is thinking...';
    statusEl.className = 'status thinking';
  } else {
    const color = game.currentPlayer === Stone.Black ? 'Black' : 'White';
    const isYou = game.currentPlayer === playerColor;
    statusEl.textContent = `${color}'s turn${isYou ? ' (you)' : ''}`;
    statusEl.className = 'status';
  }

  if (lastAIResult && !aiThinking) {
    infoEl.textContent = `AI: depth ${lastAIResult.depth}, ${lastAIResult.nodes.toLocaleString()} nodes, ${lastAIResult.timeMs.toFixed(0)}ms`;
  } else if (aiThinking) {
    infoEl.textContent = '';
  }
}

// ─── Controls ───

function newGame(): void {
  game = createGame();
  lastAIResult = null;
  aiThinking = false;
  hoverPos = null;
  animatingStone = null;
  drawBoard();
  updateStatus();

  // If player is white, AI plays first
  if (playerColor === Stone.White) {
    aiThinking = true;
    updateStatus();
    setTimeout(async () => {
      const result = findBestMove(game, 2000);
      lastAIResult = result;
      makeMove(game, result.move);
      await animateStone(result.move.row, result.move.col);
      aiThinking = false;
      updateStatus();
      drawBoard();
    }, 50);
  }
}

function undo(): void {
  if (aiThinking) return;
  if (game.moves.length < 2) return;
  // Undo both AI and player move
  undoMove(game);
  undoMove(game);
  lastAIResult = null;
  drawBoard();
  updateStatus();
}

function toggleColor(): void {
  if (aiThinking) return;
  playerColor = playerColor === Stone.Black ? Stone.White : Stone.Black;
  const btn = document.getElementById('colorBtn')!;
  btn.textContent = playerColor === Stone.Black ? '⚫ Play as Black' : '⚪ Play as White';
  newGame();
}

// ─── Init ───

export function initUI(): void {
  // Create DOM structure
  const app = document.getElementById('app')!;
  app.innerHTML = `
    <div class="game-container">
      <div class="header">
        <h1>Renju</h1>
        <div id="status" class="status">Black's turn (you)</div>
      </div>
      <canvas id="board"></canvas>
      <div id="info" class="info"></div>
      <div class="controls">
        <button id="newBtn" class="btn">New Game</button>
        <button id="undoBtn" class="btn">Undo</button>
        <button id="colorBtn" class="btn">⚫ Play as Black</button>
      </div>
      <div class="rules-hint">
        <details>
          <summary>Renju Rules</summary>
          <p>First to get exactly 5 in a row wins. Black plays first but has restrictions:</p>
          <ul>
            <li><strong>Overline</strong>: 6+ in a row is forbidden for Black</li>
            <li><strong>Double-four</strong>: Creating two fours simultaneously is forbidden</li>
            <li><strong>Double-three</strong>: Creating two open threes simultaneously is forbidden</li>
          </ul>
          <p>White has no restrictions. Forbidden moves are marked with <span style="color:red">✕</span> on the board.</p>
        </details>
      </div>
    </div>
  `;

  canvas = document.getElementById('board') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;

  // Event listeners
  canvas.addEventListener('click', (e) => {
    const pos = getGridPos(e.clientX, e.clientY);
    if (pos) handlePlayerMove(pos.row, pos.col);
  });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const pos = getGridPos(touch.clientX, touch.clientY);
      if (pos) handlePlayerMove(pos.row, pos.col);
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    hoverPos = getGridPos(e.clientX, e.clientY);
    drawBoard();
  });

  canvas.addEventListener('mouseleave', () => {
    hoverPos = null;
    drawBoard();
  });

  // Prevent double-tap zoom on iOS
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
  });

  document.getElementById('newBtn')!.addEventListener('click', newGame);
  document.getElementById('undoBtn')!.addEventListener('click', undo);
  document.getElementById('colorBtn')!.addEventListener('click', toggleColor);

  window.addEventListener('resize', resizeCanvas);

  game = createGame();
  resizeCanvas();
  updateStatus();
}
