'use strict';

const Piece = require('./piece');
const Color = require('../color');
const readline = require('readline');
const Queen = require('./queen');

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
    constructor (color, x, y) {
        super(color, x, y, color === Color.WHITE ? PAWN_WHITE_MOVE_SET : PAWN_BLACK_MOVE_SET);
        this.enPassantable = false;
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
        const dX = x - this.x;

        if (this.firstMove === false && Math.abs(dY) === 2) {
            // can only move forward by 2 on the first move
            return false;
        }

        if (Math.abs(dX) === Math.abs(dY)) {
            if (board.getByAddress(x, y) === null) {
                // en passant
                let otherPiece = board.getByAddress(x, this.y);
                if (otherPiece instanceof Pawn && otherPiece.enPassantable) {
                    return true;
                }
                return false;
            }
        } else if (board.getByAddress(x, y) !== null) {
            // can't move forward onto an occupied space
            return false;
        }

        return true;
    }
}
