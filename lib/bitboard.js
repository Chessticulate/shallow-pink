'use strict';

const Color = require('./color');

// ==== core helpers ==========================================================

// square index 0..63 from x,y
function sq(x, y) { return (y << 3) | x; }

// bitboard mask with a single bit set at sqIdx
function BB_SQ(sqIdx) { return 1n << BigInt(sqIdx); }

// board bounds
function onBoardXY(x, y) { return x >= 0 && x < 8 && y >= 0 && y < 8; }

// pop least-significant 1-bit; returns [bbWithout, index]
function popLSB(bb) {
    const lsb = bb & -bb;
    return [bb ^ lsb, bitIndex(lsb)];
}

// return bit index 0..63 from a 1-bit mask
function bitIndex(lsb) {
    let i = 0n;
    while (lsb >> 1n) { lsb >>= 1n; i++; }
    return Number(i);
}

// ==== attack generation (bitboards) =========================================

function knightAttacks(fromSq) {
    const x = fromSq & 7, y = fromSq >> 3;
    const deltas = [
        [ 1, -2],[ 2, -1],[ 2,  1],[ 1,  2],
        [-1,  2],[-2,  1],[-2, -1],[-1, -2],
    ];
    let m = 0n;
    for (const [dx, dy] of deltas) {
        const nx = x + dx, ny = y + dy;
        if (onBoardXY(nx, ny)) m |= BB_SQ(sq(nx, ny));
    }
    return m;
}

function kingAttacks(fromSq) {
    const x = fromSq & 7, y = fromSq >> 3;
    let m = 0n;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (onBoardXY(nx, ny)) m |= BB_SQ(sq(nx, ny));
        }
    }
    return m;
}

function pawnAttacks(fromSq, color) {
    const x = fromSq & 7, y = fromSq >> 3;
    const dir = color === Color.WHITE ? -1 : 1;
    let m = 0n;
    // captures
    const ny = y + dir;
    if (onBoardXY(x - 1, ny)) m |= BB_SQ(sq(x - 1, ny));
    if (onBoardXY(x + 1, ny)) m |= BB_SQ(sq(x + 1, ny));
    return m;
}

function _rayFrom(x, y, dx, dy, occAll) {
    let attacks = 0n;
    let nx = x + dx, ny = y + dy;
    while (onBoardXY(nx, ny)) {
        const s = sq(nx, ny);
        const m = BB_SQ(s);
        attacks |= m;
        if (occAll & m) break; // stop behind first blocker
        nx += dx; ny += dy;
    }
    return attacks;
}

function bishopAttacks(fromSq, occAll) {
    const x = fromSq & 7, y = fromSq >> 3;
    return (
        _rayFrom(x, y,  1,  1, occAll) |
        _rayFrom(x, y,  1, -1, occAll) |
        _rayFrom(x, y, -1,  1, occAll) |
        _rayFrom(x, y, -1, -1, occAll)
    );
}

function rookAttacks(fromSq, occAll) {
    const x = fromSq & 7, y = fromSq >> 3;
    return (
        _rayFrom(x, y,  1,  0, occAll) |
        _rayFrom(x, y, -1,  0, occAll) |
        _rayFrom(x, y,  0,  1, occAll) |
        _rayFrom(x, y,  0, -1, occAll)
    );
}

function queenAttacks(fromSq, occAll) {
    return bishopAttacks(fromSq, occAll) | rookAttacks(fromSq, occAll);
}

// ==== state builders / attachment ===========================================

