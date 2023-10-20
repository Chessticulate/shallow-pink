'use strict';

const Piece = require('./piece');
const Color = require('../color');
const crypto = require('crypto');

function buildMoveSet() {
    let moveSet = [];

    for (let i = 1; i < 8; i++) {
        moveSet.push([0, i]);
        moveSet.push([i, 0]);
        moveSet.push([0, -i]);
        moveSet.push([-i, 0]);
    }

    return moveSet;
}

const ROOK_MOVE_SET = buildMoveSet();

const keys = [];

const flipMap = [7, 6, 5, 4, 3, 2, 1, 0];

const squareTable = [
    [ 0,  0,  0,  0,  0,  0,  0,  0 ],
    [ 5, 10, 10, 10, 10, 10, 10,  5 ],
    [ -5,  0,  0,  0,  0,  0,  0, -5 ],
    [ -5,  0,  0,  0,  0,  0,  0, -5 ],
    [ -5,  0,  0,  0,  0,  0,  0, -5 ],
    [ -5,  0,  0,  0,  0,  0,  0, -5 ],
    [ -5,  0,  0,  0,  0,  0,  0, -5 ],
    [ 0,  0,  0,  5,  5,  0,  0,  0 ]
];

// two keys for each color
function generateKey() {
    let whiteKey = crypto.randomBytes(8); // Generate 8 random bytes (64 bits)
    let blackKey = crypto.randomBytes(8); 
    keys.push(BigInt(whiteKey.readUInt32LE(0)) + (BigInt(whiteKey.readUInt32LE(4)) << 32n));
    keys.push(BigInt(blackKey.readUInt32LE(0)) + (BigInt(blackKey.readUInt32LE(4)) << 32n));
}

module.exports = class Rook extends Piece {
    constructor (color, x, y) {
        super(color, x, y, ROOK_MOVE_SET);
        generateKey();
        this.key = color === color.WHITE ? keys[0] : keys[1];
    }

    toString() {
        return JSON.parse(this.color === Color.WHITE ? '"\\u265C"' : '"\\u2656"');
    }

    toFEN() {
        return this.color === Color.WHITE ? 'R' : 'r';
    }

    value() {
        let val = this.color === Color.WHITE ? 5 : -5;
        if (this.color === Color.WHITE) {
            return val + squareTable[this.y][this.x];
        }
        
        return val + (-1 * squareTable[flipMap[this.y]][flipMap[this.x]]);
    }
};
