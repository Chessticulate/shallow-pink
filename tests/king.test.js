const Color = require('../lib/color');
const King = require('../lib/pieces/king');
const Board = require('../lib/board');
const Pawn = require('../lib/pieces/pawn');
const Rook = require('../lib/pieces/rook')

test('king constructor', () => {
    let king = new King('king', Color.WHITE, 3, 4);

    expect(king.id).toBe('king');
    expect(king.color).toBe(Color.WHITE);
    expect(king.x).toBe(3);
    expect(king.y).toBe(4);
});

test('king cannot move into check', () => {
    let board = new Board();
    board.board = Array(8).fill().map(() => Array(8).fill(null));

    let king = new King('king', Color.WHITE, 0, 0);
    board.set(0, 0, king);

    let rook = new Rook('rookK', Color.BLACK, 7, 1);
    board.set(7, 1, rook);

    expect(king.evaluate(board, 0, 1)).toBe(false);
});

test('king can only capture pieces of opposite color', () => {
    let board = new Board();
    board.board = Array(8).fill().map(() => Array(8).fill(null));

    let king = new King('king', Color.WHITE, 0, 0);
    board.set(0, 0, king);

    let rook = new Rook('rookK', Color.WHITE, 0, 1);
    board.set(0, 1, rook);

    expect(king.evaluate(board, 0, 1)).toBe(false);

    let rookBlack = new Rook('rookK', Color.BLACK, 1, 1);
    board.set(1, 1, rookBlack);

    expect(king.evaluate(board, 1, 1)).toBe(true);
});
