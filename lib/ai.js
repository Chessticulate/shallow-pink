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

    const sign = CHESS.turn % 2 ? 1 : -1;

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

// Killer moves: two slots per ply
const KILLERS = [];

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
    if (row[0] === key) return;          // already primary
    if (row[1] === key) {                // swap to primary
        [row[0], row[1]] = [row[1], row[0]];
        return;
    }
    row[1] = row[0];                     // demote old primary
    row[0] = key;                        // new primary
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

    let best;
    const stm = CHESS.stm;
    const inCheck = CHESS.board.checkForCheck(stm);

    if (!inCheck) {
        const standPat = evaluate(CHESS);
        best = standPat;
        if (standPat >= beta) { CHESS.table.set(CHESS.board.hash, new TableEntry(move, standPat)); return standPat; }
        if (standPat > alpha) alpha = standPat;
    } else {
        best = -Infinity;
    }

    const entries = CHESS.legalMovesAI({ capturesPromosOnly: !inCheck });
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

// === NEGAMAX SEARCH with PVS =======================================
// *** CHANGED: replace miniMaxRec with a pure negamax + alpha-beta (+ light PVS).
function searchNegamax(depth, alpha, beta, move, ply = 0) {
    data.nodeCount++;
    if (CHESS.gameOver) return evaluate(CHESS);
    if (depth === 0)    return qsearch(alpha, beta, move);

    const stm = CHESS.stm;
    const entries = CHESS.legalMovesAI();
    orderEntries(entries, ply);

    let best = -Infinity;
    let first = true;

    for (const entry of entries) {
        const built = CHESS.validate(entry);
        if (!built) continue;
        const [moveList, , , meta] = built;

        CHESS.push(moveList);
        if (CHESS.board.checkForCheck(stm)) { CHESS.pop(); continue; }

        let score;
        if (first) {
            // full window on the first child
            score = -searchNegamax(depth - 1, -beta, -alpha, moveList, ply + 1);
            first = false;
        } else {
            // *** PVS: try a null window first
            score = -searchNegamax(depth - 1, -(alpha + 1), -alpha, moveList, ply + 1);
            if (score > alpha && score < beta) {
                score = -searchNegamax(depth - 1, -beta, -alpha, moveList, ply + 1);
            }
        }

        CHESS.pop();

        if (score >= beta) {
            // *** KILLER on quiets at cutoff
            if (!(meta?.isCapture) && !(meta?.isPromotion)) {
                recordKiller(ply, entryKey(entry));
            }
            data.prunedNodes++;
            return score; // fail-hard beta
        }
        if (score > best) best = score;
        if (score > alpha) alpha = score;
    }

    // If no legal moves expanded, return static (stalemate/checkmate handled in evaluate or gameOver)
    return best;
}

function miniMax(chess, depth) {
    CHESS = chess;
    const stm = CHESS.stm;

    const bookMoves = getBookMoves();
    if (bookMoves.length > 0 && CHESS.turn < 20) {
        const move = randomMove(bookMoves);
        console.log('Book move:', move);
        return move;
    }

    const entries = CHESS.legalMovesAI();
    orderEntries(entries, 0);

    let alpha = -Infinity, beta = +Infinity;
    let bestIdx = -1;
    let bestScore = -Infinity;  // *** NEGAMAX: always maximize returned score
    const moveMap = new Map();

    console.log('eval:', evaluate(CHESS)); // from side-to-move POV

    for (let i = 0; i < entries.length; i++) {
        const built = CHESS.validate(entries[i]);
        if (!built) continue;
        const [moveList] = built;

        CHESS.push(moveList);
        if (CHESS.board.checkForCheck(stm)) { CHESS.pop(); continue; }

        let score;
        const tt = CHESS.table.get(CHESS.board.hash);
        if (tt !== undefined) { data.tptNodes++; score = tt.score; }
        else { score = -searchNegamax(depth - 1, -beta, -alpha, moveList, 1); }  // *** CHANGED

        CHESS.pop();

        if (score > bestScore) {
            bestIdx = i;
            bestScore = score;
            moveMap.clear();
            moveMap.set(i, bestScore);
        } else if (score === bestScore) {
            moveMap.set(i, bestScore);
        }

        if (score > alpha) alpha = score;
        if (alpha >= beta) { data.prunedNodes++; break; }
    }

    const keys = Array.from(moveMap.keys());
    const pickIdx = keys.length ? keys[Math.floor(Math.random() * keys.length)] : bestIdx;

    let sanMoves = [];
    for (let [idx, score] of moveMap.entries()) {
        const built = CHESS.validate(entries[idx]);
        if (!built) continue;
        const san = CHESS.board.coordsToSan(built);
        sanMoves.push([san, score]);
    }

    const chosenBuilt = CHESS.validate(entries[pickIdx]);
    if (!chosenBuilt) { console.log('AI move:', '(none)'); return '(none)'; }

    const san = CHESS.board.coordsToSan(chosenBuilt);
    console.log('best moves:', sanMoves);
    console.log('AI move:', san);
    return san;
}

module.exports = {
    evaluate: evaluate,
    miniMax: miniMax,
    data: data
};

