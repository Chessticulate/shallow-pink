const Color = require("../lib/color");
const Queen = require("../lib/pieces/queen");
const Board = require("../lib/board");
const Pawn = require("../lib/pieces/pawn");

test("queen constructor", () => {
  let queen = new Queen(Color.WHITE, 4, 7);
  expect(queen.color).toBe(Color.WHITE);
  expect(queen.x).toBe(4);
  expect(queen.y).toBe(7);
});

test("queen can only move through empty spaces", () => {
  let board = new Board();
  board.board = Array(8)
    .fill()
    .map(() => Array(8).fill(null));

  let queen = new Queen(Color.WHITE, 4, 4);
  board.set(4, 4, queen);

  // testing queens movement
  expect(queen.evaluate(board, 0, 0)).toBe(true);
  expect(queen.evaluate(board, 4, 7)).toBe(true);

  let pawnAWhite = new Pawn(Color.WHITE, 7, 1);
  let pawnABlack = new Pawn(Color.BLACK, 6, 0);

  board.set(6, 6, pawnAWhite);
  board.set(1, 1, pawnABlack);

  // making sure queen cannot move through pieces
  expect(queen.evaluate(board, 7, 7)).toBe(false);
  expect(queen.evaluate(board, 0, 0)).toBe(false);
});

test("queen can only capture pieces of opposite color", () => {
  let board = new Board();
  board.board = Array(8)
    .fill()
    .map(() => Array(8).fill(null));

  let queen = new Queen(Color.WHITE, 4, 4);
  board.set(4, 4, queen);

  let blackPawn = new Pawn(Color.BLACK, 3, 3);
  board.set(3, 3, blackPawn);

  expect(queen.evaluate(board, 3, 3)).toBe(true);

  let whitePawn = new Pawn(Color.WHITE, 3, 4);
  board.set(3, 4, whitePawn);

  expect(queen.evaluate(board, 3, 4)).toBe(false);
});
