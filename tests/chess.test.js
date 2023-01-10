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
    expect(chess.enPassantable).toBe(null);
    expect(chess.history.length).toBe(0);
});

test('record move', () => {
    let chess = new Chess();
    let moveStr = 'e4';
    chess.check = true;

    chess.recordMove(moveStr);
    expect(chess.history[0]).toBe('e4+');

    moveStr = 'a6'
    chess.checkmate = true;

    chess.recordMove(moveStr);
    expect(chess.history[1]).toBe('a6#');

    moveStr = 'Qxd5';
    chess.gameOver = true;

    // checkmate
    chess.recordMove(moveStr);
    expect(chess.history[2]).toBe('Qxd5#');
    expect(chess.history[3]).toBe('0-1');

    // draw
    chess = new Chess();
    chess.gameOver = true;
    chess.draw = true;

    chess.recordMove(moveStr);
    expect(chess.history[0]).toBe('Qxd5');
    expect(chess.history[1]).toBe('½–½');
    
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
    let chess = new Chess();

    chess.board.wipe();

    // initialize pieces so that their is insufficient material
    let blackKing = new King(Color.BLACK, 7, 0);
    let whiteKing = new King(Color.WHITE, 5, 1);
    let whiteBishop = new Bishop(Color.WHITE, 5, 3);
    let blackKnight = new Knight(Color.WHITE, 1, 1);

    chess.board.set(7, 0, blackKing);
    chess.board.set(5, 1, whiteKing);
    chess.board.set(5, 3, whiteBishop);
    chess.board.set(1, 1, blackKnight);
    chess.board.teamMap[Color.WHITE] = [whiteKing, whiteBishop];
    chess.board.teamMap[Color.BLACK] = [blackKing, blackKnight];
    chess.board.blackKing = blackKing;
    chess.board.whiteKing = whiteKing;


    expect(chess.board.insufficientMaterial()).toBe(true);

    // add another piece so that there is sufficient material
    let blackPawn = new Pawn(Color.BLACK, 0, 0);
    chess.board.set(0, 0, blackPawn);
    chess.board.teamMap[Color.BLACK] = [blackKing, blackKnight, blackPawn];

    expect(chess.board.insufficientMaterial()).toBe(false);
})


test('threefold repetition', () => {
    let chess = new Chess();

    chess.move('e4');
    let hash = chess.board.stateHash();
    chess.states.set(hash, chess.states.get(hash) + 1);
 
    chess.board = new Board();
    chess.turn++;

    expect(chess.move('e4')).toBe(Status.DRAW);
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
