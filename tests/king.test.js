const Color = require("../lib/color");
const King = require("../lib/pieces/king");
const Board = require("../lib/board");
const Pawn = require("../lib/pieces/pawn");
const Rook = require("../lib/pieces/rook");

test("test king constructor", () => {
  let king = new King(Color.WHITE, 3, 4);
  expect(king.color).toBe(Color.WHITE);
  expect(king.x).toBe(3);
  expect(king.y).toBe(4);
});

test("test king movement", () => {
  let board = new Board();
  board.board = Array(8)
    .fill()
    .map(() => Array(8).fill(null));

  let king = new King(Color.WHITE, 0, 0);
  board.set(0, 0, king);

  expect(king.evaluate(board, 1, 0)).toBe(true);
  expect(king.evaluate(board, 0, 1)).toBe(true);
  expect(king.evaluate(board, 1, 1)).toBe(true);

  expect(king.evaluate(board, 2, 0)).toBe(false);
  expect(king.evaluate(board, 0, 2)).toBe(false);
  expect(king.evaluate(board, 2, 2)).toBe(false);
});

test("test king can only capture pieces of opposite color", () => {
  let board = new Board();
  board.board = Array(8)
    .fill()
    .map(() => Array(8).fill(null));

  let king = new King(Color.WHITE, 0, 0);
  board.set(0, 0, king);

  let rook = new Rook(Color.WHITE, 0, 1);
  board.set(0, 1, rook);

  expect(king.evaluate(board, 0, 1)).toBe(false);

  let rookBlack = new Rook(Color.BLACK, 1, 1);
  board.set(1, 1, rookBlack);

  expect(king.evaluate(board, 1, 1)).toBe(true);
});

test("king flipPerspective", () => {
  const blackKing = new King(Color.BLACK, 0, 0);

  expect(blackKing.x).toBe(0);
  expect(blackKing.y).toBe(0);

  blackKing.flipPerspective();

  expect(blackKing.x).toBe(7);
  expect(blackKing.y).toBe(7);
});
