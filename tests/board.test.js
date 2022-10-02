const Board = require('../lib/board');
const Color = require('../lib/color');
const Bishop = require('../lib/pieces/bishop');
const King = require('../lib/pieces/king');
const Pawn = require('../lib/pieces/pawn');
const Queen = require('../lib/pieces/queen');
const Rook = require('../lib/pieces/rook');


test('board constructor', () => {
    let board = new Board();

    expect(board.board.length).toBe(8);
    expect(board.board[0].length).toBe(8);
    expect(board.moveHistory.length).toBe(0);
});


test('correct piece placement on board', () => {
    let board = new Board();

    // White
    let pawnAWhite = board.getByAddress(0, 6);
    expect(pawnAWhite === null).toBe(false);
    expect(pawnAWhite.id).toBe('pawnA');
    expect(pawnAWhite.color).toBe(Color.WHITE);
    expect(pawnAWhite.x).toBe(0);
    expect(pawnAWhite.y).toBe(6);

    let pawnHWhite = board.getByAddress(7, 6);
    expect(pawnHWhite === null).toBe(false);
    expect(pawnHWhite.id).toBe('pawnH');
    expect(pawnHWhite.color).toBe(Color.WHITE);
    expect(pawnHWhite.x).toBe(7);
    expect(pawnHWhite.y).toBe(6);

    let rookQWhite = board.getByAddress(0, 7);
    expect(rookQWhite === null).toBe(false);
    expect(rookQWhite.id).toBe('rookQ');
    expect(rookQWhite.color).toBe(Color.WHITE);
    expect(rookQWhite.x).toBe(0);
    expect(rookQWhite.y).toBe(7);

    let bishopKWhite = board.getByAddress(5, 7);
    expect(bishopKWhite === null).toBe(false);
    expect(bishopKWhite.id).toBe('bishopK');
    expect(bishopKWhite.color).toBe(Color.WHITE);
    expect(bishopKWhite.x).toBe(5);
    expect(bishopKWhite.y).toBe(7);

    // Black
    let pawnABlack = board.getByAddress(0, 1);
    expect(pawnABlack === null).toBe(false);
    expect(pawnABlack.id).toBe('pawnA');
    expect(pawnABlack.color).toBe(Color.BLACK);
    expect(pawnABlack.x).toBe(0);
    expect(pawnABlack.y).toBe(1);

    let pawnHBlack = board.getByAddress(7, 1);
    expect(pawnHBlack === null).toBe(false);
    expect(pawnHBlack.id).toBe('pawnH');
    expect(pawnHBlack.color).toBe(Color.BLACK);
    expect(pawnHBlack.x).toBe(7);
    expect(pawnHBlack.y).toBe(1);

    let rookQBlack = board.getByAddress(0, 0);
    expect(rookQBlack === null).toBe(false);
    expect(rookQBlack.id).toBe('rookQ');
    expect(rookQBlack.color).toBe(Color.BLACK);
    expect(rookQBlack.x).toBe(0);
    expect(rookQBlack.y).toBe(0);

    let bishopKBlack = board.getByAddress(5, 0);
    expect(bishopKBlack=== null).toBe(false);
    expect(bishopKBlack.id).toBe('bishopK');
    expect(bishopKBlack.color).toBe(Color.BLACK);
    expect(bishopKBlack.x).toBe(5);
    expect(bishopKBlack.y).toBe(0);
});


test('board moves pieces, and move history behaves correctly', () => {
    let board = new Board();
    let pawnCBlack = board.getById('pawnC', Color.BLACK);

    // before move
    expect(board.getByAddress(2, 1)).toBe(pawnCBlack);
    expect(board.getByAddress(2, 3)).toBe(null);
    expect(pawnCBlack.x).toBe(2);
    expect(pawnCBlack.y).toBe(1);
    expect(board.moveHistory.length).toBe(0);

    // do move
    board.move(pawnCBlack, 2, 3);

    // after move
    expect(board.getByAddress(2, 1)).toBe(null);
    expect(board.getByAddress(2, 3)).toBe(pawnCBlack);
    expect(pawnCBlack.x).toBe(2);
    expect(pawnCBlack.y).toBe(3);
    expect(board.moveHistory.length).toBe(1);
    expect(board.moveHistory[0].pieceMoved).toBe(pawnCBlack);
    expect(board.moveHistory[0].originX).toBe(2);
    expect(board.moveHistory[0].originY).toBe(1);
    expect(board.moveHistory[0].pieceTaken).toBe(null);

    // undo
    board.undo();

    // after undo
    expect(board.getByAddress(2, 1)).toBe(pawnCBlack);
    expect(board.getByAddress(2, 3)).toBe(null);
    expect(pawnCBlack.x).toBe(2);
    expect(pawnCBlack.y).toBe(1);
    expect(board.moveHistory.length).toBe(0);

  
});


