const Chess = require('./chess');
const { uciToSan, sanToUci } = require('./utils/notation');
const readline = require('readline');
let chess = null;

async function runUci() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    console.log('id name Shallowpink');
    console.log('id author Brian & Kyle Glaws');
    console.log('uciok');

    rl.on('line', (line) => {
        const tokens = line.trim().split(' ');

        switch (tokens[0]) {
        case 'uci': {
            break;
        }
                
        case 'isready': {
            console.log('readyok');
            break;
        }

        case 'ucinewgame': {
            break;
        }

        // only configured to work from startpos for now
        case 'position': {
            if (tokens[1] === 'startpos') {
                chess = new Chess();
                // indexOf returns -1 if move is not present
                const idx = tokens.indexOf('moves');
                if (idx !== -1) {
                    let san = '';
                    for (let i = idx + 1; i < tokens.length; i++) {
                        san = uciToSan(chess, tokens[i]);
                        chess.move(san);
                    }
                }
            }
            break;
        }

        case 'go': {
            const move = chess.suggestMove(5);
            const uci = sanToUci(chess, move);
            console.log(`bestmove ${uci}`);
            break;
        }

        case 'quit': {
            rl.close();
            process.exit(0);
            break;
        }
        }
    });
}

module.exports = { runUci };

if (require.main === module) {
    runUci();
}
