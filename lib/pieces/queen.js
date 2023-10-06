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

const flipMap = [7, 6, 5, 4, 3, 2, 1, 0];

const squareTable = [
    [-.20, -.10, -.10, -.05, -.05, -.10, -.10, -.20],
    [-.10,  0,  0,  0,  0,  0,  0, -.10],
    [-.10,  0,  .05,  .05,  .05,  .05,  0, -.10],
    [-.05,  0,  .05,  .05,  .05,  .05,  0, -.05],
    [0,  0,  .05,  .05,  .05,  .05,  0, -.05],
    [-.10,  .05,  .05,  .05,  .05,  .05,  0,  -.10],
    [-.10,  0,  .05,  0,  0,  0,  0, -.10],
    [-.20, -.10, -.10, -.05, -.05, -.10, -.10, -.20]
];

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

    value() {
        let val = this.color === Color.WHITE ? 9 : -9;
        if (this.color === Color.WHITE) {
            return val + squareTable[this.y][this.x];
        }
        
        return val + (-1 * squareTable[flipMap[this.y]][flipMap[this.x]]);
    }
};
