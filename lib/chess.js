'use strict';

const Color = require('./color');
const Bishop = require('./bishop');
const King = require('./king');
const Knight = require('./knight');
const Pawn = require('./pawn');
const Queen = require('./queen');
const Rook = require('./rook');


module.exports = class Chess {
    constructor() {
        this.board = Array(8).fill().map(() => Array(8).fill(null))

        // fill board
        this.loadPieces(Color.WHITE);
        this.loadPieces(Color.BLACK);

        this.turn = 0;
        this.over = false;
    }

    gameOver() {
        return this.over;
    }

    loadPieces(color) {
        let row = color == Color.WHITE ? 6 : 1;
        for (let col = 0; col < 8; col++) {
            this.board[row][col] = new Pawn('pawn' + String.fromCharCode(65 + col), color, row, col);
        }

        row = color == Color.WHITE ? 7 : 0;
        let col = color == Color.WHITE ? 7 : 0;
        let dir = color == Color.WHITE ? -1 : 1;

        this.board[row][0] = new Rook('rookQ', color, row, 0);
        this.board[row][1] = new Knight('knightQ', color, row, 1);
        this.board[row][2] = new Bishop('bishopQ', color, row, 2);
        this.board[row][3] = new Queen('queen', color, row, 3);
        this.board[row][4] = new King('king', color, row, 4);
        this.board[row][5] = new Bishop('bishopK', color, row, 5);
        this.board[row][6] = new Knight('knightK', color, row, 6);
        this.board[row][7] = new Rook('rookK', color, row, 7);
    }

    doMove(piece, address) {
        console.log(`Moving ${piece} to ${address}`);
        this.turn++;
    }

    toString() {
        // horizontal line that divides the ranks '----'
        let line = Array(17).fill('-');
        line[17] = '\n';

        // alternating vertical divider and empty space '| | |'
        let rank = Array(17).fill().map((_, i) => { return i % 2 ? ' ' : '|' });
        rank[17] = '\n';

        let boardStrArr = [];
        for (let row = 0; row < 17; row++) {
            if (row % 2 == 0) {
                boardStrArr[row] = line;
            } else {
                // need to copy rank since we may modify
                boardStrArr[row] = [...rank];
                const boardRow = Math.floor(row/2);
                for (let col = 1, boardCol = 0; boardCol < 8; col+=2,boardCol++) {
                    // replace ' ' with piece if present
                    boardStrArr[row][col] = this.board[boardRow][boardCol] || ' ';
                }
            }
        }

        return boardStrArr.map(row => row.join('')).join('');
    }
}
