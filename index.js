'use strict';

const Chess = require('./lib/chess');
const fs = require('fs');

module.exports = Chess;


const usage = () => console.log(`${process.argv[0]} ${process.argv[1]} <path/to/input/file>`);


const main = (moves) => {
    const game = new Chess();

    while (game.gameOver() === false && game.turn < moves.length) {
        const [piece, address] = moves[game.turn];
        game.doMove(piece, address);
    }

    console.log('GAME OVER');
}

if (require.main === module) {
    if (process.argv.length !== 3) {
        usage();
        process.exit(1);
    }

    const moves = fs.readFileSync(process.argv[2])
        .toString()
        .replaceAll('\r\n', '\n')  // in case you have windows' line endings
        .split('\n')
        .filter(line => line.includes(' '))
        .map(line => line.split(' '));

    main(moves);
}
