'use strict';

const Chess = require('./lib/chess');
module.exports = Chess;

const readline = require('readline');


function playChess() {
    const chess = new Chess();

    return new Promise(function(resolve, reject) {
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

            rl.setPrompt(`${chess}\n> `);
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
