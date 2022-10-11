'use strict';

const Color = require('../color');

module.exports = class Piece {
    constructor (color, x, y, moveSet) {
        this.color = color;
        this.x = x;
        this.y = y;
        this.moveSet = moveSet;
        this.firstMove = true;
    }

    inMoveSet(dX, dY) {
        let moveStr = [dX, dY].toString();
        for (let coords of this.moveSet) {
            if (coords.toString() == moveStr) {
                return true;
            }
        }
        return false;
    }

    evaluate(board, x, y) {
        if (x < 0 || y < 0 || x > 7 || y > 7) {
            return false;
        }

        const dX = x - this.x;
        const dY = y - this.y;

        if (dX === 0 && dY === 0) {
            return false;
        }

        if (!this.inMoveSet(dX, dY)) {
            return false;
        }

        if ((dX === 0 || dY === 0 || Math.abs(dX) === Math.abs(dY)) &&
            !board.pathClear(this.x, this.y, x, y)) {
            return false;
        }

        const target = board.get(x, y);

        return target === null || target.color !== this.color;
    }

    canMove(board) {
        for (let i = 0; i < this.moveSet.length; i++) {
            let [x, y] = this.moveSet[i];
            x += this.x;
            y += this.y;
            if (this.evaluate(board, x, y)) {
                let moveList = [new Move(this, x, y)];

                if (board.get(x, y)) {
                    moveList.unshift(new Move(board.get(x, y), -1, -1));
                } else if (this instanceof Pawn && // en passant
                    Math.abs(x - this.x) === 1 &&
                    Math.abs(y - this.y) === 1) {
                    moveList.unshift(new Move(board.get(x, this.y), -1, -1));
                }

                board.move(moveList);

                if (!board.checkForCheck(this.color)) {
                    board.undo();
                    return true;
                }
                board.undo();
            }
        }
        return false;
    }
}
