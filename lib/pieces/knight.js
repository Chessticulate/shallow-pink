'use strict';

const Piece = require('./piece');
const Color = require('../color');

const KNIGHT_MOVE_SET = [
    [1, -2],
    [2, -1],
    [2, 1],
    [1, 2],
    [-1, 2],
    [-2, 1],
    [-2, -1],
    [-1, -2]
];


module.exports = class Knight extends Piece {
    constructor (color, x, y) {
        super(color, x, y, KNIGHT_MOVE_SET);
    }

    toString() {
        if (this.color == Color.BLACK) {
            return JSON.parse('"\\u2658"');
        }
        return JSON.parse('"\\u265E"');
    }

}
