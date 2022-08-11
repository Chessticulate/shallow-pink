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
    ]
}

const PAWN_WHITE_MOVE_SET = buildMoveSet(Color.WHITE);
const PAWN_BLACK_MOVE_SET = buildMoveSet(Color.BLACK);


module.exports = class Pawn extends Piece {
    constructor (id, color, x, y) {
        super(id, color, x, y, color === Color.WHITE ? PAWN_WHITE_MOVE_SET : PAWN_BLACK_MOVE_SET);
    }

    toString() {
        if (this.color === Color.BLACK) {
            return JSON.parse('"\\u2659"');
        }
        return JSON.parse('"\\u265F"');
    }

    evaluate(board, x, y) {
        if (!super.evaluate(board, x, y)) {
            return false;
        }

        const dY = y - this.y;

        if (this.firstMove === false && Math.abs(dY) == 2) {
            return false;
        }

        return true;
    }
}
