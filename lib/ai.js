const Color = require('./color');
const fs = require('fs');

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

// ------------------
// Book integration
// ------------------

let bookFile;
try {
    // load the opening book once (e.g. Performance.bin)
    bookFile = fs.readFileSync('./books/Performance.bin');
} catch (err) {
    console.warn('Opening book not found, continuing without book.');
    bookFile = null;
}

function readBookEntry(buffer, offset) {
    return {
        key: buffer.readBigUInt64BE(offset),   // zobrist hash
        move: buffer.readUInt16BE(offset + 8), // polyglot move encoding
        weight: buffer.readUInt16BE(offset + 10),
        learn: buffer.readUInt32BE(offset + 12)
    };
}

function polyglotToUci(move) {
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
    return uci;
}

function getBookMoves(fenHash) {
    if (!bookFile) return [];
    const entries = bookFile.length / 16;
    const moves = [];
    for (let i = 0; i < entries; i++) {
        const entry = readBookEntry(bookFile, i * 16);
        if (entry.key === fenHash) {
            moves.push({
                move: polyglotToUci(entry.move),
                weight: entry.weight
            });
        }
    }
    return moves;
}

function weightedRandom(moves) {
    const total = moves.reduce((sum, m) => sum + m.weight, 0);
    let r = Math.floor(Math.random() * total);
    for (const m of moves) {
        if (r < m.weight) return m.move;
        r -= m.weight;
    }
    return moves[0].move;
}

// ------------------
// Your existing code
// ------------------

// evaluation function, currently uses material value as well as relative piece square value 
function evaluate(chess) { 
    let score = 0; 

    [Color.WHITE, Color.BLACK].forEach(color => {
        chess.board.teamMap[color].forEach(piece => {
            score += piece.value();
        });
    });

    if (chess.checkmate) {
        score += chess.turn % 2 == 0 ? 1000 : -1000;
    }

    else if (chess.check) {
        score += chess.turn % 2 == 0 ? 15 : -15;
    }

    return score;
}

function miniMaxRec(chess, depth, alpha, beta, move) {
    data.nodeCount++;

    if (depth === 0 || chess.gameOver) {
        let storedFen = chess.transpositionTable.get(chess.board.hash);
        if (storedFen !== undefined) {
            data.tptNodes++;
            return storedFen.score;
        }
        let score = evaluate(chess);
        chess.transpositionTable.set(chess.board.hash, new TableEntry(move, score));
        return score;
    }

    let maxing = chess.turn % 2 == 0 ? false : true;
    let moves = chess.legalMoves();
    let bestVal = maxing ? -Infinity : Infinity;

    for (let i = 0; i < moves.length; i++) {

        chess.move(moves[i]);
        let score = miniMaxRec(chess, depth-1, alpha, beta, move);
        chess.undo();

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
    // --- book lookup first ---
    const bookMoves = getBookMoves(chess.board.hash);
    if (bookMoves.length > 0) {
        const move = weightedRandom(bookMoves);
        console.log('Book move:', move);
        return move;
    }

    let moves = chess.legalMoves();
    let alpha = -Infinity, beta = Infinity;
    let maxing = chess.turn % 2 == 0 ? false : true;
    let bestMove, bestScore = maxing ? -Infinity : Infinity;

    // list of best candidate moves
    let moveMap = new Map();

    for (let i = 0; i < moves.length; i++) {
        chess.move(moves[i]);

        let score;

        // if move results in checkmate, clear all other moves from moveMap and break out of the loop
        if (chess.checkmate) {
            // score is undefined at this point so it needs to be set 
            score = maxing ? 100 : -100;
            moveMap.clear();
            moveMap.set(moves[i], score);
            chess.undo();
            break;
        }

        // if fen has not been seen, fenScore is undefined
        let storedFen = chess.transpositionTable.get(chess.board.hash);

        if (storedFen !== undefined) {
            data.tptNodes++;
            score = storedFen.score;
            // console.log('stored FEN move ', storedFen);
        }
        // move[i] is passed into the recursive call so it can be added to the transposition table
        else score = miniMaxRec(chess, depth-1, alpha, beta, moves[i]);

        chess.undo();

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
    
    return key ;
}

module.exports = {
    evaluate: evaluate,
    miniMax: miniMax,
    data: data
};

