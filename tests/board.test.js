const Board = require('../lib/board');
const Color = require('../lib/color');
const Move = require('../lib/move');
const Bishop = require('../lib/pieces/bishop');
const King = require('../lib/pieces/king');
const Knight = require('../lib/pieces/knight');
const Pawn = require('../lib/pieces/pawn');
const Queen = require('../lib/pieces/queen');
const Rook = require('../lib/pieces/rook');


test('board constructor', () => {
    let board = new Board();

    expect(board.board.length).toBe(8);
    expect(board.board[0].length).toBe(8);
    expect(board.prevMove).toBe(null);

    expect(board.blackKing instanceof King).toBe(true);
    expect(board.blackKing.color).toBe(Color.BLACK);

    expect(board.whiteKing instanceof King).toBe(true);
    expect(board.whiteKing.color).toBe(Color.WHITE);
});


test('correct piece placement on board', () => {
    let board = new Board();

    for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 8; x++) {
            expect(board.get(x, y).color).toBe(Color.BLACK);
            expect(board.get(x, 7 - y).color).toBe(Color.WHITE);
        }
    }

    for (let y = 2; y < 6; y++) {
        for (let x = 0; x < 8; x++) {
            expect(board.get(x, y)).toBe(null);
        }
    }

    let blackKing = board.get(4, 0);
    expect(blackKing instanceof King).toBe(true);
    expect(blackKing.color).toBe(Color.BLACK);

    let whiteKing = board.get(4, 7);
    expect(whiteKing instanceof King).toBe(true);
    expect(whiteKing.color).toBe(Color.WHITE);

    // White
    let pawnAWhite = board.get(0, 6);
    expect(pawnAWhite instanceof Pawn).toBe(true);
    expect(pawnAWhite.color).toBe(Color.WHITE);
    expect(pawnAWhite.x).toBe(0);
    expect(pawnAWhite.y).toBe(6);

    let pawnHWhite = board.get(7, 6);
    expect(pawnHWhite instanceof Pawn).toBe(true);
    expect(pawnHWhite.color).toBe(Color.WHITE);
    expect(pawnHWhite.x).toBe(7);
    expect(pawnHWhite.y).toBe(6);

    let rookQWhite = board.get(0, 7);
    expect(rookQWhite instanceof Rook).toBe(true);
    expect(rookQWhite.color).toBe(Color.WHITE);
    expect(rookQWhite.x).toBe(0);
    expect(rookQWhite.y).toBe(7);

    let bishopKWhite = board.get(5, 7);
    expect(bishopKWhite instanceof Bishop).toBe(true);
    expect(bishopKWhite.color).toBe(Color.WHITE);
    expect(bishopKWhite.x).toBe(5);
    expect(bishopKWhite.y).toBe(7);

    let knightQWhite = board.get(1, 7);
    expect(knightQWhite instanceof Knight).toBe(true);
    expect(knightQWhite.color).toBe(Color.WHITE);
    expect(knightQWhite.x).toBe(1);
    expect(knightQWhite.y).toBe(7);

    // Black
    let pawnABlack = board.get(0, 1);
    expect(pawnABlack instanceof Pawn).toBe(true);
    expect(pawnABlack.color).toBe(Color.BLACK);
    expect(pawnABlack.x).toBe(0);
    expect(pawnABlack.y).toBe(1);

    let pawnHBlack = board.get(7, 1);
    expect(pawnHBlack instanceof Pawn).toBe(true);
    expect(pawnHBlack.color).toBe(Color.BLACK);
    expect(pawnHBlack.x).toBe(7);
    expect(pawnHBlack.y).toBe(1);

    let rookQBlack = board.get(0, 0);
    expect(rookQBlack instanceof Rook).toBe(true);
    expect(rookQBlack.color).toBe(Color.BLACK);
    expect(rookQBlack.x).toBe(0);
    expect(rookQBlack.y).toBe(0);

    let bishopKBlack = board.get(5, 0);
    expect(bishopKBlack instanceof Bishop).toBe(true);
    expect(bishopKBlack.color).toBe(Color.BLACK);
    expect(bishopKBlack.x).toBe(5);
    expect(bishopKBlack.y).toBe(0);

    let knightQBlack = board.get(1, 0);
    expect(knightQBlack instanceof Knight).toBe(true);
    expect(knightQBlack.color).toBe(Color.BLACK);
    expect(knightQBlack.x).toBe(1);
    expect(knightQBlack.y).toBe(0);
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


