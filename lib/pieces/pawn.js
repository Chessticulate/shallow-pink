'use strict';

const Piece = require('./piece');
const Color = require('../color');
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
        return JSON.parse(this.color === Color.WHITE ? '"\\u265F"' : '"\\u2659"');
    }

    toFEN() {
        return this.color === Color.WHITE ? 'P' : 'p';
    }

    value() {
        return this.color === Color.WHITE ? 1 : -1;
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
}