function initFromBoard(board) {
    const bb = {
        W: { P: 0n, N: 0n, B: 0n, R: 0n, Q: 0n, K: 0n },
        B: { P: 0n, N: 0n, B: 0n, R: 0n, Q: 0n, K: 0n },
        OCC: { WHITE: 0n, BLACK: 0n, ALL: 0n },
    };

    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const piece = board.get(x, y);
            if (!piece) continue;

            // Use board's rank mapping to compute the bitboard square
            const rankChar = board.yToRank ? board.yToRank[y] : String(8 - y);
            const rankNum  = Number(rankChar);
            const yBB      = (rankNum >= 1 && rankNum <= 8) ? (8 - rankNum) : (7 - y);
            const s        = (yBB << 3) | x;
            const m        = BB_SQ(s);

            if (piece.color === Color.WHITE) {
                switch (piece.toFEN()) {
                case 'P': bb.W.P |= m; break;
                case 'N': bb.W.N |= m; break;
                case 'B': bb.W.B |= m; break;
                case 'R': bb.W.R |= m; break;
                case 'Q': bb.W.Q |= m; break;
                case 'K': bb.W.K |= m; break;
                }
                bb.OCC.WHITE |= m;
            } else {
                switch (piece.toFEN()) {
                case 'p': bb.B.P |= m; break;
                case 'n': bb.B.N |= m; break;
                case 'b': bb.B.B |= m; break;
                case 'r': bb.B.R |= m; break;
                case 'q': bb.B.Q |= m; break;
                case 'k': bb.B.K |= m; break;
                }
                bb.OCC.BLACK |= m;
            }
        }
    }

    bb.OCC.ALL = bb.OCC.WHITE | bb.OCC.BLACK;
    return bb;
}

function attachToBoard(board) {
    board.bb = initFromBoard(board);
    return board.bb;
}

function syncFromBoard(board) {
    board.bb = initFromBoard(board);
}

// ==== incremental update helpers ============================================

function _pieceLetter(piece) { return piece.toFEN().toUpperCase(); }
function _colorKeys(color) {
    return color === Color.WHITE
        ? { C: 'W', OCC: 'WHITE' }
        : { C: 'B', OCC: 'BLACK' };
}

function clearAt(board, color, letter, sqIdx) {
    const m = BB_SQ(sqIdx);
    board.bb[color][letter] &= ~m;
    const occKey = color === 'W' ? 'WHITE' : 'BLACK';
    board.bb.OCC[occKey] &= ~m;
}

function setAt(board, color, letter, sqIdx) {
    const m = BB_SQ(sqIdx);
    board.bb[color][letter] |= m;
    const occKey = color === 'W' ? 'WHITE' : 'BLACK';
    board.bb.OCC[occKey] |= m;
}

function updatePieceBit(board, piece, fromX, fromY, toX, toY) {
    const { C } = _colorKeys(piece.color);
    const L = _pieceLetter(piece);
    if (fromX !== null && fromY !== null) {
        clearAt(board, C, L, sq(fromX, fromY));
    }
    if (toX !== null && toY !== null) {
        setAt(board, C, L, sq(toX, toY));
    }
}

function removePieceBit(board, piece, atX, atY) {
    const { C } = _colorKeys(piece.color);
    const L = _pieceLetter(piece);
    clearAt(board, C, L, sq(atX, atY));
}

function addPieceBit(board, piece, atX, atY) {
    const { C } = _colorKeys(piece.color);
    const L = _pieceLetter(piece);
    setAt(board, C, L, sq(atX, atY));
}

function finalizeOccupancy(board) {
    board.bb.OCC.ALL = board.bb.OCC.WHITE | board.bb.OCC.BLACK;
}

// ==== BB-native legality helpers ============================================

function cloneBB(bb) {
    return {
        W: { P: bb.W.P, N: bb.W.N, B: bb.W.B, R: bb.W.R, Q: bb.W.Q, K: bb.W.K },
        B: { P: bb.B.P, N: bb.B.N, B: bb.B.B, R: bb.B.R, Q: bb.B.Q, K: bb.B.K },
        OCC: { WHITE: bb.OCC.WHITE, BLACK: bb.OCC.BLACK, ALL: bb.OCC.ALL },
    };
}

