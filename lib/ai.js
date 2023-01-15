
function generateMoveStr(piece, board, x, y) {
    
}


function randomMove(fenStr) {
    let chess = new Chess(fenStr);
    let pieces = chess.teamMap[chess.turn % 2 ? Color.WHITE : Color.BLACK];
    let moveMap = new Map();
    pieces.forEach(piece => {
        moveMap.set(piece, [])
        piece.moveSet.forEach(move => {
            let x = move[0] + piece.x, y = move[1] + piece.y;
            if (piece.evaluate(chess.board, x, y)) {
                moveMap.get(piece).push('');
            }
        });
    });

    

    // loop through each piece
        // loop through each pieces move set
            // filter out out of bounds moves / illegal moves
            // filter out checked moves
    // convert moves into move strings
    // return random move
}
