import { RenjuEngine } from "./engine";
import { RenjuGameState, colorName, moveReasonToMessage } from "./game-state";
import { BOARD_SIZE, idx, type Board, type Color, type Point } from "./rules";

const AI_MAX_DEPTH = 4;
const AI_TIME_BUDGET_MS = 100;
const BASE_CANVAS_SIZE = 640;
const BOARD_PADDING_RATIO = 34 / BASE_CANVAS_SIZE;
const FILE_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "O", "P"] as const;

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element as T;
}

const app = requireElement<HTMLDivElement>("#app");
app.innerHTML = `
  <main class="shell">
    <h1>Renju PWA</h1>
    <p id="status"></p>
    <div class="board-wrap">
      <canvas id="board" width="${BASE_CANVAS_SIZE}" height="${BASE_CANVAS_SIZE}"></canvas>
    </div>
    <div class="controls">
      <button id="new-game" type="button">New game</button>
      <button id="toggle-side" type="button">Play as White</button>
    </div>
    <p class="hint">Black follows Renju forbidden rules (double-three, double-four, overline). AI uses iterative deepening up to depth ${AI_MAX_DEPTH} within ~${AI_TIME_BUDGET_MS}ms.</p>
  </main>
`;

const canvas = requireElement<HTMLCanvasElement>("#board");
const context = canvas.getContext("2d");
if (!context) throw new Error("2D canvas context is unavailable");
const ctx = context;

const statusEl = requireElement<HTMLParagraphElement>("#status");
const newGameBtn = requireElement<HTMLButtonElement>("#new-game");
const toggleSideBtn = requireElement<HTMLButtonElement>("#toggle-side");

const engine = new RenjuEngine();
const game = new RenjuGameState({ humanColor: 1 });
const aiAdapter = {
  findBestMove(board: Board, _depth: number): Point {
    return engine.findBestMoveIterative(board, {
      maxDepth: AI_MAX_DEPTH,
      timeLimitMs: AI_TIME_BUDGET_MS,
    });
  },
};

let boardPixelSize = BASE_CANVAS_SIZE;
let boardPadding = boardPixelSize * BOARD_PADDING_RATIO;
let step = (boardPixelSize - boardPadding * 2) / (BOARD_SIZE - 1);
let stoneRadius = step * 0.42;
let tapRadius = step * 0.45;

function updateBoardGeometry(size: number): void {
  boardPixelSize = size;
  boardPadding = boardPixelSize * BOARD_PADDING_RATIO;
  step = (boardPixelSize - boardPadding * 2) / (BOARD_SIZE - 1);
  stoneRadius = step * 0.42;
  tapRadius = step * 0.45;
}

function syncCanvasResolution(): void {
  const rect = canvas.getBoundingClientRect();
  const minSide = Math.min(rect.width, rect.height);
  if (!Number.isFinite(minSide) || minSide < 32) return;

  const cssSize = Math.round(minSide);
  const dpr = Math.max(1, window.devicePixelRatio || 1);

  const targetWidth = Math.round(cssSize * dpr);
  const targetHeight = Math.round(cssSize * dpr);
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  updateBoardGeometry(cssSize);
}

function toPixel(n: number): number {
  return boardPadding + n * step;
}

function snapLine(value: number): number {
  return Math.round(value) + 0.5;
}

