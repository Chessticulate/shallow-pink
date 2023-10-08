const Board = require('../lib/board');
const { WHITE, BLACK } = require('../lib/color');
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
    expect(board.history.length).toBe(0);

    expect(board.blackKing instanceof King).toBe(true);
    expect(board.blackKing.color).toBe(Color.BLACK);

    expect(board.whiteKing instanceof King).toBe(true);
    expect(board.whiteKing.color).toBe(Color.WHITE);

    // new board from fen string
    board = new Board('8/2pK4/4P3/1pb3Pq/4N1k1/B7/8/8 w - - 0 1');

    expect(board.toFEN()).toEqual('8/2pK4/4P3/1pb3Pq/4N1k1/B7/8/8');
    expect(board.castleState).toBe('-');
    expect(board.enPassant).toBe(undefined);
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


test('draw detection', () => {
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

test('insufficient material', () => {
    let board = new Board();

    board.wipe();

    // initialize pieces so that their is insufficient material
    let blackKing = new King(Color.BLACK, 7, 0);
    let whiteKing = new King(Color.WHITE, 5, 1);
    let whiteBishop = new Bishop(Color.WHITE, 5, 3);
    let blackKnight = new Knight(Color.WHITE, 1, 1);

    board.set(7, 0, blackKing);
    board.set(5, 1, whiteKing);
    board.set(5, 3, whiteBishop);
    board.set(1, 1, blackKnight);
    board.teamMap[Color.WHITE] = [whiteKing, whiteBishop];
    board.teamMap[Color.BLACK] = [blackKing, blackKnight];
    board.blackKing = blackKing;
    board.whiteKing = whiteKing;


    expect(board.insufficientMaterial()).toBe(true);

    // add another piece so that there is sufficient material
    let blackPawn = new Pawn(Color.BLACK, 0, 0);
    board.set(0, 0, blackPawn);
    board.teamMap[Color.BLACK] = [blackKing, blackKnight, blackPawn];

    expect(board.insufficientMaterial()).toBe(false);

    // test insufficient material from new fen 

    let board2 = new Board('8/8/8/8/1k6/1N6/8/7K w - - 0 1');

    expect(board2.insufficientMaterial()).toBe(true);

})

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

    // check history
    expect(board.history[0][0].piece).toBe(blackRook);
    expect(board.history[0][0].destX).toBe(0);
    expect(board.history[0][0].destY).toBe(0);
    expect(board.history[0][0].firstMove).toBe(true);
    expect(board.history[0][1].piece).toBe(blackKing);
    expect(board.history[0][1].destX).toBe(4);
    expect(board.history[0][1].destY).toBe(0);
    expect(board.history[0][1].firstMove).toBe(true);

    // undo the move
    board.undo();
    expect(board.history.length).toBe(0);
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

    // check history
    expect(board.history[0][0].piece).toBe(whiteRook);
    expect(board.history[0][0].destX).toBe(7);
    expect(board.history[0][0].destY).toBe(7);
    expect(board.history[0][0].firstMove).toBe(true);
    expect(board.history[0][1].piece).toBe(whiteKing);
    expect(board.history[0][1].destX).toBe(4);
    expect(board.history[0][1].destY).toBe(7);
    expect(board.history[0][1].firstMove).toBe(true);

    // undo the move
    board.undo();
    expect(board.history.length).toBe(0);
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
    expect(board.history.length).toBe(1);
    expect(board.history[0][0].piece).toBe(blackPawnA);
    expect(board.history[0][0].destX).toBe(0);
    expect(board.history[0][0].destY).toBe(1);
    expect(board.history[0][0].firstMove).toBe(true);

    // undo move
    board.undo();
    expect(board.history.length).toBe(0);
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

    // examine history
    expect(board.history.length).toBe(1);
    expect(board.history[0][0].piece).toBe(whiteKnightQ);
    expect(board.history[0][0].destX).toBe(1);
    expect(board.history[0][0].destY).toBe(7);
    expect(board.history[0][0].firstMove).toBe(true);

    // undo move
    board.undo();
    expect(board.history.length).toBe(0);
    expect(board.get(1, 7)).toBe(whiteKnightQ);
    expect(board.get(0, 5)).toBe(null);
    expect(whiteKnightQ.x).toBe(1);
    expect(whiteKnightQ.y).toBe(7);
    expect(whiteKnightQ.firstMove).toBe(true);
});


