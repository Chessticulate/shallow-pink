const Color = require('../lib/color');

const AI = require('../lib/ai');
const Chess = require('../lib/chess');


test('evaluate', () => {
    let chess = new Chess();
    expect(AI.evaluate(chess)).toBe(87);

    chess = new Chess('3N4/1p4nq/2p5/Q3P2k/2B1b3/PR3R2/3KPP2/8 w - - 0 1');
    expect(AI.evaluate(chess)).toBe(1102);

    chess = new Chess('7r/4nkn1/p4P1P/1b1pRN2/7K/bPp5/6r1/8 w - - 0 1');
    expect(AI.evaluate(chess)).toBe(-1366);
});


