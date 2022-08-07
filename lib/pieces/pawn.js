'use strict';

const Color = require('../color');

module.exports = class Pawn {
    constructor (id, color, row, col) {
        super(id, color, row, col);
        this.firstMove = true;
        this.moveSet = this.buildMoveSet();
    }

    buildMoveSet() {
        const dir = color === Color.WHITE ? -1 : 1;
        return [
            [0, 1 * dir],
            [0, 2 * dir],
            [1, 1 * dir],
            [-1, 1 * dir],
        ]
    }

    toString() {
        if (this.color == Color.BLACK) {
            return JSON.parse('"\\u2659"');
        }
        return JSON.parse('"\\u265F"');
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

    evaluate(board, x, y) {
        if (x >= 0 && y >= 0 && x <= 7 && y <= 7) {
            return false;
        }

        const dir = this.color == Color.WHITE ? 1 : -1;

        switch ([x - this.x, y - this.y]) {
            case [0, 1 * dir]:
                if (this.board.getByAddress(x,y) === null) {
                    return true;
                }
                break;
            case [0, 2 * dir]:
                if (this.firstMove &&
                    board.getByAddress(this.x, this.y + (1 * dir)) &&
                    board.getByAddress(x, y) === null) {
                    return true;
                }
                break;
            case [1, 1 * dir]:
            case [-1, 1 * dir]:
                if (board.getByAddress(x, y) === null ||
                    board.getByAddress(x, y).color !== this.color) {
                    return true;
                }
                break;
        }

        return false;
    }
}
