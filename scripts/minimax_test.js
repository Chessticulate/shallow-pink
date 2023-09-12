const Chess = require('../lib/chess');
const { nodeCount, memoizedNodes, miniMax } = require('../lib/ai');

let chess = new Chess();

function miniMaxTestGame(chess) {
    let currentMoves;
    while(!chess.gameOver) {
        console.log(chess.toString());
        console.log(chess.toFEN());
        // currentMoves chess.legalMoves();
        // let move = currentMoves[Math.floor(Math.random() * currentMoves.length)];
        let move = miniMax(chess, 3);
        console.log(move, '->', chess.move(move));
    }
    console.log(chess.toString());
    console.log(chess.toFEN());
}

miniMaxTestGame(chess);

