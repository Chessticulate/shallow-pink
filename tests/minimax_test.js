const Color = require('../lib/color');
const Board = require('../lib/board');
const Pawn = require('../lib/pieces/pawn');
const Queen = require('../lib/pieces/queen');
const King = require('../lib/pieces/king');
const Knight = require('../lib/pieces/knight');

const AI = require('../lib/ai');
const Chess = require('../lib/chess');
const { nodeCount, memoizedNodes } = require('../lib/ai');

let chess = new Chess();


function miniMaxTestGame(chess) {
    let currentMoves;
    while(!chess.gameOver) {
        console.log(chess.toString());
        console.log(chess.toFEN());
        // currentMoves = legalMoves(chess);
        // let move = currentMoves[Math.floor(Math.random() * currentMoves.length)];
        let move = AI.miniMax(chess.toFEN(), 5);
        console.log(move, '->', chess.move(move));
    }
    console.log(chess.toString());
    console.log(chess.toFEN());
}

miniMaxTestGame(chess);


// old tests

// console.log("best move: ", AI.miniMax(chess.toFEN(), 5));
// console.log("nodes visited: ",AI.nodeCount);
// console.log("nodes pruned: ",AI.prunedNodes);
// console.log("nodes memoized: ", AI.memoizedNodes);

/** NOTES
 *  
 * prunedNodes variable supplies the number of times a branch was cut early, not the actual number of nodes on that branch
 * to achieve the accurate number of nodes pruned would be the number of all possible variations at depth n - nodes visited at depth n
 * 
 * 
 * SAMPLE GAMES
 * 
 * '4b3/8/2BK1k1p/6pP/2P2p2/1p4b1/2p2qP1/4r2r w - - 0 1'
 */
