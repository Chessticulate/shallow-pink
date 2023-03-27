const Color = require('../lib/color');
const Board = require('../lib/board');
const Pawn = require('../lib/pieces/pawn');
const Queen = require('../lib/pieces/queen');
const King = require('../lib/pieces/king');
const Knight = require('../lib/pieces/knight');

const AI = require('../lib/ai');
const Chess = require('../lib/chess');
const { nodeCount, memoizedNodes } = require('../lib/ai');

let chess = new Chess();//('4b3/8/2BK1k1p/6pP/2P2p2/1p4b1/2p2qP1/4r2r w - - 0 1');

console.log(AI.miniMax(chess.toFEN(), 3));
console.log(AI.nodeCount);
console.log(AI.memoizedNodes);
