'use strict';

const Piece = require('./piece');
const Color = require('../color');

function buildMoveSet() {
    let moveSet = [];

    for (let i = 1; i < 8; i++) {
        moveSet.push([0, i]);
        moveSet.push([i, 0]);
        moveSet.push([0, -i]);
        moveSet.push([-i, 0]);
        moveSet.push([i, i]);
        moveSet.push([i, -i]);
        moveSet.push([-i, i]);
        moveSet.push([-i, -i]);
    }

    return moveSet;
}

const QUEEN_MOVE_SET = buildMoveSet();


module.exports = class Queen extends Piece {
    constructor (id, color, x, y) {
        super(id, color, x, y, QUEEN_MOVE_SET);
    }

    toString() {
        if (this.color == Color.BLACK) {
            return JSON.parse('"\\u2655"');
        }
        return JSON.parse('"\\u265B"');
    }
}
