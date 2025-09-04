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

const flipMap = [7, 6, 5, 4, 3, 2, 1, 0];

const mgTable = [
    [ -65,  23,  16, -15, -56, -34,   2,  13 ],
    [  29,  -1, -20,  -7,  -8,  -4, -38, -29 ],
    [ -9,   24,   2, -16, -20,   6,  22, -22 ],
    [ -17, -20, -12, -27, -30, -25, -14, -36 ],
    [ -49,  -1, -27, -39, -46, -44, -33, -51 ],
    [ -14, -14, -22, -46, -44, -30, -15, -27 ],
    [  1,   7,  -8, -64, -43, -16,   9,   8  ],
    [ -15,  36,  12, -54,   8, -28,  24,  14 ],
];

const egTable = [
    [ -74, -35, -18, -18, -11,  15,   4, -17 ],
    [ -12,  17,  14,  17,  17,  38,  23,  11 ],
    [  10,  17,  23,  15,  20,  45,  44,  13 ],
    [  -8,  22,  24,  27,  26,  33,  26,   3 ],
    [ -18,  -4,  21,  24,  27,  23,   9, -11 ],
    [ -19,  -3,  11,  21,  23,  16,   7,  -9 ],
    [ -27, -11,   4,  13,  14,   4,  -5, -17 ],
    [ -53, -34, -21, -11, -28, -14, -24, -43 ],
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

    value(phase) {
        const table = phase === 'mg' ? mgTable : egTable;
        let val = 0;

        if (this.color === Color.WHITE) {
            return val + table[this.y][this.x];
        }

        return val - table[flipMap[this.y]][flipMap[this.x]];
    }
};
