'use strict';

const Chess = require('../lib/chess');
const Board = require('../lib/board');
const Color = require('../lib/color');
const Status = require('../lib/status');
const King = require('../lib/pieces/king');
const Queen = require('../lib/pieces/queen');
const Rook = require('../lib/pieces/rook');
const Bishop = require('../lib/pieces/bishop');
const Knight = require('../lib/pieces/knight');
const Pawn = require('../lib/pieces/pawn');
const { CHECK } = require('../lib/status');

test('chess constructor', () => {
    let chess = new Chess();

    expect(chess.turn).toBe(1);
    expect(chess.board instanceof Board).toBe(true);
    expect(chess.gameOver).toBe(false);
    expect(chess.draw).toBe(false);
    expect(chess.checkmate).toBe(false);
    expect(chess.check).toBe(false);

    // test resume from fen str
    expect(chess.move("e4")).toBe(Status.MOVEOK);
    expect(chess.move("c5")).toBe(Status.MOVEOK);
    expect(chess.toFEN()).toBe("rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2");
    let fenChess = new Chess(chess.toFEN(), chess.states);

    expect(fenChess.turn).toBe(3);
    expect(fenChess.fiftyMoveCounter).toBe(0);
    expect(fenChess.states).toBe(chess.states);
    expect(fenChess.board instanceof Board).toBe(true);
    expect(JSON.stringify(fenChess.board.enPassantable)).toBe(JSON.stringify(chess.board.enPassantable));
    expect(fenChess.gameOver).toBe(false);
    expect(fenChess.draw).toBe(false);
    expect(fenChess.checkmate).toBe(false);
    expect(fenChess.check).toBe(false);
    expect(fenChess.toString()).toBe(chess.toString());

    // late game test, additional test to make sure castling appears as - if no castling sides are available
    let lateGame = new Chess('r1bq1bnr/1p1p1k1p/p3p1p1/5p2/2BQP3/1PN5/P1P2PPP/R1B1R1K1 b - - 2 10');

    expect(lateGame.toFEN()).toBe('r1bq1bnr/1p1p1k1p/p3p1p1/5p2/2BQP3/1PN5/P1P2PPP/R1B1R1K1 b - - 2 10');
});

test('undo move', () => {
    let chess = new Chess();

    chess.move('f3');
    chess.move('e5');
    chess.move('g4');

    let hash = chess.board.stateHash();
    let map = chess.states;
    let check = chess.check;
    let fen1 = chess.toFEN();

    chess.move('d5');
    expect(fen1 === chess.toFEN()).toBe(false);
    chess.undo();
    expect(fen1).toBe(chess.toFEN());

    expect(chess.turn).toBe(4);
    expect(chess.gameOver).toBe(false);
    expect(chess.draw).toBe(false);
    expect(chess.check).toBe(check);
    expect(chess.prevMove).toBe('g4');
    expect(chess.fiftyMoveCounter).toBe(0);
    expect(chess.states).toBe(map);
    expect(chess.board.stateHash()).toBe(hash);
    expect(chess.prevState).toBe(null);

    // instead of redoing d5, do Qh4 checkmate 
    let gameOver = chess.gameOver;

    expect(chess.move('Qh4')).toBe(Status.CHECKMATE);

    chess.undo();

    expect(chess.turn).toBe(4);
    expect(chess.gameOver).toBe(false);
    expect(chess.draw).toBe(false);
    expect(chess.check).toBe(false);
    expect(chess.prevMove).toBe('g4');
    expect(chess.fiftyMoveCounter).toBe(0);
    expect(chess.states).toBe(map);
    expect(chess.board.stateHash()).toBe(hash);
    expect(chess.prevState).toBe(null);
    
});

test('record move', () => {
    let chess = new Chess();
    let moveStr = 'e4';
    chess.check = true;

    chess.recordMove(moveStr);
    expect(chess.prevMove).toBe('e4+');

    moveStr = 'a6'
    chess.checkmate = true;

    chess.recordMove(moveStr);
    expect(chess.prevMove).toBe('a6#');

    moveStr = 'Qxd5';
    chess.gameOver = true;

    // checkmate
    chess.recordMove(moveStr);
    expect(chess.prevMove).toBe('Qxd5#');

    // draw
    chess = new Chess();
    chess.gameOver = true;
    chess.draw = true;

    chess.recordMove(moveStr);
    expect(chess.prevMove).toBe('Qxd5');
});

test('game over', () => {
    let chess = new Chess();
    let moveStr = 'a4';
    chess.gameOver = true;

    expect(chess.move(moveStr)).toBe(Status.GAMEOVER);
});

test('invalid move (incorrect syntax/ impossible move)', () => {
    let chess = new Chess();
    let moveStr = 'a10';

    expect(chess.move(moveStr)).toBe(Status.INVALIDMOVE);
});

