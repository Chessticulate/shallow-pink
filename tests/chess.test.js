'use strict';

const Chess = require('../lib/chess');
const Board = require('../lib/board');
const Status = require('../lib/status');
const King = require('../lib/pieces/king');
const Color = require('../lib/color');
const Queen = require('../lib/pieces/queen');
const Rook = require('../lib/pieces/rook');
const Pawn = require('../lib/pieces/pawn');


test('chess constructor', () => {
    let chess = new Chess();

    expect(chess.turn).toBe(1);
    expect(chess.board instanceof Board).toBe(true);
    expect(chess.gameOver).toBe(false);
    expect(chess.stalemate).toBe(false);
    expect(chess.checkmate).toBe(false);
    expect(chess.check).toBe(false);
});

test('test address parsing', () => {
    let chess = new Chess();

    let [x, y] = chess.parseAddress('a1');
    expect(x).toBe(0);
    expect(y).toBe(7);

    [x, y] = chess.parseAddress('A1');
    expect(x).toBe(0);
    expect(y).toBe(7);

    [x, y] = chess.parseAddress('h8');
    expect(x).toBe(7);
    expect(y).toBe(0);

    expect(chess.parseAddress('z9')).toBe(null);
});

test('test move errors', () => {
    let chess = new Chess;

    expect(chess.move('pawnZ', 'A4')).toBe(Status.PIECENOTFOUND);
    expect(chess.move('knightK', 'X4')).toBe(Status.INVALIDADDRESS);
    expect(chess.move('pawnA', 'A5')).toBe(Status.INVALIDMOVE);
});

test('test cannot move into check', () => {
    let chess = new Chess();
    chess.board.board = Array(8).fill().map(() => Array(8).fill(null));

    let king = new King('king', Color.WHITE, 0, 7);
    chess.board.set(0, 7, king);

    let queen = new Queen('queen', Color.BLACK, 2, 6);
    chess.board.set(2, 6, queen);
    
    expect(chess.move('king', 'A2')).toBe(Status.PUTSINCHECK);
    expect(chess.move('king', 'B2')).toBe(Status.PUTSINCHECK);
    expect(chess.move('king', 'B1')).toBe(Status.PUTSINCHECK);
});

test('test cannot move if still in check', () => {
    let chess = new Chess();
    chess.board.board = Array(8).fill().map(() => Array(8).fill(null));

    let king = new King('king', Color.WHITE, 0, 7);
    chess.board.set(0, 7, king);

    let queen = new Queen('queen', Color.BLACK, 2, 5);
    chess.board.set(2, 5, queen);

    let rook = new Rook('rookK', Color.BLACK, 0, 0);
    chess.board.set(0, 0, rook)

    chess.check = true
    
    expect(chess.move('king', 'A2')).toBe(Status.STILLINCHECK);
    expect(chess.move('king', 'B2')).toBe(Status.STILLINCHECK);
});

test('test game over by checkmate', () => {
    let chess = new Chess();

    expect(chess.move('pawnF', 'F3')).toBe(Status.MOVEOK);
    expect(chess.move('pawnE', 'E5')).toBe(Status.MOVEOK);
    expect(chess.move('pawnG', 'G4')).toBe(Status.MOVEOK);
    expect(chess.move('queen', 'H4')).toBe(Status.CHECKMATE);

    expect(chess.gameOver).toBe(true);
    expect(chess.checkmate).toBe(true);
    expect(chess.check).toBe(true);
    expect(chess.stalemate).toBe(false);

    let turn = chess.turn;
    expect(chess.move('pawnA', 'A4',)).toBe(Status.GAMEOVER);
    expect(chess.turn).toBe(turn);
});


