'use strict';

const Move = require('../move');

const flipMap = [7, 6, 5, 4, 3, 2, 1, 0];

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

    flipPerspective() {
        this.x = flipMap[this.x];
        this.y = flipMap[this.y];
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
                }

                /* Check for pawn en passant. (can't import Pawn class due
                 * to circular import, need to improvise when checking if
                 * current piece is a pawn.)
                 */
                else if ((this.toString() === JSON.parse('"\\u265F"') || 
                    this.toString() === JSON.parse('"\\u2659"')) &&
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
};