function isSquareAttacked(bb, sqIdx, byColor) {
    const occ = bb.OCC.ALL;
    const S = BB_SQ(sqIdx);

    // pawns
    if (byColor === Color.WHITE) {
        let pawns = bb.W.P;
        while (pawns) {
            const [rest, idx] = popLSB(pawns);
            pawns = rest;
            if (pawnAttacks(idx, Color.WHITE) & S) return true;
        }
    } else {
        let pawns = bb.B.P;
        while (pawns) {
            const [rest, idx] = popLSB(pawns);
            pawns = rest;
            if (pawnAttacks(idx, Color.BLACK) & S) return true;
        }
    }

    // knights
    let knights = byColor === Color.WHITE ? bb.W.N : bb.B.N;
    while (knights) {
        const [rest, idx] = popLSB(knights);
        knights = rest;
        if (knightAttacks(idx) & S) return true;
    }

    // bishops & queens (diagonals)
    let bishops = byColor === Color.WHITE ? bb.W.B : bb.B.B;
    while (bishops) {
        const [rest, idx] = popLSB(bishops);
        bishops = rest;
        if (bishopAttacks(idx, occ) & S) return true;
    }
    let queens = byColor === Color.WHITE ? bb.W.Q : bb.B.Q;
    while (queens) {
        const [rest, idx] = popLSB(queens);
        queens = rest;
        if (bishopAttacks(idx, occ) & S) return true;
    }

    // rooks & queens (orthogonals)
    let rooks = byColor === Color.WHITE ? bb.W.R : bb.B.R;
    while (rooks) {
        const [rest, idx] = popLSB(rooks);
        rooks = rest;
        if (rookAttacks(idx, occ) & S) return true;
    }
    queens = byColor === Color.WHITE ? bb.W.Q : bb.B.Q;
    while (queens) {
        const [rest, idx] = popLSB(queens);
        queens = rest;
        if (rookAttacks(idx, occ) & S) return true;
    }

    // king
    let king = byColor === Color.WHITE ? bb.W.K : bb.B.K;
    if (king) {
        const idx = bitIndex(king);
        if (kingAttacks(idx) & S) return true;
    }

    return false;
}

function _findKingSq(bb, color) {
    const k = color === Color.WHITE ? bb.W.K : bb.B.K;
    return bitIndex(k);
}

/**
 * Apply a temporary move to a cloned bb (no board mutation).
 * Supports normal moves, captures, EP, promotions, castling.
 * opts: { piece, fromSq, toSq, promoLetter?, isEP?, epCapturedSq?, isCastle?, rookFromSq?, rookToSq? }
 */
function applyTempMoveBB(board, bb, opts) {
    const { piece, fromSq, toSq, promoLetter, isEP, epCapturedSq, isCastle, rookFromSq, rookToSq } = opts;
    const me = piece.color === Color.WHITE ? 'W' : 'B';
    const them = piece.color === Color.WHITE ? 'B' : 'W';
    const occMeKey = me === 'W' ? 'WHITE' : 'BLACK';
    const occThemKey = them === 'W' ? 'WHITE' : 'BLACK';
    const fromM = BB_SQ(fromSq);
    const toM = BB_SQ(toSq);

    // moving piece letter
    let L = piece.toFEN().toUpperCase();

    // clear from
    bb[me][L] &= ~fromM;
    bb.OCC[occMeKey] &= ~fromM;

    // normal capture if dest occupied by them
    if (bb.OCC[occThemKey] & toM) {
        for (const P of ['P','N','B','R','Q','K']) {
            if (bb[them][P] & toM) {
                bb[them][P] &= ~toM;
                bb.OCC[occThemKey] &= ~toM;
                break;
            }
        }
    }

    // en passant capture
    if (isEP && typeof epCapturedSq === 'number') {
        const capM = BB_SQ(epCapturedSq);
        bb[them]['P'] &= ~capM;
        bb.OCC[occThemKey] &= ~capM;
    }

    // drop piece (promotion uses promoLetter)
    const dropLetter = promoLetter ? promoLetter : L;
    bb[me][dropLetter] |= toM;
    bb.OCC[occMeKey] |= toM;

    // castling: move rook too
    if (isCastle && typeof rookFromSq === 'number' && typeof rookToSq === 'number') {
        const rf = BB_SQ(rookFromSq);
        const rt = BB_SQ(rookToSq);
        bb[me]['R'] &= ~rf;
        bb.OCC[occMeKey] &= ~rf;
        bb[me]['R'] |= rt;
        bb.OCC[occMeKey] |= rt;
    }

    // finalize
    bb.OCC.ALL = bb.OCC.WHITE | bb.OCC.BLACK;
    return bb;
}

