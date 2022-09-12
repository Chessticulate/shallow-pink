const Color = require('../lib/color');
const Pawn = require('../lib/pieces/pawn');
const King = require('../lib/pieces/king');
const Board = require('../lib/board');

// TODO
// Promotion, En Passant

test('pawn constructor', () => {
    let pawn = new Pawn('pawnA', Color.WHITE, 0, 6);
    expect(pawn.id).toBe('pawnA');
    expect(pawn.color).toBe(Color.WHITE);
    expect(pawn.x).toBe(0);
    expect(pawn.y).toBe(6);
    expect(pawn.firstMove).toBe(true);
    expect(pawn.enPassantable).toBe(false);
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

    board.set(0, 5, pawnABlack);
    board.set(0, 4, pawnABlack);

    expect(pawnAWhite.evaluate(board, 0, 5)).toBe(false);
    expect(pawnAWhite.evaluate(board, 0, 4)).toBe(false);
});


test('pawn can only move diagonally onto space occupied by opponent', () => {
    let board = new Board();
    let pawnBWhite = board.getById('pawnB', Color.WHITE);
    let pawnBBlack = board.getById('pawnB', Color.BLACK);

    expect(pawnBWhite.evaluate(board, 0, 5)).toBe(false);
    expect(pawnBWhite.evaluate(board, 2, 5)).toBe(false);

    board.set(0, 5, pawnBBlack);
    board.set(2, 5, pawnBBlack);

    expect(pawnBWhite.evaluate(board, 0, 5)).toBe(true);
    expect(pawnBWhite.evaluate(board, 2, 5)).toBe(true);   
});


test('white pawns can only move up, black pawns can only move down', () => {
    let board = new Board();
    board.board = Array(8).fill().map(() => Array(8).fill(null));
    let pawnDBlack = new Pawn('pawnD', Color.BLACK, 3, 1);
    let pawnDWhite = new Pawn('pawnD', Color.WHITE, 3, 6);
    board.set(3, 1, pawnDBlack);
    board.set(3, 6, pawnDWhite);

    expect(pawnDBlack.evaluate(board, 3, 0)).toBe(false);
    expect(pawnDBlack.evaluate(board, 3, 2)).toBe(true);

    expect(pawnDWhite.evaluate(board, 3, 7)).toBe(false);
    expect(pawnDWhite.evaluate(board, 3, 5)).toBe(true);
});


test('en passant', () => {
    let board = new Board();
    board.board = Array(8).fill().map(() => Array(8).fill(null));

    let kingWhite = new King('king', Color.WHITE, 4, 7);
    board.set(4, 7, kingWhite);
    let pawnDWhite = new Pawn('pawnD', Color.WHITE, 3, 4);
    board.set(3, 4, pawnDWhite);

    let kingBlack = new King('king', Color.BLACK, 4, 0);
    board.set(4, 0, kingBlack);
    let pawnEBlack = new Pawn('pawnE', Color.BLACK, 4, 4);
    board.set(4, 4, pawnEBlack);

    pawnDWhite.enPassantable = false;
    expect(pawnEBlack.evaluate(board, 3, 5)).toBe(false);
    pawnDWhite.enPassantable = true;
    expect(pawnEBlack.evaluate(board, 3, 5)).toBe(true);
});

