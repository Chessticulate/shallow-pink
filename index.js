#!/usr/bin/env node
'use strict';

const Chess = require('./lib/chess');
module.exports = Chess;

let readline;
let fs;

try {
    readline = require('readline');
    fs = require('fs');
} catch (error) {
    console.warn('failed to import readline -- you must be using this in a browser?');
}


function parseArgs() {
    const args = process.argv.slice(2);
    let bookPath = null;
    let aiWhite = false;
    let aiBlack = false;

    for (let i = 0; i < args.length; i++) {
        const a = args[i];

        if (a === '--ai-white') aiWhite = true;
        else if (a === '--ai-black') aiBlack = true;
        else if (a === '--book') {
            const next = args[i + 1];
            if (!next || next.startsWith('-')) {
                console.error('Error: --book needs a path (e.g. "--book ./file.bin").');
                process.exit(1);
            }
            bookPath = next;
            i++; // skip value
        }
    }

    return { bookPath, aiWhite, aiBlack };
}


function playChess() {
    const { bookPath, aiWhite, aiBlack } = parseArgs();
    let chess = null;
    let book = null;

    if (bookPath) {
        if (!fs || !fs.existsSync(bookPath)) {
            console.error(`Error: book file not found: ${bookPath}`);
            process.exit(1);
        }
        book = fs.readFileSync(bookPath);
        console.log('book loaded!');
    }
    
    // leave fen states and table null
    chess = new Chess(null, null, book, null);

    if (aiWhite) {
        // if AI is white, board should be from blacks perspective
        chess.board.flipPerspective();
        let move = chess.suggestMove(5);
        let result = chess.move(move);
        console.log(`result: ${result}`);
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
                if (aiBlack || aiWhite) {
                    let move = chess.suggestMove(5);

                    chess.move(move);
                    console.log('hash: ', chess.board.hash); 
                    console.log('fen: ', chess.toFEN()); 
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