test('check detection', () => {
    let board = new Board();
    let blackQueen = new Queen(Color.BLACK, 0, 1); 
    let whiteKing = new King(Color.WHITE, 0, 0);

    expect(board.checkForCheck(Color.WHITE)).toBe(false);
    expect(board.checkForCheck(Color.BLACK)).toBe(false);

    board.wipe();

    board.teamMap[Color.WHITE].push(whiteKing);
    board.teamMap[Color.BLACK].push(blackQueen);
    board.whiteKing = whiteKing;

    board.set(0, 1, blackQueen);
    board.set(0, 0, whiteKing);

    expect(board.get(0, 1)).toBe(blackQueen);
    expect(board.get(0, 0)).toBe(whiteKing);

    expect(board.checkForCheck(Color.WHITE)).toBe(true);
});


test('checkmate detection', () => {
    let board = new Board();

    expect(board.checkForCheck(Color.WHITE)).toBe(false);
    expect(board.checkForCheck(Color.BLACK)).toBe(false);

    let whiteRook = new Rook(Color.WHITE, 5, 0);
    let whiteKing = new King(Color.WHITE, 6, 2);
    let blackKing = new King(Color.BLACK, 7, 0);

    board.set(5, 0, new Rook(Color.WHITE, 5, 0));
    board.set(6, 2, new King(Color.WHITE, 6, 2));
    board.set(7, 0, new King(Color.BLACK, 7, 0));

    board.wipe();
    board.teamMap[Color.WHITE] = [whiteKing, whiteRook];
    board.teamMap[Color.BLACK] = [blackKing];
    board.whiteKing = whiteKing;
    board.blackKing = blackKing;

    expect(board.checkForCheck(Color.WHITE)).toBe(false);
    expect(board.checkForCheck(Color.BLACK)).toBe(true);
});


test('stalemate detection', () => {
    let board = new Board();

    expect(board.canMove(Color.WHITE)).toBe(true);
    expect(board.canMove(Color.BLACK)).toBe(true);

    let blackKing = new King(Color.BLACK, 7, 0);
    let whiteKing = new King(Color.WHITE, 5, 1);
    let whiteQueen = new Queen(Color.WHITE, 5, 3);

    board.wipe();
    board.set(7, 0, blackKing);
    board.set(5, 1, whiteKing);
    board.set(5, 3, whiteQueen);
    board.teamMap[Color.WHITE] = [whiteKing, whiteQueen];
    board.teamMap[Color.BLACK] = [blackKing];
    board.blackKing = blackKing;
    board.whiteKing = whiteKing;

    expect(board.canMove(Color.WHITE)).toBe(true);
    expect(board.canMove(Color.BLACK)).toBe(false);
});


