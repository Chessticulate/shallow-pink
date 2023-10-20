const Color = require('./color');

const data = {
    nodeCount: 0,
    prunedNodes: 0,
    memoizedNodes: 0
};

class TableEntry {
    constructor(move, score) {
        this.move = move;
        this.score = score;
    }
}

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
        let storedFen = chess.transpositionTable.get(chess.fen);
        if (storedFen !== undefined) {
            // data.memoizedNodes++;
            return storedFen.score;
        }
        let score = evaluate(chess);
        chess.transpositionTable.set(chess.fen, new TableEntry(move, score));
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
        let storedFen = chess.transpositionTable.get(chess.fen);

        if (storedFen !== undefined) {
            score = storedFen.score;
            console.log('stored FEN move ', storedFen);
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

    console.log('best move(s)', moveArr);
        
    // random candidate move
    const [key,] = moveArr[Math.floor(Math.random() * moveArr.length)];
    
    return key ;
}

module.exports = {
    evaluate: evaluate,
    miniMax: miniMax,
    data: data
};

