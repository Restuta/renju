/**
 * Canvas-based Renju board renderer.
 * Touch-friendly, responsive, with animations.
 */

import {
  Board, BOARD_SIZE, BLACK, WHITE, EMPTY, Stone, Pos, posKey, GameState,
} from './types';

const BOARD_COLOR = '#dcb35c';
const BOARD_BORDER = '#8b6914';
const LINE_COLOR = '#333';
const BLACK_STONE = '#111';
const WHITE_STONE = '#f0f0f0';
const FORBIDDEN_COLOR = 'rgba(255, 50, 50, 0.5)';
const LAST_MOVE_MARKER = 'rgba(255, 50, 50, 0.85)';
const STAR_POINTS: [number, number][] = [
  [3, 3], [3, 7], [3, 11],
  [7, 3], [7, 7], [7, 11],
  [11, 3], [11, 7], [11, 11],
];

export class BoardRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cellSize = 0;
  private padding = 0;
  private boardPixelSize = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  resize(containerWidth: number): void {
    const dpr = window.devicePixelRatio || 1;
    const size = Math.min(containerWidth, 500);

    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.padding = size * 0.05;
    this.boardPixelSize = size - this.padding * 2;
    this.cellSize = this.boardPixelSize / (BOARD_SIZE - 1);
  }

  /** Convert canvas pixel coordinates to board position */
  pixelToBoard(x: number, y: number): Pos | null {
    const col = Math.round((x - this.padding) / this.cellSize);
    const row = Math.round((y - this.padding) / this.cellSize);
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;

    // Check if click is close enough to intersection
    const bx = this.padding + col * this.cellSize;
    const by = this.padding + row * this.cellSize;
    const dist = Math.sqrt((x - bx) ** 2 + (y - by) ** 2);
    if (dist > this.cellSize * 0.6) return null;

    return [row, col];
  }

  draw(state: GameState): void {
    const { ctx } = this;
    const size = this.canvas.width / (window.devicePixelRatio || 1);

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Board background
    ctx.fillStyle = BOARD_COLOR;
    ctx.fillRect(0, 0, size, size);

    // Border
    ctx.strokeStyle = BOARD_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      this.padding - this.cellSize * 0.3,
      this.padding - this.cellSize * 0.3,
      this.boardPixelSize + this.cellSize * 0.6,
      this.boardPixelSize + this.cellSize * 0.6,
    );

    this.drawGrid();
    this.drawStarPoints();
    this.drawCoordinates();
    this.drawForbiddenMarks(state);
    this.drawStones(state);
    this.drawLastMoveMarker(state);
    this.drawMoveNumbers(state);
  }

  private drawGrid(): void {
    const { ctx } = this;
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 0.8;

    for (let i = 0; i < BOARD_SIZE; i++) {
      const pos = this.padding + i * this.cellSize;

      // Horizontal
      ctx.beginPath();
      ctx.moveTo(this.padding, pos);
      ctx.lineTo(this.padding + this.boardPixelSize, pos);
      ctx.stroke();

      // Vertical
      ctx.beginPath();
      ctx.moveTo(pos, this.padding);
      ctx.lineTo(pos, this.padding + this.boardPixelSize);
      ctx.stroke();
    }
  }

  private drawStarPoints(): void {
    const { ctx } = this;
    ctx.fillStyle = LINE_COLOR;
    for (const [r, c] of STAR_POINTS) {
      const x = this.padding + c * this.cellSize;
      const y = this.padding + r * this.cellSize;
      ctx.beginPath();
      ctx.arc(x, y, this.cellSize * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawCoordinates(): void {
    const { ctx } = this;
    const fontSize = Math.max(8, this.cellSize * 0.32);
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = '#555';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < BOARD_SIZE; i++) {
      const x = this.padding + i * this.cellSize;
      const y = this.padding + i * this.cellSize;

      // Column letters (A-O, skip I)
      const letter = String.fromCharCode(65 + (i >= 8 ? i + 1 : i));
      ctx.fillText(letter, x, this.padding - this.cellSize * 0.55);

      // Row numbers (15 at top, 1 at bottom)
      ctx.fillText(`${BOARD_SIZE - i}`, this.padding - this.cellSize * 0.65, y);
    }
  }

  private drawForbiddenMarks(state: GameState): void {
    if (state.currentPlayer !== BLACK || state.gameOver) return;
    // Only show forbidden marks when it's the player's turn and player is Black
    if (state.playerColor !== BLACK) return;

    const { ctx } = this;
    const r = this.cellSize * 0.15;

    for (const key of state.forbiddenMoves) {
      const [row, col] = key.split(',').map(Number);
      const x = this.padding + col * this.cellSize;
      const y = this.padding + row * this.cellSize;

      ctx.strokeStyle = FORBIDDEN_COLOR;
      ctx.lineWidth = 2;

      // Draw X mark
      ctx.beginPath();
      ctx.moveTo(x - r, y - r);
      ctx.lineTo(x + r, y + r);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + r, y - r);
      ctx.lineTo(x - r, y + r);
      ctx.stroke();
    }
  }

  private drawStones(state: GameState): void {
    const { ctx } = this;
    const stoneRadius = this.cellSize * 0.43;

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const stone = state.board[r][c];
        if (stone === EMPTY) continue;

        const x = this.padding + c * this.cellSize;
        const y = this.padding + r * this.cellSize;

        if (stone === BLACK) {
          // Black stone with gradient
          const gradient = ctx.createRadialGradient(
            x - stoneRadius * 0.3, y - stoneRadius * 0.3, stoneRadius * 0.1,
            x, y, stoneRadius,
          );
          gradient.addColorStop(0, '#444');
          gradient.addColorStop(1, BLACK_STONE);
          ctx.fillStyle = gradient;
        } else {
          // White stone with gradient
          const gradient = ctx.createRadialGradient(
            x - stoneRadius * 0.3, y - stoneRadius * 0.3, stoneRadius * 0.1,
            x, y, stoneRadius,
          );
          gradient.addColorStop(0, '#fff');
          gradient.addColorStop(1, '#ddd');
          ctx.fillStyle = gradient;
          ctx.strokeStyle = '#aaa';
          ctx.lineWidth = 0.5;
        }

        ctx.beginPath();
        ctx.arc(x, y, stoneRadius, 0, Math.PI * 2);
        ctx.fill();
        if (stone === WHITE) ctx.stroke();
      }
    }
  }

  private drawLastMoveMarker(state: GameState): void {
    if (!state.lastMove) return;
    const { ctx } = this;
    const [r, c] = state.lastMove;
    const x = this.padding + c * this.cellSize;
    const y = this.padding + r * this.cellSize;
    const markerR = this.cellSize * 0.12;

    ctx.fillStyle = LAST_MOVE_MARKER;
    ctx.beginPath();
    ctx.arc(x, y, markerR, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawMoveNumbers(state: GameState): void {
    if (state.moveHistory.length === 0) return;
    // Only show the last move number
    const { ctx } = this;
    const moveIdx = state.moveHistory.length - 1;
    const [r, c] = state.moveHistory[moveIdx];
    const stone = state.board[r][c];
    const x = this.padding + c * this.cellSize;
    const y = this.padding + r * this.cellSize;

    const fontSize = Math.max(8, this.cellSize * 0.35);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = stone === BLACK ? '#fff' : '#000';
    ctx.fillText(`${moveIdx + 1}`, x, y + 1);
  }
}