test('castling', () => {
    let board = new Board();

    // castling shouldn't work at game start
    expect(board.buildMove('O-O-O', Color.BLACK)).toBe(null);
    expect(board.buildMove('O-O', Color.BLACK)).toBe(null);
    expect(board.buildMove('O-O-O', Color.WHITE)).toBe(null);
    expect(board.buildMove('O-O', Color.WHITE)).toBe(null);

    // wipe board
    board.wipe();

    let blackKing = new King(Color.BLACK, 4, 0);
    let blackRook = new Rook(Color.BLACK, 0, 0);
    let whiteKing = new King(Color.WHITE, 4, 7);
    let whiteRook = new Rook(Color.WHITE, 7, 7);

    // add black king + rooks
    board.blackKing = blackKing;
    board.teamMap[Color.BLACK] = [
        board.set(0, 0, blackRook),
        board.set(4, 0, blackKing)
    ];

    // add white king + rooks
    board.whiteKing = whiteKing;
    board.teamMap[Color.WHITE] = [
        board.set(7, 7, whiteRook),
        board.set(4, 7, whiteKing)
    ];

    // black queen side castle
    let moveList = board.buildMove("O-O-O", Color.BLACK);
    expect(moveList !== null).toBe(true);
    expect(moveList.length).toBe(2);
    expect(moveList[0].piece).toBe(blackKing);
    expect(moveList[0].destX).toBe(2);
    expect(moveList[0].destY).toBe(0);
    expect(moveList[0].firstMove).toBe(false);
    expect(moveList[1].piece).toBe(blackRook);
    expect(moveList[1].destX).toBe(3);
    expect(moveList[1].destY).toBe(0);
    expect(moveList[1].firstMove).toBe(false);

    // execute the move
    board.move(moveList);
    expect(blackKing.x).toBe(2);
    expect(blackKing.y).toBe(0);
    expect(blackKing.firstMove).toBe(false);
    expect(blackRook.x).toBe(3);
    expect(blackRook.y).toBe(0);
    expect(blackRook.firstMove).toBe(false);
    expect(board.get(0, 0)).toBe(null);
    expect(board.get(2, 0)).toBe(blackKing);
    expect(board.get(3, 0)).toBe(blackRook);
    expect(board.get(4, 0)).toBe(null);

    // check prevMove
    expect(board.prevMove[0].piece).toBe(blackRook);
    expect(board.prevMove[0].destX).toBe(0);
    expect(board.prevMove[0].destY).toBe(0);
    expect(board.prevMove[0].firstMove).toBe(true);
    expect(board.prevMove[1].piece).toBe(blackKing);
    expect(board.prevMove[1].destX).toBe(4);
    expect(board.prevMove[1].destY).toBe(0);
    expect(board.prevMove[1].firstMove).toBe(true);

    // undo the move
    board.undo();
    expect(board.prevMove).toBe(null);
    expect(board.get(0, 0)).toBe(blackRook);
    expect(blackRook.firstMove).toBe(true);
    expect(blackRook.x).toBe(0);
    expect(blackRook.y).toBe(0);
    expect(board.get(2, 0)).toBe(null);
    expect(board.get(3, 0)).toBe(null);
    expect(board.get(4, 0)).toBe(blackKing);
    expect(blackKing.firstMove).toBe(true);
    expect(blackKing.x).toBe(4);
    expect(blackKing.y).toBe(0);

    // white king side castle
    moveList = board.buildMove("O-O", Color.WHITE);
    expect(moveList !== null).toBe(true);
    expect(moveList.length).toBe(2);
    expect(moveList[0].piece).toBe(whiteKing);
    expect(moveList[0].destX).toBe(6);
    expect(moveList[0].destY).toBe(7);
    expect(moveList[0].firstMove).toBe(false);
    expect(moveList[1].piece).toBe(whiteRook);
    expect(moveList[1].destX).toBe(5);
    expect(moveList[1].destY).toBe(7);
    expect(moveList[1].firstMove).toBe(false);

    // execute the move
    board.move(moveList);
    expect(whiteKing.x).toBe(6);
    expect(whiteKing.y).toBe(7);
    expect(whiteKing.firstMove).toBe(false);
    expect(whiteRook.x).toBe(5);
    expect(whiteRook.y).toBe(7);
    expect(whiteRook.firstMove).toBe(false);
    expect(board.get(7, 7)).toBe(null);
    expect(board.get(6, 7)).toBe(whiteKing);
    expect(board.get(5, 7)).toBe(whiteRook);
    expect(board.get(4, 7)).toBe(null);

    // check prevMove
    expect(board.prevMove[0].piece).toBe(whiteRook);
    expect(board.prevMove[0].destX).toBe(7);
    expect(board.prevMove[0].destY).toBe(7);
    expect(board.prevMove[0].firstMove).toBe(true);
    expect(board.prevMove[1].piece).toBe(whiteKing);
    expect(board.prevMove[1].destX).toBe(4);
    expect(board.prevMove[1].destY).toBe(7);
    expect(board.prevMove[1].firstMove).toBe(true);

    // undo the move
    board.undo();
    expect(board.prevMove).toBe(null);
    expect(board.get(7, 7)).toBe(whiteRook);
    expect(whiteRook.firstMove).toBe(true);
    expect(whiteRook.x).toBe(7);
    expect(whiteRook.y).toBe(7);
    expect(board.get(6, 7)).toBe(null);
    expect(board.get(5, 7)).toBe(null);
    expect(board.get(4, 7)).toBe(whiteKing);
    expect(whiteKing.firstMove).toBe(true);
    expect(whiteKing.x).toBe(4);
    expect(whiteKing.y).toBe(7);
});


