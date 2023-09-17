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
    constructor (color, x, y) {
        super(color, x, y, KING_MOVE_SET);
    }

    toString() {
        return JSON.parse(this.color === Color.WHITE ? '"\\u265A"' : '"\\u2654"');
    }

    toFEN() {
        return this.color === Color.WHITE ? 'K' : 'k';
    }

    value() {
        return 0;
    }
};