test('checkForCheck works', () => {
    let board = new Board();
    let blackQueen = new Queen('queen', Color.BLACK, 4, 0); 
    let whiteKing = new King('king', Color.WHITE, 4, 7);

    expect(board.checkForCheck(Color.WHITE)).toBe(false);
    expect(board.checkForCheck(Color.BLACK)).toBe(false);

    board.board = Array(8).fill().map(() => Array(8).fill(null));
    board.set(4, 0, blackQueen);
    board.set(4, 7, whiteKing);

    expect(board.getByAddress(4, 0)).toBe(blackQueen);
    expect(board.getByAddress(4, 7)).toBe(whiteKing);
    expect(board.getById('queen', Color.BLACK)).toBe(blackQueen);
    expect(board.getById('king', Color.WHITE)).toBe(whiteKing);

    expect(board.checkForCheck(Color.WHITE)).toBe(true);
});


test('checkForMate works', () => {
    let board = new Board();

    expect(board.checkForMate(Color.WHITE)).toBe(false);
    expect(board.checkForMate(Color.BLACK)).toBe(false);

    board.board = Array(8).fill().map(() => Array(8).fill(null));
    board.set(5, 0, new Rook('rookQ', Color.WHITE, 5, 0));
    board.set(6, 2, new King('king', Color.WHITE, 6, 2));
    board.set(7, 0, new King('king', Color.BLACK, 7, 0));

    expect(board.checkForMate(Color.WHITE)).toBe(false);
    expect(board.checkForMate(Color.BLACK)).toBe(true);
});


test('checkForStalemate works', () => {
    let board = new Board();

    expect(board.checkForStalemate(Color.WHITE)).toBe(false);
    expect(board.checkForStalemate(Color.BLACK)).toBe(false);

    board.board = Array(8).fill().map(() => Array(8).fill(null));
    board.set(7, 0, new King('king', Color.BLACK, 7, 0));
    board.set(5, 1, new King('king', Color.WHITE, 5, 1));
    board.set(5, 3, new Queen('queen', Color.WHITE, 5, 3));

    expect(board.checkForStalemate(Color.WHITE)).toBe(false);
    expect(board.checkForStalemate(Color.BLACK)).toBe(true);
});


test('pathClear works', () => {
    let board = new Board();

    expect(board.pathClear(5, 5, 2, 2)).toBe(true);
    expect(board.pathClear(5, 5, 1, 1)).toBe(true);
    expect(board.pathClear(6, 6, 2, 2)).toBe(true);
    expect(board.pathClear(6, 6, 1, 1)).toBe(true);
    expect(board.pathClear(6, 6, 0, 0)).toBe(false);
    expect(board.pathClear(7, 7, 1, 1)).toBe(false);
});

test('promote works', () => {
    let board = new Board();
    let pawn = new Pawn('pawnA', Color.WHITE, 0, 0);

    expect(board.promote(pawn, 'quan')).toBe(false);
    expect(board.promote(pawn, 'king')).toBe(false);

    expect(board.promote(pawn, 'queen')).toBe(true);
    expect(board.promote(pawn, 'rook')).toBe(true);
    expect(board.promote(pawn, 'bishop')).toBe(true);
    expect(board.promote(pawn, 'knight')).toBe(true);
});

