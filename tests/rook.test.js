const Board = require('../lib/board');
const Color = require('../lib/color');
const Rook = require('../lib/pieces/rook');


test('rook constructor', () => {
    let rook = new Rook('rookQ', Color.WHITE, 0, 7);
    expect(rook.id).toBe('rookQ');
    expect(rook.color).toBe(Color.WHITE);
    expect(rook.x).toBe(0);
    expect(rook.y).toBe(7);
    expect(rook.firstMove).toBe(true);
});


test('rook can only move horizontally and vertically', () => {
    let board = new Board();
    board.board = Array(8).fill().map(() => Array(8).fill(null));
    let rook = new Rook('rookK', Color.BLACK, 0, 0);

    expect(rook.evaluate(board, 0, 7)).toBe(true);
    expect(rook.evaluate(board, 7, 0)).toBe(true);
    expect(rook.evaluate(board, 7, 7)).toBe(false);
});


test('rook cannot move through other pieces', () => {
    let board = new Board();
    board.board = Array(8).fill().map(() => Array(8).fill(null));
    let rookKBlack = new Rook('rookK', Color.BLACK, 3, 0);
    board.board[0][3] = rookKBlack;

    expect(rookKBlack.evaluate(board, 3, 7)).toBe(true);

    let rookQWhite = new Rook('rookQ', Color.WHITE, 3, 4);
    board.board[4][3] = rookQWhite;

    expect(rookKBlack.evaluate(board, 3, 7)).toBe(false);
});