test('basic capturing', () => {
    let moveList, board = new Board();

    // assume non-capture moves are working fine
    let whitePawnD = board.get(3, 6);
    let blackPawnE = board.get(4, 1);
    board.move(board.buildMove("d4", Color.WHITE));
    board.move(board.buildMove("e5", Color.BLACK));

    // build white pawn d capture black pawn e
    moveList = board.buildMove("dxe5", Color.WHITE);
    expect(moveList === null).toBe(false);
    expect(moveList.length).toBe(2);
    expect(moveList[0].piece).toBe(blackPawnE);
    expect(moveList[0].destX).toBe(-1);
    expect(moveList[0].destY).toBe(-1);
    expect(moveList[1].piece).toBe(whitePawnD);
    expect(moveList[1].destX).toBe(4);
    expect(moveList[1].destY).toBe(3);

    // do capture
    board.move(moveList);
    expect(board.get(3, 4)).toBe(null);
    expect(board.get(4, 3)).toBe(whitePawnD);
    expect(board.teamMap[Color.BLACK].find(piece => piece === blackPawnE)).toBe(undefined);

    // examine history
    expect(board.history.length).toBe(3);
    expect(board.history[2][0].piece).toBe(whitePawnD);
    expect(board.history[2][0].destX).toBe(3);
    expect(board.history[2][0].destY).toBe(4);
    expect(board.history[2][1].piece).toBe(blackPawnE);
    expect(board.history[2][1].destX).toBe(4);
    expect(board.history[2][1].destY).toBe(3);
    expect(blackPawnE.x).toBe(-1);
    expect(blackPawnE.y).toBe(-1);

    // undo move
    board.undo();
    expect(board.get(3, 4)).toBe(whitePawnD);
    expect(board.get(4, 3)).toBe(blackPawnE);
    expect(board.teamMap[Color.BLACK].find(piece => piece === blackPawnE)).toBe(blackPawnE);

    // redo move and continue
    board.move(board.buildMove("dxe5", Color.WHITE));

    // build bishop capturing queen
    let whiteBishopQ = board.get(2, 7);
    let blackQueen = board.get(3, 0);
    board.move(board.buildMove("Qg5", Color.BLACK));
    moveList = board.buildMove("Bxg5", Color.WHITE);
    expect(moveList === null).toBe(false);
    expect(moveList[0].piece).toBe(blackQueen);
    expect(moveList[0].destX).toBe(-1);
    expect(moveList[0].destY).toBe(-1);
    expect(moveList[1].piece).toBe(whiteBishopQ);
    expect(moveList[1].destX).toBe(6);
    expect(moveList[1].destY).toBe(3);

    // do capture
    board.move(moveList);
    expect(board.get(2, 7)).toBe(null);
    expect(board.get(6, 3)).toBe(whiteBishopQ);
    expect(board.teamMap[Color.BLACK].find(piece => piece === blackQueen)).toBe(undefined);

    // examine history
    expect(board.history.length).toBe(5);
    expect(board.history[4].length).toBe(2);
    expect(board.history[4][0].piece).toBe(whiteBishopQ);
    expect(board.history[4][0].destX).toBe(2);
    expect(board.history[4][0].destY).toBe(7);
    expect(board.history[4][1].piece).toBe(blackQueen);
    expect(board.history[4][1].destX).toBe(6);
    expect(board.history[4][1].destY).toBe(3);

    // undo
    board.undo();
    expect(board.get(2, 7)).toBe(whiteBishopQ);
    expect(board.get(6, 3)).toBe(blackQueen);
    expect(board.teamMap[Color.BLACK].find(piece => piece === blackQueen)).toBe(blackQueen);
});


test("en passant", () => {
    let board = new Board();
    let pawnWhiteD = board.get(3, 6);
    let pawnBlackE = board.get(4, 1);

    board.move(board.buildMove("d4", Color.WHITE));
    expect(pawnBlackE.enPassantable).toBe(false);
    expect(pawnWhiteD.enPassantable).toBe(true);

    board.move(board.buildMove("e6", Color.BLACK));
    expect(pawnBlackE.enPassantable).toBe(false);
    expect(pawnWhiteD.enPassantable).toBe(false);

    board.undo();
    expect(pawnBlackE.enPassantable).toBe(false);
    expect(pawnWhiteD.enPassantable).toBe(true);

    board.move(board.buildMove("e5", Color.BLACK));
    expect(pawnBlackE.enPassantable).toBe(true);
    expect(pawnWhiteD.enPassantable).toBe(false);

    board.undo();
    expect(pawnBlackE.enPassantable).toBe(false);
    expect(pawnWhiteD.enPassantable).toBe(true);

    board.move(board.buildMove("a6", Color.BLACK));
    board.move(board.buildMove("d5", Color.WHITE));
    board.move(board.buildMove("e5", Color.BLACK));

    let moveList = board.buildMove("dxe6", Color.WHITE);
    expect(moveList === null).toBe(false);
    expect(moveList.length).toBe(2);
    expect(moveList[0].piece).toBe(pawnBlackE);
    expect(moveList[0].destX).toBe(-1);
    expect(moveList[0].destY).toBe(-1);
    expect(moveList[1].piece).toBe(pawnWhiteD);
    expect(moveList[1].destX).toBe(4);
    expect(moveList[1].destY).toBe(2);

    board.move(moveList);
    expect(board.get(3, 3)).toBe(null);
    expect(board.get(4, 3)).toBe(null);
    expect(board.get(4, 2)).toBe(pawnWhiteD);
    expect(pawnWhiteD.x).toBe(4);
    expect(pawnWhiteD.y).toBe(2);
    expect(board.teamMap[Color.BLACK].find(piece => piece === pawnBlackE)).toBe(undefined);

    board.undo();
    expect(board.get(4, 2)).toBe(null);
    expect(board.get(3, 3)).toBe(pawnWhiteD);
    expect(pawnWhiteD.x).toBe(3);
    expect(pawnWhiteD.y).toBe(3);
    expect(board.get(4, 3)).toBe(pawnBlackE);
    expect(pawnBlackE.x).toBe(4);
    expect(pawnBlackE.y).toBe(3);
    expect(board.teamMap[Color.BLACK].find(piece => piece === pawnBlackE)).toBe(pawnBlackE);
});


