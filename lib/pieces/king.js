'use strict';

const Piece = require('./piece');
const Color = require('../color');
const crypto = require('crypto');

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

const keys = [];

const flipMap = [7, 6, 5, 4, 3, 2, 1, 0];

const squareTable = [
    [-.30, -.40, -.40, -.50, -.50, -.40, -.40, -.30],
    [-.30, -.40, -.40, -.50, -.50, -.40, -.40, -.30],
    [-.30, -.40, -.40, -.50, -.50, -.40, -.40, -.30],
    [-.30, -.40, -.40, -.50, -.50, -.40, -.40, -.30],
    [-.20, -.30, -.30, -.40, -.40, -.30, -.30, -.20],
    [-.10, -.20, -.20, -.20, -.20, -.20, -.20, -.10],
    [.20, .20,  0,  0,  0,  0, .20, .20],
    [.20, .30, .10,  0,  0, .10, .30, .20]
];

// two keys for each color
function generateKey() {
    let whiteKey = crypto.randomBytes(8); // Generate 8 random bytes (64 bits)
    let blackKey = crypto.randomBytes(8); 
    keys.push(BigInt(whiteKey.readUInt32LE(0)) + (BigInt(whiteKey.readUInt32LE(4)) << 32n));
    keys.push(BigInt(blackKey.readUInt32LE(0)) + (BigInt(blackKey.readUInt32LE(4)) << 32n));
}

module.exports = class King extends Piece {
    constructor (color, x, y) {
        super(color, x, y, KING_MOVE_SET);
        generateKey();
        this.key = color === color.WHITE ? keys[0] : keys[1];
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
            return val + squareTable[this.y][this.x];
        }
        
        return val + (-1 * squareTable[flipMap[this.y]][flipMap[this.x]]);
    }
};
