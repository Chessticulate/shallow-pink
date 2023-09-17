'use strict';

const Chess = require('./lib/chess');
module.exports = Chess;

const readline = require('readline');


function playChess() {
    const chess = new Chess();

    if (process.argv.includes('--ai-white')) {
        let move = chess.suggestMove(3);
        let result = chess.move(move);
        console.log(`AI move: ${move}, result: ${result}`);
    }

    return new Promise(function() {
        let rl = readline.createInterface(process.stdin, process.stdout);
        rl.setPrompt(`${chess}\n> `);
        rl.prompt()

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