test("standard promotion", () => {
    let board = new Board();
    let whiteKing = new King(Color.WHITE, 0, 7);
    let whitePawn = new Pawn(Color.WHITE, 3, 1);
    let blackKing = new King(Color.BLACK, 7, 7);

    board.wipe();

    board.whiteKing = whiteKing;
    board.blackKing = blackKing;

    board.teamMap[Color.WHITE] = [
        board.set(0, 7, whiteKing),
        board.set(3, 1, whitePawn)
    ];
    board.teamMap[Color.BLACK] = [
        board.set(7, 7, blackKing)
    ];

    expect(board.buildMove("d8", Color.WHITE)).toBe(null);

    let moveList = board.buildMove("d8=R", Color.WHITE);
    expect(moveList === null).toBe(false);
    expect(moveList[0].piece).toBe(whitePawn);
    expect(moveList[0].destX).toBe(-1);
    expect(moveList[0].destY).toBe(-1);
    expect(moveList[1].piece instanceof Rook).toBe(true);
    expect(moveList[1].destX).toBe(3);
    expect(moveList[1].destY).toBe(0);

    board.move(moveList);
    let whiteRook = board.get(3,0);
    expect(whiteRook instanceof Rook).toBe(true);
    expect(board.teamMap[Color.WHITE].find(piece => piece === whitePawn)).toBe(undefined);
    expect(board.teamMap[Color.WHITE].find(piece => piece === whiteRook)).toBe(whiteRook);

    board.undo();
    expect(board.get(3, 1)).toBe(whitePawn);
    expect(board.get(3, 0)).toBe(null);
    expect(board.teamMap[Color.WHITE].find(piece => piece === whitePawn)).toBe(whitePawn);
    expect(board.teamMap[Color.WHITE].find(piece => piece === whiteRook)).toBe(undefined);
});


test("capture promotion", () => {
    let board = new Board();
    let whiteKing = new King(Color.WHITE, 0, 7);
    let whitePawn = new Pawn(Color.WHITE, 3, 1);
    let blackKing = new King(Color.BLACK, 7, 7);
    let blackPawn = new Pawn(Color.BLACK, 4, 0);


    board.wipe();

    board.whiteKing = whiteKing;
    board.blackKing = blackKing;

    board.teamMap[Color.WHITE] = [
        board.set(0, 7, whiteKing),
        board.set(3, 1, whitePawn)
    ];
    board.teamMap[Color.BLACK] = [
        board.set(7, 7, blackKing),
        board.set(4, 0, blackPawn)
    ];

    expect(board.buildMove("dxe8", Color.WHITE)).toBe(null);

    let moveList = board.buildMove("dxe8=Q", Color.WHITE);
    expect(moveList === null).toBe(false);
    expect(moveList[0].piece).toBe(blackPawn);
    expect(moveList[0].destX).toBe(-1);
    expect(moveList[0].destY).toBe(-1);
    expect(moveList[1].piece).toBe(whitePawn);
    expect(moveList[1].destX).toBe(-1);
    expect(moveList[1].destY).toBe(-1);
    expect(moveList[2].destX).toBe(4);
    expect(moveList[2].destY).toBe(0);
    expect(moveList[2].piece instanceof Queen).toBe(true);

    board.move(moveList);
    let whiteQueen = board.get(4,0);
    expect(whiteQueen instanceof Queen).toBe(true);
    expect(board.teamMap[Color.WHITE].find(piece => piece === whitePawn)).toBe(undefined);
    expect(board.teamMap[Color.BLACK].find(piece => piece === blackPawn)).toBe(undefined);
    expect(board.teamMap[Color.WHITE].find(piece => piece === whiteQueen)).toBe(whiteQueen);

    board.undo();
    expect(board.get(3, 1)).toBe(whitePawn);
    expect(board.get(4, 0)).toBe(blackPawn);
    expect(board.teamMap[Color.WHITE].find(piece => piece === whitePawn)).toBe(whitePawn);
    expect(board.teamMap[Color.WHITE].find(piece => piece === whiteQueen)).toBe(undefined);
    expect(board.teamMap[Color.BLACK].find(piece => piece === blackPawn)).toBe(blackPawn);
});


