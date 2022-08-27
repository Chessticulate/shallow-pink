'use strict';

const Chess = require('../lib/chess');
const Board = require('../lib/board');
const Status = require('../lib/status');


test('chess constructor', () => [
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

});


test('test chess tostring', () => {
    let chess = new Chess();
    chess.toString();
});

