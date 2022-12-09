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
	console.log("checkmate test \n", chess.board.toString());
});

test('full game (stalemate)', () => {
	let chess = new Chess();

	let moveArr = [
		'e3', 'a5', 
		'Qh5', 'Ra6',
		'Qxa5', 'h5',
		'h4', 'R6h6', // Rh6 is ambiguous, rank needs to be included. using rank didn't work
		'Qxc7', 'f6',
		'Qxd7'
	];
	let historyArr = []
	for (let i = 0; i < moveArr.length; i++) {
		if (moveArr[i] === 'Qxd7') {
			console.log(chess.board.toString());
			expect(chess.move(moveArr[i])).toEqual(Status.CHECK);
		}
		expect(chess.move(moveArr[i])).toEqual(Status.MOVEOK);
	}

	console.log('stalemate test \n', chess.board.toString());

});

test('draw (insufficient material)', () => {

});

test('draw (50 move rule)', () => {

});

test('draw (threefold repetition)', () => {

});