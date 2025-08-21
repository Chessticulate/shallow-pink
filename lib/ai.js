'use strict';

const Color = require('./color');
const { uciToSan } = require('./utils/notation');
const { loadBook } = require('./utils/loadBook');
let CHESS = null;

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
    return {
        key: buffer.readBigUInt64BE(offset),   // zobrist hash
        move: buffer.readUInt16BE(offset + 8), // polyglot move encoding
        weight: buffer.readUInt16BE(offset + 10),
        learn: buffer.readUInt32BE(offset + 12)
    };
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
    let hash = CHESS.board.hash;
    const entries = CHESS.book.length / 16;
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
    let score = 0; 

    [Color.WHITE, Color.BLACK].forEach(color => {
        CHESS.board.teamMap[color].forEach(piece => {
            score += piece.value();
        });
    });

    if (CHESS.checkmate) {
        score += CHESS.turn % 2 == 0 ? 1000 : -1000;
    }

    else if (CHESS.check) {
        score += CHESS.turn % 2 == 0 ? 15 : -15;
    }

    return score;
}

function miniMaxRec(depth, alpha, beta, move) {
    data.nodeCount++;

    if (depth === 0 || CHESS.gameOver) {
        let storedFen = CHESS.table.get(CHESS.board.hash);
        if (storedFen !== undefined) {
            data.tptNodes++;
            return storedFen.score;
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
            score = maxing ? 100 : -100;
            moveMap.clear();
            moveMap.set(moves[i], score);
            CHESS.undo();
            break;
        }

        // if fen has not been seen, fenScore is undefined
        let storedFen = CHESS.table.get(CHESS.board.hash);

        if (storedFen !== undefined) {
            data.tptNodes++;
            score = storedFen.score;
            // console.log('stored FEN move ', storedFen);
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

