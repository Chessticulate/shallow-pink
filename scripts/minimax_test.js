const Chess = require('../lib/chess');
const fs = require('fs');
const { miniMax } = require('../lib/ai');

let depth;
if (!process.argv[2]) {
    depth = 3;
}
else depth = process.argv[2];
 
console.log('depth =', depth);

let book = fs.readFileSync('../books/Performance.bin');

let chess = new Chess(null,null,book);

function miniMaxTestGame(chess) {
    while(!chess.gameOver) {
        console.log(chess.toString());
        console.log(chess.toFEN());
        console.log(chess.board.hash);
        // console.log('key: ', chess.key);
        // console.log(chess.legalMoves());
        // let move = currentMoves[Math.floor(Math.random() * currentMoves.length)];
        let move = miniMax(chess, depth);
        console.log(move, '->', chess.move(move));
    }
    console.log(chess.toString());
    console.log(chess.toFEN());
}

miniMaxTestGame(chess);

