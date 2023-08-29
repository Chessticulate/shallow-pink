const Chess = require("./chess");
const Color = require("./color");
const Status = require("./status");

function evaluate(chess) { 
    let score = 0; 

    [Color.WHITE, Color.BLACK].forEach(color => {
        chess.board.teamMap[color].forEach(piece => {
            score += piece.value();
        });
    });

    return score;
}

function miniMaxRec(chess, depth, depth2, alpha, beta, evaluatedPositions) {
    let fen = chess.board.toFEN();
    if (depth === 0 || chess.gameOver) {
        if (evaluatedPositions.get(fen) !== undefined) {
            return evaluatedPositions.get(fen);
        }
        let score = evaluate(chess);
        evaluatedPositions.set(fen, score);
        return score;
    }

    let maxing = chess.turn % 2 == 0 ? false : true;
    let moves = legalMoves(chess);

    let bestVal = maxing ? -Infinity : Infinity;
    for (let i = 0; i < moves.length; i++) {

        chess.move(moves[i]);
        let score = miniMaxRec(chess, depth-1, depth2+1, alpha, beta, evaluatedPositions);
        chess.undo();

        if (maxing) {
            bestVal = Math.max(bestVal, score);
            alpha = Math.max(alpha, bestVal);
        }

        else {
            bestVal = Math.min(bestVal, score);
            beta =  Math.min(beta, bestVal);
        }
    
        if(beta <= alpha) {
            break;
        }
        
    };
    return bestVal;
}

function miniMax(fen, depth) {
    let chess = new Chess(fen);
    let moves = legalMoves(chess);
    let alpha = -Infinity, beta = Infinity;
    let maxing = chess.turn % 2 == 0 ? false : true;
    let evaluatedPositions = new Map();
    let bestMove, bestScore = maxing ? -Infinity : Infinity;

    moves.forEach(move => {
        chess.move(move);
        let score = miniMaxRec(chess, depth-1, 1, alpha, beta, evaluatedPositions);
        chess.undo();
        if ((maxing && score > bestScore) || (!maxing && score < bestScore)) {
            bestMove = move;
            bestScore = score;
        }
    });
    return bestMove;
}

module.exports = {
    evaluate: evaluate,
    miniMax: miniMax,
};

