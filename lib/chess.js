'use strict';

const Color = require('./color');
const Board = require('./board');
const Status = require('./status');
const Pawn = require('./pieces/pawn');
const { BLACK, WHITE } = require('./color');


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
        this.turn = 1;
        this.gameOver = false;
        this.stalemate = false;
        this.checkmate = false;
        this.check = false;
        this.promotion = null;
        this.enPassantable = null;
    }

    move(moveStr) {
        if (this.gameOver) {
            return Status.GAMEOVER;
        }

        let currColor = this.turn % 2 ? Color.WHITE : Color.BLACK;
        let otherColor = this.turn % 2 ? Color.BLACK : Color.WHITE;

        // if pawn is promoted, skip regular move
        if (this.promotion) {
            let promoteTo = moveStr;
            if (!this.board.promote(this.promotion, promoteTo)) {
                return Status.INVALIDPROMOTION;
            }
            this.promotion = null;
        }
        // if castle, skip regular move
        else if (moveStr === 'O-O-O' || moveStr === 'O-O') {
            // king cannot castle out of check 
            if (this.check) {
                return Status.INVALIDMOVE
            }
            // if king is not in check, attempt castle
            else if (!this.board.castle(moveStr, currColor)) {
                return Status.INVALIDMOVE
            }
        }
        // regular move
        else {

            // identify what piece is being moved
                // piece type
                // piece instance

            // is this valid
                // general movement validity
                // ambiguity

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

            let dx = Math.abs(piece.x - x);
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

            // check for enpassantability
            if (piece instanceof Pawn && piece.firstMove && dx == 0 && dy == 2) {
                piece.enPassantable = true;
                this.enPassantable = piece;
            }

            // check for pawn promotion
            if (piece instanceof Pawn) {
                if (piece.color === WHITE && piece.y === 0) {
                    this.promotion = piece;
                    return Status.PROMOTION;
                }
                else if (piece.color === BLACK && piece.y === 7) {
                    this.promotion = piece;
                    return Status.PROMOTION;
                }
            }

            piece.firstMove = false;

            // undo "enpassantability" at end of next turn
            if (this.enPassantable && piece !== this.enPassantable) {
                this.enPassantable.enPassantable = false;
                this.enPassantable = null;
            }
        }

        // committing to the move
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

        // return check 
        if(this.check) {
            return Status.CHECK;
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
