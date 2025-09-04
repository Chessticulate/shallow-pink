'use strict';

const Piece = require('./piece');
const Color = require('../color');

function buildMoveSet() {
    let moveSet = [];

    for (let i = 1; i < 8; i++) {
        moveSet.push([i, i]);
        moveSet.push([i, -i]);
        moveSet.push([-i, i]);
        moveSet.push([-i, -i]);
    }

    return moveSet;
}

const BISHOP_MOVE_SET = buildMoveSet();

const flipMap = [7, 6, 5, 4, 3, 2, 1, 0];

const mgTable = [
    [ -29,  4, -82, -37, -25, -42,   7,  -8 ],
    [  26, 16, -18, -13,  30,  59,  18, -47 ],
    [  16, 37,  43,  40,  35,  50,  37,  -2 ],
    [  -4,  5,  19,  50,  37,  37,   7,  -2 ],
    [  -6, 13,  13,  26,  34,  12,  10,   4 ],
    [   0, 15,  15,  15,  14,  27,  18,  10 ],
    [   4, 15,  16,   0,   7,  21,  33,   1 ],
    [ -33, -3, -14, -21, -13, -12, -39, -21 ],
];

const egTable = [
    [ -14, -21, -11,  -8, -7,  -9, -17, -24 ],
    [  -8,  -4,   7, -12, -3, -13,  -4, -14 ],
    [   2,  -8,   0,  -1, -2,   6,   0,   4 ],
    [  -3,   9,  12,   9, 14,  10,   3,   2 ],
    [  -6,   3,  13,  19,  7,  10,  -3,  -9 ],
    [ -12,  -3,   8,  10, 13,   3,  -7, -15 ],
    [ -14, -18,  -7,  -1,  4,  -9, -15, -27 ],
    [ -23,  -9, -23,  -5, -9, -16,  -5, -17 ],
];

module.exports = class Bishop extends Piece {
    constructor (color, x, y) {
        super(color, x, y, BISHOP_MOVE_SET);
    }

    toString() {
        return JSON.parse(this.color === Color.WHITE ? '"\\u265D"' : '"\\u2657"');
    }

    toFEN() {
        return this.color === Color.WHITE ? 'B' : 'b';
    }

    value(phase) {
        let base = phase === 'mg' ? 365 : 297;
        const table = phase === 'mg' ? mgTable : egTable;

        let val = this.color === Color.WHITE ? base : base*-1;

        if (this.color === Color.WHITE) {
            return val + table[this.y][this.x];
        }

        return val - table[flipMap[this.y]][flipMap[this.x]];
    }
};
