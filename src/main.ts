import { Game } from './game';

// Inject styles
const style = document.createElement('style');
style.textContent = `
  :root {
    --bg: #0c0b09;
    --surface: #171512;
    --surface-hover: #1f1c17;
    --surface-active: #28241d;
    --border: #2a261f;
    --border-hover: #3a3529;
    --gold: #c8a44e;
    --gold-soft: #a08338;
    --gold-glow: rgba(200, 164, 78, 0.08);
    --text: #e2dacb;
    --text-secondary: #9b9080;
    --text-muted: #645c50;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
  }

  html, body {
    height: 100%;
    overflow: hidden;
    background: var(--bg);
    color: var(--text);
    font-family: 'Manrope', system-ui, sans-serif;
    touch-action: manipulation;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  #app {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
    min-height: 100dvh;
    padding: env(safe-area-inset-top) 16px env(safe-area-inset-bottom);
    background:
      radial-gradient(ellipse 80% 50% at 50% -5%, var(--gold-glow), transparent),
      radial-gradient(ellipse 60% 40% at 50% 105%, rgba(200, 164, 78, 0.03), transparent);
  }

  .header {
    text-align: center;
    padding: 20px 0 6px;
    animation: fadeUp 0.5s ease-out both;
  }

  .header h1 {
    font-family: 'Cinzel', 'Georgia', serif;
    font-size: 26px;
    font-weight: 600;
    letter-spacing: 5px;
    color: var(--gold);
    text-shadow: 0 0 30px rgba(200, 164, 78, 0.12);
  }

  .header-rule {
    width: 48px;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--gold-soft), transparent);
    margin: 8px auto 0;
    animation: pulse 4s ease-in-out infinite;
  }

  #status {
    font-size: 13px;
    font-weight: 400;
    color: var(--text-secondary);
    min-height: 22px;
    padding: 8px 0 4px;
    letter-spacing: 0.3px;
    transition: color 0.3s ease;
  }

  #board-container {
    width: 100%;
    max-width: 500px;
    aspect-ratio: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    animation: fadeUp 0.5s ease-out 0.1s both;
  }

  #board {
    cursor: pointer;
    border-radius: 3px;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.3),
      0 4px 16px rgba(0, 0, 0, 0.25),
      0 8px 40px rgba(0, 0, 0, 0.2);
  }

  .controls {
    display: flex;
    gap: 10px;
    padding: 14px 0 10px;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    animation: fadeUp 0.5s ease-out 0.2s both;
  }

  .controls button,
  .controls select {
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px 20px;
    font-family: 'Manrope', system-ui, sans-serif;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.3px;
    cursor: pointer;
    touch-action: manipulation;
    transition: all 0.2s ease;
    outline: none;
  }

  .controls button:hover,
  .controls select:hover {
    background: var(--surface-hover);
    border-color: var(--border-hover);
  }

  .controls button:active {
    background: var(--surface-active);
    transform: scale(0.97);
    transition: all 0.08s ease;
  }

  .controls button:focus-visible,
  .controls select:focus-visible {
    border-color: var(--gold-soft);
    box-shadow: 0 0 0 2px var(--gold-glow);
  }

  .controls select {
    appearance: none;
    -webkit-appearance: none;
    padding-right: 30px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 5 5-5' stroke='%239b9080' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
  }

  .controls select option {
    background: var(--surface);
    color: var(--text);
  }

  .controls label {
    font-size: 10px;
    font-weight: 500;
    color: var(--text-muted);
    letter-spacing: 1px;
    text-transform: uppercase;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
  }

  .info {
    font-size: 11px;
    color: var(--text-muted);
    text-align: center;
    padding: 6px 20px 16px;
    max-width: 360px;
    line-height: 1.6;
    letter-spacing: 0.15px;
    animation: fadeUp 0.5s ease-out 0.3s both;
  }

  @keyframes fadeUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  @media (max-height: 700px) {
    .header { padding: 10px 0 2px; }
    .header h1 { font-size: 22px; }
    .controls { padding: 8px 0 4px; }
    .info { padding: 4px 20px 8px; }
  }
`;
document.head.appendChild(style);

// Build DOM
const app = document.getElementById('app')!;
app.innerHTML = `
  <div class="header">
    <h1>Renju</h1>
    <div class="header-rule"></div>
    <div id="status">Black's turn (you) — Move 1 [center]</div>
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
        <option value="4">4</option>
        <option value="5">5</option>
        <option value="6">6</option>
        <option value="7">7</option>
        <option value="8" selected>8</option>
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
    Black has forbidden moves: double-three, double-four, overline.<br>
    White wins with 5+ in a row. Add to Home Screen for offline play.
  </div>
`;

// Start game
new Game();
