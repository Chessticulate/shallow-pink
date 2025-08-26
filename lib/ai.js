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

function miniMaxRec(depth, alpha, beta, move) {
    data.nodeCount++;

    if (depth === 0 || CHESS.gameOver) {
        let hash = CHESS.table.get(CHESS.board.hash);
        if (hash !== undefined) {
            data.tptNodes++;
            return hash.score;
        }
        let score = evaluate(CHESS);
        CHESS.table.set(CHESS.board.hash, new TableEntry(move, score));
        return score;
    }

    let maxing = CHESS.turn % 2 == 0 ? false : true;
    let moves = CHESS.legalMoves();
    let bestVal = maxing ? -Infinity : Infinity;

    for (let i = 0; i < moves.length; i++) {

        CHESS.move(moves[i]);
        let score = miniMaxRec(depth-1, alpha, beta, move);
        CHESS.undo();

        if (maxing) {
            bestVal = Math.max(bestVal, score);
            alpha = Math.max(alpha, bestVal);
        }

        else {
            bestVal = Math.min(bestVal, score);
            beta =  Math.min(beta, bestVal);
        }
    
        if (beta <= alpha) {
            data.prunedNodes++;
            break;
        }
        
    }
    return bestVal;
}

function miniMax(chess, depth) {

    CHESS = chess;
    const bookMoves = getBookMoves();
    // play book moves for a maximum of 12 ply (6 full moves)
    if (bookMoves.length > 0 && CHESS.turn < 6) {
        const move = randomMove(bookMoves);
        console.log('Book move:', move);
        return move;
    }

    let moves = CHESS.legalMoves();
    let alpha = -Infinity, beta = Infinity;
    let maxing = CHESS.turn % 2 == 0 ? false : true;
    let bestMove, bestScore = maxing ? -Infinity : Infinity;

    // list of best candidate moves
    let moveMap = new Map();

    for (let i = 0; i < moves.length; i++) {
        CHESS.move(moves[i]);

        let score;

        // if move results in checkmate, clear all other moves from moveMap and break out of the loop
        if (CHESS.checkmate) {
            score = maxing ? 10000 : -10000;
            moveMap.clear();
            moveMap.set(moves[i], score);
            CHESS.undo();
            break;
        }

        // if position has not been seen, hash is undefined
        let hash = CHESS.table.get(CHESS.board.hash);

        if (hash !== undefined) {
            data.tptNodes++;
            score = hash.score;
        }
        // move[i] is passed into the recursive call so it can be added to the transposition table
        else score = miniMaxRec(depth-1, alpha, beta, moves[i]);

        CHESS.undo();

        if ((maxing && score >= bestScore) || (!maxing && score <= bestScore)) { 
            bestMove = moves[i];
            bestScore = score;

            // if best score is greater than any scores in moveMap, moveMap is flushed
            // MoveMap should only hav len > 1 if the scores of the moves are equal.
            let clearMap = false;

            for (let [, mapScore] of moveMap.entries()) {
                if (maxing && bestScore > mapScore) {
                    clearMap = true;
                    break;
                }
                else if (!maxing && bestScore < mapScore) {
                    clearMap = true;
                    break;
                }

            }

            // clear map if clear flag is thrown
            if (clearMap) moveMap.clear();

            moveMap.set(bestMove, bestScore);
        }
    }

    const moveArr = Array.from(moveMap.entries());
        
    // random candidate move
    const [key,] = moveArr[Math.floor(Math.random() * moveArr.length)];
    
    console.log('AI move:', key);
    return key ;
}

module.exports = {
    evaluate: evaluate,
    miniMax: miniMax,
    data: data
};

