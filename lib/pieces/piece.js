'use strict';

const Color = require('../color');

module.exports = class Piece {
    constructor (id, color, x, y, moveSet) {
        this.id = id;
        this.color = color;
        this.x = x;
        this.y = y;
        this.moveSet = moveSet;
        this.firstMove = true;
    }

    evaluate(board, x, y) {
        if (!(x >= 0 && y >= 0 && x <= 7 && y <= 7)) {
            return false;
        }

        const dX = x - this.x;
        const dY = y - this.y;

        if (dX === 0 && dY === 0) {
            return false;
        }

        if (!this.moveSet.includes([dX, dY])) {
            return false;
        }

        if ((dX === 0 || dY === 0) && Math.abs(dX) === Math.abs(dY) &&
            !board.pathClear(this.x, this.y, x, y)) {
            return false;
        }

        const target = board.getByAddress(x, y);

        return target === null || target.color !== this.color;
    }

    canMove(board) {
        for (let i = 0; i < this.moveSet.length; i++) {
            let [x, y] = this.moveSet[i];
            x += this.x;
            y += this.y;
            if (this.evaluate(board, x, y)) {
                board.move(this, x, y);
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