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
        return JSON.parse(this.color === Color.WHITE ? '"\\u265E"' : '"\\u2658"');
    }

    toFEN() {
        return this.color === Color.WHITE ? 'N' : 'n';
    }
    
    value() {
        return this.color === Color.WHITE ? 3 : -3;
    }
};
