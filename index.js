'use strict';
const Chess = require('./lib/chess');
module.exports = Chess;

let readline;

try {
    readline = require('readline');
} catch (error) {
    console.warn('failed to import readline -- you must be using this in a browser?');
}


function playChess() {
    const chess = new Chess();

    if (process.argv.includes('--ai-white')) {
        // if AI is white, board should be from blacks perspective
        chess.board.flipPerspective();
        let move = chess.suggestMove(3);
        let result = chess.move(move);
        console.log(`AI move: ${move}, result: ${result}`);
    }

    return new Promise(function() {
        let rl = readline.createInterface(process.stdin, process.stdout);
        rl.setPrompt(`${chess}\n> `);
        rl.prompt();

        rl.on('line', function(line) {
            if (line === 'exit' || line === 'quit') {
                rl.close();
                return;
            }

            let result = chess.move(line);

            if (chess.gameOver) {
                console.log(`${chess}`);
                process.exit();
            }

            console.log(result);

            if (result === Chess.Status.MOVEOK || result === Chess.Status.CHECK) {
                if (process.argv.includes('--ai-black') || process.argv.includes('--ai-white')) {
                    let move = chess.suggestMove(3);

                    chess.move(move);
                    console.log(`AI move: ${move}`);
                }
            }

            rl.setPrompt(`${chess}\n> `);
            rl.prompt();
        });
    });
}

if (require.main === module) {
    playChess(); 
}
