/* chess.js */
'use strict';

const Color = require('./color');
const Bishop = require('./bishop');
const King = require('./king'):
const Knight = require('./knight');
const Pawn = require('./pawn');
const Queen = require('./queen');
const Rook = require('./rook');


export default const Chess = class {
    constructor() {
        this.board = Array(8).fill().map(() => Array(8).fill(null))

        // fill board
        makePieces(Color.WHITE);
        makePieces(Color.BLACK);

        this.turn = 0;
    }

    loadPieces(color) {
        // pawns
        let i = color.WHITE ? 1 : 6;

        for (let j = 0; j < 8; j++) {
            this.board[i][j] = new Pawn(color, j, i);
        }

    }

    toString() {

        // horizontal line that divides the board '----'
        let line = Array(17).fill('-');

        // alternating vertical divider and empty space '| | |'
        let rank = Array(17).fill().map((_, i) => { return i % 2 ? ' ' : '|' });

        boardStrArr = [];
        for (let row = 0; i < 17; i++) {
            if (row % 2 == 0) {
                boardStrArr[row] = line;
            } else {
                // need to copy rank since we may modify
                boardStrArr[row] = [...rank];
                const boardRow = Math.floor(row/2);
                for (let col = 0, boardCol = 0; boardCol < 8; col+=2,boardCol++) {
                    // replace ' ' with piece if present
                    boardStrArr[row][col] = this.board[boardRow][boardCol] || ' ';
                }
            }
        }

        return boardChars.map(row => row.join('')).join('\n')
    }
}
