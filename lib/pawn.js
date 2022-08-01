'use strict';

const Color = require('./color');

module.exports = class Pawn {
    constructor (color, row, col) {
        this.color = color;
        this.row = row;
        this.col = col;
    }

    toString() {
        if (this.color == Color.BLACK) {
            return JSON.parse('"\\u2659"');
        }
        return JSON.parse('"\\u265F"');
    }
}
