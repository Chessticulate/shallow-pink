const Color = require('../lib/color');
const Pawn = require('../lib/pieces/pawn');
const Board = require('../lib/board');


test('pawn constructor', () => {
    let pawn = new Pawn('pawnA', Color.WHITE, 0, 6);
    expect(pawn.id).toBe('pawnA');
    expect(pawn.color).toBe(Color.WHITE);
    expect(pawn.x).toBe(0);
    expect(pawn.y).toBe(6);
    expect(pawn.firstMove).toBe(true);
});


test('pawn can only move forward 2 spaces on first move', () => {
    let board = new Board();
    let pawn = board.getById('pawnA', Color.WHITE);

    expect(pawn.evaluate(board, 0, 4)).toBe(true);
    pawn.firstMove = false;
    expect(pawn.evaluate(board, 0, 4)).toBe(false);
});


test('pawn can only move forward onto empty spaces', () => {
    let board = new Board();
    let pawnAWhite = board.getById('pawnA', Color.WHITE);
    let pawnABlack = board.getById('pawnA', Color.BLACK);

    expect(pawnAWhite.evaluate(board, 0, 5)).toBe(true);
    expect(pawnAWhite.evaluate(board, 0, 4)).toBe(true);

    board.board[5][0] = pawnABlack;
    board.board[4][0] = pawnABlack;

    expect(pawnAWhite.evaluate(board, 0, 5)).toBe(false);
    expect(pawnAWhite.evaluate(board, 0, 4)).toBe(false);
});


test('pawn can only move diagonally onto space occupied by opponent', () => {
    let board = new Board();
    let pawnBWhite = board.getById('pawnB', Color.WHITE);
    let pawnBBlack = board.getById('pawnB', Color.BLACK);

    expect(pawnBWhite.evaluate(board, 0, 5)).toBe(false);
    expect(pawnBWhite.evaluate(board, 2, 5)).toBe(false);

    board.board[5][0] = pawnBBlack;
    board.board[5][2] = pawnBBlack;

    expect(pawnBWhite.evaluate(board, 0, 5)).toBe(true);
    expect(pawnBWhite.evaluate(board, 2, 5)).toBe(true);   
});


test('white pawns can only move up, black pawns can only move down', () => {
    let board = new Board();
    board.board = Array(8).fill().map(() => Array(8).fill(null));
    let pawnDBlack = new Pawn('pawnD', Color.BLACK, 3, 1);
    let pawnDWhite = new Pawn('pawnD', Color.WHITE, 3, 6);
    board.board[1][3] = pawnDBlack;
    board.board[6][3] = pawnDWhite;

    expect(pawnDBlack.evaluate(board, 3, 0)).toBe(false);
    expect(pawnDBlack.evaluate(board, 3, 2)).toBe(true);

    expect(pawnDWhite.evaluate(board, 3, 7)).toBe(false);
    expect(pawnDWhite.evaluate(board, 3, 5)).toBe(true);
});
