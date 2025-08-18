const Color = require('../color');
const King = require('../pieces/king');


// uci format --> standard algebraic 
function uciToSan(chess, uciMove) {
    // isolate start and end squares
    const orig = uciMove.slice(0, 2);
    const dest = uciMove.slice(2, 4);
    
    // get piece type from start square
    let x = chess.board.fileToX[orig[0]];
    let y = chess.board.rankToY[orig[1]];
    const piece = chess.board.get(x, y);

    // TODO this is a temporary fix
    // generateMoveStrs is returning Kc1 instead of O-O-O for castles
    // might want to refactor that but this should fix for now
    if (piece instanceof King) {
        if (uciMove == 'e1g1' || uciMove == 'e8g8') {
            return 'O-O';
        }

        if (uciMove == 'e1c1' || uciMove == 'e8c8') {
            return 'O-O-O';
        }
    }

    // set x and y to destination
    x = chess.board.fileToX[dest[0]];
    y = chess.board.rankToY[dest[1]];

    let san = chess.generateMoveStrs(piece, x, y)[0];

    if (san.includes('=')) {
        return san.slice(0, -1) + uciMove[4].toUpperCase();
    }

    return san;

}

// standard algebraic --> uci format
function sanToUci(chess, sanMove) {
    let turnColor = chess.turn % 2 ? Color.WHITE : Color.BLACK;

    if (sanMove == 'O-O') {
        return turnColor == Color.WHITE ? 'e1g1' : 'e8g8';
    }

    if (sanMove == 'O-O-O') {
        return turnColor == Color.WHITE ? 'e1c1' : 'e8c8';
    }
    
    // isolate piece type and origin
    let pieceType = 'NBRKQ'.includes(sanMove[0]) ? sanMove[0] : 'P';

    // isolate promotion before cleaning move
    const promotion = sanMove.includes('=') ? sanMove.at(-1).toLowerCase() : '';

    // get dest
    const cleanedMove = sanMove.replace(/=[QRBN]?|\+|#|x/g, ''); // Qxd5 --> d5
    const dest = cleanedMove.slice(-2);
    const x = chess.board.fileToX[dest[0]];
    const y = chess.board.rankToY[dest[1]];

    // find piece that can do move
    const pieceList = chess.board.teamMap[turnColor].filter(
        piece => piece.toFEN().toUpperCase() === pieceType
    );

    let orig = '';
    for (const piece of pieceList) {
        if (piece.evaluate(chess.board, x, y)) {
            orig = `${chess.board.xToFile[piece.x]}${chess.board.yToRank[piece.y]}`;
            break;
        }
    }

    return `${orig}${dest}${promotion}`;
}

module.exports = { uciToSan, sanToUci };

