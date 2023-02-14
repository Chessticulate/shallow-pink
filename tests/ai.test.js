const Color = require('../lib/color');
const Board = require('../lib/board');
const Pawn = require('../lib/pieces/pawn');
const King = require('../lib/pieces/king');

const AI = require('../lib/ai');


test('generateMoveStr', () => {
    let board = new Board();
    let pawnDBlack = board.get(3, 1);

    expect(AI.generateMoveStr(pawnDBlack, board, 3, 3)).toBe('d5');

    let knightQWhite = board.get(1, 7);

    expect(AI.generateMoveStr(knightQWhite, board, 2, 5)).toBe('Nc3');
    
    let i = 1;

    ["d4", "Nc6", "d5", "e5"].forEach(move => {
        board.move(board.buildMove(move, (i % 2 ? Color.WHITE : Color.BLACK)));
        i++;
    });

    let pawnDWhite = board.get(3, 3);
    expect(AI.generateMoveStr(pawnDWhite, board, 4, 2)).toBe("dxe6");

    board.wipe();
    let whiteKing = new King(Color.WHITE, 7, 7);
    let blackKing = new King(Color.WHITE, 1, 7);
    let whitePawn = new Pawn(Color.WHITE, 1, 1);
    board.whiteKing = whiteKing;
    board.blackKing = blackKing;

    board.teamMap[Color.WHITE] = [
        board.set(0, 7, whiteKing),
        board.set(3, 1, whitePawn)
    ];
    board.teamMap[Color.BLACK] = [
        board.set(7, 7, blackKing)
    ];

    expect(AI.generateMoveStr(whitePawn, board, 1, 0)).toBe("b8=Q");
});

test('validMoves', () => {
    
});


