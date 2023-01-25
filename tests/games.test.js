'use strict';

const Chess = require('../lib/chess');
const Board = require('../lib/board');
const Status = require('../lib/status');
const King = require('../lib/pieces/king');
const Color = require('../lib/color');
const Queen = require('../lib/pieces/queen');
const Rook = require('../lib/pieces/rook');
const Pawn = require('../lib/pieces/pawn');

test('full game (checkmate)', () => {
    let chess = new Chess();

    let moveArr = ['f3', 'e5', 'g4'];

    for (let i = 0; i < moveArr.length; i++) {
        expect(chess.move(moveArr[i])).toBe(Status.MOVEOK);
    }

    expect(chess.move('Qh4')).toBe(Status.CHECKMATE);
});

test('full game (stalemate)', () => {
    let chess = new Chess();

    let moveArr = [
        'e3', 'a5', 
        'Qh5', 'Ra6',
        'Qxa5', 'h5',
        'h4', 'Rah6',
        'Qxc7', 'f6',
        'Qxd7', 'Kf7',
        'Qxb7', 'Qd3',
        'Qxb8', 'Qh7',
        'Qxc8', 'Kg6',
        'Qe6'
    ];
    for (let i = 0; i < moveArr.length; i++) {
        if (moveArr[i] === 'Qxd7') {
            expect(chess.move(moveArr[i])).toEqual(Status.CHECK);
        }
        else if (moveArr[i] === 'Qe6') {
            expect(chess.move(moveArr[i])).toEqual(Status.STALEMATE);
        }
        else expect(chess.move(moveArr[i])).toEqual(Status.MOVEOK);
    }

});

test('draw (insufficient material)', () => {

});

test('draw (50 move rule)', () => {

});

test('draw (threefold repetition)', () => {
	let chess = new Chess();

	let moveArr = [
		'Nf3', 'Nf6',
		'Ng1', 'Ng8',
		'Nf3', 'Nf6',
		'Ng1', 'Ng8',
		'Nf3', 'Nf6'
	];

	for (let i = 0; i < moveArr.length; i++) {
		if (i === 8) {
			expect(chess.move(moveArr[i])).toBe(Status.DRAW);
			break;
		}
		else 
			expect(chess.move(moveArr[i])).toBe(Status.MOVEOK);
	}

});
