const Color = require('../lib/color');
const Bishop = require('../lib/pieces/bishop');
const Board = require('../lib/board');
const Pawn = require('../lib/pieces/pawn');

test('bishop constructor', () => {
    let bishop = new Bishop('bishopQ', Color.BLACK, 1, 2);

    expect(bishop.id).toBe('bishopQ');
    expect(bishop.color).toBe(Color.BLACK);
    expect(bishop.x).toBe(1);
    expect(bishop.y).toBe(2);
});

test('bishop can only move through empty spaces', () => {
    let board = new Board();
    board.board = Array(8).fill().map(() => Array(8).fill(null));

    let bishop = new Bishop('bishopK', Color.WHITE, 0, 0);
    board.set(0, 0, bishop);

    expect(bishop.evaluate(board, 1, 1)).toBe(true);
    expect(bishop.evaluate(board, 7, 7)).toBe(true);

    let pawnAWhite = new Pawn('pawnA', Color.WHITE, 2, 2);  
    board.set(2, 2, pawnAWhite);

    expect(bishop.evaluate(board, 3, 3)).toBe(false);

    //resetting bishop position to test movement from a different tile
    board.set(7, 0, board)  
    let pawnABlack = new Pawn('pawnA', Color.BLACK, 1, 6);
    board.set(1, 6, pawnABlack);

    expect(bishop.evaluate(board, 0, 7)).toBe(false);
});

test('bishop can only capture pieces of opposite color', () => {
    let board = new Board();
    board.board = Array(8).fill().map(() => Array(8).fill(null));

    let bishop = new Bishop('bishopK', Color.WHITE, 0, 0);
    board.set(0, 0, bishop);

    let blackPawn = new Pawn('pawnA', Color.BLACK, 7, 7);
    board.set(7, 7, blackPawn);

    expect(bishop.evaluate(board, 7, 7)).toBe(true);

    let whitePawn = new Pawn('pawnA', Color.WHITE, 4, 4);
    board.set(4, 4, whitePawn);

    expect(bishop.evaluate(board, 4, 4)).toBe(false);
});


test('promoted bishop can be ambiguous', () => {
    let board = new Board();
    board.board = Array(8).fill().map(() => Array(8).fill(null));

    let bishopAWhite = new Bishop('bishopA', Color.WHITE, 0, 5);
    board.set(0, 5, bishopAWhite);
    let bishopCWhite = new Bishop('bishopC', Color.WHITE, 0, 7);
    board.set(0, 7, bishopCWhite);

    expect(bishopAWhite.evaluate(board, 1, 6)).toBe(true);
    expect(bishopCWhite.evaluate(board, 1, 6)).toBe(true);

    expect(bishopAWhite.ambiguous(board, 1, 6)).toBe(true);
    expect(bishopCWhite.ambiguous(board, 1, 6)).toBe(true);
});

