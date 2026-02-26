# Renju PWA

A touch-friendly Renju game for iPhone/local play with a browser-based AI engine.

## Features
- 15x15 Renju board with touch controls
- Coordinate labels on the board (A-H, J-P / 15-1)
- Official opening constraint: Black's first move must be center (H8)
- Forbidden-move checks for black (double-three, double-four, overline)
- Forbidden intersections are highlighted on the board when Black is to move
- Local AI opponent (alpha-beta style search + move ordering)
- Play as either Black or White
- PWA support (manifest + service worker) for offline home-screen play

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (typically `http://localhost:5173`).

## Run tests

```bash
npm test
```

## Typecheck

```bash
npm run typecheck
```

## Production build

```bash
npm run build
```

## Deploy to Vercel

```bash
vercel
vercel --prod
```

The production bundle is generated into `dist/` via Vite.
