'use strict';

const Color = require('./color');
const Board = require('./board');
const Status = require('./status');


const fileMap = {
    'A': 0,
    'B': 1,
    'C': 2,
    'D': 3,
    'E': 4,
    'F': 5,
    'G': 6,
    'H': 7
};


const rankMap = {
    '1': 7,
    '2': 6,
    '3': 5,
    '4': 4,
    '5': 3,
    '6': 2,
    '7': 1,
    '8': 0
};


module.exports = class Chess {
    constructor() {
        this.board = new Board();
        this.turn = 0;
        this.gameOver = false;
        this.stalemate = false;
        this.checkmate = false;
        this.check = false;
    }

    move(pieceId, address) {
        if (this.gameOver) {
            return Status.GAMEOVER;
        }

        let currColor = this.turn % 2 ? Color.BLACK : Color.WHITE;
        let otherColor = this.turn % 2 ? Color.WHITE : Color.BLACK;

        // find piece
        let piece = this.board.getById(pieceId, currColor);
        if (piece === null) {
            return Status.PIECENOTFOUND;
        }

        // translate address to array indices
        let coords;
        if ((coords = this.parseAddress(address)) === null) {
            return Status.INVALIDADDRESS;
        }
        const [x, y] = coords;

        // check that desired move is valid
        if (piece.evaluate(this.board, x, y) === false) {
            return Status.INVALIDMOVE;
        }

        // place piece, check if current player is in check
        this.board.move(piece, x, y);
        if (this.board.checkForCheck(currColor)) {
            this.board.undo();
            if (this.check) {
                return Status.STILLINCHECK;
            }
            return Status.PUTSINCHECK;
        }

        // committing to the move
        piece.isFirstMove = false;
        this.turn++;

        // check if other team is in check
        if (this.board.checkForCheck(otherColor)) {
            this.check = true;
            // check mate?
            if (this.board.checkForMate(otherColor)) {
                this.checkmate = true;
                this.gameOver = true;
                return Status.CHECKMATE;
            }
        } else {
            this.check = false;
        }

        // check for stalemate
        if (this.board.checkForStalemate(otherColor)) {
            this.stalemate = true;
            this.gameOver = true;
            return Status.STALEMATE;
        }

        // move successful
        return Status.MOVEOK;
    }

    parseAddress(address) {
        if (address.length != 2) {
            return null;
        }

        const file = fileMap[address[0].toUpperCase()];
        const rank = rankMap[address[1]];

        if (file === undefined || rank === undefined) {
            return null;
        }

        return [file, rank];
    }

    toString() {
        let title = "";
        if (this.gameOver) {
            title = "game over";
            if (this.stalemate) {
                title = `${title}: stalemate`;
            } else {
                const winner = this.turn % 2 ? Color.WHITE : Color.BLACK;
                title = `${title}: ${winner} won`;
            }
        } else {
            const whomst = this.turn % 2 ? Color.BLACK : Color.WHITE;
            title = `${whomst}'s turn`;
            if (this.check) {
                title = `${title}: in check`;
            }
        }
 
        return `${this.board}\n${title}`;
    }
}
