'use strict';

const Color = require('./color');
const Board = require('./board');
const Status = require('./status');
const King = require('./pieces/king');
const AI = require('./ai');
const { InvalidFENException } = require('./errors');
const BB = require('./bitboard');

class GameState {
    constructor(check, prevMove, fiftyMoveCounter, states, currentState) {
        this.check = check;
        this.prevMove = prevMove;
        this.fiftyMoveCounter = fiftyMoveCounter;
        this.states = states;
        this.currentState = currentState;
    }
}

// Convert bitboard attacks/pushes into [x,y] targets for one piece
function targetsFromBitboards(board, piece) {
    const fromSq = (piece.y << 3) | piece.x;
    const ours   = piece.color === Color.WHITE ? board.bb.OCC.WHITE : board.bb.OCC.BLACK;
    const occ    = board.bb.OCC.ALL;
    let mask = 0n;

    switch (piece.toFEN().toUpperCase()) {
    case 'B': mask = BB.bishopAttacks(fromSq, occ); break;
    case 'R': mask = BB.rookAttacks(fromSq, occ);   break;
    case 'Q': mask = BB.queenAttacks(fromSq, occ);  break;
    case 'N': mask = BB.knightAttacks(fromSq);      break;
    case 'K': mask = BB.kingAttacks(fromSq);        break;

    case 'P': {
        let t = 0n;
        const dir = piece.color === Color.WHITE ? -1 : 1;

        // forward pushes
        const y1 = piece.y + dir;
        if (y1 >= 0 && y1 < 8 && board.get(piece.x, y1) === null) {
            t |= BB.BB_SQ((y1 << 3) | piece.x);
            const startRank = piece.color === Color.WHITE ? 6 : 1;
            const y2 = piece.y + 2 * dir;
            if (piece.y === startRank && board.get(piece.x, y2) === null) {
                t |= BB.BB_SQ((y2 << 3) | piece.x);
            }
        }

        // captures (incl. en passant)
        let caps = BB.pawnAttacks(fromSq, piece.color);
        while (caps) {
            const [rest, idx] = BB.popLSB(caps);
            caps = rest;
            const x = idx & 7, y = idx >> 3;

            const target = board.get(x, y);
            if (target) {
                if (target.color !== piece.color) {
                    t |= BB.BB_SQ(idx);
                }
            } else {
                // en passant: adjacent pawn on same rank was EP-enabled
                const adj = board.get(x, piece.y);
                if (adj && typeof adj.toFEN === 'function' &&
                        (adj.toFEN() === 'P' || adj.toFEN() === 'p') &&
                        adj.enPassantable && y === piece.y + dir) {
                    t |= BB.BB_SQ(idx);
                }
            }
        }

        mask = t;
        break;
    }
    }

    // cannot land on our own pieces for non-pawns
    if (piece.toFEN().toUpperCase() !== 'P') {
        mask &= ~ours;
    }

    const out = [];
    while (mask) {
        const [rest, idx] = BB.popLSB(mask);
        mask = rest;
        out.push([idx & 7, idx >> 3]);
    }
    return out;
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
        this.fen = null;

        // history stores previous game states
        this.history = [];

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

    move(moveStr) {
        if (this.gameOver) {
            return Status.GAMEOVER;
        }
        let currColor = this.turn % 2 ? Color.WHITE : Color.BLACK;

        // legalMoves now includes + and # suffix to optimize search
        // these need to be stripped when being submitted to chess.move
        moveStr = moveStr.replace(/[+#]/g, ''); // Qxd5# --> Qxd5

        let moveObj;
        if (!(moveObj = this.board.buildMove(moveStr, currColor))) {
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

    // ---------- Bitboard-driven version with BB-native legality ----------
    BBlegalMoves(piece) {
        let pieces;
        let moveSet = [];
        let color = this.turn % 2 ? Color.WHITE : Color.BLACK;

        if (!piece) {
            pieces = [...this.board.teamMap[color]];
        } else if (piece.color != color) {
            return [];
        } else {
            pieces = [piece];
        }

        pieces.forEach((p) => {
            const bbTargets = targetsFromBitboards(this.board, p);
            if (!bbTargets) return;

            for (const [x, y] of bbTargets) {
                // Self-king safety via bitboards (no move/undo)
                if (!BB.kingSafeAfter(this.board, p, x, y)) continue;

                // Build SAN(s) the same way you do today
                let moveStrs = this.generateMoveStrs(p, x, y);

                // Determine '+' via BB; confirm '#' only when needed
                let suffixes = [];
                for (const s of moveStrs) {
                    let promoLetter = null;
                    const eq = s.indexOf('=');
                    if (eq !== -1 && eq < s.length - 1) promoLetter = s[eq + 1];

                    const gives = BB.givesCheckAfter(this.board, p, x, y, { promoLetter });
                    if (!gives) {
                        suffixes.push('');
                        continue;
                    }
                    // Rare: confirm '#'
                    let status = this.move(s);
                    let suff = status === Status.CHECKMATE ? '#' : '+';
                    suffixes.push(suff);
                    this.undo();
                }

                for (let i = 0; i < moveStrs.length; i++) {
                    const suff = suffixes[i];
                    moveSet.push(suff ? (moveStrs[i] + suff) : moveStrs[i]);
                }
            }
        });

        // Castling with BB legality (no move/undo), optional '#' confirmation
        if ((!piece || piece instanceof King) && !this.check) {
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

                const king = color === Color.WHITE ? this.board.whiteKing : this.board.blackKing;
                const y = king.y;

                castleMoves.forEach((castle) => {
                    let rookX = castle === 'O-O-O' ? 0 : 7;
                    let xDir = castle === 'O-O-O' ? -1 : 1;
                    let kFromX = king.x, kToX = kFromX + 2 * xDir;
                    let rFromX = rookX, rToX = kToX + -1 * xDir;

                    // path empty
                    let emptyPath = true;
                    for (let cx = kFromX + xDir; cx !== rFromX; cx += xDir) {
                        if (this.board.get(cx, y) !== null) { emptyPath = false; break; }
                    }
                    if (!emptyPath) return;

                    // squares the king passes/lands are not attacked
                    const opp = color === Color.WHITE ? Color.BLACK : Color.WHITE;
                    const sq1 = (y << 3) | (kFromX + xDir);
                    const sq2 = (y << 3) | kToX;
                    if (BB.isSquareAttacked(this.board.bb, sq1, opp)) return;
                    if (BB.isSquareAttacked(this.board.bb, sq2, opp)) return;

                    // king safe after simulated castle (include rook shift)
                    const ok = BB.kingSafeAfter(this.board, king, kToX, y, {
                        isCastle: true,
                        rookFromSq: (y << 3) | rFromX,
                        rookToSq: (y << 3) | rToX,
                    });
                    if (!ok) return;

                    // '+' / '#' suffix
                    let suffix = '';
                    const gives = BB.givesCheckAfter(this.board, king, kToX, y, {
                        isCastle: true,
                        rookFromSq: (y << 3) | rFromX,
                        rookToSq: (y << 3) | rToX,
                    });
                    if (gives) {
                        let status = this.move(castle);
                        suffix = status === Status.CHECKMATE ? '#' : '+';
                        this.undo();
                    }
                    moveSet.push(suffix ? (castle + suffix) : castle);
                });
            }
        }

        return this.sortMoves(moveSet);
    }


    // BB move gen for search: no '+'/'#', no Board.move calls.
    // Still returns SAN strings so ai.js can call game.move() unchanged.
    BBlegalMovesNoSuffix(piece) {
        let pieces;
        let moveSet = [];
        let color = this.turn % 2 ? Color.WHITE : Color.BLACK;

        if (!piece) {
            pieces = [...this.board.teamMap[color]];
        } else if (piece.color != color) {
            return [];
        } else {
            pieces = [piece];
        }

        pieces.forEach((p) => {
            const bbTargets = targetsFromBitboards(this.board, p);
            if (!bbTargets) return;

            for (const [x, y] of bbTargets) {
            // BB legality only: ensure our king is safe after the move
                if (!BB.kingSafeAfter(this.board, p, x, y)) continue;

                // Build SAN the cheap way (no suffix).
                // generateMoveStrs may return multiple SANs on promotions.
                const sans = this.generateMoveStrs(p, x, y);
                for (const s of sans) moveSet.push(s);
            }
        });

        // Castling: BB legality only (no '+'/'#').
        const colorIsKing = (!piece || piece instanceof King) && !this.check;
        if (colorIsKing) {
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

                const king = color === Color.WHITE ? this.board.whiteKing : this.board.blackKing;
                const y = king.y;

                castleMoves.forEach((castle) => {
                    let rookX = castle === 'O-O-O' ? 0 : 7;
                    let xDir = castle === 'O-O-O' ? -1 : 1;
                    let kFromX = king.x, kToX = kFromX + 2 * xDir;
                    let rFromX = rookX, rToX = kToX + -1 * xDir;

                    // path empty
                    let emptyPath = true;
                    for (let cx = kFromX + xDir; cx !== rFromX; cx += xDir) {
                        if (this.board.get(cx, y) !== null) { emptyPath = false; break; }
                    }
                    if (!emptyPath) return;

                    // squares the king passes/lands are not attacked
                    const opp = color === Color.WHITE ? Color.BLACK : Color.WHITE;
                    const sq1 = (y << 3) | (kFromX + xDir);
                    const sq2 = (y << 3) | kToX;
                    if (BB.isSquareAttacked(this.board.bb, sq1, opp)) return;
                    if (BB.isSquareAttacked(this.board.bb, sq2, opp)) return;

                    // king safe after simulated castle (include rook shift)
                    const ok = BB.kingSafeAfter(this.board, king, kToX, y, {
                        isCastle: true,
                        rookFromSq: (y << 3) | rFromX,
                        rookToSq: (y << 3) | rToX,
                    });
                    if (!ok) return;

                    moveSet.push(castle);
                });
            }
        }

        return this.sortMoves(moveSet);
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
