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
    }

    return moveSet;
}

const ROOK_MOVE_SET = buildMoveSet();


module.exports = class Rook extends Piece {
    constructor (color, x, y) {
        super(color, x, y, ROOK_MOVE_SET);
    }

    toString() {
        return JSON.parse(this.color === Color.WHITE ? '"\\u265C"' : '"\\u2656"');
    }

    toFEN() {
        return this.color === Color.WHITE ? 'R' : 'r';
    }
}
