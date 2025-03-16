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

// knight square table for calculating relative value
// b1, b8, g1, g8 should all be |.40|. 
// they are changed to equally encourage e and d pawn pushes in the opening
const squareTable = [
    [ -50,-30,-30,-30,-30,-30,-30,-50 ],
    [ -40,-20,  0,  0,  0,  0,-20,-40 ],
    [ -30,  0, 10, 15, 15, 10,  0,-30 ],
    [ -30,  5, 15, 20, 20, 15,  5,-30 ],
    [ -30,  0, 15, 20, 20, 15,  0,-30 ],
    [ -30,  5, 10, 15, 15, 10,  5,-30 ],
    [ -40,-20,  0,  5,  5,  0,-20,-40 ],
    [ -50,-30,-30,-30,-30,-30,-30,-50 ]
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
        let val = this.color === Color.WHITE ? 3 : -3;
        if (this.color === Color.WHITE) {
            return val + squareTable[this.y][this.x];
        }
        // try passing in this.x and y to flipMap for black piece table eval
        // this way there is only one piece table for each piece
        return val + (-1 * squareTable[flipMap[this.y]][flipMap[this.x]]);
    }
    
};