test('test game over by stalemate', () => {
    let chess = new Chess();
    
    expect(chess.move('pawnE', 'E3')).toBe(Status.MOVEOK);
    expect(chess.move('pawnA', 'A5')).toBe(Status.MOVEOK);
    expect(chess.move('queen', 'H5')).toBe(Status.MOVEOK);
    expect(chess.move('rookQ', 'A6')).toBe(Status.MOVEOK);
    expect(chess.move('queen', 'A5')).toBe(Status.MOVEOK);
    expect(chess.move('pawnH', 'H5')).toBe(Status.MOVEOK);
    expect(chess.move('queen', 'C7')).toBe(Status.MOVEOK);
    expect(chess.move('rookQ', 'H6')).toBe(Status.MOVEOK);
    expect(chess.move('pawnH', 'H4')).toBe(Status.MOVEOK);
    expect(chess.move('pawnF', 'F6')).toBe(Status.MOVEOK);
    expect(chess.move('queen', 'D7')).toBe(Status.CHECK);
    expect(chess.move('king', 'F7')).toBe(Status.MOVEOK);
    expect(chess.move('queen', 'B7')).toBe(Status.MOVEOK);
    expect(chess.move('queen', 'D3')).toBe(Status.MOVEOK);
    expect(chess.move('queen', 'B8')).toBe(Status.MOVEOK);
    expect(chess.move('queen', 'H7')).toBe(Status.MOVEOK);
    expect(chess.move('queen', 'C8')).toBe(Status.MOVEOK);
    expect(chess.move('king', 'G6')).toBe(Status.MOVEOK);
    expect(chess.move('queen', 'E6')).toBe(Status.STALEMATE);

    expect(chess.gameOver).toBe(true);
    expect(chess.checkmate).toBe(false);
    expect(chess.check).toBe(false);
    expect(chess.stalemate).toBe(true);
    
    let turn = chess.turn;
    expect(chess.move('king', 'G5',)).toBe(Status.GAMEOVER);
    expect(chess.turn).toBe(turn);
});

test('promotion', () => {
    let chess = new Chess();

    chess.board.board = Array(8).fill().map(() => Array(8).fill(null));

    let blackKing = new King('king', Color.BLACK, 7, 0);
    chess.board.set(7, 0, blackKing);

    let whiteKing = new King('king', Color.WHITE, 7, 7);
    chess.board.set(7, 7, whiteKing);

    let pawn = new Pawn('pawn', Color.WHITE, 0, 1);
    chess.board.set(0, 1, pawn);

    expect(chess.move('pawn', 'a8')).toBe(Status.PROMOTION);
    expect(chess.turn).toBe(1);
    expect(chess.promotion).toBe(pawn);
    expect(chess.move('king')).toBe(Status.INVALIDPROMOTION);
    expect(chess.move('queEn')).toBe(Status.CHECK);
    expect(chess.turn).toBe(2);
})

test('castling', () => {
    let chess = new Chess();
    chess.board.board = Array(8).fill().map(() => Array(8).fill(null));

    let whiteKing = new King('king', Color.WHITE, 4, 7);
    chess.board.set(4, 7, whiteKing);

    let whiteRook = new Rook('rookK', Color.WHITE, 7, 7);
    chess.board.set(7, 7, whiteRook);

    // black king is required for chess.move to function properly
    let blackKing = new King('king', Color.BLACK, 0, 1);
    chess.board.set(0, 1, blackKing);

    expect(chess.move('castle', 'k')).toBe(Status.MOVEOK);

    // reset board, test that castling out of check does not work
    chess = new Chess();
    chess.board.board = Array(8).fill().map(() => Array(8).fill(null));

    chess.board.set(4, 7, whiteKing);
    chess.board.set(7, 7, whiteRook);
    chess.board.set(0, 1, blackKing);

    let blackQueen = new Queen('queen', Color.BLACK, 0, 0);
    chess.board.set(0, 0, blackQueen);

    chess.turn = 2;

    console.log(chess.board.toString());

    expect(chess.move('queen', 'E8')).toBe(Status.MOVEOK);

    // expect(chess.check).toBe(true);

    expect(chess.move('castle', 'k')).toBe(Status.INVALIDMOVE);

});

test('en passant', () => {
    let chess = new Chess();
    chess.board.board = Array(8).fill().map(() => Array(8).fill(null));

    let kingWhite = new King('king', Color.WHITE, 4, 7);
    chess.board.set(4, 7, kingWhite);
    let pawnDWhite = new Pawn('pawnD', Color.WHITE, 3, 6);
    chess.board.set(3, 6, pawnDWhite);

    let kingBlack = new King('king', Color.BLACK, 4, 0);
    chess.board.set(4, 0, kingBlack);
    let pawnEBlack = new Pawn('pawnE', Color.BLACK, 4, 4);
    chess.board.set(4, 4, pawnEBlack);

    expect(chess.enPassantable).toBe(null);
    expect(pawnDWhite.enPassantable).toBe(false);

    expect(chess.move('pawnD', 'd4')).toBe(Status.MOVEOK);
    expect(pawnDWhite.enPassantable).toBe(true);
    expect(chess.enPassantable).toBe(pawnDWhite);

    expect(chess.move('pawnE', 'd3')).toBe(Status.MOVEOK);
    expect(chess.board.getByAddress(3, 4)).toBe(null);
    expect(chess.enPassantable).toBe(null);
});

test('test chess tostring', () => {
    let chess = new Chess();
    chess.toString();
});

