'use strict';

const Chess = require('../lib/chess');
const Board = require('../lib/board');
const Status = require('../lib/status');
const King = require('../lib/pieces/king');
const Color = require('../lib/color');
const Queen = require('../lib/pieces/queen');
const Rook = require('../lib/pieces/rook');


test('chess constructor', () => {
    let chess = new Chess();

    expect(chess.turn).toBe(0);
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
    expect(chess.move('queen', 'D7')).toBe(Status.MOVEOK);
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


test('test chess tostring', () => {
    let chess = new Chess();
    chess.toString();
});

