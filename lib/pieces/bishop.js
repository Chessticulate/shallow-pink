'use strict';

const Piece = require('./piece');
const Color = require('../color');

function buildMoveSet() {
    let moveSet = [];

    for (let i = 1; i < 8; i++) {
        moveSet.push([i, i]);
        moveSet.push([i, -i]);
        moveSet.push([-i, i]);
        moveSet.push([-i, -i]);
    }

    return moveSet;
}

const BISHOP_MOVE_SET = buildMoveSet();


module.exports = class Bishop extends Piece {
    constructor (color, x, y) {
        super(color, x, y, BISHOP_MOVE_SET);
    }

    toString() {
        if (this.color === Color.BLACK) {
            return JSON.parse('"\\u2657"');
        }
        return JSON.parse('"\\u265D"');
    }
}
