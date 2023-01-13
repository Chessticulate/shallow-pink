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
    constructor (color, x, y) {
        super(color, x, y, QUEEN_MOVE_SET);
    }

    toString() {
        return JSON.parse(this.color === Color.WHITE ? '"\\u265B"' : '"\\u2655"');
    }

    toFEN() {
        return this.color === Color.WHITE ? 'Q' : 'q';
    }
}
