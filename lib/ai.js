'use strict';

const Color = require('./color');
const { uciToSan } = require('./utils/notation');
const PIECE_INDEX = require('./utils/pieceIndex');
let CHESS = null;

// game phase is calculated by counting remaining pieces in a position
// value is between 0 and 24
// pawns and kings are 0, bishops and knights 1, rook 2, and queens are 4
const gamePhase = [0, 0, 1, 1, 1, 1, 2, 2, 4, 4, 0, 0];

const data = {
    nodeCount: 0,
    prunedNodes: 0,
    tptNodes: 0
};
class TableEntry {
    constructor(move, score) {
        this.move = move;
        this.score = score;
    }
}

// Book integration
// ------------------

function readBookEntry(buffer, offset) {
    // Fast path for Node Buffer with read*BE methods
    if (buffer && typeof buffer.readBigUInt64BE === 'function') {
        return {
            key: buffer.readBigUInt64BE(offset),        // BigInt
            move: buffer.readUInt16BE(offset + 8),
            weight: buffer.readUInt16BE(offset + 10),
            learn: buffer.readUInt32BE(offset + 12)
        };
    }
    // Generic path (browser & Node) via DataView
    const view = makeDataView(buffer, offset, 16);
    return {
        key:    view.getBigUint64(0,  false), // big-endian
        move:   view.getUint16   (8,  false),
        weight: view.getUint16   (10, false),
        learn:  view.getUint32   (12, false)
    };
}

function byteLen(src) {
    if (!src) return 0;
    if (ArrayBuffer.isView(src)) return src.byteLength;          // Buffer/TypedArray
    if (typeof src.byteLength === 'number') return src.byteLength; // ArrayBuffer
    if (typeof src.length === 'number') return src.length;         // Buffer.length (bytes)
    return 0;
}

// Use DataView so the same parsing code works in both Node (Buffer/Uint8Array)
// and the browser (Uint8Array/ArrayBuffer). Node’s Buffer.read*BE methods aren’t
// available in the browser, and DataView handles the big-endian reads we need.
function makeDataView(src, offset, length) {
    if (ArrayBuffer.isView(src)) {
        // Buffer and Uint8Array are views over an ArrayBuffer
        return new DataView(src.buffer, src.byteOffset + offset, length);
    }
    if (src instanceof ArrayBuffer) {
        return new DataView(src, offset, length);
    }
    throw new TypeError('Unsupported book buffer type');
}

// polyglot moves are decoded more easily into Uci
// so moves are first converted to uci and then into san 
function polyglotToSan(move) {
    const fromFile = (move >> 6) & 7;
    const fromRank = (move >> 9) & 7;
    const toFile = (move >> 0) & 7;
    const toRank = (move >> 3) & 7;
    const promo = (move >> 12) & 7;

    let uci =
        String.fromCharCode('a'.charCodeAt(0) + fromFile) +
        (fromRank + 1) +
        String.fromCharCode('a'.charCodeAt(0) + toFile) +
        (toRank + 1);

    if (promo > 0) {
        uci += ['n', 'b', 'r', 'q'][promo - 1];
    }
    return uciToSan(CHESS, uci);
}

function getBookMoves() {
    if (!CHESS.book) return [];
    const hash = CHESS.board.hash;
    const totalBytes = byteLen(CHESS.book);
    const entries = Math.floor(totalBytes / 16);
    const moves = [];

    for (let i = 0; i < entries; i++) {
        const entry = readBookEntry(CHESS.book, i * 16);
        if (entry.key === hash) {
            moves.push({
                move: polyglotToSan(entry.move),
                weight: entry.weight
            });
        }
    }
    return moves;
}

// book move selection
// -------------------

