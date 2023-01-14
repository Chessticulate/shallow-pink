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
        this.fiftyMoveCounter = 0;
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
            // reset state map for threefold repetition
            this.states = new Map();
        }

        if (moveStr.includes('x') || moveStr[0] === moveStr[0].toLowerCase()) {
            // reset fifty move rule counter
            this.fiftyMoveCounter = 0;
        }
        else this.fiftyMoveCounter++;

        // fifty move rule check
        if (this.fiftyMoveCounter > 99) {
            this.draw = true;
            this.gameOver = true;
            this.recordMove(moveStr);
            return Status.DRAW;
        }

        // increment state map occurrences
        let hash = this.board.stateHash();
        this.states.set(hash, 1 + (this.states.get(hash) | 0));

        // check for threefold repetition
        let draw = false;
        for (const [key, value] of this.states.entries()) {
            if (value > 2) draw = true;
        }
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

    toFEN() {
        let turn = `${this.turn % 2 ? 'w' : 'b'}`;
        let wc = '';    
        let bc = '';
        let ep = '-';
        let hm = this.fiftyMoveCounter;
        let fm = Math.round(this.turn / 2);

        // if King has not yet moved, check rooks
        if(this.board.whiteKing.firstMove) {
            // seperately check rooks firstMove
            if (this.board.get(7, 7).firstMove) {
                wc = 'K';
            }
            if (this.board.get(0, 7).firstMove) {
                wc = `${wc}Q`;
            }
        }  
        if (this.board.blackKing.firstMove) {
            if (this.board.get(7, 0).firstMove) {
                bc = 'k';
            }
            if (this.board.get(0, 0).firstMove) {
                bc = `${bc}q`;
            }
        }
        if (this.board.enPassantable) {
            let enPassfile = this.history[this.history.length -1][0];
            let enPassRank = this.board.enPassantable.color === Color.WHITE ? '3' : '6';             
            ep = `${enPassfile}${enPassRank}`;
        }      

        return `${this.board.toFEN()} ${turn} ${wc}${bc} ${ep} ${hm} ${fm}`;
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
