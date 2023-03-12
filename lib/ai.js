const {xToFile, yToRank} = require("./addressMaps");
const Chess = require("./chess");
const Color = require("./color");
const Status = require("./status");

function generateMoveStrs(piece, board, x, y) {
    let pieceType = piece.toFEN().toUpperCase();
    let capture = false;

    if (board.get(x, y) || 
        (pieceType === "P" && Math.abs(piece.x - x) === Math.abs(piece.y - y))) {
        capture = true;
    }

    // check if move string needs to be disambiguated
    let ambiguous = false, ambigX = false, ambigY = false;
    board.teamMap[piece.color].forEach(currPiece => {
        if (currPiece.toFEN() === piece.toFEN() &&
            currPiece !== piece &&
            currPiece.evaluate(board, x, y)) {
            ambiguous = true;
            if (currPiece.x === piece.x) {
                ambigX = true;
            }
            if (currPiece.y === piece.y) {
                ambigY = true;
            }
        }
    });

    let origFile = xToFile[piece.x];
    let origRank = yToRank[piece.y];
    let destFile = xToFile[x];
    let destRank = yToRank[y];

    let disambiguate = '';
    if (ambiguous) {
        if (ambigX && ambigY) {
            disambiguate = origFile + origRank;
        }
        else if (ambigX) {
            disambiguate = origRank;
        }
        else {
            disambiguate = origFile;
        }
    }

    if (pieceType === "P") {
        if (y === 0 || y === 7) {
            let moveStrs = [];
            ["Q", "N", "B", "R"].forEach(newType => {
                moveStrs.push(`${capture?origFile+'x':''}${destFile}${destRank}=${newType}`);
            });
            return moveStrs;
        }
        return [`${capture?origFile+'x':''}${destFile}${destRank}`];
    }
    return [`${pieceType}${disambiguate}${capture?'x':''}${destFile}${destRank}`];
}


function legalMoves(fenStr) {
    let chess = new Chess(fenStr);
    let color = chess.turn % 2 ? Color.WHITE : Color.BLACK;
    let pieces = [...chess.board.teamMap[color]];
    let moveSet = [];
    let moveStrs = null;

    pieces.forEach(piece => {
        piece.moveSet.forEach(move => {
            let x = move[0] + piece.x, y = move[1] + piece.y;
            if (!piece.evaluate(chess.board, x, y)) {
                return;
            }

            moveStrs = generateMoveStrs(piece, chess.board, x, y);

            let status = chess.move(moveStrs[0]);
            if (![Status.INVALIDMOVE, Status.STILLINCHECK, Status.PUTSINCHECK].includes(status)) {
                moveStrs.forEach(moveStr => {
                    moveSet.push(moveStr);
                });
                chess.undo();
            }
        });
    });

    return moveSet;
}

function evaluate(fen) { 
    let chess = new Chess(fen);
    let score = 0; 

    [Color.WHITE, Color.BLACK].forEach(color => {
        chess.board.teamMap[color].forEach(piece => {
            score += piece.value();
        });
    });

    return score;
}


function miniMaxRec(fen, depth, maxing) {
    let chess = new Chess(fen);

    if (depth === 0 || chess.gameOver) {
        return evaluate(chess.toFEN());
    }

    let moves = legalMoves(fen);

    let bestVal = maxing ? -Infinity : Infinity;
    moves.forEach(move => {
        chess.move(move);
        let score = miniMaxRec(chess.toFEN(), depth-1, !maxing);
        chess.undo();
        bestVal = maxing ? Math.max(score, bestVal) : Math.min(score, bestVal);
    });
    return bestVal;
}

// if depth is even, opponents best move and score is returned
// if depth is odd, active teams best move and score is returned
function miniMax(fen, depth) {
    let chess = new Chess(fen);
    let moves = legalMoves(fen);
    let maxing = chess.turn % 2 == 0 ? false : true;

    let bestMove, bestScore = maxing ? -Infinity : Infinity;
    moves.forEach(move => {
        chess.move(move);
        let score = miniMaxRec(chess.toFEN(), depth-1, !maxing);
        chess.undo();
        if ((maxing && score > bestScore) || (!maxing && score < bestScore)) {
            bestMove = move;
            bestScore = score;
        }
    });
    return bestMove;
}

function mainFrame(fen) {
    let chess = new Chess(fen);
    let currentMoves;
    while(!chess.gameOver) {
        console.log(chess.toString());
        console.log(chess.toFEN());
        currentMoves = this.legalMoves(chess.toFEN());
        let move = currentMoves[Math.floor(Math.random() * currentMoves.length)];
        console.log(move, '->', chess.move(move));
    }
    console.log(chess.toString());
    console.log(chess.toFEN());
}

module.exports = {
    evaluate: evaluate,
    legalMoves: legalMoves,
    generateMoveStrs: generateMoveStrs,
    miniMax: miniMax,
    nodeCount: 0,
    mainFrame: mainFrame
};