// always plays the highest weighted book move
/* eslint-disable-next-line no-unused-vars */
function bestBookMove(moves) {
    if (!moves.length) return null;
    let bestMove = moves[0];

    for (let i = 1; i < moves.length; i++) {
        const m = moves[i];
        if (
            m.weight > bestMove.weight ||
            (m.weight === bestMove.weight && m.move < bestMove.move) // tie-break
        ) {
            bestMove = m;
        }
    }
    return bestMove.move;
}

// fully random move selection
/* eslint-disable-next-line no-unused-vars */
function randomMove(moves) {
    const idx = Math.floor(Math.random() * moves.length);
    return moves[idx].move;
}

// this function "randomly" selects moves with a bias towards higher weighted moves
/* eslint-disable-next-line no-unused-vars */
function weightedRandom(moves) {
    const total = moves.reduce((sum, m) => sum + m.weight, 0);
    let r = Math.floor(Math.random() * total);
    for (const m of moves) {
        if (r < m.weight) return m.move;
        r -= m.weight;
    }
    return moves[0].move;
}

// evaluation and search
// ---------------------


// evaluation function, currently uses material value as well as relative piece square value 
function evaluate(CHESS) { 
    let phase = 0;

    let mg = {};
    mg[Color.WHITE] = 0;
    mg[Color.BLACK] = 0;

    let eg = {};
    eg[Color.WHITE] = 0;
    eg[Color.BLACK] = 0;

    [Color.WHITE, Color.BLACK].forEach(color => {
        CHESS.board.teamMap[color].forEach(piece => {
            mg[piece.color] += piece.value('mg');
            eg[piece.color] += piece.value('eg');
            phase += gamePhase[PIECE_INDEX[piece.toFEN()]];
        });
    });

    const sign = CHESS.turnColor === Color.WHITE ? 1 : -1;

    const mgScore = sign * (mg[Color.WHITE] + mg[Color.BLACK]);
    const egScore = sign * (eg[Color.WHITE] + eg[Color.BLACK]);

    // Tapered evaluation weights
    // phase cannot be > 24 (in the case of early promotions)
    const mgPhase = Math.min(phase, 24);
    const egPhase = 24 - mgPhase;

    // Final tapered score (truncate toward zero like C's int division)
    const score = (mgScore * mgPhase + egScore * egPhase) / 24;
    return Math.trunc(score);
}

