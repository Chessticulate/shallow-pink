'use strict';

const Color = require('../color');

module.exports = class Bishop {
    constructor (ID, color, row, col) {
        this.ID = ID;
        this.color = color;
        this.row = row;
        this.col = col;
    }

    toString() {
        if (this.color == Color.BLACK) {
            return JSON.parse('"\\u2657"');
        }
        return JSON.parse('"\\u265D"');
    }

    evaluate(board, x, y) {
    }
}
