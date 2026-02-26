import { RenjuEngine } from "./engine";
import { RenjuGameState, colorName, moveReasonToMessage } from "./game-state";
import { BOARD_SIZE, idx, type Color, type Point } from "./rules";

const AI_DEPTH = 2;
const CANVAS_SIZE = 640;
const BOARD_PADDING = 34;
const STEP = (CANVAS_SIZE - BOARD_PADDING * 2) / (BOARD_SIZE - 1);
const STONE_RADIUS = STEP * 0.42;
const TAP_RADIUS = STEP * 0.45;
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
      <canvas id="board" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}"></canvas>
    </div>
    <div class="controls">
      <button id="new-game" type="button">New game</button>
      <button id="toggle-side" type="button">Play as White</button>
    </div>
    <p class="hint">Black follows Renju forbidden rules (double-three, double-four, overline). AI depth is fixed at ${AI_DEPTH} (max for this app).</p>
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

function toPixel(n: number): number {
  return BOARD_PADDING + n * STEP;
}

function drawGrid(): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f4e3b2";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#5c4120";
  ctx.lineWidth = 1;

  for (let i = 0; i < BOARD_SIZE; i++) {
    const p = toPixel(i);

    ctx.beginPath();
    ctx.moveTo(toPixel(0), p);
    ctx.lineTo(toPixel(BOARD_SIZE - 1), p);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(p, toPixel(0));
    ctx.lineTo(p, toPixel(BOARD_SIZE - 1));
    ctx.stroke();
  }

  const stars = [3, 7, 11];
  ctx.fillStyle = "#5c4120";
  for (const y of stars) {
    for (const x of stars) {
      ctx.beginPath();
      ctx.arc(toPixel(x), toPixel(y), STEP * 0.09, 0, Math.PI * 2);
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

    ctx.fillText(file, p, BOARD_PADDING * 0.42);
    ctx.fillText(file, p, canvas.height - BOARD_PADDING * 0.42);

    ctx.fillText(rank, BOARD_PADDING * 0.42, p);
    ctx.fillText(rank, canvas.width - BOARD_PADDING * 0.42, p);
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
    ctx.moveTo(pX - STEP * 0.17, pY - STEP * 0.17);
    ctx.lineTo(pX + STEP * 0.17, pY + STEP * 0.17);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pX + STEP * 0.17, pY - STEP * 0.17);
    ctx.lineTo(pX - STEP * 0.17, pY + STEP * 0.17);
    ctx.stroke();
  }
}

function drawStones(): void {
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const stone = game.board[idx(x, y)];
      if (stone === 0) continue;

      ctx.beginPath();
      ctx.arc(toPixel(x), toPixel(y), STONE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = stone === 1 ? "#111" : "#f8f8f8";
      ctx.fill();
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }
}

function draw(): void {
  drawGrid();
  drawCoordinates();
  drawForbiddenMarkers();
  drawStones();
}

function boardPos(e: PointerEvent): Point | null {
  const r = canvas.getBoundingClientRect();
  const px = ((e.clientX - r.left) / r.width) * canvas.width;
  const py = ((e.clientY - r.top) / r.height) * canvas.height;

  const x = Math.round((px - BOARD_PADDING) / STEP);
  const y = Math.round((py - BOARD_PADDING) / STEP);

  if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return null;

  const nearestX = toPixel(x);
  const nearestY = toPixel(y);
  if (Math.abs(px - nearestX) > TAP_RADIUS || Math.abs(py - nearestY) > TAP_RADIUS) return null;

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

  const result = game.playAIMove(engine, AI_DEPTH);
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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
