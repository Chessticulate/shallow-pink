const Color = require('../lib/color');
const Board = require('../lib/board');
const Pawn = require('../lib/pieces/pawn');

const AI = require('../lib/ai');


test('generateMoveStr', () => {
    let board = new Board();
    let pawnDBlack = board.get(3, 1);

    expect(AI.generateMoveStr(pawnDBlack, board, 3, 3)).toBe('d5');

    let knightQWhite = board.get(1, 7);

    expect(AI.generateMoveStr(knightQWhite, board, 2, 5)).toBe('Nc3');

    ["d4", "Nc6", "d5", "e5"].forEach(move => {
        board.move(board.buildMove(move));
    });

    let pawnDWhite = board.get(3, 3);
    expect(AI.generateMoveStr(pawnDWhite, board, 4, 2)).toBe("dxe6");

    board.wipe();
    board.whiteKing = board.set(new King(Color.WHITE, 7, 7));
    board.blackKing = board.set(new King(Color.BLACK, 7, 1));
    let whitePawn = board.set(new Pawn(Color.WHITE, 1, 1));
    board.teamMap[Color.WHITE] = [whiteKing, whitePawn];
    board.teamMap[Color.BLACK] = [blackKing];

    expect(AI.generateMoveStr(whitePawn, board, 1, 0)).toBe("b8=Q");
});