test("check promotion", () => {
    let board = new Board();
    let whiteKing = new King(Color.WHITE, 0, 7);
    let whitePawn = new Pawn(Color.WHITE, 3, 1);
    let blackKing = new King(Color.BLACK, 1, 1);

    board.wipe();

    board.whiteKing = whiteKing;
    board.blackKing = blackKing;

    board.teamMap[Color.WHITE] = [
        board.set(0, 7, whiteKing),
        board.set(3, 1, whitePawn)
    ];
    board.teamMap[Color.BLACK] = [
        board.set(1, 1, blackKing)
    ];

    expect(board.buildMove("d8", Color.WHITE)).toBe(null);

    let moveList = board.buildMove("d8=N", Color.WHITE);
    expect(moveList === null).toBe(false);
    expect(moveList[0].piece).toBe(whitePawn);
    expect(moveList[0].destX).toBe(-1);
    expect(moveList[0].destY).toBe(-1);
    expect(moveList[1].piece instanceof Knight).toBe(true);
    expect(moveList[1].destX).toBe(3);
    expect(moveList[1].destY).toBe(0);

    board.move(moveList);
    let whiteKnight = board.get(3,0);
    expect(whiteKnight instanceof Knight).toBe(true);
    expect(board.teamMap[Color.WHITE].find(piece => piece === whitePawn)).toBe(undefined);
    expect(board.teamMap[Color.WHITE].find(piece => piece === whiteKnight)).toBe(whiteKnight);
    expect(board.checkForCheck(Color.BLACK)).toBe(true);

    board.undo();
    expect(board.get(3, 1)).toBe(whitePawn);
    expect(board.get(3, 0)).toBe(null);
    expect(board.teamMap[Color.WHITE].find(piece => piece === whitePawn)).toBe(whitePawn);
    expect(board.teamMap[Color.WHITE].find(piece => piece === whiteKnight)).toBe(undefined);

    expect(board.checkForCheck(Color.BLACK)).toBe(false);
});

test('toFEN', () => {
    let board = new Board();
    
    let fenStr = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

    expect(board.toFEN() === fenStr).toBe(true);
});

test('toString works', () => {
    let board = new Board();

    let boardStr = 
        "-----------------\n" +
        "|♖|♘|♗|♕|♔|♗|♘|♖|\n" +
        "-----------------\n" +
        "|♙|♙|♙|♙|♙|♙|♙|♙|\n" +
        "-----------------\n" +
        "| | | | | | | | |\n" +
        "-----------------\n" +
        "| | | | | | | | |\n" +
        "-----------------\n" +
        "| | | | | | | | |\n" +
        "-----------------\n" +
        "| | | | | | | | |\n" +
        "-----------------\n" +
        "|♟|♟|♟|♟|♟|♟|♟|♟|\n" +
        "-----------------\n" +
        "|♜|♞|♝|♛|♚|♝|♞|♜|\n" +
        "-----------------\n";

    expect(board.toString() === boardStr).toBe(true);
});

test('flipPerspective', () => {
    let board = new Board();

    let flippedBoard = 
    "-----------------\n" +
    "|♜|♞|♝|♚|♛|♝|♞|♜|\n" +
    "-----------------\n" +
    "|♟|♟|♟|♟|♟|♟|♟|♟|\n" +
    "-----------------\n" +
    "| | | | | | | | |\n" +
    "-----------------\n" +
    "| | | | | | | | |\n" +
    "-----------------\n" +
    "| | | | | | | | |\n" +
    "-----------------\n" +
    "| | | | | | | | |\n" +
    "-----------------\n" +
    "|♙|♙|♙|♙|♙|♙|♙|♙|\n" +
    "-----------------\n" +
    "|♖|♘|♗|♔|♕|♗|♘|♖|\n" +
    "-----------------\n";

    board.flipPerspective();

    expect(board.toString() === flippedBoard).toBe(true);
});

