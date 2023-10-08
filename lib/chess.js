'use strict';

const Color = require('./color');
const Board = require('./board');
const Status = require('./status');
const Rook = require('./pieces/rook');
const AI = require('./ai');
const {InvalidFENException} = require('./errors');

class GameState {
    constructor(check, prevMove, fiftyMoveCounter, states, currentState) {
        this.check = check;
        this.prevMove = prevMove;
        this.fiftyMoveCounter = fiftyMoveCounter;
        this.states = states;
        this.currentState = currentState;
    }
}


module.exports = class Chess {

    static Status = Status;
    static Color = Color;

    constructor(fenStr, states) {
        this.gameOver = false;
        this.checkmate = false;
        this.check = false;
        this.draw = false;
        this.prevMove = null;

        // history stores previous game states
        this.history = [];

        if (!fenStr) {
            this.board = new Board();
            this.fiftyMoveCounter = 0;
            this.turn = 1;
            this.states = {};
            return;
        }

        try {
            let [, turnColor,,, fiftyMoveCounter, fullMoveCounter] = fenStr.split(' ');

            this.board = new Board(fenStr);
            this.fiftyMoveCounter = parseInt(fiftyMoveCounter);
            this.turn = (parseInt(fullMoveCounter) - 1) * 2 + (turnColor === 'w' ? 1 : 2);
            this.states = states ? states : {};
            this.checkGameStatus();
        } catch (err) {
            throw new InvalidFENException();
        }
    }

    undo() {
        // might need a better way of handling the opening state where there is no history
        if (this.history.length === 0) {
            return;
        }
        let prevState = this.history.pop();
        this.turn--;
        this.gameOver = false;
        this.checkmate = false;
        this.draw = false;
        this.check = prevState.check;
        this.prevMove = prevState.prevMove;
        this.fiftyMoveCounter = prevState.fiftyMoveCounter;
        // decrement state visits 
        if (prevState.currentState) {
            this.states[prevState.currentState] = this.states[prevState.currentState] - 1;
        }
        // restore old state map
        else {
            this.states = prevState.states;
        }
        this.board.undo();
    }

    recordMove(moveStr) {
        if (this.checkmate) {
            moveStr += '#';
        } else if (this.check) {
            moveStr += '+';
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

        let hash = this.board.toFEN();

        // record game state, track stalemate conditions
        if (moveStr.includes('x') || moveStr[0] === moveStr[0].toLowerCase()) {
            this.history.push(new GameState(this.check, this.prevMove, this.fiftyMoveCounter, this.states, null));
            this.states = {};
            this.fiftyMoveCounter = 0;
        }
        else {
            this.history.push(new GameState(this.check, this.prevMove, this.fiftyMoveCounter, null, hash));
            this.fiftyMoveCounter++;
        }         

        // increment state map occurrences
        this.states[hash] = 1 + (this.states[hash] | 0);

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
            return Status.FIFTYMOVERULE;
        }

        // check for threefold repetition
        let draw = false;
        for (const value of Object.values(this.states)) {
            if (value > 2) draw = true;
        }
        if (draw) {
            this.draw = true;
            this.gameOver = true;
            return Status.THREEFOLDREPETITION;
        }

        // insufficient material
        if (this.board.insufficientMaterial()) {
            this.draw = true;
            this.gameOver = true;
            return Status.INSUFFICIENTMATERIAL;
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

    generateMoveStrs(piece, x, y) {
        let pieceType = piece.toFEN().toUpperCase();
        let capture = false;
    
        if (this.board.get(x, y) || 
            (pieceType === 'P' && Math.abs(piece.x - x) === Math.abs(piece.y - y))) {
            capture = true;
        }
    
        // check if move string needs to be disambiguated
        let ambiguous = false, ambigX = false, ambigY = false;
        this.board.teamMap[piece.color].forEach(currPiece => {
            if (currPiece.toFEN() === piece.toFEN() &&
                currPiece !== piece &&
                currPiece.evaluate(this.board, x, y)) {
                ambiguous = true;
                if (currPiece.x === piece.x) {
                    ambigX = true;
                }
                if (currPiece.y === piece.y) {
                    ambigY = true;
                }
            }
        });
    
        let origFile = this.board.xToFile[piece.x];
        let origRank = this.board.yToRank[piece.y];
        let destFile = this.board.xToFile[x];
        let destRank = this.board.yToRank[y];
    
        let disambiguate = '';
        if (ambiguous) {
            if (ambigX && ambigY) {
                disambiguate = origFile + origRank;
            }
            else if (ambigX) {
                disambiguate = origRank;
            }
            else {
                disambiguate = origFile;
            }
        }
    
        if (pieceType === 'P') {
            if (y === 0 || y === 7) {
                let moveStrs = [];
                
                // omitting Rook and Bishop Promotions
                ['Q', 'N'].forEach(newType => {
                    moveStrs.push(`${capture?origFile+'x':''}${destFile}${destRank}=${newType}`);
                });
                return moveStrs;
            }
            return [`${capture?origFile+'x':''}${destFile}${destRank}`];
        }
        return [`${pieceType}${disambiguate}${capture?'x':''}${destFile}${destRank}`];
    }

    legalMoves() {
        let color = this.turn % 2 ? Color.WHITE : Color.BLACK;
        let pieces = [...this.board.teamMap[color]];
        let moveSet = [];
        let moveStrs = null;
        let status = null;

        pieces.forEach(piece => {
            piece.moveSet.forEach(move => {
                let x = move[0] + piece.x, y = move[1] + piece.y;
                if (!piece.evaluate(this.board, x, y)) {
                    return;
                }

                moveStrs = this.generateMoveStrs(piece, x, y);
    
                status = this.move(moveStrs[0]);
                if (![Status.INVALIDMOVE, Status.STILLINCHECK, Status.PUTSINCHECK].includes(status)) {
                    moveStrs.forEach(moveStr => {
                        moveSet.push(moveStr);
                    });
                    this.undo();
                }
            });
        });

        // castling is not in any pieces move set and is handled by the board instead
        // has to be seperately added to the list of legal moves.
        let castleFEN = this.board.castleState.split('');
        if (!(castleFEN[0] === '-')) {

            let castleMoves = [];

            if (color === Color.WHITE) {
                if (castleFEN.includes('K')) castleMoves.push('O-O');
                if (castleFEN.includes('Q')) castleMoves.push('O-O-O');
            }
            else {
                if (castleFEN.includes('k')) castleMoves.push('O-O');
                if (castleFEN.includes('q')) castleMoves.push('O-O-O');
            }
            
            castleMoves.forEach(castle => {
                status = this.move(castle);
                if (![Status.INVALIDMOVE, Status.STILLINCHECK, Status.PUTSINCHECK].includes(status)) {
                    moveSet.push(castle);
                    this.undo();
                }    
            });
        }
        return this.sortMoves(moveSet);
    }
	
    sortMoves(moves) {
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].includes('x') || moves[i].includes('=')) {
                moves.unshift(moves.splice(i, 1)[0]);
            }
        }	
        return moves;
    }

    flipPerspective() {
        this.board.flipPerspective();
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
        if (enPassantPiece) {
            let enPassfile = this.board.xToFile[enPassantPiece.x];
            let enPassRank = enPassantPiece.color === Color.WHITE ? '3' : '6';
            ep = `${enPassfile}${enPassRank}`;
        }

        return `${this.board.toFEN()} ${turn} ${wc}${bc} ${ep} ${hm} ${fm}`;
    }

    suggestMove(depth) {
        return AI.miniMax(this, depth);
    }

    toString() {
        let title = '';
        if (this.gameOver) {
            title = 'game over';
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

    toJSON() {
        return JSON.stringify(
            {
                'fen': this.toFEN(),
                'states': this.states
            }
        );
    }
};
