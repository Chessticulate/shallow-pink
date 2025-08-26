'use strict';

const Piece = require('./piece');
const Color = require('../color');

function buildMoveSet() {
    let moveSet = [];

    for (let i = 1; i < 8; i++) {
        moveSet.push([0, i]);
        moveSet.push([i, 0]);
        moveSet.push([0, -i]);
        moveSet.push([-i, 0]);
        moveSet.push([i, i]);
        moveSet.push([i, -i]);
        moveSet.push([-i, i]);
        moveSet.push([-i, -i]);
    }

    return moveSet;
}

const QUEEN_MOVE_SET = buildMoveSet();

const flipMap = [7, 6, 5, 4, 3, 2, 1, 0];

const mgTable = [
    [ -28,   0,  29,  12,  59,  44,  43,  45 ],
    [ -24, -39,  -5,   1, -16,  57,  28,  54 ],
    [ -13, -17,   7,   8,  29,  56,  47,  57 ],
    [ -27, -27, -16, -16,  -1,  17,  -2,   1 ],
    [  -9, -26,  -9, -10,  -2,  -4,   3,  -3 ],
    [ -14,   2, -11,  -2,  -5,   2,  14,   5 ],
    [ -35,  -8,  11,   2,   8,  15,  -3,   1 ],
    [  -1, -18,  -9,  10, -15, -25, -31, -50 ],
];

const egTable = [
    [  -9,  22,  22,  27,  27,  19,  10,  20 ],
    [ -17,  20,  32,  41,  58,  25,  30,   0 ],
    [ -20,   6,   9,  49,  47,  35,  19,   9 ],
    [   3,  22,  24,  45,  57,  40,  57,  36 ],
    [ -18,  28,  19,  47,  31,  34,  39,  23 ],
    [ -16, -27,  15,   6,   9,  17,  10,   5 ],
    [ -22, -23, -30, -16, -16, -23, -36, -32 ],
    [ -33, -28, -22, -43,  -5, -32, -20, -41 ],
];


module.exports = class Queen extends Piece {
    constructor (color, x, y) {
        super(color, x, y, QUEEN_MOVE_SET);
    }

    toString() {
        return JSON.parse(this.color === Color.WHITE ? '"\\u265B"' : '"\\u2655"');
    }

    toFEN() {
        return this.color === Color.WHITE ? 'Q' : 'q';
    }

    value(phase) {
        let base = phase === 'mg' ? 1025 : 936;
        const table = phase === 'mg' ? mgTable : egTable;

        let val = this.color === Color.WHITE ? base : base*-1;

        if (this.color === Color.WHITE) {
            return val + table[this.y][this.x];
        }

        return val - table[flipMap[this.y]][flipMap[this.x]];
    }
};
