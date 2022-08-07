'use strict';

const Color = require('./color');

module.exports = class Pawn {
    constructor (id, color, row, col) {
        super(id, color, row, col);
        this.firstMove = true;
    }

    toString() {
        if (this.color == Color.BLACK) {
            return JSON.parse('"\\u2659"');
        }
        return JSON.parse('"\\u265F"');
    }

    canMove(board) {
        const dir = this.color == Color.WHITE ? 1 : -1;

        if (self.evaluate(board, this.x, )) {
            return true;
        }
        return false;
    }

    evaluate(board, x, y) {
        const dir = this.color == Color.WHITE ? 1 : -1;

        // 2 spaces forward
        if (this.firstMove && this.y - y == (dir * 2) && this.x - x == 0 &&
            this.pathClear([this.x, this.y], address) && board[y][x] == null) {
            return true;
        }

        // 1 space forward
        if (this.y - y == (dir * 1) && this.x - x == 0 && board[y][x] == null) {
            return true;
        }

        // diagonal
        if (this.y - y == (dir * 1) && Math.abs(this.x - x) == 1 &&
            (board[y][x] == null || board[y][x].color !== this.color)) {
            return true;
        }

        return false;
    }
}
