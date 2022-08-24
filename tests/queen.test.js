const Color = require('../lib/color');
const Queen = require('../lib/pieces/queen');
const Board = require('../lib/board');
const Pawn = require('../lib/pieces/pawn');

test('queen constructor', () => {
  let queen = new Queen('queen', Color.WHITE, 4, 7);

  expect(queen.id).toBe('queen');
  expect(queen.color).toBe(Color.WHITE);
  expect(queen.x).toBe(4);
  expect(queen.y).toBe(6);
});

test('queen can only move through empty spaces', () => {
  let board = new Board();
  board.board = Array(8).fill().map(() => Array(8).fill(null));

  let queen = new Queen('queen', Color.WHITE, 4, 4);
  board.board[4][4] = queen;

  // testing queens movement
  expect(queen.evaluate(board, 0, 0).toBe(true));
  expect(queen.evaluate(board, 7, 0).toBe(true));

  let pawnAWhite = new Pawn('pawnA', Color.WHITE, 7, 1);
  let pawnABlack = new Pawn('pawnA', Color.BLACK, 6, 0);
  
  board.board[7][1] = pawnAWhite;
  board.board[6][0] = pawnABlack;

  // making sure queen cannot move through pieces
  expect(queen.evaluate(board, 7, 7).toBe(false));
  expect(queen.evaluate(board, 0, 0).toBe(false));
  
  // testing capturing a piece from opposing team
  expect(queen.evaluate(board, 6, 0).toBe(true));
});

test('queen can only capture pieces of opposite color', () => {
  let board = new Board();
  board.board = Array(8).fill().map(() => Array(8).fill(null));

  let queen = new Queen('queen', Color.WHITE, 4, 4);
  board.board[4][4] = queen;

  let pawn = new Pawn('pawnA', Color.BLACK, 3, 3);
  board.board[3][3] = pawn;

  expect(queen.evaluate(board, 3, 3).toBe(true))
}) 