test('basic movement', () => {
    let board = new Board();

    // a few invalid moves
    expect(board.buildMove("b4", Color.BLACK)).toBe(null);
    expect(board.buildMove("f6", Color.WHITE)).toBe(null);
    expect(board.buildMove("Qd7", Color.BLACK)).toBe(null);
    expect(board.buildMove("Rh7", Color.WHITE)).toBe(null);

    // build black pawn move
    let blackPawnA = board.get(0, 1);
    let moveList = board.buildMove("a5", Color.BLACK);
    expect(moveList !== null).toBe(true);
    expect(moveList.length).toBe(1);
    expect(moveList[0].piece).toBe(blackPawnA);
    expect(moveList[0].destX).toBe(0);
    expect(moveList[0].destY).toBe(3);

    // do move
    board.move(moveList);
    expect(board.get(0, 1)).toBe(null);
    expect(board.get(0, 3)).toBe(blackPawnA);
    expect(blackPawnA.x).toBe(0);
    expect(blackPawnA.y).toBe(3);
    expect(blackPawnA.firstMove).toBe(false);

    // examine prev move
    expect(board.prevMove.length).toBe(1);
    expect(board.prevMove[0].piece).toBe(blackPawnA);
    expect(board.prevMove[0].destX).toBe(0);
    expect(board.prevMove[0].destY).toBe(1);
    expect(board.prevMove[0].firstMove).toBe(true);

    // undo move
    board.undo();
    expect(board.prevMove).toBe(null);
    expect(board.get(0, 3)).toBe(null);
    expect(board.get(0, 1)).toBe(blackPawnA);
    expect(blackPawnA.x).toBe(0);
    expect(blackPawnA.y).toBe(1);
    expect(blackPawnA.firstMove).toBe(true);

    // build white knight move
    let whiteKnightQ = board.get(1, 7);
    moveList = board.buildMove("Na3", Color.WHITE);
    expect(moveList !== null).toBe(true);
    expect(moveList.length).toBe(1);
    expect(moveList[0].piece).toBe(whiteKnightQ);
    expect(moveList[0].destX).toBe(0);
    expect(moveList[0].destY).toBe(5);

    // execute move
    board.move(moveList);
    expect(board.get(1, 7)).toBe(null);
    expect(board.get(0, 5)).toBe(whiteKnightQ);
    expect(whiteKnightQ.x).toBe(0);
    expect(whiteKnightQ.y).toBe(5);
    expect(whiteKnightQ.firstMove).toBe(false);

    // examine prevMove
    expect(board.prevMove.length).toBe(1);
    expect(board.prevMove[0].piece).toBe(whiteKnightQ);
    expect(board.prevMove[0].destX).toBe(1);
    expect(board.prevMove[0].destY).toBe(7);
    expect(board.prevMove[0].firstMove).toBe(true);

    // undo move
    board.undo();
    expect(board.prevMove).toBe(null);
    expect(board.get(1, 7)).toBe(whiteKnightQ);
    expect(board.get(0, 5)).toBe(null);
    expect(whiteKnightQ.x).toBe(1);
    expect(whiteKnightQ.y).toBe(7);
    expect(whiteKnightQ.firstMove).toBe(true);
});


test('capturing', () => {
    let board = new Board();
    board.wipe();

    // add black king + rooks
    let blackKnight = new Knight(Color.BLACK, 3, 2);
    let blackKing = new King(Color.BLACK, 0, 0);
    board.blackKing = blackKing;
    board.teamMap[Color.BLACK] = [
        board.set(0, 0, blackKing),
        board.set(3, 2, blackKnight)
    ];

    // add white king + rooks
    let whitePawn = new Pawn(Color.WHITE, 4, 4);
    let whiteKing = new King(Color.WHITE, 7, 7);
    board.whiteKing = whiteKing;
    board.teamMap[Color.WHITE] = [
        board.set(7, 7, whiteKing),
        board.set(4, 4, whitePawn)
    ];

    // can't move with 'x' in move string without capturing
    expect(board.buildMove("Nxf7", Color.BLACK)).toBe(null);

    // can't capture without 'x' in move str
    expect(board.buildMove("Ne4", Color.BLACK)).toBe(null);

    // knight capture pawn
    moveList = board.buildMove("Nxe4", Color.BLACK);
    expect(moveList === null).toBe(false);
    expect(moveList.length).toBe(2);
    expect(moveList[0].piece).toBe(whitePawn);
    expect(moveList[0].destX).toBe(-1);
    expect(moveList[0].destY).toBe(-1);
    expect(moveList[1].piece).toBe(blackKnight);
    expect(moveList[1].destX).toBe(4);
    expect(moveList[1].destY).toBe(4);

    // do the move
    board.move(moveList);
    expect(board.get(3, 2)).toBe(null);
    expect(board.get(4, 4)).toBe(blackKnight);
    expect(blackKnight.firstMove).toBe(false);
    expect(board.teamMap[Color.BLACK].find(piece => piece === whitePawn)).toBe(undefined);

    // examine prevMove
    expect(board.prevMove === null).toBe(false);
    expect(board.prevMove.length).toBe(2);
    expect(board.prevMove[0].piece).toBe(blackKnight);
    expect(board.prevMove[0].destX).toBe(3);
    expect(board.prevMove[0].destY).toBe(2);
    expect(board.prevMove[0].firstMove).toBe(true);
    expect(board.prevMove[1].piece).toBe(whitePawn);
    expect(board.prevMove[1].destX).toBe(4);
    expect(board.prevMove[1].destY).toBe(4);

    // undo move
    board.undo();
    expect(board.prevMove === null).toBe(true);
    expect(board.get(4, 4)).toBe(whitePawn);
    expect(whitePawn.x).toBe(4);
    expect(whitePawn.y).toBe(4);
    expect(whitePawn.firstMove).toBe(true);
    expect(board.get(3, 2)).toBe(blackKnight);
    expect(blackKnight.x).toBe(3);
    expect(blackKnight.y).toBe(2);
    expect(blackKnight.firstMove).toBe(true);
});


test('toString works', () => {
    let board = new Board();
    board.toString();
});

