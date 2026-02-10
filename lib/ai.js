'use strict';

const Color = require('./color');
const { polyglotToSan, coordsToSan, polyglotToUci } = require('./utils/notation');
const PIECE_INDEX = require('./utils/pieceIndex');
let CHESS = null;

// Utils

// game phase is calculated by counting remaining pieces in a position
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

// Killer moves: two slots per ply
const KILLERS = [];

// Book integration
// ------------------

function readBookEntry(buffer, offset) {
    // Fast path for Node Buffer with read*BE methods
    if (buffer && typeof buffer.readBigUInt64BE === 'function') {
        return {
            key: buffer.readBigUInt64BE(offset),
            move: buffer.readUInt16BE(offset + 8),
            weight: buffer.readUInt16BE(offset + 10),
            learn: buffer.readUInt32BE(offset + 12)
        };
    }
    // Generic path (browser & Node) via DataView
    const view = makeDataView(buffer, offset, 16);
    return {
        key:    view.getBigUint64(0,  false),
        move:   view.getUint16   (8,  false),
        weight: view.getUint16   (10, false),
        learn:  view.getUint32   (12, false)
    };
}

function byteLen(src) {
    if (!src) return 0;
    if (ArrayBuffer.isView(src)) return src.byteLength;
    if (typeof src.byteLength === 'number') return src.byteLength;
    if (typeof src.length === 'number') return src.length;
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

function getBookMoves() {
    if (!CHESS.book) return [];
    const hash = CHESS.board.hash;
    const totalBytes = byteLen(CHESS.book);
    const entries = Math.floor(totalBytes / 16);
    const moves = [];

    for (let i = 0; i < entries; i++) {
        const entry = readBookEntry(CHESS.book, i * 16);
        if (entry.key === hash) {
            const uci = polyglotToUci(entry.move);
            if (uci === 'e8h8' || uci === 'e1a1' || uci.startsWith('e8h') || uci.startsWith('e1a')) {
                console.warn('Suspicious castle decode:', uci, 'raw:', entry.move.toString(16));
            }
            moves.push({
                move: polyglotToSan(CHESS, entry.move),
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
            (m.weight === bestMove.weight && m.move < bestMove.move)
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


    const mgScore = (mg[Color.WHITE] + mg[Color.BLACK]);
    const egScore = (eg[Color.WHITE] + eg[Color.BLACK]);

    // Tapered evaluation weights
    // phase cannot be > 24 (in the case of early promotions)
    const mgPhase = Math.min(phase, 24);
    const egPhase = 24 - mgPhase;

    // Final tapered score (truncate toward zero like C's int division)
    const score = (mgScore * mgPhase + egScore * egPhase) / 24;
    return Math.trunc(score);
}

function entryKey(e) {
    // Key = fromX,fromY -> toX,toY + (promo)
    if (e && e.piece && Number.isInteger(e.destX) && Number.isInteger(e.destY)) {
        return `${e.piece.x},${e.piece.y}->${e.destX},${e.destY}-${e.promo || ''}`;
    }
    // Fallback if we ever pass pre-built [moves,orig,dest,meta] instead
    if (Array.isArray(e?.orig) && Array.isArray(e?.dest)) {
        const promo = e?.meta?.promotion || '';
        return `${e.orig[0]},${e.orig[1]}->${e.dest[0]},${e.dest[1]}-${promo}`;
    }
    return null;
}

function recordKiller(ply, key) {
    if (!key) return;
    const row = (KILLERS[ply] ||= []);
    if (row[0] === key) return;
    if (row[1] === key) {
        [row[0], row[1]] = [row[1], row[0]];
        return;
    }
    row[1] = row[0];
    row[0] = key;
}

function isKiller(ply, e) {
    const row = KILLERS[ply];
    if (!row) return false;
    const k = entryKey(e);
    return !!k && (row[0] === k || row[1] === k);
}

function orderEntries(entries, ply = 0) {
    if (!Array.isArray(entries) || entries.length < 2) return;

    const board = CHESS.board;

    const pieceScore = p =>
        p && typeof p.value === 'function' ? Math.abs(p.value('mg')) : 0;

    // Precompute feature keys once
    const decorated = entries.map(e => {
        const meta = e.meta ?? (() => {
            let ox, oy, dx, dy, attacker = e?.piece ?? null;
            if (Array.isArray(e?.orig)) { ox = e.orig[0]; oy = e.orig[1]; }
            if (Array.isArray(e?.dest)) { dx = e.dest[0]; dy = e.dest[1]; }
            if (dx === undefined && typeof e?.x === 'number') dx = e.x;
            if (dy === undefined && typeof e?.y === 'number') dy = e.y;

            // Try last move as fallback
            if ((dx === undefined || dy === undefined) && Array.isArray(e?.moves) && e.moves.length) {
                const last = e.moves[e.moves.length - 1];
                if (typeof last?.destX === 'number' && typeof last?.destY === 'number') {
                    dx = last.destX; dy = last.destY;
                    attacker = last.piece || attacker;
                }
            }

            const destPiece = (dx !== undefined && dy !== undefined) ? board.get(dx, dy) : null;

            let isCapture = !!destPiece;
            let isPromotion = false;
            const isPawn = !!attacker?.toFEN && attacker.toFEN().toUpperCase() === 'P';

            // En passant inference
            if (!isCapture && isPawn && dx !== undefined && dy !== undefined && ox !== undefined && oy !== undefined) {
                if (dx !== ox && board.get(dx, dy) === null) {
                    const adj = board.get(dx, oy);
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
        })();

        const base = (meta.isPromotion ? 2 : 0) + (meta.isCapture ? 1 : 0);
        const killerBonus = (!meta.isCapture && !meta.isPromotion && isKiller(ply, e)) ? 1000 : 0;
        const mvv = meta.isCapture ? (meta.victimScore - meta.attackerScore) : -Infinity;

        return { e, base, killerBonus, mvv, isCapture: meta.isCapture };
    });

    decorated.sort((A, B) => {
        if (A.base !== B.base) return B.base - A.base; // promos > captures > quiets
        if (A.base === 0) { // quiets: killer bonus
            if (A.killerBonus !== B.killerBonus) return B.killerBonus - A.killerBonus;
            return 0;
        }
        // captures: MVV-LVA
        if (A.mvv !== B.mvv) return B.mvv - A.mvv;
        return 0;
    });

    for (let i = 0; i < entries.length; i++) {
        entries[i] = decorated[i].e;
    }
}

function qsearch(alpha, beta, move) {
    if (CHESS.draw) return 0;

    const tt = CHESS.table.get(CHESS.board.hash);
    if (tt !== undefined) { data.tptNodes++; return tt.score; }

    const stm = CHESS.stm;
    const maxing = (stm === Color.WHITE);
    
    const inCheck = CHESS.board.checkForCheck(stm);

    let best = maxing ? Infinity : -Infinity;

    if (!inCheck) {
        const standPat = evaluate(CHESS); 
        if (maxing) {
            if (standPat >= beta) { CHESS.table.set(CHESS.board.hash, new TableEntry(move, standPat)); return standPat; }
            if (standPat > alpha) alpha = standPat;
        } else {
            if (standPat <= alpha) { CHESS.table.set(CHESS.board.hash, new TableEntry(move, standPat)); return standPat; }
            if (standPat < beta) beta = standPat;
        }
        best = standPat;
    }

    const entries = CHESS.legalMovesAI({ capturesPromosOnly: !inCheck });
    orderEntries(entries);

    for (const entry of entries) {
        const built = CHESS.validate(entry); 
        if (!built) continue;
        const [moveList] = built;

        CHESS.push(moveList);
        if (CHESS.board.checkForCheck(stm)) { CHESS.pop(); continue; }

        const score = qsearch(beta, alpha, moveList);
        CHESS.pop();

        if (maxing) {
            if (score >= beta) { CHESS.table.set(CHESS.board.hash, new TableEntry(move, score)); return score; }
            if (score > best) best = score;
            if (score > alpha) alpha = score;
        } else {
            if (score <= alpha) { CHESS.table.set(CHESS.board.hash, new TableEntry(move, score)); return score; }
            if (score < best) best = score;
            if (score < beta)  beta  = score;
        }
    }

    CHESS.table.set(CHESS.board.hash, new TableEntry(move, best));
    return best;
}

function miniMaxRec(depth, alpha, beta, move, ply = 0) {
    data.nodeCount++;
    if (CHESS.gameOver) return evaluate(CHESS);
    if (depth === 0) return qsearch(alpha, beta, move);

    const stm = CHESS.sideToMove();
    const maxing = (stm === Color.WHITE);

    const entries = CHESS.legalMovesAI();
    orderEntries(entries, ply);

    let bestVal = maxing ? -Infinity : +Infinity;
    let first = true;

    for (const entry of entries) {
        const built = CHESS.validate(entry);
        if (!built) continue;
        const [moveList, , , meta] = built;

        CHESS.push(moveList);

        if (CHESS.board.checkForCheck(stm)) { CHESS.pop(); continue; }

        let score;
        if (first) {
            score = miniMaxRec(depth - 1, alpha, beta, moveList, ply + 1);
            first = false;
        } else {
            score = miniMaxRec(depth - 1, alpha, alpha + 1, moveList, ply + 1);
            if (score > alpha && score < beta) {
                score = miniMaxRec(depth - 1, alpha, beta, moveList, ply + 1);
            }
        }

        CHESS.pop();

        if (maxing) {
            if (score > bestVal) bestVal = score;
            if (bestVal > alpha) alpha = bestVal;
        } else {
            if (score < bestVal) bestVal = score;
            if (bestVal < beta)  beta  = bestVal;
        }

        // Beta cutoff → record killer if this move was QUIET
        if (beta <= alpha) {
            if (!(meta?.isCapture) && !(meta?.isPromotion)) {
                recordKiller(ply, entryKey(entry));
            }
            data.prunedNodes++;
            break;
        }
    }

    return bestVal;
}

function miniMax(chess, depth) {
    CHESS = chess;

    const bookMoves = getBookMoves();
    if (bookMoves.length > 0 && CHESS.turn < 20) {
        const move = randomMove(bookMoves);
        return move;
    }

    const entries = CHESS.legalMovesAI();
    orderEntries(entries, 0);

    let alpha = -Infinity, beta = Infinity;

    const stm = CHESS.sideToMove();
    const maxing = (stm === Color.WHITE);

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

            // keep a small set of ties
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
    const chosenBuilt = CHESS.validate(entries[pickIdx]);
    const san = coordsToSan(CHESS, chosenBuilt);

    return san;
}

module.exports = {
    evaluate: evaluate,
    miniMax: miniMax,
    data: data
};

