# Renju PWA

A touch-friendly Renju game for iPhone/local play with a browser-based AI engine.

## Features
- 15x15 Renju board with touch controls
- Forbidden-move checks for black (double-three, double-four, overline)
- Local AI opponent (alpha-beta style search + move ordering)
- PWA support (manifest + service worker) for offline home-screen play

## Run locally

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Deploy to Vercel

```bash
vercel
vercel --prod
```

This repo is static and does not require a build step.
