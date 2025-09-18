'use strict';

const Color = require('./color');
const Board = require('./board');
const Status = require('./status');
const King = require('./pieces/king');
const Pawn = require('./pieces/pawn');
const Rook = require('./pieces/rook');
const AI = require('./ai');
const { InvalidFENException } = require('./errors');
const { uciToSan, sanToUci } = require('./utils/notation');

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

    // tpt table needs to be added to the constructor as well eventually
    constructor(fenStr, states, book, table) {
        this.gameOver = false;
        this.checkmate = false;
        this.check = false;
        this.draw = false;
        this.prevMove = null;
        this.lastOrig = null;
        this.lastDest = null;
        this.table = table ? table : new Map();

        // book can be null
        this.book = book;

        // fen stores just the board fen for use in the statehash, and the transposition table
        // setting it as an instance variable helps prevent generating fen more than once per move

        // history stores previous game states
        this.history = [];
        
        // search only history
        this.searchStack = [];

        if (!fenStr) {
            this.board = new Board();
            this.fiftyMoveCounter = 0;
            this.turn = 1;
            this.turnColor = Color.WHITE;
            this.states = new Map();
            return;
        }

        try {
            let [, turnColor, , , fiftyMoveCounter, fullMoveCounter] =
        fenStr.split(' ');

            this.board = new Board(fenStr);
            this.fiftyMoveCounter = parseInt(fiftyMoveCounter);
            this.turn =
        (parseInt(fullMoveCounter) - 1) * 2 + (turnColor === 'w' ? 1 : 2);
            this.turnColor = turnColor === 'w' ? Color.WHITE: Color.BLACK;
            this.states = states ? states : new Map();
            this.checkGameStatus();
        } catch (err) {
            throw new InvalidFENException();
        }
    }

    sideToMove() { return (this.turn & 1) ? Color.WHITE : Color.BLACK; }

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
            this.states.set(
                prevState.currentState,
                this.states.get(prevState.currentState) - 1,
            );
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

    // uci compatible move function
    // for compliance with lichess api or scid or any other engine to engine interaction 
    moveUCI(uci) {
        const san = uciToSan(this, uci); 
        return sanToUci(this, this.move(san));
    }

    move(moveStr) {
        if (this.gameOver) {
            return Status.GAMEOVER;
        }
        let currColor = this.sideToMove();

        // legalMoves now includes + and # suffix to optimize search
        // these need to be stripped when being submitted to chess.move
        moveStr = moveStr.replace(/[+#]/g, ''); // Qxd5# --> Qxd5

        let moveObj;
        if (!(moveObj = this.board.buildMoveSAN(moveStr, currColor))) {
            return Status.INVALIDMOVE;
        }

        let [moves, orig, dest] = moveObj;
        this.lastOrig = orig;
        this.lastDest = dest;

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
        this.turnColor = this.turnColor === Color.WHITE ? Color.BLACK : Color.WHITE;

        // record game state, track stalemate conditions
        if (moveStr.includes('x') || moveStr[0] === moveStr[0].toLowerCase()) {
            this.history.push(
                new GameState(
                    this.check,
                    this.prevMove,
                    this.fiftyMoveCounter,
                    this.states,
                    null,
                ),
            );
            this.states = new Map();
            this.fiftyMoveCounter = 0;
        } else {
            this.history.push(
                new GameState(
                    this.check,
                    this.prevMove,
                    this.fiftyMoveCounter,
                    null,
                    this.board.hash,
                ),
            );
            this.fiftyMoveCounter++;
        }

        // increment state map occurrences
        this.states.set(this.board.hash, 1 + (this.states.get(this.board.hash) | 0));

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
        for (const [, value] of this.states.entries()) {
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

    // search only move functions
    push(move) {
        this.searchStack.push({
            turn: this.turn,
            turnColor: this.turnColor,
            prevMove: this.prevMove,
        });

        const currColor = (this.turn % 2) ? Color.WHITE : Color.BLACK;

        let lowLevelMove = move;
        if (typeof move === 'string') {
            const clean = move.replace(/[+#]/g, '');
            const built = this.board.buildMoveSAN(clean, currColor);
            if (!built) throw new Error('push(): cannot build move from string');
            lowLevelMove = built[0];
        }

        this.board.make(lowLevelMove);
        this.turn++;
        this.turnColor = (this.turnColor === Color.WHITE) ? Color.BLACK : Color.WHITE;
    } 

    pop() {
        // Exact inverse of push. No legality/status/history.
        if (!this.searchStack || this.searchStack.length === 0) return;

        this.board.unmake();                 // revert board state first

        const s = this.searchStack.pop(); // restore small Chess-layer fields
        this.turn      = s.turn;
        this.turnColor = s.turnColor;
        this.prevMove  = s.prevMove;

        // ensure UI flags don’t leak into search assumptions
        this.gameOver = false;
        this.checkmate = false;
        this.draw = false;
        this.check = false;
        this.lastOrig = null;
        this.lastDest = null;
    }

    // ---------------------------------------------------------
    // generateMoveStrs and legalMoves are now slightly obsolete
    // legalMovesAI generates a list of pseudo legal move objects 
    // [ piece, dest, promo, iscapture, ispromo ] 
    // both gms and lm are now only used for creating a list of human readable legal moves
    // ai uses legalMovesAI

    generateMoveStrs(piece, x, y) {
        let pieceType = piece.toFEN().toUpperCase();
        let capture = false;

        if (
            this.board.get(x, y) ||
      (pieceType === 'P' && Math.abs(piece.x - x) === Math.abs(piece.y - y))
        ) {
            capture = true;
        }

        // check if move string needs to be disambiguated
        let ambiguous = false,
            ambigX = false,
            ambigY = false;
        this.board.teamMap[piece.color].forEach((currPiece) => {
            if (currPiece.toFEN() === piece.toFEN() &&
                currPiece !== piece &&
                currPiece.evaluate(this.board, x, y)
            ) {
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
            } else if (ambigX) {
                disambiguate = origRank;
            } else {
                disambiguate = origFile;
            }
        }

        if (pieceType === 'P') {
            if (y === 0 || y === 7) {
                let moveStrs = [];

                // omitting Rook and Bishop Promotions
                ['Q', 'N'].forEach((newType) => {
                    moveStrs.push(
                        `${capture ? origFile + 'x' : ''}${destFile}${destRank}=${newType}`,
                    );
                });
                return moveStrs;
            }
            return [`${capture ? origFile + 'x' : ''}${destFile}${destRank}`];
        }
        return [
            `${pieceType}${disambiguate}${capture ? 'x' : ''}${destFile}${destRank}`,
        ];
    }

    legalMoves(piece) {
        let pieces;
        let moveSet = [];
        let moveStrs = null;
        let status = null;
        let suffix = '';
        let color = this.turn % 2 ? Color.WHITE : Color.BLACK;
        if (!piece) {
            pieces = [...this.board.teamMap[color]];
        } else if (piece.color != color) {
            return [];
        } else {
            pieces = [piece];
        }

        pieces.forEach((piece) => {
            piece.moveSet.forEach((move) => {
                let x = move[0] + piece.x,
                    y = move[1] + piece.y;
                if (!piece.evaluate(this.board, x, y)) {
                    return;
                }

                moveStrs = this.generateMoveStrs(piece, x, y);

                status = this.move(moveStrs[0]);
                suffix = status === Status.CHECK ?
                    '+' : status === Status.CHECKMATE ?
                        '#' : '';

                if (![Status.INVALIDMOVE,
                    Status.STILLINCHECK,
                    Status.PUTSINCHECK].includes(status)
                ) {
                    if (suffix) {
                        moveStrs = moveStrs.map((move) => move + suffix);
                    }
                    moveStrs.forEach((moveStr) => {
                        moveSet.push(moveStr);
                    });
                    this.undo();
                }
            });
        });

        // if check is true, castling is not legal
        if ((!piece || piece instanceof King) && !this.check) {
            // castling is not in any pieces move set and is handled by the board instead
            // has to be seperately added to the list of legal moves.
	
            let castleFEN = this.board.castleState.split('');
            if (!(castleFEN[0] === '-')) {
                let castleMoves = [];

                if (color === Color.WHITE) {
                    if (castleFEN.includes('K')) castleMoves.push('O-O');
                    if (castleFEN.includes('Q')) castleMoves.push('O-O-O');
                } else {
                    if (castleFEN.includes('k')) castleMoves.push('O-O');
                    if (castleFEN.includes('q')) castleMoves.push('O-O-O');
                }

                castleMoves.forEach((castle) => {
                    status = this.move(castle);
                    suffix = status === Status.CHECK ? 
                        '+' : status === Status.CHECKMATE ?
                            '#' : '';
                    if (![Status.INVALIDMOVE,
                        Status.STILLINCHECK,
                        Status.PUTSINCHECK].includes(status)
                    ) {
                        if (suffix) {
                            castle += suffix;
                        }
                        moveSet.push(castle);
                        this.undo();
                    }
                });
            }
        }
        return this.sortMoves(moveSet);
    }

    // --------------------------------------------------------------------

    // PSEUDO-LEGAL generator (no self-check test, no make/unmake)
    // opts.capturesPromosOnly: when true, emit only captures and promotions
    // used by qsearch to find "quiet" positions with no captures
    legalMovesAI(opts = {}) {
        const { capturesPromosOnly = false } = opts;
        const color = (this.turn % 2) ? Color.WHITE : Color.BLACK;

        const moves = [];
        const team = this.board.teamMap[color];

        for (const piece of team) {
            if (!piece || piece.x < 0 || piece.y < 0) continue;

            for (const [dx, dy] of piece.moveSet) {
                const x = piece.x + dx, y = piece.y + dy;
                if (!piece.evaluate(this.board, x, y)) continue;

                const target = this.board.get(x, y);
                // capture detection (incl. EP)
                let isCapture = !!target;
                if (!isCapture && piece instanceof Pawn && piece.x !== x) {
                    const adj = this.board.get(x, piece.y);
                    isCapture = (adj instanceof Pawn && adj.enPassantable);
                }

                const isPromotion = (piece instanceof Pawn) && (y === 0 || y === 7);
                if (capturesPromosOnly && !(isCapture || isPromotion)) continue;

                if (isPromotion) {
                    moves.push({ piece, destX: x, destY: y, promo: 'Q', isCapture: !!isCapture, isPromotion: true });
                    moves.push({ piece, destX: x, destY: y, promo: 'N', isCapture: !!isCapture, isPromotion: true });
                } else {
                    moves.push({ piece, destX: x, destY: y, promo: null,  isCapture: !!isCapture, isPromotion: false });
                }
            }
        }

        // PSEUDO castling: require rook present, both unmoved, path clear.
        if (!capturesPromosOnly) {
            const king = color === Color.WHITE ? this.board.whiteKing : this.board.blackKing;
            if (king && king.firstMove) {
                const y = king.y;

                const rookK = this.board.get(7, y);
                if (rookK instanceof Rook && rookK.firstMove && this.board.pathClear(king.x, y, 7, y)) {
                    moves.push({ piece: king, destX: king.x + 2, destY: y, promo: null, isCapture: false, isPromotion: false, isCastle: true });
                }
                const rookQ = this.board.get(0, y);
                if (rookQ instanceof Rook && rookQ.firstMove && this.board.pathClear(king.x, y, 0, y)) {
                    moves.push({ piece: king, destX: king.x - 2, destY: y, promo: null, isCapture: false, isPromotion: false, isCastle: true });
                }
            }
        }

        return moves;
    }

    // validate pseudo legal move
    validate(entry) {
        const color = (this.turn & 1) ? Color.WHITE : Color.BLACK;

        // Castling: use the fully validated string path
        if (entry.isCastle || (entry.piece.toFEN().toUpperCase() === 'K' &&
            Math.abs(entry.destX - entry.piece.x) === 2)) {
            const tag = (entry.destX > entry.piece.x) ? 'O-O' : 'O-O-O';
            return this.board.castle(tag, color); // [moves, orig, dest]
        }

        return this.board.buildMoveCoords(
            entry.piece, entry.destX, entry.destY, entry.promo || null
        ); 
    }

    sortMoves(moves) {
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].includes('x') ||
            moves[i].includes('=') ||
            moves[i].includes('O') ||
            moves[i].includes('+') ||
            moves[i].includes('#')
            ) {
                moves.unshift(moves.splice(i, 1)[0]);
            }
        }
        return moves;
    }

    toFEN() {
        let turn = `${this.turn % 2 ? 'w' : 'b'}`;
        let ep = '-';
        let castle;
        let hm = this.fiftyMoveCounter;
        let fm = Math.round(this.turn / 2);
        
        if (!this.board.castleState) {
            castle = '-'; 
        } else castle = this.board.castleState;

        let enPassantPiece = this.board.enPassantList[this.board.enPassantList.length - 1];
        if (enPassantPiece) {
            let enPassfile = this.board.xToFile[enPassantPiece.x];
            let enPassRank = enPassantPiece.color === Color.WHITE ? '3' : '6';
            ep = `${enPassfile}${enPassRank}`;
        }

        return `${this.board.toFEN()} ${turn} ${castle} ${ep} ${hm} ${fm}`;
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
        return JSON.stringify({
            fen: this.toFEN(),
            states: this.states,
        });
    }
};
