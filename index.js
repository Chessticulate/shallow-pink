'use strict';

const Chess = require('./lib/chess');
const fs = require('fs');

module.exports = Chess;


const main = async function() {
    const game = new Chess();

    while (game.gameOver() === false) {
    }

    console.log('GAME OVER');
}


if (require.main === module) {
    main();
}
