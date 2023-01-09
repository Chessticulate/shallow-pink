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
        this.checkmate = false;
        this.check = false;
        this.draw = false;
        this.enPassantable = null;
        this.history = [];
        this.states = new Map();
    }

    recordMove(moveStr) {
        if (this.checkmate) {
            moveStr += "#";
        } else if (this.check) {
            moveStr += "+";
        }

        this.history.push(moveStr);

        if (this.gameOver) {
            if (this.checkmate) {
                this.history.push(this.turn % 2 ? "0-1" : "1-0");
            } else { // draw
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

        let moves;
        if (!(moves = this.board.buildMove(moveStr, currColor))) {
            return Status.INVALIDMOVE;
        }

        // place piece, check if current player is in check
        this.board.move(moves);
        if (this.board.checkForCheck(currColor)) {
            this.board.undo();
            if (this.check) {
                return Status.STILLINCHECK;
            }
            return Status.PUTSINCHECK;
        }

        // committing to the move
        this.turn++;

        // check if a capture has occurred
        if (moveStr.includes('x')) {
            this.states = {};
        }

        let hash = this.board.stateHash();
        this.states[hash] = 1 + (this.states[hash] | 0);

        let draw = false;

        this.states.forEach((value, key) => {
            if (value > 2) draw = true;
        });

        if (draw) {
            this.draw = true;
            this.gameOver = true;
            this.recordMove(moveStr);
            return Status.DRAW;
        }

        // insufficient material
        if(this.board.insufficientMaterial()) {
            this.draw = true;
            this.gameOver = true;
            this.recordMove(moveStr);
            return Status.DRAW;
        }

        // check if other team is in check
        if (this.board.checkForCheck(otherColor)) {
            this.check = true;
            // check mate?
            if (!this.board.canMove(otherColor)) {
                this.checkmate = true;
                this.gameOver = true;
                this.recordMove(moveStr);
                return Status.CHECKMATE;
            }
        } else {
            this.check = false;
        }

        // check for draw
        if (!this.board.canMove(otherColor)) {
            this.draw = true;
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
            if (this.draw) {
                title = `${title}: draw`;
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
