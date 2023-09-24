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

const flipMap = [7, 6, 5, 4, 3, 2, 1, 0];

const squareTable = [
    [-.20, -.10, -.10, -.10, -.10, -.10, -.10, -.20],
    [-.10, 0, 0, 0, 0, 0, 0,-.10],
    [-.10,  0,  .05, .10, .10,  .05,  0, -.10],
    [-.10, .05, .05, .10, .10, .05, .05, -.10],
    [-.10, 0, .10, .10, .10, .10, 0, -.10],
    [-.10, .10, .10, .10, .10, .10, .10, -.10],
    [-.10,  .05, 0, 0, 0, 0, .05, -.10],
    [-.20, -.10, -.10, -.10, -.10, -.10, -.10, -.20]
];

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

    value() {
        let val = this.color === Color.WHITE ? 3 : -3;
        if (this.color === Color.WHITE) {
            return val + squareTable[this.y][this.x];
        }

        return val + (-1 * squareTable[flipMap[this.y]][flipMap[this.x]]);
    }
}
