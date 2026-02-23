import { Game } from './game';

// Inject styles
const style = document.createElement('style');
style.textContent = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
  }

  html, body {
    height: 100%;
    overflow: hidden;
    background: #1a1a2e;
    color: #e0e0e0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    touch-action: manipulation;
  }

  #app {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
    min-height: 100dvh;
    padding: env(safe-area-inset-top) 12px env(safe-area-inset-bottom);
  }

  .header {
    text-align: center;
    padding: 12px 0 4px;
  }

  .header h1 {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 2px;
    color: #f0d060;
  }

  #status {
    font-size: 14px;
    color: #aaa;
    min-height: 20px;
    padding: 4px 0;
  }

  #board-container {
    width: 100%;
    max-width: 500px;
    aspect-ratio: 1;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  #board {
    cursor: pointer;
    border-radius: 4px;
  }

  .controls {
    display: flex;
    gap: 8px;
    padding: 12px 0;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
  }

  .controls button,
  .controls select {
    background: #16213e;
    color: #e0e0e0;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 10px 16px;
    font-size: 14px;
    cursor: pointer;
    touch-action: manipulation;
    transition: background 0.15s;
  }

  .controls button:hover,
  .controls select:hover {
    background: #1f3460;
  }

  .controls button:active {
    background: #2a4a80;
  }

  .controls select {
    appearance: none;
    -webkit-appearance: none;
    padding-right: 28px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23aaa' fill='none' stroke-width='1.5'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
  }

  .controls select option {
    background: #16213e;
    color: #e0e0e0;
  }

  .controls label {
    font-size: 12px;
    color: #888;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .info {
    font-size: 11px;
    color: #666;
    text-align: center;
    padding: 8px 16px;
    max-width: 400px;
    line-height: 1.4;
  }
`;
document.head.appendChild(style);

// Build DOM
const app = document.getElementById('app')!;
app.innerHTML = `
  <div class="header">
    <h1>RENJU</h1>
    <div id="status">Black's turn (you) — Move 1</div>
  </div>
  <div id="board-container">
    <canvas id="board"></canvas>
  </div>
  <div class="controls">
    <button id="undo-btn">Undo</button>
    <button id="new-game-btn">New Game</button>
    <label>
      Difficulty
      <select id="difficulty">
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4" selected>4</option>
        <option value="5">5</option>
        <option value="6">6</option>
      </select>
    </label>
    <label>
      Play as
      <select id="color-select">
        <option value="1">Black</option>
        <option value="2">White</option>
      </select>
    </label>
  </div>
  <div class="info">
    Renju rules: Black has forbidden moves (double-three, double-four, overline).
    White wins with 5+ in a row. Add to Home Screen for offline play.
  </div>
`;

// Start game
new Game();
