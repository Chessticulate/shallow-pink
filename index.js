'use strict';

const Chess = require('./lib/chess');
module.exports = Chess;

const readline = require('readline');


function playChess() {
    const chess = new Chess();

    return new Promise(function(resolve, reject) {
        let rl = readline.createInterface(process.stdin, process.stdout)
        rl.setPrompt(`${chess}\n> `)
        rl.prompt();

        rl.on('line', function(line) {
            if (line === 'exit' || line === 'quit') {
                rl.close();
                return;
            }

            let pieceMove = line.split(' ');
            if (pieceMove.length === 2) {
                let [piece, move] = pieceMove;
                console.log(chess.move(piece, move));
                if (chess.gameOver) process.exit();
            } else {
                console.log(`invalid move`);
            }

            rl.setPrompt(`${chess}\n> `)
            rl.prompt();
        });
    })
}


async function main() {
    await playChess();
}


if (require.main === module) {
    main();
}
