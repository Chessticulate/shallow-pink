'use strict';

const Color = require('./color');
const Board = require('./board');
const Status = require('./status');
const Pawn = require('./pieces/pawn');

module.exports = class Chess {
    constructor() {
        this.board = new Board();
        this.turn = 1;
        this.gameOver = false;
        this.stalemate = false;
        this.checkmate = false;
        this.check = false;
        this.enPassantable = null;
        this.history = [];
    }

    recordMove(moveStr) {
        if (this.checkmate) {
            moveStr += "#";
        } else if (this.check) {
            moveStr += "+";
        }

        this.history.push(moveStr);

        if (this.gameover) {
            if (this.checkmate) {
                this.history.push(this.turn % 2 ? "0-1" : "1-0");
            } else { // stalemate
                this.history.push("½–½");
            }
        }
    }

    move(moveStr) {
        if (this.gameOver) {
            return Status.GAMEOVER;
        }

        let currColor = this.turn % 2 ? Color.WHITE : Color.BLACK;
        let otherColor = this.turn % 2 ? Color.BLACK : Color.WHITE;

        if (moveStr.includes('=')) { // promotion
            if (moveStr.length !== 4 || moveStr[2] !== '=') {
                return Status.INVALIDMOVE;
            }
            if (!this.board.promote(moveStr.substr(0, 2), currColor, moveStr[3])) {
                return Status.INVALIDMOVE;
            }
        }
        else if (moveStr === 'O-O-O' || moveStr === 'O-O') { // castle
            // king cannot castle out of check 
            if (this.check) {
                return Status.INVALIDMOVE
            }
            // if king is not in check, attempt castle
            else if (!this.board.castle(moveStr, currColor)) {
                return Status.INVALIDMOVE
            }
        }
        else { // regular move
            // find list of pieces that CAN make this move
            const moveObj = this.board.buildMove(moveStr, currColor);
            if (moveObj === null) {
                return Status.INVALIDMOVE;
            }

            let piece = moveObj.pieceMoved;
            let dy = Math.abs(piece.y - y);

            // place piece, check if current player is in check
            this.board.move(piece, x, y);
            if (this.board.checkForCheck(currColor)) {
                this.board.undo();
                if (this.check) {
                    return Status.STILLINCHECK;
                }
                return Status.PUTSINCHECK;
            }

            // undo "enpassantability" of previous turn
            if (this.enPassantable) {
                this.enPassantable.enPassantable = false;
                this.enPassantable = null;
            }

            // check for enpassantability in current turn
            if (piece instanceof Pawn && piece.firstMove && dy == 2) {
                piece.enPassantable = true;
                this.enPassantable = piece;
            }

            piece.firstMove = false;
        }

        // committing to the move
        this.turn++;

        // check if other team is in check
        if (this.board.checkForCheck(otherColor)) {
            this.check = true;
            // check mate?
            if (this.board.canMove(otherColor)) {
                this.checkmate = true;
                this.gameOver = true;
                this.recordMove(moveStr);
                return Status.CHECKMATE;
            }
        } else {
            this.check = false;
        }

        // check for stalemate
        if (this.board.canMove(otherColor)) {
            this.stalemate = true;
            this.gameOver = true;
            this.recordMove(moveStr);
            return Status.STALEMATE;
        }

        // return check 
        if (this.check) {
            this.recordMove(moveStr);
            return Status.CHECK;
        }

        // move successful
        this.recordMove(moveStr);
        return Status.MOVEOK;
    }

    toString() {
        let title = "";
        if (this.gameOver) {
            title = "game over";
            if (this.stalemate) {
                title = `${title}: stalemate`;
            } else {
                const winner = this.turn % 2 ? Color.BLACK : Color.WHITE;
                title = `${title}: ${winner} won`;
            }
        } else {
            const whomst = this.turn % 2 ? Color.WHITE : Color.BLACK;
            title = `${whomst}'s turn`;
            if (this.check) {
                title = `${title}: in check`;
            }
        }
 
        return `${this.board}\n${title}`;
    }
}
