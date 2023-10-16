const Chess = require('../lib/chess');
const { data, miniMax } = require('../lib/ai');

let depth;
if (!process.argv[2]) {
    depth = 3;
}
else depth = process.argv[2];
 
console.log('depth =', depth);

let chess = new Chess();

function miniMaxTestGame(chess) {
    while(!chess.gameOver) {
        console.log(chess.toString());
        console.log(chess.toFEN());
        console.log(chess.transpositionTable.size)
        // console.log(chess.legalMoves());
        // let move = currentMoves[Math.floor(Math.random() * currentMoves.length)];
        let move = miniMax(chess, depth);
        console.log(move, '->', chess.move(move));
    }
    console.log(chess.toString());
    console.log(chess.toFEN());
}

miniMaxTestGame(chess);

