'use strict';

/**
 * Bitboard-native search (baseline):
 * - Packed raw moves
 * - Make/Unmake
 * - Alpha-Beta (no qsearch, no null-move)
 * - Simple MVV-LVA ordering
 * - Material evaluation only
 */

const BB = require('./bitboard');
const Color = require('./color');

// ------------------------ Constants / helpers ------------------------

const PT = { P: 0, N: 1, B: 2, R: 3, Q: 4, K: 5 };
const MVV = [100, 320, 330, 500, 900, 20000]; // P,N,B,R,Q,K
const INF = (1e9 | 0);

// Global scratch arrays (reused every node)
let _tempMoves = [];   // holds pseudo moves before legality filter
let _legalMoves = [];  // holds legal moves after make/unmake test

// Castle mask: 1=K,2=Q,4=k,8=q
const CASTLE = { WK: 1, WQ: 2, BK: 4, BQ: 8 };

// Packed move (32-bit int):
//  0..5   fromSq
//  6..11  toSq
//  12..14 promo (0 none, 1 N, 2 B, 3 R, 4 Q)
//  15     capture
//  16     ep
//  17     castle
//  18     doublePush
//  19..21 mover piece type (0..5)
function M(from, to, promo, cap, ep, cs, dbl, moverPT) {
    return (from & 63) |
           ((to & 63) << 6) |
           (((promo | 0) & 7) << 12) |
           ((cap ? 1 : 0) << 15) |
           ((ep ? 1 : 0) << 16) |
           ((cs ? 1 : 0) << 17) |
           ((dbl ? 1 : 0) << 18) |
           (((moverPT | 0) & 7) << 19);
}
function M_from(m)   { return  m        & 63; }
function M_to(m)     { return (m >> 6)  & 63; }
function M_promo(m)  { return (m >> 12) & 7; }
function M_cap(m)    { return (m >> 15) & 1; }
function M_ep(m)     { return (m >> 16) & 1; }
function M_cs(m)     { return (m >> 17) & 1; }
function M_dbl(m)    { return (m >> 18) & 1; }
function M_pt(m)     { return (m >> 19) & 7; }

function bbHas(bb, sq) { return (bb & BB.BB_SQ(sq)) !== 0n; }
function bbSet(bb, sq) { return bb | BB.BB_SQ(sq); }
function bbClr(bb, sq) { return bb & ~BB.BB_SQ(sq); }

function sqX(sq) { return sq & 7; }
function sqY(sq) { return sq >> 3; }

function sideKey(side) { return side === Color.WHITE ? 'W' : 'B'; }
function oppSide(side) { return side === Color.WHITE ? Color.BLACK : Color.WHITE; }

// Castling helpers
function encodeCastle(str) {
    if (!str || str === '-') return 0;
    let m = 0;
    if (str.includes('K')) m |= CASTLE.WK;
    if (str.includes('Q')) m |= CASTLE.WQ;
    if (str.includes('k')) m |= CASTLE.BK;
    if (str.includes('q')) m |= CASTLE.BQ;
    return m;
}

// Initial squares
const SQ = {
    e1: (7 << 3) | 4, g1: (7 << 3) | 6, f1: (7 << 3) | 5, h1: (7 << 3) | 7, a1: (7 << 3) | 0, d1: (7 << 3) | 3,
    e8: (0 << 3) | 4, g8: (0 << 3) | 6, f8: (0 << 3) | 5, h8: (0 << 3) | 7, a8: (0 << 3) | 0, d8: (0 << 3) | 3,
};

// Attacked helper used for castling & legality
function isSquareAttackedLocal(S, sq, bySide) {
    const occAll = S.bb.OCC.ALL;

    // pawns
    let pb = getPieceBB(S, bySide, PT.P);
    while (pb) { const [r, from] = BB.popLSB(pb); pb = r;
        if (BB.pawnAttacks(from, bySide) & BB.BB_SQ(sq)) return true;
    }

    // knights
    let nb = getPieceBB(S, bySide, PT.N);
    while (nb) { const [r, from] = BB.popLSB(nb); nb = r;
        if (BB.knightAttacks(from) & BB.BB_SQ(sq)) return true;
    }

    // bishops/queens (diagonals)
    let db = getPieceBB(S, bySide, PT.B) | getPieceBB(S, bySide, PT.Q);
    while (db) { const [r, from] = BB.popLSB(db); db = r;
        if (BB.bishopAttacks(from, occAll) & BB.BB_SQ(sq)) return true;
    }

    // rooks/queens (orthogonals)
    let rb = getPieceBB(S, bySide, PT.R) | getPieceBB(S, bySide, PT.Q);
    while (rb) { const [r, from] = BB.popLSB(rb); rb = r;
        if (BB.rookAttacks(from, occAll) & BB.BB_SQ(sq)) return true;
    }

    // king
    const kb = getPieceBB(S, bySide, PT.K);
    if (kb) {
        const ksq = kingSqOf(kb);
        if (BB.kingAttacks(ksq) & BB.BB_SQ(sq)) return true;
    }
    return false;
}

