'use strict';

const Piece = require('./piece');
const Color = require('../color');

const KING_MOVE_SET = [
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [0, -1],
];


module.exports = class King extends Piece {
    constructor (id, color, x, y) {
        super(id, color, x, y, KING_MOVE_SET);
    }

    toString() {
        if (this.color === Color.BLACK) {
            return JSON.parse('"\\u2654"');
        }
        return JSON.parse('"\\u265A"');
    }

    ambiguous(board, x, y) {
        return false;
    }
}
