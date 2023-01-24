const xToFile = {
    0: 'a',
    1: 'b',
    2: 'c',
    3: 'd',
    4: 'e',
    5: 'f',
    6: 'g',
    7: 'h'
};

const yToRank = {
    7: '1',
    6: '2',
    5: '3',
    4: '4',
    3: '5',
    2: '6',
    1: '7',
    0: '8'
};


function generateMoveStr(piece, board, x, y) {
    let pieceType = piece.toFEN().toUpperCase();
    let capture = false;

    if (board.get(x, y) || 
        (pieceType === "P" && Math.abs(piece.x - x) === Math.abs(piece.y - y))) {
        capture = true;
    }

    if (pieceType === "P") {
        let promotion = (y === 0 || y === 7);
        return `${capture?'x':''}${xToFile[x]}${yToRank[y]}${promotion?'=Q':''}`;
    }
    return `${pieceType}${capture?'x':''}${xToFile[x]}${yToRank[y]}`;
}


function randomMove(fenStr) {
    let chess = new Chess(fenStr);
    let pieces = chess.teamMap[chess.turn % 2 ? Color.WHITE : Color.BLACK];
    let moveSet = [];

    pieces.forEach(piece => {
        piece.moveSet.forEach(move => {
            let x = move[0] + piece.x, y = move[1] + piece.y;
            if (piece.evaluate(chess.board, x, y)) {
                return;
            }
            let moveStr = generateMoveStr(piece, board, x, y);
            if (chess.board.buildMove(moveStr) !== null) {
                moveSet.push(moveStr);
            }
        });
    });

    return moveSet[Math.floor(Math.random() * moveSet.length)];
}