// Ensure board.bb exists and has the expected shape.
// If not, build it from the current 8x8 board array.
function ensureBoardBB(board) {
    // If your bitboard module exposes an initializer, prefer it.
    if (BB.initFromBoard && typeof BB.initFromBoard === 'function') {
        board.bb = BB.initFromBoard(board);
        return;
    }

    // Fallback: Build bitboards from the 8x8 matrix.
    const z = 0n;
    const bb = {
        W: { P: z, N: z, B: z, R: z, Q: z, K: z },
        B: { P: z, N: z, B: z, R: z, Q: z, K: z },
        OCC: { WHITE: z, BLACK: z, ALL: z },
    };

    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const piece = board.get(x, y);
            if (!piece) continue;
            const sq = (y << 3) | x;
            const m = BB.BB_SQ(sq);
            const isW = piece.color === Color.WHITE;
            const dst = isW ? bb.W : bb.B;
            switch (piece.toFEN().toUpperCase()) {
            case 'P': dst.P |= m; break;
            case 'N': dst.N |= m; break;
            case 'B': dst.B |= m; break;
            case 'R': dst.R |= m; break;
            case 'Q': dst.Q |= m; break;
            case 'K': dst.K |= m; break;
            }
            if (isW) bb.OCC.WHITE |= m; else bb.OCC.BLACK |= m;
        }
    }
    bb.OCC.ALL = bb.OCC.WHITE | bb.OCC.BLACK;
    board.bb = bb;
}

// ------------------------ Zobrist (minimal, stable) ------------------------

const MASK64 = (1n << 64n) - 1n;

