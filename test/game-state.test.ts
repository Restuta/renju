import assert from "node:assert/strict";
import test from "node:test";
import { RenjuGameState, moveReasonToMessage } from "../src/game-state";
import { BOARD_SIZE, idx } from "../src/rules";

test("black opening move must be center", () => {
  const game = new RenjuGameState({ humanColor: 1 });
  const center = Math.floor(BOARD_SIZE / 2);

  const illegal = game.place(0, 0, 1);
  assert.equal(illegal.ok, false);
  if (!illegal.ok) {
    assert.equal(illegal.reason, "opening-center");
  }

  const legal = game.place(center, center, 1);
  assert.equal(legal.ok, true);
  assert.equal(game.turn, 2);
});

test("AI black opening falls back to legal center move", () => {
  const game = new RenjuGameState({ humanColor: 2 });
  const center = Math.floor(BOARD_SIZE / 2);
  const badEngine = { findBestMove: () => ({ x: 0, y: 0 }) };

  const aiMove = game.playAIMove(badEngine, 2);
  assert.equal(aiMove.ok, true);
  assert.equal(game.board[idx(center, center)], 1);
  assert.equal(game.turn, 2);
});

test("forbidden points are shown only on black turn", () => {
  const game = new RenjuGameState({ humanColor: 1 });
  const center = Math.floor(BOARD_SIZE / 2);

  game.place(center, center, 1);
  const whiteTurnForbidden = game.getForbiddenPointsForCurrentTurn();
  assert.deepEqual(whiteTurnForbidden, []);
});

test("moveReasonToMessage exposes opening and forbidden messages", () => {
  assert.match(moveReasonToMessage("opening-center"), /center/);
  assert.match(moveReasonToMessage("double-four"), /double-four/);
});
