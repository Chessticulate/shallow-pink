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
        return JSON.parse(this.color === Color.WHITE ? '"\\u265D"' : '"\\u2657"');
    }

    toFEN() {
        return this.color === Color.WHITE ? 'B' : 'b';
    }
}
