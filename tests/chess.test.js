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

test('chess constructor', () => {
    let chess = new Chess();

    expect(chess.turn).toBe(1);
    expect(chess.board instanceof Board).toBe(true);
    expect(chess.gameOver).toBe(false);
    expect(chess.stalemate).toBe(false);
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

    // stalemate
    chess = new Chess();
    chess.gameOver = true;
    chess.stalemate = true;

    chess.recordMove(moveStr);
    expect(chess.history[0]).toBe('Qxd5');
    expect(chess.history[1]).toBe('½–½');
    
});

test('move', () => {
    let chess = new Chess();
    let moveStr = 'a4';

    // GAMEOVER
    chess.gameOver = true;
    expect(chess.move(moveStr)).toBe(Status.GAMEOVER);

    // INVALIDMOVE
    chess.gameOver = false;
    moveStr = 'a10';
    expect(chess.move(moveStr)).toBe(Status.INVALIDMOVE);

    // PUTSINCHECK
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

    moveStr = 'Ka8'

    expect(chess.move(moveStr)).toBe(Status.PUTSINCHECK);

    // STILLINCHECK
    chess.check = true;
    expect(chess.move(moveStr)).toBe(Status.STILLINCHECK);

    // INSUFFICIENT MATERIAL
    chess.board.wipe();

    // initialize pieces so that their is insufficient material
    blackKing = new King(Color.BLACK, 7, 0);
    whiteKing = new King(Color.WHITE, 5, 1);
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

    
    // CHECKMATE
    chess.board.wipe();
    chess.check = false;

    whiteKing = new King(Color.WHITE, 0, 1);
    blackKing = new King(Color.BLACK, 2, 2);
    blackQueen = new Queen(Color.BLACK, 1, 3);

    chess.board.teamMap[Color.WHITE] = [whiteKing];
    chess.board.teamMap[Color.BLACK] = [blackKing, blackQueen];
    chess.board.whiteKing = whiteKing;
    chess.board.blackKing = blackKing;

    chess.board.set(1, 3, blackQueen);
    chess.board.set(2, 2, blackKing);
    chess.board.set(0, 1, whiteKing);
    chess.turn = 2;

    moveStr = 'Qb7';

    expect(chess.move(moveStr)).toBe(Status.CHECKMATE);

    // STALEMATE 
    chess.board.wipe();
    chess.gameOver = false;
    chess.checkmate = false;
    chess.check = false;

    whiteKing = new King(Color.WHITE, 0, 1);
    blackKing = new King(Color.BLACK, 2, 2);
    blackQueen = new Queen(Color.BLACK, 7, 5);

    chess.board.teamMap[Color.WHITE] = [whiteKing];
    chess.board.teamMap[Color.BLACK] = [blackKing, blackQueen];
    chess.board.whiteKing = whiteKing;
    chess.board.blackKing = blackKing;

    chess.board.set(7, 5, blackQueen);
    chess.board.set(2, 2, blackKing);
    chess.board.set(0, 1, whiteKing);
    chess.turn = 2;

    moveStr = 'Qc8';

    expect(chess.move(moveStr)).toBe(Status.STALEMATE);

    // CHECK 
    chess.board.wipe();
    chess.stalemate = false;
    chess.gameOver = false;

    whiteKing = new King(Color.WHITE, 0, 1);
    blackKing = new King(Color.BLACK, 2, 2);
    blackQueen = new Queen(Color.BLACK, 7, 5);

    chess.board.teamMap[Color.WHITE] = [whiteKing];
    chess.board.teamMap[Color.BLACK] = [blackKing, blackQueen];
    chess.board.whiteKing = whiteKing;
    chess.board.blackKing = blackKing;

    chess.board.set(7, 5, blackQueen);
    chess.board.set(2, 2, blackKing);
    chess.board.set(0, 1, whiteKing);
    chess.turn = 2;

    moveStr = 'Qh7';

    expect(chess.move(moveStr)).toBe(Status.CHECK);

    // MOVEOK
    chess = new Chess();

    moveStr = 'e4';
    expect(chess.move(moveStr)).toBe(Status.MOVEOK);
    
    moveStr = 'd5';
    expect(chess.move(moveStr)).toBe(Status.MOVEOK);

    // check that record move is working
    let historyStr = "['e4', 'd5']";
    // expect(chess.history === historyStr).toBe(true);
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
    "-----------------\n" +    

    "white's turn\n"; 

    // expect(chess.toString() === chessStr).toBe(true);
});
