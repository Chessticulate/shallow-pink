const Board = require('../lib/board');
const Color = require('../lib/color');
const Rook = require('../lib/pieces/rook');


test('rook constructor', () => {
    let rook = new Rook(Color.WHITE, 0, 7);
    expect(rook.color).toBe(Color.WHITE);
    expect(rook.x).toBe(0);
    expect(rook.y).toBe(7);
    expect(rook.firstMove).toBe(true);
});


test('rook can only move horizontally and vertically', () => {
    let board = new Board();
    board.board = Array(8).fill().map(() => Array(8).fill(null));

    let rook = new Rook(Color.BLACK, 0, 0);
    board.set(0, 0, rook);

    expect(rook.evaluate(board, 0, 7)).toBe(true);
    expect(rook.evaluate(board, 7, 0)).toBe(true);
    expect(rook.evaluate(board, 7, 7)).toBe(false);
});


test('rook cannot move through other pieces', () => {
    let board = new Board();
    board.board = Array(8).fill().map(() => Array(8).fill(null));

    let rookKBlack = new Rook(Color.BLACK, 3, 0);
    board.set(3, 0, rookKBlack);

    expect(rookKBlack.evaluate(board, 3, 7)).toBe(true);

    let rookQWhite = new Rook(Color.WHITE, 3, 4);
    board.set(3, 4, rookQWhite);

    expect(rookKBlack.evaluate(board, 3, 7)).toBe(false);
});
