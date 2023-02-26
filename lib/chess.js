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


class GameState {
    constructor(check, prevMove, fiftyMoveCounter, states) {
        this.check = check;
        this.prevMove = prevMove;
        this.fiftyMoveCounter = fiftyMoveCounter;
        this.states = states;
    }
}


module.exports = class Chess {
    constructor(fenStr, states) {
        this.gameOver = false;
        this.checkmate = false;
        this.check = false;
        this.draw = false;
        this.prevMove = null;
        this.prevState = null;

        if (!fenStr) {
            this.board = new Board();
            this.fiftyMoveCounter = 0;
            this.turn = 1;
            this.states = new Map();
            return;
        }

        let [, turnColor,,, fiftyMoveCounter, fullMoveCounter] = fenStr.split(" ");

        this.board = new Board(fenStr);
        this.fiftyMoveCounter = parseInt(fiftyMoveCounter);
        this.turn = (parseInt(fullMoveCounter) - 1) * 2 + (turnColor === "w" ? 1 : 2);
        this.states = states ? states : new Map();
        this.checkGameStatus();
    }

    undo() {
        if (this.prevState === null) {
            return;
        }
        this.turn--;
        this.gameOver = false;
        this.checkmate = false;
        this.draw = false;
        this.check = this.prevState.check;
        this.prevMove = this.prevState.prevMove;
        this.fiftyMoveCounter = this.prevState.fiftyMoveCounter;
        this.states = this.prevState.states;
        this.board.undo(false);

        this.prevState = null;
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

        // save game state for undo()
        this.prevState = new GameState(this.check, this.prevMove, this.fiftyMoveCounter, this.states);

        if (moveStr.includes('x') || moveStr[0] === moveStr[0].toLowerCase()) {
            // reset fifty move rule counter/three fold repetition
            this.fiftyMoveCounter = 0;
            this.states = new Map();
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
        let otherColor = this.turn % 2 ? Color.WHITE : Color.BLACK;

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
            if (this.board.get(7, 7) instanceof Rook && this.board.get(7, 7).firstMove) {
                wc = 'K';
            }
            if (this.board.get(0, 7) instanceof Rook && this.board.get(0, 7).firstMove) {
                wc = `${wc}Q`;
            }
        }  
        if (this.board.blackKing.firstMove) {
            if (this.board.get(7, 0) instanceof Rook && this.board.get(7, 0).firstMove) {
                bc = 'k';
            }
            if (this.board.get(0, 0) instanceof Rook && this.board.get(0, 0).firstMove) {
                bc = `${bc}q`;
            }
        }
        // if both castling sides are null, set wc to -
        if(!wc && !bc) {
            wc = '-';
        }

        let enPassantPiece = this.board.enPassantList[this.board.enPassantList.length - 1];

        if (this.board.enPassantList.length > 0) {
            let enPassfile = xToFile[enPassantPiece.x];
            let enPassRank = enPassantPiece.color === Color.WHITE ? '3' : '6';
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
