const Board = require("../lib/board");
const Color = require("../lib/color");
const Knight = require("../lib/pieces/knight");

test("knight constructor", () => {
  let knight = new Knight(Color.WHITE, 1, 7);
  expect(knight.color).toBe(Color.WHITE);
  expect(knight.x).toBe(1);
  expect(knight.y).toBe(7);
});

test("knights movement", () => {
  let board = new Board();
  let knightQBlack = board.get(1, 0);
  let knightKBlack = board.get(6, 0);
  let knightQWhite = board.get(1, 7);
  let knightKWhite = board.get(6, 7);

  expect(knightQBlack.evaluate(board, 2, 2)).toBe(true);
  expect(knightQBlack.evaluate(board, 0, 2)).toBe(true);
  expect(knightQBlack.evaluate(board, 3, 1)).toBe(false);

  expect(knightKBlack.evaluate(board, 5, 2)).toBe(true);
  expect(knightKBlack.evaluate(board, 7, 2)).toBe(true);
  expect(knightKBlack.evaluate(board, 4, 1)).toBe(false);

  expect(knightQWhite.evaluate(board, 2, 5)).toBe(true);
  expect(knightQWhite.evaluate(board, 0, 5)).toBe(true);
  expect(knightQWhite.evaluate(board, 3, 6)).toBe(false);

  expect(knightKWhite.evaluate(board, 5, 5)).toBe(true);
  expect(knightKWhite.evaluate(board, 7, 5)).toBe(true);
  expect(knightKWhite.evaluate(board, 4, 6)).toBe(false);
});
