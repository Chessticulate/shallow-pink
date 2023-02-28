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

    if (pieceType === "P") {
        if (y === 0 || y === 7) {
            let moveStrs = [];
            ["Q", "N", "B", "R"].forEach(newType => {
                moveStrs.push(`${capture?xToFile[piece.x]+'x':''}${xToFile[x]}${yToRank[y]}=${newType}`);
            });
            return moveStrs;
        }
        return [`${capture?xToFile[piece.x]+'x':''}${xToFile[x]}${yToRank[y]}`];
    }
    // might need to use completely disambiguated moves
    return [`${pieceType}${capture?'x':''}${xToFile[x]}${yToRank[y]}`];
}


function legalMoves(fenStr) {
    let chess = new Chess(fenStr);
    let color = chess.turn % 2 ? Color.WHITE : Color.BLACK;
    let pieces = chess.board.teamMap[color];
    let moveSet = [];
    let moveStrs = null;

    // undoing promotion causes the pawn to be re-added to team list, 
    // which causes its moves to be evaluated a second time.

    pieces.forEach(piece => {
        piece.moveSet.forEach(move => {
            let x = move[0] + piece.x, y = move[1] + piece.y;
            if (!piece.evaluate(chess.board, x, y)) {
                return;
            }
            
            moveStrs = generateMoveStrs(piece, chess.board, x, y);

            moveStrs.forEach(moveStr => {
                let status = chess.move(moveStr);
                if (![Status.INVALIDMOVE, Status.STILLINCHECK, Status.PUTSINCHECK].includes(status)) {
                    moveSet.push(moveStr);
                    chess.undo();
                }
            });
        });
    });

    return moveSet;
}

module.exports.generateMoveStrs = generateMoveStrs;
module.exports.legalMoves = legalMoves;

