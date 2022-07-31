'use strict';

const Color = require('./color');

module.exports = class Knight {
    constructor (ID, color, row, col) {
        this.ID = ID;
        this.color = color;
        this.row = row;
        this.col = col;
    }

    toString() {
        if (this.color == Color.BLACK) {
            return JSON.parse('"\\u2658"');
        }
        return JSON.parse('"\\u265E"');
    }
}