// SplitMix64 PRNG
let Z_STATE = 0x9e3779b97f4a7c15n; // fixed seed for determinism
function splitmix64() {
    Z_STATE = (Z_STATE + 0x9e3779b97f4a7c15n) & MASK64;
    let z = Z_STATE;
    z = (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n & MASK64;
    z = (z ^ (z >> 27n)) * 0x94d049bb133111ebn & MASK64;
    return z ^ (z >> 31n);
}

const Z = {
    // piece[2 sides][6 pt][64 sq]
    piece: [
        Array.from({ length: 6 }, () => Array.from({ length: 64 }, splitmix64)),
        Array.from({ length: 6 }, () => Array.from({ length: 64 }, splitmix64)),
    ],
    side: splitmix64(),
    castle: [splitmix64(), splitmix64(), splitmix64(), splitmix64()], // WK, WQ, BK, BQ
    epFile: Array.from({ length: 8 }, splitmix64), // a..h if EP available
};

function xorPiece(S, side, pt, sq) {
    const sIdx = side === Color.WHITE ? 0 : 1;
    S.hash ^= Z.piece[sIdx][pt][sq];
}
function xorCastleBits(S, prev, curr) {
    const diff = prev ^ curr;
    if (diff & CASTLE.WK) S.hash ^= Z.castle[0];
    if (diff & CASTLE.WQ) S.hash ^= Z.castle[1];
    if (diff & CASTLE.BK) S.hash ^= Z.castle[2];
    if (diff & CASTLE.BQ) S.hash ^= Z.castle[3];
}
function xorEP(S, prevSq, newSq) {
    if (prevSq >= 0) S.hash ^= Z.epFile[prevSq & 7];
    if (newSq  >= 0) S.hash ^= Z.epFile[newSq  & 7];
}

function initZobrist(S) {
    let h = 0n;
    // pieces
    function doSide(side, sideBB) {
        for (let pt = 0; pt <= 5; pt++) {
            let bb = [sideBB.P, sideBB.N, sideBB.B, sideBB.R, sideBB.Q, sideBB.K][pt];
            while (bb) {
                const [rest, sq] = BB.popLSB(bb);
                bb = rest;
                const sIdx = side === Color.WHITE ? 0 : 1;
                h ^= Z.piece[sIdx][pt][sq];
            }
        }
    }
    doSide(Color.WHITE, S.bb.W);
    doSide(Color.BLACK, S.bb.B);
    if (S.stm === Color.WHITE) h ^= Z.side;
    if (S.castling & CASTLE.WK) h ^= Z.castle[0];
    if (S.castling & CASTLE.WQ) h ^= Z.castle[1];
    if (S.castling & CASTLE.BK) h ^= Z.castle[2];
    if (S.castling & CASTLE.BQ) h ^= Z.castle[3];
    if (S.epSq >= 0) h ^= Z.epFile[S.epSq & 7];
    return h & MASK64;
}

// ------------------------ State ------------------------

function recomputeOcc(bb) {
    bb.OCC.WHITE = bb.W.P | bb.W.N | bb.W.B | bb.W.R | bb.W.Q | bb.W.K;
    bb.OCC.BLACK = bb.B.P | bb.B.N | bb.B.B | bb.B.R | bb.B.Q | bb.B.K;
    bb.OCC.ALL   = bb.OCC.WHITE | bb.OCC.BLACK;
}

function epFromBoard(board) {
    if (!board.enPassant || board.enPassant === '-') return -1;
    const x = board.fileToX[board.enPassant[0]];
    const y = board.rankToY[board.enPassant[1]];
    return (y << 3) | x;
}

function kingSqOf(bbSideK) {
    return BB.bitIndex(bbSideK & -bbSideK);
}

function bbStateFromBoard(board) {
    ensureBoardBB(board);

    const stm =
        (board.turnColor === 'w' || board.turnColor === 'W') ? Color.WHITE :
        (board.turnColor === 'b' || board.turnColor === 'B') ? Color.BLACK :
        board.turnColor;

    const S = {
        bb: {
            W: { P: board.bb.W.P, N: board.bb.W.N, B: board.bb.W.B, R: board.bb.W.R, Q: board.bb.W.Q, K: board.bb.W.K },
            B: { P: board.bb.B.P, N: board.bb.B.N, B: board.bb.B.B, R: board.bb.B.R, Q: board.bb.B.Q, K: board.bb.B.K },
            OCC: { WHITE: board.bb.OCC.WHITE, BLACK: board.bb.OCC.BLACK, ALL: board.bb.OCC.ALL },
        },
        stm,
        castling: encodeCastle(board.castleState),
        epSq: epFromBoard(board),
        halfmove: board.fiftyMoveCounter | 0,
        hash: 0n,
    };

    recomputeOcc(S.bb);
    S.hash = initZobrist(S);
    return S;
}

// ------------------------ Piece BB access ------------------------

function getPieceBB(S, side, pt) {
    const k = sideKey(side);
    switch (pt) {
    case PT.P: return S.bb[k].P;
    case PT.N: return S.bb[k].N;
    case PT.B: return S.bb[k].B;
    case PT.R: return S.bb[k].R;
    case PT.Q: return S.bb[k].Q;
    case PT.K: return S.bb[k].K;
    }
}
function setPieceBB(S, side, pt, v) {
    const k = sideKey(side);
    switch (pt) {
    case PT.P: S.bb[k].P = v; break;
    case PT.N: S.bb[k].N = v; break;
    case PT.B: S.bb[k].B = v; break;
    case PT.R: S.bb[k].R = v; break;
    case PT.Q: S.bb[k].Q = v; break;
    case PT.K: S.bb[k].K = v; break;
    }
}

// For capture victim detection
function ptAtSquare(S, side, sq) {
    const sideBB = S.bb[sideKey(side)];
    const m = BB.BB_SQ(sq);
    if (sideBB.P & m) return PT.P;
    if (sideBB.N & m) return PT.N;
    if (sideBB.B & m) return PT.B;
    if (sideBB.R & m) return PT.R;
    if (sideBB.Q & m) return PT.Q;
    if (sideBB.K & m) return PT.K;
    return -1;
}

// ------------------------ Move generation (pseudo) ------------------------

function genPawnMoves(S, side, out) {
    const occAll = S.bb.OCC.ALL;
    const us = S.bb[sideKey(side)];
    const themOcc = side === Color.WHITE ? S.bb.OCC.BLACK : S.bb.OCC.WHITE;
    let p = us.P;

    const dir = side === Color.WHITE ? -1 : 1;
    const startRank = side === Color.WHITE ? 6 : 1;
    const promoRank = side === Color.WHITE ? 0 : 7;

    while (p) {
        const [rest, from] = BB.popLSB(p);
        p = rest;

        const fx = sqX(from), fy = sqY(from);

        // one step
        const y1 = fy + dir;
        if (y1 >= 0 && y1 < 8) {
            const to1 = (y1 << 3) | fx;
            if (!bbHas(occAll, to1)) {
                if (y1 === promoRank) {
                    out.push(M(from, to1, 4, 0, 0, 0, 0, PT.P)); // =Q
                    out.push(M(from, to1, 1, 0, 0, 0, 0, PT.P)); // =N
                } else {
                    out.push(M(from, to1, 0, 0, 0, 0, 0, PT.P));
                    // two steps
                    if (fy === startRank) {
                        const y2 = fy + 2 * dir;
                        const to2 = (y2 << 3) | fx;
                        if (!bbHas(occAll, to2)) {
                            out.push(M(from, to2, 0, 0, 0, 0, 1, PT.P));
                        }
                    }
                }
            }
        }

        // captures (mask via BB.pawnAttacks)
        let caps = BB.pawnAttacks(from, side);
        while (caps) {
            const [r2, to] = BB.popLSB(caps);
            caps = r2;

            if (bbHas(themOcc, to)) {
                const ty = sqY(to);
                if (ty === promoRank) {
                    out.push(M(from, to, 4, 1, 0, 0, 0, PT.P));
                    out.push(M(from, to, 1, 1, 0, 0, 0, PT.P));
                } else {
                    out.push(M(from, to, 0, 1, 0, 0, 0, PT.P));
                }
            } else if (S.epSq >= 0 && to === S.epSq) {
                out.push(M(from, to, 0, 1, 1, 0, 0, PT.P));
            }
        }
    }
}

function genLeaperMoves(S, side, pt, atkFn, out) {
    const ourOcc = side === Color.WHITE ? S.bb.OCC.WHITE : S.bb.OCC.BLACK;
    const themOcc = side === Color.WHITE ? S.bb.OCC.BLACK : S.bb.OCC.WHITE;
    let bb = getPieceBB(S, side, pt);
    while (bb) {
        const [rest, from] = BB.popLSB(bb);
        bb = rest;
        let mask = atkFn(from);
        mask &= ~ourOcc;
        while (mask) {
            const [r2, to] = BB.popLSB(mask);
            mask = r2;
            const cap = bbHas(themOcc, to) ? 1 : 0;
            out.push(M(from, to, 0, cap, 0, 0, 0, pt));
        }
    }
}

function genSliderMoves(S, side, pt, atkFn, out) {
    const occAll = S.bb.OCC.ALL;
    const ourOcc = side === Color.WHITE ? S.bb.OCC.WHITE : S.bb.OCC.BLACK;
    const themOcc = side === Color.WHITE ? S.bb.OCC.BLACK : S.bb.OCC.WHITE;
    let bb = getPieceBB(S, side, pt);
    while (bb) {
        const [rest, from] = BB.popLSB(bb);
        bb = rest;
        let mask = atkFn(from, occAll);
        mask &= ~ourOcc;
        while (mask) {
            const [r2, to] = BB.popLSB(mask);
            mask = r2;
            const cap = bbHas(themOcc, to) ? 1 : 0;
            out.push(M(from, to, 0, cap, 0, 0, 0, pt));
        }
    }
}

function genKingMoves(S, side, out) {
    const ourK = getPieceBB(S, side, PT.K);
    if (!ourK) return;
    const from = kingSqOf(ourK);
    const ourOcc = side === Color.WHITE ? S.bb.OCC.WHITE : S.bb.OCC.BLACK;
    let mask = BB.kingAttacks(from);
    mask &= ~ourOcc;

    while (mask) {
        const [r2, to] = BB.popLSB(mask);
        mask = r2;
        const cap = bbHas(side === Color.WHITE ? S.bb.OCC.BLACK : S.bb.OCC.WHITE, to) ? 1 : 0;
        out.push(M(from, to, 0, cap, 0, 0, 0, PT.K));
    }

    // Castling (pseudo): emptiness + rights + squares not attacked
    const rights = S.castling;
    const occ = S.bb.OCC.ALL;

    if (side === Color.WHITE) {
        const y = 7;
        // O-O
        if ((rights & CASTLE.WK) &&
            !bbHas(occ, (y << 3) | 5) && !bbHas(occ, (y << 3) | 6)) {
            if (!isSquareAttackedLocal(S, (y << 3) | 4, Color.BLACK) &&
                !isSquareAttackedLocal(S, (y << 3) | 5, Color.BLACK) &&
                !isSquareAttackedLocal(S, (y << 3) | 6, Color.BLACK)) {
                out.push(M(SQ.e1, SQ.g1, 0, 0, 0, 1, 0, PT.K));
            }
        }
        // O-O-O
        if ((rights & CASTLE.WQ) &&
            !bbHas(occ, (y << 3) | 3) && !bbHas(occ, (y << 3) | 2) && !bbHas(occ, (y << 3) | 1)) {
            if (!isSquareAttackedLocal(S, (y << 3) | 4, Color.BLACK) &&
                !isSquareAttackedLocal(S, (y << 3) | 3, Color.BLACK) &&
                !isSquareAttackedLocal(S, (y << 3) | 2, Color.BLACK)) {
                out.push(M(SQ.e1, SQ.c1, 0, 0, 0, 1, 0, PT.K));
            }
        }
    } else {
        const y = 0;
        // O-O
        if ((rights & CASTLE.BK) &&
            !bbHas(occ, (y << 3) | 5) && !bbHas(occ, (y << 3) | 6)) {
            if (!isSquareAttackedLocal(S, (y << 3) | 4, Color.WHITE) &&
                !isSquareAttackedLocal(S, (y << 3) | 5, Color.WHITE) &&
                !isSquareAttackedLocal(S, (y << 3) | 6, Color.WHITE)) {
                out.push(M(SQ.e8, SQ.g8, 0, 0, 0, 1, 0, PT.K));
            }
        }
        // O-O-O
        if ((rights & CASTLE.BQ) &&
            !bbHas(occ, (y << 3) | 3) && !bbHas(occ, (y << 3) | 2) && !bbHas(occ, (y << 3) | 1)) {
            if (!isSquareAttackedLocal(S, (y << 3) | 4, Color.WHITE) &&
                !isSquareAttackedLocal(S, (y << 3) | 3, Color.WHITE) &&
                !isSquareAttackedLocal(S, (y << 3) | 2, Color.WHITE)) {
                out.push(M(SQ.e8, SQ.c8, 0, 0, 0, 1, 0, PT.K));
            }
        }
    }
}

// ------------------------ Make / Unmake ------------------------

function clearCastleOnMove(S, side, pt, from, to) {
    // Clear castling rights if king/rook moves or rook captured
    if (side === Color.WHITE) {
        if (pt === PT.K) {
            S.castling &= ~(CASTLE.WK | CASTLE.WQ);
        } else if (pt === PT.R) {
            if (from === SQ.h1) S.castling &= ~CASTLE.WK;
            else if (from === SQ.a1) S.castling &= ~CASTLE.WQ;
        }
        if (to === SQ.h8) S.castling &= ~CASTLE.BK;
        if (to === SQ.a8) S.castling &= ~CASTLE.BQ;
    } else {
        if (pt === PT.K) {
            S.castling &= ~(CASTLE.BK | CASTLE.BQ);
        } else if (pt === PT.R) {
            if (from === SQ.h8) S.castling &= ~CASTLE.BK;
            else if (from === SQ.a8) S.castling &= ~CASTLE.BQ;
        }
        if (to === SQ.h1) S.castling &= ~CASTLE.WK;
        if (to === SQ.a1) S.castling &= ~CASTLE.WQ;
    }
}

function make(S, m, undo) {
    const from = M_from(m), to = M_to(m);
    const pt = M_pt(m);
    const promo = M_promo(m);
    const isCap = !!M_cap(m);
    const isEP  = !!M_ep(m);
    const isCS  = !!M_cs(m);
    const isDB  = !!M_dbl(m);

    const side = S.stm;
    const opp  = oppSide(side);

    // snapshot
    undo.castling = S.castling;
    undo.epSq = S.epSq;
    undo.halfmove = S.halfmove;
    undo.capturedPT = -1;
    undo.capturedSq = -1;
    undo.rookMove = 0;

    // hash: toggle side
    S.hash ^= Z.side;

    // EP hash (remove old)
    xorEP(S, S.epSq, -1);
    S.epSq = -1;

    // Halfmove clock
    if (pt === PT.P || isCap) S.halfmove = 0;
    else S.halfmove++;

    // Move the piece in BB + Zobrist
    xorPiece(S, side, pt, from);
    let bbMover = getPieceBB(S, side, pt);
    bbMover = bbClr(bbMover, from);

    if (pt === PT.P && promo) {
        setPieceBB(S, side, pt, bbMover);
        const ptPromo = (promo === 1 ? PT.N : promo === 2 ? PT.B : promo === 3 ? PT.R : PT.Q);
        let bbPromo = getPieceBB(S, side, ptPromo);
        bbPromo = bbSet(bbPromo, to);
        setPieceBB(S, side, ptPromo, bbPromo);
        xorPiece(S, side, ptPromo, to);
    } else {
        bbMover = bbSet(bbMover, to);
        setPieceBB(S, side, pt, bbMover);
        xorPiece(S, side, pt, to);
    }

    // Captures
    if (isCap) {
        if (isEP) {
            const capSq = side === Color.WHITE ? (to + 8) : (to - 8);
            let bbOppP = getPieceBB(S, opp, PT.P);
            bbOppP = bbClr(bbOppP, capSq);
            setPieceBB(S, opp, PT.P, bbOppP);
            undo.capturedPT = PT.P;
            undo.capturedSq = capSq;
            xorPiece(S, opp, PT.P, capSq);
        } else {
            const vPT = ptAtSquare(S, opp, to);
            if (vPT >= 0) {
                let bbVictim = getPieceBB(S, opp, vPT);
                bbVictim = bbClr(bbVictim, to);
                setPieceBB(S, opp, vPT, bbVictim);
                undo.capturedPT = vPT;
                undo.capturedSq = to;
                xorPiece(S, opp, vPT, to);
            }
        }
    }

    // Double pawn push → set EP square & hash it in
    if (pt === PT.P && isDB) {
        S.epSq = side === Color.WHITE ? (from - 8) : (from + 8);
        xorEP(S, -1, S.epSq);
    }

    // Castling: move rook as well (and Zobrist)
    if (isCS) {
        if (side === Color.WHITE) {
            if (to === SQ.g1) { // O-O
                let bbR = getPieceBB(S, side, PT.R);
                bbR = bbClr(bbR, SQ.h1);
                bbR = bbSet(bbR, SQ.f1);
                setPieceBB(S, side, PT.R, bbR);
                undo.rookMove = 1; undo.rookFrom = SQ.h1; undo.rookTo = SQ.f1;
                xorPiece(S, side, PT.R, SQ.h1);
                xorPiece(S, side, PT.R, SQ.f1);
            } else if (to === SQ.c1) { // O-O-O
                let bbR = getPieceBB(S, side, PT.R);
                bbR = bbClr(bbR, SQ.a1);
                bbR = bbSet(bbR, SQ.d1);
                setPieceBB(S, side, PT.R, bbR);
                undo.rookMove = 1; undo.rookFrom = SQ.a1; undo.rookTo = SQ.d1;
                xorPiece(S, side, PT.R, SQ.a1);
                xorPiece(S, side, PT.R, SQ.d1);
            }
        } else {
            if (to === SQ.g8) { // O-O
                let bbR = getPieceBB(S, side, PT.R);
                bbR = bbClr(bbR, SQ.h8);
                bbR = bbSet(bbR, SQ.f8);
                setPieceBB(S, side, PT.R, bbR);
                undo.rookMove = 1; undo.rookFrom = SQ.h8; undo.rookTo = SQ.f8;
                xorPiece(S, side, PT.R, SQ.h8);
                xorPiece(S, side, PT.R, SQ.f8);
            } else if (to === SQ.c8) { // O-O-O
                let bbR = getPieceBB(S, side, PT.R);
                bbR = bbClr(bbR, SQ.a8);
                bbR = bbSet(bbR, SQ.d8);
                setPieceBB(S, side, PT.R, bbR);
                undo.rookMove = 1; undo.rookFrom = SQ.a8; undo.rookTo = SQ.d8;
                xorPiece(S, side, PT.R, SQ.a8);
                xorPiece(S, side, PT.R, SQ.d8);
            }
        }
    }

    // Castling rights update (+ Zobrist)
    const prevCastle = S.castling;
    clearCastleOnMove(S, side, pt, from, to);
    xorCastleBits(S, prevCastle, S.castling);

    // Recompute occupancy
    recomputeOcc(S.bb);

    // side to move
    S.stm = opp;
}

function unmake(S, m, undo) {
    const from = M_from(m), to = M_to(m);
    const pt = M_pt(m);
    const promo = M_promo(m);
    const isCap = !!M_cap(m);
    const isCS  = !!M_cs(m);

    // flip side back (hash will toggle below)
    S.stm = oppSide(S.stm);

    // Zobrist: toggle side
    S.hash ^= Z.side;

    // Undo castle rook shift (+ Zobrist)
    if (isCS && undo.rookMove) {
        let bbR = getPieceBB(S, S.stm, PT.R);
        bbR = bbClr(bbR, undo.rookTo);
        bbR = bbSet(bbR, undo.rookFrom);
        setPieceBB(S, S.stm, PT.R, bbR);
        xorPiece(S, S.stm, PT.R, undo.rookTo);
        xorPiece(S, S.stm, PT.R, undo.rookFrom);
    }

    // Move piece back (with Zobrist)
    if (pt === PT.P && promo) {
        const ptPromo = (promo === 1 ? PT.N : promo === 2 ? PT.B : promo === 3 ? PT.R : PT.Q);
        let bbPromo = getPieceBB(S, S.stm, ptPromo);
        bbPromo = bbClr(bbPromo, to);
        setPieceBB(S, S.stm, ptPromo, bbPromo);
        xorPiece(S, S.stm, ptPromo, to);

        let bbP = getPieceBB(S, S.stm, PT.P);
        bbP = bbSet(bbP, from);
        setPieceBB(S, S.stm, PT.P, bbP);
        xorPiece(S, S.stm, PT.P, from);
    } else {
        let bbMover = getPieceBB(S, S.stm, pt);
        bbMover = bbClr(bbMover, to);
        bbMover = bbSet(bbMover, from);
        setPieceBB(S, S.stm, pt, bbMover);
        xorPiece(S, S.stm, pt, to);
        xorPiece(S, S.stm, pt, from);
    }

    // Restore captured piece (+ Zobrist)
    if (isCap) {
        const vPT = undo.capturedPT;
        if (vPT >= 0) {
            const capSide = oppSide(S.stm);
            let bbV = getPieceBB(S, capSide, vPT);
            const sq = undo.capturedSq;
            bbV = bbSet(bbV, sq);
            setPieceBB(S, capSide, vPT, bbV);
            xorPiece(S, capSide, vPT, sq);
        }
    }

    // Restore EP (hash) & halfmove, castling (hash)
    const prevCastle = S.castling;
    S.castling = undo.castling;
    xorCastleBits(S, prevCastle, S.castling);

    // EP toggle: previous -> undo.epSq
    xorEP(S, S.epSq, undo.epSq);
    S.epSq = undo.epSq;

    S.halfmove = undo.halfmove;

    // Recompute occupancy
    recomputeOcc(S.bb);
}

// ------------------------ Legality filtering ------------------------

function inCheck(S, side) {
    const kSq = kingSqOf(getPieceBB(S, side, PT.K));
    return isSquareAttackedLocal(S, kSq, oppSide(side));
}

function genPseudoMoves(S, out) {
    out.length = 0;
    const side = S.stm;
    genPawnMoves(S, side, out);
    genLeaperMoves(S, side, PT.N, BB.knightAttacks, out);
    genKingMoves(S, side, out);
    genSliderMoves(S, side, PT.B, BB.bishopAttacks, out);
    genSliderMoves(S, side, PT.R, BB.rookAttacks, out);
    genSliderMoves(S, side, PT.Q, BB.queenAttacks, out);
}

function genLegalMoves(S, out) {
    _tempMoves.length = 0;
    genPseudoMoves(S, _tempMoves);

    out.length = 0;
    const undo = {};
    for (let i = 0; i < _tempMoves.length; i++) {
        const m = _tempMoves[i];
        make(S, m, undo);
        const moverSide = oppSide(S.stm); // after make(), stm flipped
        const kSq = kingSqOf(getPieceBB(S, moverSide, PT.K));
        const illegal = isSquareAttackedLocal(S, kSq, S.stm);
        unmake(S, m, undo);
        if (!illegal) out.push(m);
    }
}
function genLegalMovesArray(S) { const out = []; genLegalMoves(S, out); return out; }

// ------------------------ Ordering ------------------------

const MAX_PLY = 128;
const killers = Array.from({ length: MAX_PLY }, () => [0, 0]); // two killers per ply
const HIST_SIZE = 2 * 64 * 64;
const history = new Int32Array(HIST_SIZE);

function sideIdx(s) { return s === Color.WHITE ? 0 : 1; }
function histIndex(side, from, to) { return sideIdx(side) * 4096 + (from << 6) + to; }

function isQuiet(m) { return !M_cap(m) && !M_promo(m) && !M_cs(m) && !M_ep(m); }

function updateKillersAndHistory(ply, side, m, depth) {
    if (!isQuiet(m)) return;
    if (killers[ply][0] !== m) {
        killers[ply][1] = killers[ply][0];
        killers[ply][0] = m;
    }
    const idx = histIndex(side, M_from(m), M_to(m));
    history[idx] += (depth * depth);
    if (history[idx] > 1_000_000) history[idx] = 1_000_000;
}
function historyScore(side, m) { return history[histIndex(side, M_from(m), M_to(m))] | 0; }

function ptAtSquareAfterMove(S, m) {
    const to = M_to(m);
    const isEP = M_ep(m);
    const side = S.stm;
    const opp = oppSide(side);
    if (isEP) return PT.P;
    return ptAtSquare(S, opp, to);
}

function moveScore(S, m) {
    if (M_cap(m)) {
        const victimPT = ptAtSquareAfterMove(S, m);
        const attackerPT = M_pt(m);
        const v = victimPT >= 0 ? MVV[victimPT] : 0;
        return 1_000_000 + (v * 100) - MVV[attackerPT];
    }
    if (M_promo(m)) return 500_000;
    // killers/history for quiets
    let s = 0;
    return s;
}

function orderMoves(S, arr, ply) {
    const side = S.stm;
    const scored = new Array(arr.length);
    for (let i = 0; i < arr.length; i++) {
        const m = arr[i];
        let s = 0;
        if (M_cap(m)) {
            const victimPT = ptAtSquareAfterMove(S, m);
            const attackerPT = M_pt(m);
            const v = victimPT >= 0 ? MVV[victimPT] : 0;
            s = 1_000_000 + (v * 100) - MVV[attackerPT];
        } else if (isQuiet(m)) {
            if (m === killers[ply][0]) s = 600_000;
            else if (m === killers[ply][1]) s = 500_000;
            else s = historyScore(side, m);
        } else if (M_promo(m)) {
            s = 550_000; // promo quiet gets a small boost
        }
        scored[i] = { m, s };
    }
    scored.sort((a, b) => b.s - a.s);
    for (let i = 0; i < arr.length; i++) arr[i] = scored[i].m;
}

// ------------------------ Evaluation ------------------------

function materialEval(S) {
    const W = S.bb.W, B = S.bb.B;
    function popcnt(b) { let c = 0n; while (b) { const l = b & -b; b ^= l; c++; } return Number(c); }
    let score = 0;
    score += popcnt(W.P) * MVV[PT.P] - popcnt(B.P) * MVV[PT.P];
    score += popcnt(W.N) * MVV[PT.N] - popcnt(B.N) * MVV[PT.N];
    score += popcnt(W.B) * MVV[PT.B] - popcnt(B.B) * MVV[PT.B];
    score += popcnt(W.R) * MVV[PT.R] - popcnt(B.R) * MVV[PT.R];
    score += popcnt(W.Q) * MVV[PT.Q] - popcnt(B.Q) * MVV[PT.Q];
    return score;
}

// ------------------------ Search ------------------------

let _nodes = 0;

function alphaBeta(S, depth, alpha, beta, ply) {
    _nodes++;

    if (depth <= 0) {
        const sign = (S.stm === Color.WHITE) ? 1 : -1;
        return sign * materialEval(S);
    }

    // Generate legal moves
    genLegalMoves(S, _legalMoves);
    if (_legalMoves.length === 0) {
        // checkmate or stalemate
        if (inCheck(S, S.stm)) return -INF + 1;
        return 0;
    }

    // Order moves
    orderMoves(S, _legalMoves, ply);

    let best = -INF, bestMove = 0;
    const undo = {};

    for (let i = 0; i < _legalMoves.length; i++) {
        const m = _legalMoves[i];

        make(S, m, undo);
        const score = -alphaBeta(S, depth - 1, -beta, -alpha, ply + 1);
        unmake(S, m, undo);

        if (score > best) {
            best = score;
            bestMove = m;
            if (score > alpha) {
                alpha = score;
                if (alpha >= beta) {
                    // beta cutoff: update killers/history
                    updateKillersAndHistory(ply, S.stm, m, depth);
                    return best;
                }
            }
        }
    }
    return best;
}

function searchRoot(board, depth) {
    const S = bbStateFromBoard(board);
    _nodes = 0;

    const rootMoves = genLegalMovesArray(S);
    if (rootMoves.length === 0) {
        return { best: 0, score: 0, nodes: _nodes, ttHits: 0, ttStores: 0 };
    }

    orderMoves(S, rootMoves, /*ply=*/0);

    let alpha = -INF, beta = INF;
    let bestMove = rootMoves[0], bestScore = -INF;
    const undo = {};

    for (let i = 0; i < rootMoves.length; i++) {
        const m = rootMoves[i];
        make(S, m, undo);
        const score = -alphaBeta(S, depth - 1, -beta, -alpha, /*ply=*/1);
        unmake(S, m, undo);

        if (score > bestScore) {
            bestScore = score;
            bestMove = m;
            if (score > alpha) alpha = score;
        }
    }

    return { best: bestMove, score: bestScore, nodes: _nodes, ttHits: 0, ttStores: 0 };
}

function searchIter(board, maxDepth) {
    let bestMove = 0, lastScore = 0, nodes = 0;
    for (let d = 1; d <= maxDepth; d++) {
        const s = searchRoot(board, d);
        bestMove = s.best || bestMove;
        lastScore = s.score;
        nodes += s.nodes | 0;
    }
    return { best: bestMove | 0, score: lastScore | 0, nodes, ttHits: 0, ttStores: 0 };
}

// ------------------------ Root SAN (for UI) ------------------------

function rootMoveToSAN(board, m) {
    const from = M_from(m), to = M_to(m);
    const promo = M_promo(m);
    const cap = !!M_cap(m);
    const isCastle = !!M_cs(m);

    if (isCastle) {
        const fx = sqX(from), tx = sqX(to);
        return tx > fx ? 'O-O' : 'O-O-O';
    }

    const x = sqX(to), y = sqY(to);
    const piece = board.get(sqX(from), sqY(from));
    const pieceType = piece.toFEN().toUpperCase();
    const dest = board.xToFile[x] + board.yToRank[y];

    if (pieceType === 'P') {
        const promoStr = promo ? (promo === 4 ? '=Q' : promo === 1 ? '=N' : '') : '';
        if (cap) return board.xToFile[sqX(from)] + 'x' + dest + promoStr;
        return dest + promoStr;
    }

    const occ = board.bb.OCC.ALL;
    const team = board.teamMap[piece.color].filter(p => p !== piece && p.toFEN().toUpperCase() === pieceType);

    function attacksMask(p) {
        const s = (p.y << 3) | p.x;
        switch (pieceType) {
        case 'N': return BB.knightAttacks(s);
        case 'K': return BB.kingAttacks(s);
        case 'B': return BB.bishopAttacks(s, occ);
        case 'R': return BB.rookAttacks(s, occ);
        case 'Q': return BB.queenAttacks(s, occ);
        }
        return 0n;
    }

    const toMask = BB.BB_SQ((y << 3) | x);
    let ambiguous = false, ambigSameFile = false, ambigSameRank = false;
    for (const other of team) {
        const mask = attacksMask(other);
        if (mask & toMask) {
            ambiguous = true;
            if (other.x === piece.x) ambigSameFile = true;
            if (other.y === piece.y) ambigSameRank = true;
        }
    }

    let dis = '';
    const fileChar = board.xToFile[sqX(from)];
    const rankChar = board.yToRank[sqY(from)];
    if (ambiguous) {
        if (ambigSameFile && ambigSameRank) dis = fileChar + rankChar;
        else if (ambigSameFile) dis = rankChar;
        else dis = fileChar;
    }

    return pieceType + dis + (cap ? 'x' : '') + dest;
}

// ------------------------ Perft ------------------------

function perftNode(S, depth) {
    if (depth === 0) return 1;
    let count = 0;
    const moves = [];
    genLegalMoves(S, moves);
    const undo = {};
    for (let i = 0; i < moves.length; i++) {
        make(S, moves[i], undo);
        count += perftNode(S, depth - 1);
        unmake(S, moves[i], undo);
    }
    return count;
}

function perftRoot(board, depth) {
    const S = bbStateFromBoard(board);
    const rootMoves = genLegalMovesArray(S);
    const undo = {};
    let total = 0;
    for (let i = 0; i < rootMoves.length; i++) {
        make(S, rootMoves[i], undo);
        total += perftNode(S, depth - 1);
        unmake(S, rootMoves[i], undo);
    }
    return total;
}

// ------------------------ Exports ------------------------

module.exports = {
    bbStateFromBoard,
    searchRoot,
    searchIter,
    perftRoot,
    rootMoveToSAN,
    constants: { PT, CASTLE },
};

