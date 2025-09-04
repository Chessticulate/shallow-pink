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

const flipMap = [7, 6, 5, 4, 3, 2, 1, 0];

const mgTable = [
    [-167, -89, -34, -49,  61, -97, -15,-107 ],
    [ -73, -41,  72,  36,  23,  62,   7, -17 ],
    [ -47,  60,  37,  65,  84, 129,  73,  44 ],
    [  -9,  17,  19,  53,  37,  69,  18,  22 ],
    [ -13,   4,  16,  13,  28,  19,  21,  -8 ],
    [ -23,  -9,  12,  10,  19,  17,  25, -16 ],
    [ -29, -53, -12,  -3,  -1,  18, -14, -19 ],
    [-105, -21, -58, -33, -17, -28, -19, -23 ],
];

const egTable = [
    [ -58, -38, -13, -28, -31, -27, -63, -99 ],
    [ -25,  -8, -25,  -2,  -9, -25, -24, -52 ],
    [ -24, -20,  10,   9,  -1,  -9, -19, -41 ],
    [ -17,   3,  22,  22,  22,  11,   8, -18 ],
    [ -18,  -6,  16,  25,  16,  17,   4, -18 ],
    [ -23,  -3,  -1,  15,  10,  -3, -20, -22 ],
    [ -42, -20, -10,  -5,  -2, -20, -23, -44 ],
    [ -29, -51, -23, -15, -22, -18, -50, -64 ],
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
    
    value(phase) {
        let base = phase === 'mg' ? 337 : 281;
        const table = phase === 'mg' ? mgTable : egTable;

        let val = this.color === Color.WHITE ? base : base*-1;

        if (this.color === Color.WHITE) {
            return val + table[this.y][this.x];
        }

        return val - table[flipMap[this.y]][flipMap[this.x]];
    }
    
};

