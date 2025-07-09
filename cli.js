#!/usr/bin/env node
'use strict';

const Chess = require('./lib/chess');

let readline;
let runUci;

try {
    readline = require('readline');
} catch (error) {
    console.warn('readline not available — probably running in the browser');
}

try {
    runUci = require('./scripts/uci.js').runUci;
} catch (error) {
    console.warn('uci.js not available — probably running in the browser');
}

if (process.argv.includes('-uci')) {
    if (runUci) {
        runUci();
    } else {
        console.warn('Cannot run UCI mode — missing runUci function');
    }
} else {
    playChess(readline); 
}

function playChess(readline) {
    const chess = new Chess();

    if (process.argv.includes('--ai-white')) {
        chess.board.flipPerspective();
        const move = chess.suggestMove(3);
        const result = chess.move(move);
        console.log(`AI move: ${move}, result: ${result}`);
    }

    if (!readline) {
        console.warn('Interactive mode unavailable — readline not present');
        return;
    }

    return new Promise(() => {
        const rl = readline.createInterface(process.stdin, process.stdout);
        rl.setPrompt(`${chess}\n> `);
        rl.prompt();

        rl.on('line', function(line) {
            if (line === 'exit' || line === 'quit') {
                rl.close();
                return;
            }

            const result = chess.move(line);

            if (chess.gameOver) {
                console.log(`${chess}`);
                process.exit();
            }

            console.log(result);

            if (result === Chess.Status.MOVEOK || result === Chess.Status.CHECK) {
                if (process.argv.includes('--ai-black') || process.argv.includes('--ai-white')) {
                    const move = chess.suggestMove(3);
                    chess.move(move);
                    console.log(`AI move: ${move}`);
                }
            }

            rl.setPrompt(`${chess}\n> `);
            rl.prompt();
        });
    });
}
