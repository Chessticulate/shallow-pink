const Color = require('../lib/color');
const Board = require('../lib/board');
const Pawn = require('../lib/pieces/pawn');
const Queen = require('../lib/pieces/queen');
const King = require('../lib/pieces/king');
const Knight = require('../lib/pieces/knight');

const AI = require('../lib/ai');
const Chess = require('../lib/chess');
const { nodeCount } = require('../lib/ai');


test.skip('evaluate', () => {
    let chess = new Chess();
    expect(AI.evaluate(chess)).toBe(0);

    chess = new Chess('3N4/1p4nq/2p5/Q3P2k/2B1b3/PR3R2/3KPP2/8 w - - 0 1');
    expect(AI.evaluate(chess)).toBe(12);

    chess = new Chess('7r/4nkn1/p4P1P/1b1pRN2/7K/bPp5/6r1/8 w - - 0 1');
    expect(AI.evaluate(chess)).toBe(-14);
});


