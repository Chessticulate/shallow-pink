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

const midGameTable = [
    [ -30,-40,-40,-50,-50,-40,-40,-30 ],
    [ -30,-40,-40,-50,-50,-40,-40,-30 ],
    [ -30,-40,-40,-50,-50,-40,-40,-30 ],
    [ -30,-40,-40,-50,-50,-40,-40,-30 ],
    [ -20,-30,-30,-40,-40,-30,-30,-20 ],
    [ -10,-20,-20,-20,-20,-20,-20,-10 ],
    [  20, 20,  0,  0,  0,  0, 20, 20 ],
    [  20, 30, 10,  0,  0, 10, 30, 20 ]
];

// end game position table for king, still needs to be implemented
// const endGameTable = [
//     [ -50,-40,-30,-20,-20,-30,-40,-50 ],
//     [ -30,-20,-10,  0,  0,-10,-20,-30 ],
//     [ -30,-10, 20, 30, 30, 20,-10,-30 ],
//     [ -30,-10, 30, 40, 40, 30,-10,-30 ],
//     [ -30,-10, 30, 40, 40, 30,-10,-30 ],
//     [ -30,-10, 20, 30, 30, 20,-10,-30 ],
//     [ -30,-30,  0,  0,  0,  0,-30,-30 ],
//     [ -50,-30,-30,-30,-30,-30,-30,-50 ]
// ];

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
        let val = this.color === Color.WHITE ? 0 : 0;
        if (this.color === Color.WHITE) {
            return val + midGameTable[this.y][this.x];
        }
        
        return val + (-1 * midGameTable[flipMap[this.y]][flipMap[this.x]]);
    }
};
