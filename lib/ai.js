const {xToFile, yToRank} = require("./addressMaps");
const Chess = require("./chess");
const Color = require("./color");
const Status = require("./status");

// piece value map
// used for move sorting
const valueMap = {
    'p': 1,
    'B': 3,
    'N': 3,
    'R': 5,
    'Q': 9
}

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
            // ommiting bishop and rook promotion  from move list, promotion to queen is almost always prefered, 
            // and very rarily a knight is better. "B", "R"
            ["Q", "N"].forEach(newType => {
                moveStrs.push(`${capture?origFile+'x':''}${destFile}${destRank}=${newType}`);
            });
            return moveStrs;
        }
        return [`${capture?origFile+'x':''}${destFile}${destRank}`];
    }
    return [`${pieceType}${disambiguate}${capture?'x':''}${destFile}${destRank}`];
}

// currently sorts the move order by pushing captures and promotions to the front of the list
// sorting is cutting runtime nearly in half!
// moves should be further sorted so that pieces of < value capturing pieces of > value are pushed to the front
function sortMoves(moves) {    
    for (let i = 0; i < moves.length; i++) {
        if (moves[i].includes('x') || moves[i].includes('=')) {
            moves.unshift(moves.splice(i, 1)[0]);
        }
    }
    return moves;
}

function legalMoves(chess) {
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

    return sortMoves(moveSet);
}

function evaluate(chess) { 
    let score = 0; 

    [Color.WHITE, Color.BLACK].forEach(color => {
        chess.board.teamMap[color].forEach(piece => {
            score += piece.value();
        });
    });

    return score;
}



function miniMaxRec(chess, depth, depth2, alpha, beta, transpositions) {
    let fen = chess.board.toFEN();
    module.exports.nodeCount++;

    if (depth === 0 || chess.gameOver) {
        if (transpositions.get(fen) !== undefined) {
            module.exports.memoizedNodes++;
            return transpositions.get(fen);
        }
        let score = evaluate(chess);
        transpositions.set(fen, score);
        return score;
    }

    let maxing = chess.turn % 2 == 0 ? false : true;
    let moves = legalMoves(chess);

    let bestVal = maxing ? -Infinity : Infinity;
    for (let i = 0; i < moves.length; i++) {
        
        // for (let i = 0; i < depth2; i++) {
        //     process.stdout.write("--");
        // }
        // process.stdout.write(moves[i]);
        chess.move(moves[i]);
        // console.log(" ", evaluate(chess));
        let score = miniMaxRec(chess, depth-1, depth2+1, alpha, beta, transpositions);
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
            module.exports.prunedNodes++;
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
    let transpositions = new Map();

    let bestMove, bestScore = maxing ? -Infinity : Infinity;
    moves.forEach(move => {
        process.stdout.write(move);
        chess.move(move);
        process.stdout.write(" " + evaluate(chess));
        let score = miniMaxRec(chess, depth-1, 1, alpha, beta, transpositions);
        process.stdout.write(" score at depth n " + score + "\n");
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
        currentMoves = legalMoves(chess);
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
    memoizedNodes: 0,
    prunedNodes: 0,
    mainFrame: mainFrame
};

