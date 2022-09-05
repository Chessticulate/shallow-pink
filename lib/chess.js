'use strict';

const Color = require('./color');
const Board = require('./board');
const Status = require('./status');
const AddressMaps = require('./addressMaps');


module.exports = class Chess {
    constructor() {
        this.board = new Board();
        this.turn = 1;
        this.gameOver = false;
        this.stalemate = false;
        this.checkmate = false;
        this.check = false;

        // these should be moved into a local object in move()
        this.ambiguous = [];
        this.address = null;
        this.history = [];
        this.piece = null;
    }

    move(pieceId, address) {
        if (this.gameOver) {
            return Status.GAMEOVER;
        }

        let currColor = this.turn % 2 ? Color.WHITE : Color.BLACK;
        let otherColor = this.turn % 2 ? Color.BLACK : Color.WHITE;

        // find piece
        let piece = this.board.getById(pieceId, currColor);
        if (piece === null) {
            return Status.PIECENOTFOUND;
        }
        this.piece = piece;
        this.orig = `${AddressMaps.xToFile[piece.x]}${AddressMaps.yToRank[piece.y]}`;

        // translate address to array indices
        let coords;
        if ((coords = this.parseAddress(address)) === null) {
            return Status.INVALIDADDRESS;
        }
        const [x, y] = coords;
        this.dest = dest;

        // check that desired move is valid
        if (piece.evaluate(this.board, x, y) === false) {
            return Status.INVALIDMOVE;
        }

        // place piece, check if current player is in check
        this.capture = this.board.move(piece, x, y);
        if (this.board.checkForCheck(currColor)) {
            this.board.undo();
            if (this.check) {
                return Status.STILLINCHECK;
            }
            return Status.PUTSINCHECK;
        }

        // committing to the move
        let status = Status.MOVEOK;
        piece.isFirstMove = false;
        this.turn++;
        this.ambiguous = piece.ambiguous(this.board, x, y);

        // check if other team is in check
        if (this.board.checkForCheck(otherColor)) {
            this.check = true;
            // check mate?
            if (this.board.checkForMate(otherColor)) {
                this.checkmate = true;
                this.gameOver = true;
                status = Status.CHECKMATE;
            }
        } else {
            this.check = false;
        }

        // check for stalemate
        if (this.board.checkForStalemate(otherColor)) {
            this.stalemate = true;
            this.gameOver = true;
            status = Status.STALEMATE;
        }

        const notation = this.generateNotation();

        if (this.turn % 2 === 1) {
            this.history.push(notation);
        }
        else {
            let prevNotation = this.history.pop();
            this.history.push(`${prevNotation} ${notation}`);
        }

        return status;
    }

    parseAddress(address) {
        if (address.length != 2) {
            return null;
        }

        const file = AddressMaps.fileToX[address[0].toUpperCase()];
        const rank = AddressMaps.rankToY[address[1]];

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

    getPrefix() {
        let sameFile = false, sameRank = false;

        for (let i = 0; i < this.ambiguous.length; i++) {
            if (this.ambiguous[i].x == this.orig[0]) {
                sameFile = true;
                break;
            }
        }

        for (let i = 0; i < this.ambiguous.length; i++) {
            if (this.ambiguous[i].y == this.orig[1]) {
                sameRank = true;
                break;
            }
        }

        if (sameFile && sameRank) {
            return this.orig;
        }
        if (sameFile) {
            return this.orig[1];
        }
        if (sameRank) {
            return this.orig[0];
        }
        return '';
    }

    generateNotation() {
        let suffix = '';
        let prefix = this.getPrefix();
        let capture = this.capture ? 'x' : '';
        if (this.check) {
            suffix = '+';
        }
        if (this.checkmate) {
            suffix = '#';
        }

        if (typeof(this.piece) === 'Pawn') {
            if (this.capture) {
                prefix = this.orig[0];
            }
        }
        else if (typeof(this.piece) === 'Rook') {
            prefix = `R${prefix}`;
        }
        else if (typeof(this.piece) === 'Knight') {
            prefix = `N${prefix}`;
        }
        else if (typeof(this.piece) === 'Bishop') {
            prefix = `B${prefix}`;
        }
        else if (typeof(this.piece) === 'Queen') {
            prefix = `Q${prefix}`;
        }
        else if (typeof(this.piece) === 'King') {
            prefix = `K${prefix}`;
        }

        return `${prefix}${capture}${this.dest}${suffix}`;
    }
}
