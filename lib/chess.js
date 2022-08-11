
'use strict';

const Color = require('./color');
const Board = require('./board');
const Status = require('./status');


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
        if (piece === undefined) {
            return Status.PIECENOTFOUND;
        }

        // translate address to array indices
        if ((address = this.parseAddress(address)) === null) {
            return Status.INVALIDADDRESS;
        }
        const [x, y] = address;

        // check that desired move is valid
        if (piece.evaluate(this.board, x, y) == false) {
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
                this.gameOver = true;
                return Status.CHECKMATE;
            }
        } else {
            this.check = false;
        }

        // check for stalemate
        if (this.board.checkForStalemate()) {
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

        const file = address.toUpperCase().charCodeAt(0) - 65;
        const rank = parseInt(address[1]) - 1;

        if (isNaN(rank) || file < 0 || file > 7 || rank < 0 || rank > 7) {
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
 
        return `${this.board}\n$title`;
    }
}