test('illegal move (puts in check/ still in check)', () => {
    let chess = new Chess();
    let moveStr = 'Ka8';
    chess.board.wipe();

    let whiteKing = new King(Color.WHITE, 1, 0);
    let blackKing = new King(Color.BLACK, 7, 7);
    let blackQueen = new Queen(Color.BLACK, 3, 0);

    chess.board.teamMap[Color.WHITE] = [whiteKing];
    chess.board.teamMap[Color.BLACK] = [blackKing, blackQueen];
    chess.board.whiteKing = whiteKing;
    chess.board.blackKing = blackKing;

    chess.board.set(1, 0, whiteKing);
    chess.board.set(7, 7, blackKing);
    chess.board.set(3, 0, blackQueen);

    expect(chess.move(moveStr)).toBe(Status.PUTSINCHECK);

     // STILLINCHECK
     chess.check = true;
     expect(chess.move(moveStr)).toBe(Status.STILLINCHECK);
});

test('check', () => {
    let chess = new Chess();
    let moveStr = 'Qh7';

    chess.board.wipe();
    chess.draw = false;
    chess.gameOver = false;

    let whiteKing = new King(Color.WHITE, 0, 1);
    let blackKing = new King(Color.BLACK, 2, 2);
    let blackQueen = new Queen(Color.BLACK, 7, 5);

    chess.board.teamMap[Color.WHITE] = [whiteKing];
    chess.board.teamMap[Color.BLACK] = [blackKing, blackQueen];
    chess.board.whiteKing = whiteKing;
    chess.board.blackKing = blackKing;

    chess.board.set(7, 5, blackQueen);
    chess.board.set(2, 2, blackKing);
    chess.board.set(0, 1, whiteKing);
    chess.turn = 2;


    expect(chess.move(moveStr)).toBe(Status.CHECK);
});

test('checkmate', () => {
    let chess = new Chess();
    let moveStr = 'Qb7';

    chess.board.wipe();
    chess.check = false;

    let whiteKing = new King(Color.WHITE, 0, 1);
    let blackKing = new King(Color.BLACK, 2, 2);
    let blackQueen = new Queen(Color.BLACK, 1, 3);

    chess.board.teamMap[Color.WHITE] = [whiteKing];
    chess.board.teamMap[Color.BLACK] = [blackKing, blackQueen];
    chess.board.whiteKing = whiteKing;
    chess.board.blackKing = blackKing;

    chess.board.set(1, 3, blackQueen);
    chess.board.set(2, 2, blackKing);
    chess.board.set(0, 1, whiteKing);
    chess.turn = 2;

    expect(chess.move(moveStr)).toBe(Status.CHECKMATE);
});

test('stalemate', () => {
    let chess = new Chess();
    let moveStr = 'Qc8';

    chess.board.wipe();
    chess.gameOver = false;
    chess.checkmate = false;
    chess.check = false;

    let whiteKing = new King(Color.WHITE, 0, 1);
    let blackKing = new King(Color.BLACK, 2, 2);
    let blackQueen = new Queen(Color.BLACK, 7, 5);

    chess.board.teamMap[Color.WHITE] = [whiteKing];
    chess.board.teamMap[Color.BLACK] = [blackKing, blackQueen];
    chess.board.whiteKing = whiteKing;
    chess.board.blackKing = blackKing;

    chess.board.set(7, 5, blackQueen);
    chess.board.set(2, 2, blackKing);
    chess.board.set(0, 1, whiteKing);
    chess.turn = 2;

    expect(chess.move(moveStr)).toBe(Status.STALEMATE);
});

test('50 move rule', () => {
    let chess = new Chess();
    chess.fiftyMoveCounter = 99;

    expect(chess.move('Nf3')).toBe(Status.DRAW);

    chess = new Chess();
    chess.fiftyMoveCounter = 99;

    expect(chess.move('e4')).toBe(Status.MOVEOK);
});

test('insufficient material', () => {
    let chess2 = new Chess('8/8/8/8/1k6/1N6/8/7K w - - 0 1');
    expect(chess2.board.insufficientMaterial()).toBe(true);
})


// test('threefold repetition', () => {
//     let chess = new Chess();

//     chess.move('e4');
//     let hash = chess.board.stateHash();
//     chess.states.set(hash, chess.states.get(hash) + 1);
 
//     chess.board = new Board();
//     chess.turn++;

//     expect(chess.move('e4')).toBe(Status.DRAW);
// });

test('toFEN', () => {
    let chess = new Chess();

    let move1 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    let move2 = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2';
    let finalFen = 'r1bq1bnr/1p1p1k1p/p3p1p1/5p2/2BQP3/1PN5/P1P2PPP/R1B1R1K1 b - - 2 10';

    chess.move('e4');
    expect(chess.toFEN() === move1).toBe(true);

    chess.move('c5');
    expect(chess.toFEN() === move2).toBe(true);

    // check late game position
    chess = new Chess();

    let moveArr = [
        'e4', 'c5', 
        'd4', 'cxd4',
        'Nf3', 'Nc6',
        'Bc4', 'g6', 
        'Nc3', 'a6',
        'Nxd4', 'Nxd4',
        'Qxd4', 'f5',
        'O-O', 'e6',
        'b3', 'Kf7',
        'Re1'
    ];
    for (let i = 0; i < moveArr.length; i++) {
        chess.move(moveArr[i]);
    }

    expect(chess.toFEN()).toBe(finalFen);
});


test('toString', () => {
    let chess = new Chess();
    chess.toString();

    let chessStr =  
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
    "-----------------\n\n" +
    "white's turn"; 

    expect(chess.toString()).toBe(chessStr);
});
