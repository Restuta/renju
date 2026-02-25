/**
 * Game controller — manages state, UI events, and AI integration.
 */

import {
  Board, BOARD_SIZE, BLACK, WHITE, EMPTY, Stone,
  createBoard, opponent, Pos, posKey, GameState,
} from './types';
import { checkWin, getForbiddenMoves, isForbidden } from './renju-rules';
import { findBestMove } from './ai';
import { BoardRenderer } from './renderer';

export class Game {
  private state: GameState;
  private renderer: BoardRenderer;
  private canvas: HTMLCanvasElement;
  private statusEl: HTMLElement;
  private undoBtn: HTMLButtonElement;
  private newGameBtn: HTMLButtonElement;
  private difficultySelect: HTMLSelectElement;
  private colorSelect: HTMLSelectElement;

  constructor() {
    this.canvas = document.getElementById('board') as HTMLCanvasElement;
    this.statusEl = document.getElementById('status')!;
    this.undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
    this.newGameBtn = document.getElementById('new-game-btn') as HTMLButtonElement;
    this.difficultySelect = document.getElementById('difficulty') as HTMLSelectElement;
    this.colorSelect = document.getElementById('color-select') as HTMLSelectElement;

    this.renderer = new BoardRenderer(this.canvas);

    this.state = this.createInitialState();

    this.setupEventListeners();
    this.resize();
    this.render();

    // If player chose White, AI plays first as Black
    if (this.state.playerColor === WHITE) {
      this.aiMove();
    }
  }

  private createInitialState(): GameState {
    const difficulty = parseInt(this.difficultySelect.value) || 4;
    const playerColor = parseInt(this.colorSelect.value) as typeof BLACK | typeof WHITE;
    return {
      board: createBoard(),
      currentPlayer: BLACK, // Black always goes first in Renju
      moveHistory: [],
      gameOver: false,
      winner: EMPTY,
      forbiddenMoves: new Set(),
      lastMove: null,
      playerColor,
      aiThinking: false,
      difficulty,
    };
  }

  private setupEventListeners(): void {
    // Touch/click on canvas
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('touchend', (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      this.handleBoardInput(x, y);
    }, { passive: false });

    // Buttons
    this.undoBtn.addEventListener('click', () => this.undo());
    this.newGameBtn.addEventListener('click', () => this.newGame());

    // Resize
    window.addEventListener('resize', () => this.resize());

    // Difficulty change
    this.difficultySelect.addEventListener('change', () => {
      this.state.difficulty = parseInt(this.difficultySelect.value);
    });
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.handleBoardInput(x, y);
  }

  private handleBoardInput(x: number, y: number): void {
    if (this.state.gameOver || this.state.aiThinking) return;
    if (this.state.currentPlayer !== this.state.playerColor) return;

    const pos = this.renderer.pixelToBoard(x, y);
    if (!pos) return;

    const [row, col] = pos;
    if (this.state.board[row][col] !== EMPTY) return;

    // Check forbidden move for Black
    if (this.state.currentPlayer === BLACK && isForbidden(this.state.board, row, col)) {
      this.showStatus('Forbidden move! (double-three, double-four, or overline)');
      return;
    }

    this.makeMove(row, col);

    if (!this.state.gameOver) {
      this.aiMove();
    }
  }

  private makeMove(row: number, col: number): void {
    this.state.board[row][col] = this.state.currentPlayer;
    this.state.moveHistory.push([row, col]);
    this.state.lastMove = [row, col];

    // Check win
    const winner = checkWin(this.state.board, row, col);
    if (winner !== EMPTY) {
      this.state.gameOver = true;
      this.state.winner = winner;
      this.render();
      this.showGameOver(winner);
      return;
    }

    // Check draw
    if (this.state.moveHistory.length >= BOARD_SIZE * BOARD_SIZE) {
      this.state.gameOver = true;
      this.render();
      this.showStatus('Draw!');
      return;
    }

    this.state.currentPlayer = opponent(this.state.currentPlayer);

    // Update forbidden moves (only relevant when it's Black's turn)
    if (this.state.currentPlayer === BLACK) {
      this.state.forbiddenMoves = getForbiddenMoves(this.state.board);
    } else {
      this.state.forbiddenMoves = new Set();
    }

    this.render();
    this.updateStatus();
  }

  private async aiMove(): Promise<void> {
    this.state.aiThinking = true;
    this.showStatus('Thinking...');

    // Let UI update before blocking with AI search
    await new Promise<void>(resolve =>
      requestAnimationFrame(() => setTimeout(resolve, 50)),
    );

    const aiPlayer = opponent(this.state.playerColor);
    const timeLimits = [500, 1000, 2000, 3000, 5000, 8000];
    const timeLimit = timeLimits[this.state.difficulty - 1] || 3000;

    const [row, col] = findBestMove(
      this.state.board,
      aiPlayer,
      this.state.difficulty,
      timeLimit,
    );

    this.state.aiThinking = false;

    if (row >= 0 && col >= 0) {
      this.makeMove(row, col);
    }
  }

  private undo(): void {
    if (this.state.aiThinking) return;
    if (this.state.moveHistory.length < 2) return;

    // Undo two moves (player + AI)
    for (let i = 0; i < 2; i++) {
      const move = this.state.moveHistory.pop();
      if (move) {
        this.state.board[move[0]][move[1]] = EMPTY;
      }
    }

    this.state.gameOver = false;
    this.state.winner = EMPTY;
    this.state.currentPlayer = this.state.playerColor;
    this.state.lastMove = this.state.moveHistory.length > 0
      ? this.state.moveHistory[this.state.moveHistory.length - 1]
      : null;

    if (this.state.currentPlayer === BLACK) {
      this.state.forbiddenMoves = getForbiddenMoves(this.state.board);
    } else {
      this.state.forbiddenMoves = new Set();
    }

    this.render();
    this.updateStatus();
  }

  private newGame(): void {
    if (this.state.aiThinking) return;
    this.state = this.createInitialState();
    this.render();
    this.updateStatus();

    if (this.state.playerColor === WHITE) {
      this.aiMove();
    }
  }

  private resize(): void {
    const container = document.getElementById('board-container')!;
    const width = container.clientWidth;
    this.renderer.resize(width);
    this.render();
  }

  private render(): void {
    this.renderer.draw(this.state);
  }

  private updateStatus(): void {
    if (this.state.gameOver) return;
    const turn = this.state.currentPlayer === BLACK ? 'Black' : 'White';
    const isYou = this.state.currentPlayer === this.state.playerColor;
    this.showStatus(`${turn}'s turn${isYou ? ' (you)' : ''} — Move ${this.state.moveHistory.length + 1}`);
  }

  private showGameOver(winner: Stone): void {
    const name = winner === BLACK ? 'Black' : 'White';
    const isYou = winner === this.state.playerColor;
    this.showStatus(`${name} wins! ${isYou ? 'You won!' : 'AI wins.'}`);
  }

  private showStatus(msg: string): void {
    this.statusEl.textContent = msg;
  }
}
