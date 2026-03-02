import assert from "node:assert/strict";
import test from "node:test";
import { RenjuEngine } from "../src/engine";
import { BOARD_SIZE, createBoard, idx } from "../src/rules";

test("iterative search returns center on an empty board", () => {
  const engine = new RenjuEngine();
  const board = createBoard();

  const move = engine.findBestMoveIterative(board, {
    maxDepth: 4,
    timeLimitMs: 50,
  });

  const center = Math.floor(BOARD_SIZE / 2);
  assert.deepEqual(move, { x: center, y: center });
});

test("iterative search returns a legal empty move when budget is exhausted quickly", () => {
  let tick = 0;
  const engine = new RenjuEngine({
    now: () => {
      tick += 2;
      return tick;
    },
  });

  const board = createBoard();
  board[idx(7, 7)] = 1;
  board[idx(8, 7)] = 2;

  const move = engine.findBestMoveIterative(board, {
    maxDepth: 6,
    timeLimitMs: 1,
  });

  assert.equal(board[idx(move.x, move.y)], 0);
  assert.ok(move.x >= 0 && move.x < BOARD_SIZE);
  assert.ok(move.y >= 0 && move.y < BOARD_SIZE);
});
