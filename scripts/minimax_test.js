const Chess = require('../lib/chess');
const { nodeCount, memoizedNodes, miniMax } = require('../lib/ai');

let depth;
if (!process.argv[2]) {
    depth = 2;
}
else depth = process.argv[2];
 
console.log('depth =', depth);

let chess = new Chess();

function miniMaxTestGame(chess) {
    let currentMoves;
    while(!chess.gameOver) {
        console.log(chess.toString());
        console.log(chess.toFEN());
        // currentMoves chess.legalMoves();
        // let move = currentMoves[Math.floor(Math.random() * currentMoves.length)];
        let move = miniMax(chess, depth);
        console.log(move, '->', chess.move(move));
    }
    console.log(chess.toString());
    console.log(chess.toFEN());
}

miniMaxTestGame(chess);

