const Color = require("./color");
const Status = require("./status");

const data = {
    nodeCount: 0,
    prunedNodes: 0,
    memoizedNodes: 0
}

function evaluate(chess) { 
    let score = 0; 

    [Color.WHITE, Color.BLACK].forEach(color => {
        chess.board.teamMap[color].forEach(piece => {
            score += piece.value();
        });
    });

    return Number.parseFloat(score.toFixed(2));
}

function miniMaxRec(chess, depth, alpha, beta, evaluatedPositions) {
    let fen = chess.board.toFEN();
    data.nodeCount++;

    if (depth === 0 || chess.gameOver) {
        if (evaluatedPositions.get(fen) !== undefined) {
            data.memoizedNodes++;
            return evaluatedPositions.get(fen);
        }
        let score = evaluate(chess);
        evaluatedPositions.set(fen, score);
        return score;
    }

    let maxing = chess.turn % 2 == 0 ? false : true;
    let moves = chess.legalMoves();

    let bestVal = maxing ? -Infinity : Infinity;
    for (let i = 0; i < moves.length; i++) {

        chess.move(moves[i]);
        let score = miniMaxRec(chess, depth-1, alpha, beta, evaluatedPositions);
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
        
    };
    return bestVal;
}

function miniMax(chess, depth) {
    let moves = chess.legalMoves();
    let alpha = -Infinity, beta = Infinity;
    let maxing = chess.turn % 2 == 0 ? false : true;
    let evaluatedPositions = new Map();
    let bestMove, bestScore = maxing ? -Infinity : Infinity;

    // list of best candidate moves
    let moveMap = new Map();

    moves.forEach(move => {
        chess.move(move);
        let score = miniMaxRec(chess, depth-1, alpha, beta, evaluatedPositions);
        chess.undo();
        if ((maxing && score >= bestScore) || (!maxing && score <= bestScore)) { 
            bestMove = move;
            bestScore = score;

            // if best score is greater than any scores in moveMap, moveMap is flushed
            // MoveMap should only hav len > 1 if the scores of the moves are equal.
            let clearMap = false;
            for (let [move, mapScore] of moveMap.entries()) {
                if (maxing && bestScore > mapScore) {
                    clearMap = true;
                    break;
                }
                else if (!maxing && bestScore < mapScore) {
                    clearMap = true;
                    break;
                }

            };

            // clear map if clear flag is thrown
            if (clearMap) {
                console.log('moveMap before clear', moveMap);
                moveMap.clear();
            }

            moveMap.set(bestMove, bestScore);
        }
    });

    const moveArr = Array.from(moveMap.entries());
    if (moveArr.length === 0) {
        return null;
    }
        
    // random candidate move
    const [key, value] = moveArr[Math.floor(Math.random() * moveArr.length)];

    console.log('best moves', moveArr);
    
    return key ;
}
    

module.exports = {
    evaluate: evaluate,
    miniMax: miniMax,
    data: data
};

