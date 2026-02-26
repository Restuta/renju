import assert from "node:assert/strict";
import { BOARD_SIZE, createBoard, idx, type Board, type Point } from "../src/rules";

const BLACK_CHARS = new Set(["x", "X"]);
const WHITE_CHARS = new Set(["o", "O"]);

export interface ParsedBoard {
  board: Board;
  marks: Record<string, Point>;
}

export function boardFromAscii(diagram: string): ParsedBoard {
  const rows = diagram
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  assert.equal(
    rows.length,
    BOARD_SIZE,
    `Expected ${BOARD_SIZE} rows in board diagram, got ${rows.length}`
  );

  const board = createBoard();
  const marks: Record<string, Point> = {};

  for (let y = 0; y < BOARD_SIZE; y++) {
    const row = rows[y];
    assert.equal(
      row.length,
      BOARD_SIZE,
      `Row ${y + 1} must have ${BOARD_SIZE} columns, got ${row.length}`
    );

    for (let x = 0; x < BOARD_SIZE; x++) {
      const ch = row[x];
      if (ch === ".") continue;
      if (BLACK_CHARS.has(ch)) {
        board[idx(x, y)] = 1;
        continue;
      }
      if (WHITE_CHARS.has(ch)) {
        board[idx(x, y)] = 2;
        continue;
      }
      if (/[A-Za-z]/.test(ch)) {
        marks[ch.toUpperCase()] = { x, y };
        continue;
      }
      throw new Error(`Unsupported board token '${ch}' at (${x}, ${y})`);
    }
  }

  return { board, marks };
}