// ai.js
function orderEntries(entries) {
    if (!Array.isArray(entries) || entries.length <= 1) return;

    const pieceScore = p => {
        // use your piece.value('mg') if available, else 0
        try { return Math.abs(p?.value?.('mg') ?? 0); } catch { return 0; }
    };

    function features(e) {
        // If already has meta, use it.
        if (e?.meta) {
            return {
                isPromotion: !!e.meta.isPromotion,
                isCapture:   !!e.meta.isCapture,
                victimScore: e.meta.victimScore ?? 0,
                attackerScore: e.meta.attackerScore ?? 0,
            };
        }

        if ('isCapture' in e || 'isPromotion' in e) {
            const attackerScore = e.piece?.value ? Math.abs(e.piece.value('mg')) : 0;
            let victimScore = 0;
            if (e.isCapture && Number.isInteger(e.destX) && Number.isInteger(e.destY)) {
                const victim = CHESS.board.get(e.destX, e.destY) ||
                               CHESS.board.get(e.destX, e.piece?.y); // EP guess
                try { 
                    victimScore = Math.abs(victim?.value?.('mg') ?? 0); 
                } catch(err) {
                    console.error('something went wrong', err); 
                }
            }
            return {
                isPromotion: !!e.isPromotion,
                isCapture:   !!e.isCapture,
                victimScore,
                attackerScore,
            };
        } 

        // Infer fields across both entry shapes.
        let ox, oy, dx, dy, attacker = e?.piece ?? null;

        if (Array.isArray(e?.orig)) { ox = e.orig[0]; oy = e.orig[1]; }
        if (Array.isArray(e?.dest)) { dx = e.dest[0]; dy = e.dest[1]; }

        if (dx === undefined && e?.x !== undefined) dx = e.x;
        if (dy === undefined && e?.y !== undefined) dy = e.y;

        // last resort: derive from low-level moves if present
        if ((dx === undefined || dy === undefined) && Array.isArray(e?.moves) && e.moves.length) {
            const last = e.moves[e.moves.length - 1];
            if (typeof last?.destX === 'number' && typeof last?.destY === 'number') {
                dx = last.destX; dy = last.destY;
                attacker = last.piece || attacker;
            }
        }

        const destPiece = (dx !== undefined && dy !== undefined) ? CHESS.board.get(dx, dy) : null;

        let isCapture = !!destPiece;
        let isPromotion = false;

        const isPawn = !!attacker?.toFEN && attacker.toFEN().toUpperCase() === 'P';

        // EP inference: pawn moves diagonally to empty square capturing EP-able pawn
        if (!isCapture && isPawn && dx !== undefined && dy !== undefined && ox !== undefined && oy !== undefined) {
            if (dx !== ox && CHESS.board.get(dx, dy) === null) {
                const adj = CHESS.board.get(dx, oy);
                isCapture = !!(adj && adj.toFEN && adj.toFEN().toUpperCase() === 'P' && adj.enPassantable);
            }
        }

        if (isPawn && (dy === 0 || dy === 7)) isPromotion = true;

        return {
            isPromotion,
            isCapture,
            victimScore: pieceScore(destPiece),
            attackerScore: pieceScore(attacker),
        };
    }

    entries.sort((a, b) => {
        const A = features(a);
        const B = features(b);

        // Primary: promotions (2), then captures (1), then quiets (0)
        const wa = (A.isPromotion ? 2 : 0) + (A.isCapture ? 1 : 0);
        const wb = (B.isPromotion ? 2 : 0) + (B.isCapture ? 1 : 0);
        if (wa !== wb) return wb - wa;

        // Secondary: MVV-LVA for captures
        if (A.isCapture || B.isCapture) {
            const mvvA = A.victimScore - A.attackerScore;
            const mvvB = B.victimScore - B.attackerScore;
            if (mvvA !== mvvB) return mvvB - mvvA;
        }

        return 0; // stable
    });
}

function qsearch(alpha, beta, move) {
    if (CHESS.draw) return 0;

    const tt = CHESS.table.get(CHESS.board.hash);
    if (tt !== undefined) { data.tptNodes++; return tt.score; }

    let best;
    const stm = CHESS.sideToMove();
    const inCheck = CHESS.board.checkForCheck(stm);

    if (!inCheck) {
        const standPat = evaluate(CHESS);
        best = standPat;
        if (standPat >= beta) { CHESS.table.set(CHESS.board.hash, new TableEntry(move, standPat)); return standPat; }
        if (standPat > alpha) alpha = standPat;
    } else {
        best = -Infinity;
    }

    const entries = CHESS.legalMovesAI({ capturesPromosOnly: true });
    orderEntries(entries);

    for (const entry of entries) {
        const built = CHESS.validate(entry); 
        if (!built) continue;
        const [moveList] = built;

        CHESS.push(moveList);
        if (CHESS.board.checkForCheck(stm)) { CHESS.pop(); continue; }
        const score = -qsearch(-beta, -alpha, moveList);
        CHESS.pop();

        if (score >= beta) { CHESS.table.set(CHESS.board.hash, new TableEntry(move, score)); return score; }
        if (score > best) best = score;
        if (score > alpha) alpha = score;
    }

    CHESS.table.set(CHESS.board.hash, new TableEntry(move, best));
    return best;
}