// try to test castling basic features, 
// skip castling out of check, castling function is not called in chess.move if check = true, 
// so castling does not check if king is currently in check, and only checks if the spaces for castling are
test('castling works', () => {
    let board = new Board();
    board.board = Array(8).fill().map(() => Array(8).fill(null));

    let whiteKing = new King('king', Color.WHITE, 4, 7);
    board.set(4, 7, whiteKing);

    // if rook has been captured, castling not possible (done)
    let whiteRook = null;
    expect(board.castle('k', Color.WHITE)).toBe(false);

    /**------------------------------------------------------ */
    // first move needs to be true in order to castle (done)

    whiteRook = new Rook('rookK', Color.WHITE, 7, 7);
    board.set(7, 7, whiteRook);

    expect(whiteKing.firstMove).toBe(true);
    expect(whiteRook.firstMove).toBe(true);
    expect(board.castle('k', Color.WHITE)).toBe(true);

    // first move of rook and king is false after castle (done)
    expect(whiteKing.firstMove).toBe(false);
    expect(whiteRook.firstMove).toBe(false);

    /**------------------------------------------------------ */
    // cannot castle if pieces are in between (done)

    board.board = Array(8).fill().map(() => Array(8).fill(null));

    whiteKing = new King('king', Color.WHITE, 4, 7);
    board.set(4, 7, whiteKing);

    whiteRook = new Rook('rookK', Color.WHITE, 7, 7);
    board.set(7, 7, whiteRook);

    let whiteBishop = new Bishop('bishopK', Color.WHITE, 5, 7);
    board.set(5, 7, whiteBishop);

    expect(board.castle('k', Color.WHITE)).toBe(false);

    // move bishop 
    board.set(6, 6, whiteBishop);
    board.set(5, 7, null);

    expect(board.castle('k', Color.WHITE)).toBe(true);

    /**------------------------------------------------------ */
    // castling queen side

    let blackKing = new King('king', Color.BLACK, 4, 0);
    board.set(4, 0, blackKing);

    let blackRook = new Rook('rookQ', Color.BLACK, 0, 0);
    board.set(0, 0, blackRook);

    expect(board.castle('q', Color.BLACK)).toBe(true);

    /**------------------------------------------------------ */
    // cannot castle across the line of check

    board.board = Array(8).fill().map(() => Array(8).fill(null));

    blackKing = new King('king', Color.BLACK, 4, 0);
    board.set(4, 0, blackKing);

    blackRook = new Rook('rookQ', Color.BLACK, 0, 0);
    board.set(0, 0, blackRook);

    let whiteQueen = new Queen('queen', Color.WHITE, 3, 7);
    board.set(3, 7, whiteQueen);

    expect(board.castle('q', Color.BLACK)).toBe(false);

    // move queen
    board.set(0, 7, whiteQueen);
    board.set(3, 7, null);
    whiteQueen.x = 0;

    expect(board.castle('q', Color.BLACK)).toBe(true);
});

test('en passant move history', () => {
    let board = new Board();
    board.board = Array(8).fill().map(() => Array(8).fill(null));

    let kingWhite = new King('king', Color.WHITE, 4, 7);
    board.set(4, 7, kingWhite);
    let pawnDWhite = new Pawn('pawnD', Color.WHITE, 3, 4);
    pawnDWhite.enPassantable = true;
    board.set(3, 4, pawnDWhite);

    let kingBlack = new King('king', Color.BLACK, 4, 0);
    board.set(4, 0, kingBlack);
    let pawnEBlack = new Pawn('pawnE', Color.BLACK, 4, 4);
    board.set(4, 4, pawnEBlack);

    expect(board.moveHistory.length).toBe(0);
    board.move(pawnEBlack, 3, 5);
    expect(board.moveHistory.length).toBe(1);
    expect(board.moveHistory[0].pieceMoved).toBe(pawnEBlack);
    expect(board.moveHistory[0].pieceTaken).toBe(pawnDWhite);
    expect(board.moveHistory[0].originX).toBe(4);
    expect(board.moveHistory[0].originY).toBe(4);
    expect(board.moveHistory[0].destinationX).toBe(3);
    expect(board.moveHistory[0].destinationY).toBe(5);

    board.undo();
    expect(board.moveHistory.length).toBe(0);
    expect(board.getByAddress(3, 5)).toBe(null);
    expect(board.getByAddress(4, 4)).toBe(pawnEBlack);
    expect(board.getByAddress(3, 4)).toBe(pawnDWhite);
});

test('toString works', () => {
    let board = new Board();
    board.toString();
});