function kingSafeAfter(board, piece, toX, toY, opts = {}) {
    const fromSq = (piece.y << 3) | piece.x;
    const toSq = (toY << 3) | toX;
    const bb2 = cloneBB(board.bb);

    // EP specifics if pawn “captures” an empty square
    if (piece.toFEN().toUpperCase() === 'P') {
        const target = board.get(toX, toY);
        if (!target && Math.abs(toX - piece.x) === 1 && (toY - piece.y !== 0)) {
            const adj = board.get(toX, piece.y);
            if (adj && typeof adj.toFEN === 'function' &&
                (adj.toFEN() === 'P' || adj.toFEN() === 'p') &&
                adj.enPassantable) {
                opts.isEP = true;
                opts.epCapturedSq = (piece.y << 3) | toX;
            }
        }
    }

    applyTempMoveBB(board, bb2, {
        piece,
        fromSq,
        toSq,
        promoLetter: opts.promoLetter,
        isEP: opts.isEP,
        epCapturedSq: opts.epCapturedSq,
        isCastle: opts.isCastle,
        rookFromSq: opts.rookFromSq,
        rookToSq: opts.rookToSq,
    });

    const meColor = piece.color;
    let kSq = _findKingSq(bb2, meColor);
    if (piece.toFEN().toUpperCase() === 'K') kSq = toSq;

    const oppColor = meColor === Color.WHITE ? Color.BLACK : Color.WHITE;
    return !isSquareAttacked(bb2, kSq, oppColor);
}

function givesCheckAfter(board, piece, toX, toY, opts = {}) {
    const fromSq = (piece.y << 3) | piece.x;
    const toSq = (toY << 3) | toX;
    const bb2 = cloneBB(board.bb);

    // EP specifics as above
    if (piece.toFEN().toUpperCase() === 'P') {
        const target = board.get(toX, toY);
        if (!target && Math.abs(toX - piece.x) === 1 && (toY - piece.y !== 0)) {
            const adj = board.get(toX, piece.y);
            if (adj && typeof adj.toFEN === 'function' &&
                (adj.toFEN() === 'P' || adj.toFEN() === 'p') &&
                adj.enPassantable) {
                opts.isEP = true;
                opts.epCapturedSq = (piece.y << 3) | toX;
            }
        }
    }

    applyTempMoveBB(board, bb2, {
        piece,
        fromSq,
        toSq,
        promoLetter: opts.promoLetter,
        isEP: opts.isEP,
        epCapturedSq: opts.epCapturedSq,
        isCastle: opts.isCastle,
        rookFromSq: opts.rookFromSq,
        rookToSq: opts.rookToSq,
    });

    const oppColor = piece.color === Color.WHITE ? Color.BLACK : Color.WHITE;
    const oppKingSq = _findKingSq(bb2, oppColor);
    return isSquareAttacked(bb2, oppKingSq, piece.color);
}

// ==== exports ===============================================================

module.exports = {
    // core
    sq,
    BB_SQ,
    onBoardXY,
    popLSB,
    bitIndex,

    // attacks
    knightAttacks,
    kingAttacks,
    pawnAttacks,
    bishopAttacks,
    rookAttacks,
    queenAttacks,

    // state
    initFromBoard,
    attachToBoard,
    syncFromBoard,

    // incremental
    clearAt,
    setAt,
    updatePieceBit,
    removePieceBit,
    addPieceBit,
    finalizeOccupancy,

    // legality helpers
    cloneBB,
    isSquareAttacked,
    kingSafeAfter,
    givesCheckAfter,
    applyTempMoveBB,
};

