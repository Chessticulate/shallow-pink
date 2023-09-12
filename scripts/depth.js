const Chess = require('../lib/chess');
const { nodeCount, memoizedNodes, miniMax, prunedNodes } = require('../lib/ai');

let depth;
if (!process.argv[2]) {
    depth = 3;
}
else depth = process.argv[2];

console.log('depth =', depth);

let chess = new Chess();

currentMoves = chess.legalMoves();
console.log("best move: ", miniMax(chess, depth));
console.log("nodes visited: ", nodeCount);
console.log("nodes pruned: ", prunedNodes);
console.log("nodes memoized: ", memoizedNodes);

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
