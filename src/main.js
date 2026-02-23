import "./style.css";
import { RenjuEngine } from "./engine.js";
import { BOARD_SIZE, createBoard, getForbiddenReason, idx, isWin } from "./rules.js";

const app = document.querySelector("#app");
app.innerHTML = `
  <main class="shell">
    <h1>Renju PWA</h1>
    <p id="status">Your turn (Black)</p>
    <div class="board-wrap">
      <canvas id="board" width="600" height="600"></canvas>
    </div>
    <div class="controls">
      <button id="new-game">New game</button>
    </div>
    <p class="hint">Black follows Renju forbidden move rules: double-three, double-four, overline.</p>
  </main>
`;

const canvas = document.querySelector("#board");
const ctx = canvas.getContext("2d");
const statusEl = document.querySelector("#status");
const newGameBtn = document.querySelector("#new-game");
const cell = canvas.width / BOARD_SIZE;

let board = createBoard();
let gameOver = false;
const engine = new RenjuEngine();

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f4e3b2";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#5c4120";
  for (let i = 0; i < BOARD_SIZE; i++) {
    const p = i * cell + cell / 2;
    ctx.beginPath();
    ctx.moveTo(cell / 2, p);
    ctx.lineTo(canvas.width - cell / 2, p);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(p, cell / 2);
    ctx.lineTo(p, canvas.height - cell / 2);
    ctx.stroke();
  }

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const stone = board[idx(x, y)];
      if (stone === 0) continue;
      ctx.beginPath();
      ctx.arc(x * cell + cell / 2, y * cell + cell / 2, cell * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = stone === 1 ? "#111" : "#f8f8f8";
      ctx.fill();
      ctx.strokeStyle = "#333";
      ctx.stroke();
    }
  }
}

function boardPos(e) {
  const r = canvas.getBoundingClientRect();
  const x = Math.floor(((e.clientX - r.left) / r.width) * BOARD_SIZE);
  const y = Math.floor(((e.clientY - r.top) / r.height) * BOARD_SIZE);
  return { x, y };
}

function place(x, y, color) {
  if (x < 0 || y < 0 || x >= BOARD_SIZE || y >= BOARD_SIZE) return false;
  if (board[idx(x, y)] !== 0) return false;
  board[idx(x, y)] = color;
  draw();
  if (isWin(board, x, y, color)) {
    gameOver = true;
    statusEl.textContent = color === 1 ? "You win!" : "AI wins!";
  }
  return true;
}

async function aiTurn() {
  statusEl.textContent = "AI thinking...";
  await new Promise((r) => setTimeout(r, 50));
  const m = engine.findBestMove(board, 2);
  place(m.x, m.y, 2);
  if (!gameOver) statusEl.textContent = "Your turn (Black)";
}

canvas.addEventListener("pointerdown", async (e) => {
  if (gameOver) return;
  const { x, y } = boardPos(e);
  const forbidden = getForbiddenReason(board, x, y);
  if (forbidden) {
    statusEl.textContent = `Forbidden move for Black: ${forbidden}`;
    return;
  }
  if (!place(x, y, 1)) return;
  if (!gameOver) await aiTurn();
});

newGameBtn.addEventListener("click", () => {
  board = createBoard();
  gameOver = false;
  statusEl.textContent = "Your turn (Black)";
  draw();
});

draw();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
