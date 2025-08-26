'use strict';

const Piece = require('./piece');
const Color = require('../color');

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

const flipMap = [7, 6, 5, 4, 3, 2, 1, 0];

const mgTable = [
    [  0,   0,   0,   0,   0,   0,  0,   0 ],
    [ 98, 134,  61,  95,  68, 126, 34, -11 ],
    [ -6,   7,  26,  31,  65,  56, 25, -20 ],
    [-14,  13,   6,  21,  23,  12, 17, -23 ],
    [-27,  -2,  -5,  12,  17,   6, 10, -25 ],
    [-26,  -4,  -4, -10,   3,   3, 33, -12 ],
    [-35,  -1, -20, -23, -15,  24, 38, -22 ],
    [  0,   0,   0,   0,   0,   0,  0,   0 ],
];

const egTable = [
    [  0,   0,   0,   0,   0,   0,   0,   0 ],
    [178, 173, 158, 134, 147, 132, 165, 187 ],
    [ 94, 100,  85,  67,  56,  53,  82,  84 ],
    [ 32,  24,  13,   5,  -2,   4,  17,  17 ],
    [ 13,   9,  -3,  -7,  -7,  -8,   3,  -1 ],
    [  4,   7,  -6,   1,   0,  -5,  -1,  -8 ],
    [ 13,   8,   8,  10,  13,   0,   2,  -7 ],
    [  0,   0,   0,   0,   0,   0,   0,   0 ],
];


module.exports = class Pawn extends Piece {
    constructor (color, x, y) {
        super(color, x, y, color === Color.WHITE ? PAWN_WHITE_MOVE_SET : PAWN_BLACK_MOVE_SET);
        this.enPassantable = false;
    }

    toString() {
        return JSON.parse(this.color === Color.WHITE ? '"\\u265F"' : '"\\u2659"');
    }

    toFEN() {
        return this.color === Color.WHITE ? 'P' : 'p';
    }

    value(phase) {
        let base = phase === 'mg' ? 82 : 94;
        const table = phase === 'mg' ? mgTable : egTable;

        let val = this.color === Color.WHITE ? base : base*-1;

        if (this.color === Color.WHITE) {
            return val + table[this.y][this.x];
        }

        return val - table[flipMap[this.y]][flipMap[this.x]];
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
