const {xToFile, yToRank} = require("./addressMaps");
const Chess = require("../lib/chess");
const Color = require('../lib/color');


function generateMoveStr(piece, board, x, y) {
    let pieceType = piece.toFEN().toUpperCase();
    let capture = false;

    if (board.get(x, y) || 
        (pieceType === "P" && Math.abs(piece.x - x) === Math.abs(piece.y - y))) {
        capture = true;
    }

    if (pieceType === "P") {
        let promotion = (y === 0 || y === 7);
        return `${capture?xToFile[piece.x]+'x':''}${xToFile[x]}${yToRank[y]}${promotion?'=Q':''}`;
    }
    return `${pieceType}${capture?'x':''}${xToFile[x]}${yToRank[y]}`;
}

// maybe pawn captures should not be included in the Pawn.moveSet if diagonal tiles are empty
function validMoves(fenStr) {
    let chess = new Chess(fenStr);
    let color = chess.turn % 2 ? Color.WHITE : Color.BLACK;
    let pieces = chess.board.teamMap[color];
    let moveSet = [];

    pieces.forEach(piece => {
        piece.moveSet.forEach(move => {
            let x = move[0] + piece.x, y = move[1] + piece.y;
            if (!piece.evaluate(chess.board, x, y)) {
                return;
            }
            let moveStr = generateMoveStr(piece, chess.board, x, y);
            if (chess.board.buildMove(moveStr, color) !== null) {
                moveSet.push(moveStr);
            }
        });
    });

    return moveSet;//[Math.floor(Math.random() * moveSet.length)];
}

module.exports.generateMoveStr = generateMoveStr;
module.exports.validMoves = validMoves;

