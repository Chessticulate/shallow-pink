'use strict';

const Color = require('./color');
const Board = require('./board');
const Status = require('./status');
const Pawn = require('./pieces/pawn');
const Knight = require('./pieces/knight');
const Bishop = require('./pieces/bishop');
const Rook = require('./pieces/rook');
const Queen = require('./pieces/queen');
const King = require('./pieces/king');

const {xToFile} = require("./addressMaps");

module.exports = class Chess {
    constructor(fenStr, states) {
        if (!fenStr) {
            this.board = new Board();
            this.turn = 1;
            this.gameOver = false;
            this.checkmate = false;
            this.check = false;
            this.draw = false;
            this.prevMove = null;
            this.states = new Map();
            this.fiftyMoveCounter = 0;
            return;
        }

        let [, turnColor,,, fiftyMoveCounter, fullMoveCounter] = fenStr.split(" ");

        this.board = new Board(fenStr);
        this.fiftyMoveCounter = parseInt(fiftyMoveCounter);
        this.turn = parseInt(fullMoveCounter) * 2 + (turnColor === "w" ? 1 : 0);
        this.states = states ? states : new Map();
        this.checkGameStatus();
    }

    recordMove(moveStr) {
        if (this.checkmate) {
            moveStr += "#";
        } else if (this.check) {
            moveStr += "+";
        }

        this.prevMove = moveStr;
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

        // increment state map occurrences
        let hash = this.board.stateHash();
        this.states.set(hash, 1 + (this.states.get(hash) | 0));

        let status = this.checkGameStatus();
        this.recordMove(moveStr);
        return status;
    }

    checkGameStatus() {
        // fifty move rule check
        if (this.fiftyMoveCounter > 99) {
            this.draw = true;
            this.gameOver = true;
            return Status.DRAW;
        }

        // check for threefold repetition
        let draw = false;
        for (const [key, value] of this.states.entries()) {
            if (value > 2) draw = true;
        }
        if (draw) {
            this.draw = true;
            this.gameOver = true;
            return Status.DRAW;
        }

        // insufficient material
        if (this.board.insufficientMaterial()) {
            this.draw = true;
            this.gameOver = true;
            return Status.DRAW;
        }

        // check if other team is in check
        if (this.board.checkForCheck(otherColor)) {
            this.check = true;
            // check mate?
            if (!this.board.canMove(otherColor)) {
                this.checkmate = true;
                this.gameOver = true;
                return Status.CHECKMATE;
            }
        } else {
            this.check = false;
        }

        // check for draw
        if (!this.board.canMove(otherColor)) {
            this.draw = true;
            this.gameOver = true;
            return Status.STALEMATE;
        }

        // return check 
        if (this.check) {
            return Status.CHECK;
        }

        // move successful
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
            let enPassfile = xToFile[this.board.enPassantable.x];
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