function drawGrid(): void {
  ctx.clearRect(0, 0, boardPixelSize, boardPixelSize);
  ctx.fillStyle = "#f4e3b2";
  ctx.fillRect(0, 0, boardPixelSize, boardPixelSize);

  ctx.strokeStyle = "#5c4120";
  ctx.lineWidth = 1;
  const start = snapLine(toPixel(0));
  const end = snapLine(toPixel(BOARD_SIZE - 1));

  for (let i = 0; i < BOARD_SIZE; i++) {
    const p = snapLine(toPixel(i));

    ctx.beginPath();
    ctx.moveTo(start, p);
    ctx.lineTo(end, p);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(p, start);
    ctx.lineTo(p, end);
    ctx.stroke();
  }

  const stars = [3, 7, 11];
  ctx.fillStyle = "#5c4120";
  for (const y of stars) {
    for (const x of stars) {
      ctx.beginPath();
      ctx.arc(toPixel(x), toPixel(y), step * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCoordinates(): void {
  ctx.fillStyle = "#5c4120";
  ctx.font = "600 14px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < BOARD_SIZE; i++) {
    const p = toPixel(i);
    const file = FILE_LABELS[i];
    const rank = String(BOARD_SIZE - i);

    ctx.fillText(file, p, boardPadding * 0.42);
    ctx.fillText(file, p, boardPixelSize - boardPadding * 0.42);

    ctx.fillText(rank, boardPadding * 0.42, p);
    ctx.fillText(rank, boardPixelSize - boardPadding * 0.42, p);
  }
}

function drawForbiddenMarkers(): void {
  const forbidden = game.getForbiddenPointsForCurrentTurn();
  if (forbidden.length === 0) return;

  for (const point of forbidden) {
    const pX = toPixel(point.x);
    const pY = toPixel(point.y);

    ctx.strokeStyle = point.reason === "overline" ? "#e03131" : "#f08c00";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(pX - step * 0.17, pY - step * 0.17);
    ctx.lineTo(pX + step * 0.17, pY + step * 0.17);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pX + step * 0.17, pY - step * 0.17);
    ctx.lineTo(pX - step * 0.17, pY + step * 0.17);
    ctx.stroke();
  }
}

function drawStones(): void {
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const stone = game.board[idx(x, y)];
      if (stone === 0) continue;

      ctx.beginPath();
      ctx.arc(toPixel(x), toPixel(y), stoneRadius, 0, Math.PI * 2);
      ctx.fillStyle = stone === 1 ? "#111" : "#f8f8f8";
      ctx.fill();
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }
}

function draw(): void {
  syncCanvasResolution();
  drawGrid();
  drawCoordinates();
  drawForbiddenMarkers();
  drawStones();
}

function boardPos(e: PointerEvent): Point | null {
  syncCanvasResolution();
  const r = canvas.getBoundingClientRect();
  const px = ((e.clientX - r.left) / r.width) * boardPixelSize;
  const py = ((e.clientY - r.top) / r.height) * boardPixelSize;

  const x = Math.round((px - boardPadding) / step);
  const y = Math.round((py - boardPadding) / step);

  if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return null;

  const nearestX = toPixel(x);
  const nearestY = toPixel(y);
  if (Math.abs(px - nearestX) > tapRadius || Math.abs(py - nearestY) > tapRadius) return null;

  return { x, y };
}

function setIdleStatus(): void {
  if (game.gameOver) {
    statusEl.textContent = game.winner === game.humanColor ? "You win!" : "AI wins!";
    return;
  }

  if (game.turn === game.humanColor) {
    if (game.turn === 1 && game.moveCount === 0) {
      statusEl.textContent = "Your turn (Black). Opening rule: first move must be center (H8).";
      return;
    }
    statusEl.textContent = `Your turn (${colorName(game.humanColor)}).`;
    return;
  }

  statusEl.textContent = `AI turn (${colorName(game.aiColor)}).`;
}

async function maybeRunAiTurn(): Promise<void> {
  if (game.gameOver || game.turn !== game.aiColor) return;

  statusEl.textContent = `AI thinking... (${colorName(game.aiColor)})`;
  await new Promise<void>((resolve) => setTimeout(resolve, 70));

  const result = game.playAIMove(aiAdapter, AI_MAX_DEPTH);
  if (!result.ok) {
    statusEl.textContent = `AI move failed: ${result.reason}`;
    return;
  }

  draw();
  setIdleStatus();
}

async function resetGame(humanColor: Color = game.humanColor): Promise<void> {
  game.reset(humanColor);
  toggleSideBtn.textContent = game.humanColor === 1 ? "Play as White" : "Play as Black";

  draw();
  setIdleStatus();

  if (game.turn === game.aiColor) {
    await maybeRunAiTurn();
  }
}

canvas.addEventListener("pointerdown", async (e: PointerEvent) => {
  if (game.gameOver) return;
  if (game.turn !== game.humanColor) {
    statusEl.textContent = "Wait for AI to move.";
    return;
  }

  const point = boardPos(e);
  if (!point) return;

  const move = game.place(point.x, point.y, game.humanColor);
  if (!move.ok) {
    statusEl.textContent = moveReasonToMessage(move.reason);
    draw();
    return;
  }

  draw();
  setIdleStatus();

  if (!move.win) {
    await maybeRunAiTurn();
  }
});

newGameBtn.addEventListener("click", async () => {
  await resetGame(game.humanColor);
});

toggleSideBtn.addEventListener("click", async () => {
  const nextColor: Color = game.humanColor === 1 ? 2 : 1;
  await resetGame(nextColor);
});

void resetGame(1);

let resizeRaf = 0;
window.addEventListener("resize", () => {
  if (resizeRaf) window.cancelAnimationFrame(resizeRaf);
  resizeRaf = window.requestAnimationFrame(() => {
    resizeRaf = 0;
    draw();
  });
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
