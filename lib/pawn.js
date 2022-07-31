'use strict';

const Color = require('./color');

module.exports = class Pawn {
    constructor (ID, color, row, col) {
        this.ID = ID;
        this.color = color;
        this.row = row;
        this.col = col;
        this.firstMove = true;
    }

    toString() {
        if (this.color == Color.BLACK) {
            return JSON.parse('"\\u2659"');
        }
        return JSON.parse('"\\u265F"');
    }

    // pawn move logic
    moves() {
        if (this.firstMove === true) {

        }
    }
}