function miniMaxRec(depth, alpha, beta, move) {
    data.nodeCount++;

    if (CHESS.gameOver) return evaluate(CHESS);
    const stm = CHESS.sideToMove();

    if (depth === 0) {
        return qsearch(alpha, beta, move);
    }

    const maxing = (CHESS.turn % 2) ? true : false;
    const entries = CHESS.legalMovesAI();
    orderEntries(entries);

    let bestVal = maxing ? -Infinity : Infinity;

    for (const entry of entries) {
        const built = CHESS.validate(entry);
        if (!built) continue;
        const [moveList] = built;

        CHESS.push(moveList);
        if (CHESS.board.checkForCheck(stm)) { CHESS.pop(); continue; }
        const score = miniMaxRec(depth - 1, alpha, beta, moveList);
        CHESS.pop();

        if (maxing) {
            if (score > bestVal) bestVal = score;
            if (bestVal > alpha) alpha = bestVal;
        } else {
            if (score < bestVal) bestVal = score;
            if (bestVal < beta)  beta  = bestVal;
        }

        if (beta <= alpha) { data.prunedNodes++; break; }
    }

    return bestVal;
}

function miniMax(chess, depth) {
    CHESS = chess;
    const stm = CHESS.sideToMove();

    const bookMoves = getBookMoves();
    if (bookMoves.length > 0 && CHESS.turn < 6) {
        const move = randomMove(bookMoves);
        console.log('Book move:', move);
        return move;
    }

    const entries = CHESS.legalMovesAI();
    orderEntries(entries);

    let alpha = -Infinity, beta = Infinity;
    const maxing = (CHESS.turn % 2) ? true : false;

    let bestIdx = -1;
    let bestScore = maxing ? -Infinity : Infinity;
    const moveMap = new Map();

    for (let i = 0; i < entries.length; i++) {
        const built = CHESS.validate(entries[i]);
        if (!built) continue;
        const [moveList] = built;

        CHESS.push(moveList);
        if (CHESS.board.checkForCheck(stm)) { CHESS.pop(); continue; }

        let score;
        const tt = CHESS.table.get(CHESS.board.hash);
        if (tt !== undefined) { data.tptNodes++; score = tt.score; }
        else { score = miniMaxRec(depth - 1, alpha, beta, moveList); }

        CHESS.pop();

        if ((maxing && score >= bestScore) || (!maxing && score <= bestScore)) {
            bestIdx = i;
            bestScore = score;

            let clearMap = false;
            for (const [, mapScore] of moveMap.entries()) {
                if (maxing && bestScore > mapScore) { clearMap = true; break; }
                if (!maxing && bestScore < mapScore) { clearMap = true; break; }
            }
            if (clearMap) moveMap.clear();
            moveMap.set(i, bestScore);
        }

        if (maxing) { if (score > alpha) alpha = score; }
        else        { if (score < beta)  beta  = score; }

        if (beta <= alpha) { data.prunedNodes++; break; }
    }

    const keys = Array.from(moveMap.keys());
    const pickIdx = keys.length ? keys[Math.floor(Math.random() * keys.length)] : bestIdx;

    if (pickIdx == null || pickIdx < 0) {
        console.log('AI move:', '(none)');
        return '(none)';
    }

    // Rebuild chosen entry to obtain orig/dest/meta for SAN
    const chosenBuilt = CHESS.validate(entries[pickIdx]);
    if (!chosenBuilt) { console.log('AI move:', '(none)'); return '(none)'; }
    const [moves, orig, dest, meta] = chosenBuilt;

    const fromFile = CHESS.board.xToFile[orig[0]];
    const fromRank = CHESS.board.yToRank[orig[1]];
    const toFile   = CHESS.board.xToFile[dest[0]];
    const toRank   = CHESS.board.yToRank[dest[1]];
    let uci = `${fromFile}${fromRank}${toFile}${toRank}`;

    if (meta && meta.isPromotion) {
        const promoMove = moves[moves.length - 1];
        const promoChar = promoMove.piece.toFEN().toLowerCase();
        uci += promoChar;
    }

    const san = uciToSan(CHESS, uci);
    console.log('AI move:', san);
    return san;
}

module.exports = {
    evaluate: evaluate,
    miniMax: miniMax,
    data: data
};

