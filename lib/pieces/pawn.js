'use strict';

const Piece = require('./piece');
const Color = require('../color');
const crypto = require('crypto');

function buildMoveSet(color) {
    const dir = color === Color.WHITE ? -1 : 1;
    return [
        [0, 1 * dir],
        [0, 2 * dir],
        [1, 1 * dir],
        [-1, 1 * dir],
    ];
}

const PAWN_WHITE_MOVE_SET = buildMoveSet(Color.WHITE);
const PAWN_BLACK_MOVE_SET = buildMoveSet(Color.BLACK);
const keys = [];

const flipMap = [7, 6, 5, 4, 3, 2, 1, 0];

const squareTable = [
    [ 0,  0,  0,  0,  0,  0,  0,  0 ],
    [ 50, 50, 50, 50, 50, 50, 50, 50 ],
    [ 10, 10, 20, 30, 30, 20, 10, 10 ],
    [ 5,  5, 10, 25, 25, 10,  5,  5 ],
    [ 0,  0,  0, 20, 20,  0,  0,  0 ],
    [ 5, -5,-10,  0,  0,-10, -5,  5 ],
    [ 5, 10, 10,-20,-20, 10, 10,  5 ],
    [ 0,  0,  0,  0,  0,  0,  0,  0 ]
];

// two keys for each color
function generateKey() {
    let whiteKey = crypto.randomBytes(8); // Generate 8 random bytes (64 bits)
    let blackKey = crypto.randomBytes(8); 
    keys.push(BigInt(whiteKey.readUInt32LE(0)) + (BigInt(whiteKey.readUInt32LE(4)) << 32n));
    keys.push(BigInt(blackKey.readUInt32LE(0)) + (BigInt(blackKey.readUInt32LE(4)) << 32n));
}


module.exports = class Pawn extends Piece {
    constructor (color, x, y) {
        super(color, x, y, color === Color.WHITE ? PAWN_WHITE_MOVE_SET : PAWN_BLACK_MOVE_SET);
        this.enPassantable = false;
        generateKey();
        this.key = color === color.WHITE ? keys[0] : keys[1];
    }

    toString() {
        return JSON.parse(this.color === Color.WHITE ? '"\\u265F"' : '"\\u2659"');
    }

    toFEN() {
        return this.color === Color.WHITE ? 'P' : 'p';
    }

    value() {
        let val = this.color === Color.WHITE ? 1 : -1;
        if (this.color === Color.WHITE) {
            return val + squareTable[this.y][this.x];
        }
        
        return val + (-1 * squareTable[flipMap[this.y]][flipMap[this.x]]);
    }

    flipPerspective() {
        super.flipPerspective();
        this.moveSet = this.moveSet === PAWN_WHITE_MOVE_SET ? PAWN_BLACK_MOVE_SET : PAWN_WHITE_MOVE_SET;
    }

    evaluate(board, x, y) {
        if (!super.evaluate(board, x, y)) {
            return false;
        }

        const dY = y - this.y;
        const dX = x - this.x;

        if (this.firstMove === false && Math.abs(dY) === 2) {
            // can only move forward by 2 on the first move
            return false;
        }

        if (Math.abs(dX) === Math.abs(dY)) {
            if (board.get(x, y) === null) {
                // en passant
                let otherPiece = board.get(x, this.y);
                if (otherPiece instanceof Pawn && otherPiece.enPassantable) {
                    return true;
                }
                return false;
            }
        } else if (board.get(x, y) !== null) {
            // can't move forward onto an occupied space
            return false;
        }

        return true;
    }
};
