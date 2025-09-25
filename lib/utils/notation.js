const Color = require('../color');
const King  = require('../pieces/king');
const Pawn  = require('../pieces/pawn');

// uci format --> standard algebraic 
function uciToSan(chess, uciMove) {
    const orig = uciMove.slice(0, 2);
    const dest = uciMove.slice(2, 4);

    // hard-catch castling from UCI
    if (uciMove === 'e1g1' || uciMove === 'e8g8') return 'O-O';
    if (uciMove === 'e1c1' || uciMove === 'e8c8') return 'O-O-O';

    // piece on origin
    let x = chess.board.fileToX[orig[0]];
    let y = chess.board.rankToY[orig[1]];
    const piece = chess.board.get(x, y);

    // destination
    x = chess.board.fileToX[dest[0]];
    y = chess.board.rankToY[dest[1]];

    let san = chess.generateMoveStrs(piece, x, y)[0] || '';

    // keep promotion letter from UCI if needed
    if (san.includes('=')) {
        return san.slice(0, -1) + (uciMove[4]?.toUpperCase() || '');
    }
    return san;
}

// standard algebraic --> uci 
function sanToUci(chess, sanMove) {
    const turnColor = (chess.turn % 2) ? Color.WHITE : Color.BLACK;
    if (sanMove === 'O-O')   return (turnColor === Color.WHITE) ? 'e1g1' : 'e8g8';
    if (sanMove === 'O-O-O') return (turnColor === Color.WHITE) ? 'e1c1' : 'e8c8';

    const pieceType = 'NBRKQ'.includes(sanMove[0]) ? sanMove[0] : 'P';
    const promotion = sanMove.includes('=') ? sanMove.at(-1).toLowerCase() : '';

    const cleaned = sanMove.replace(/=[QRBN]?|\+|#|x/g, '');
    const dest = cleaned.slice(-2);
    const dx = chess.board.fileToX[dest[0]];
    const dy = chess.board.rankToY[dest[1]];

    const pieceList = chess.board.teamMap[turnColor].filter(p => p.toFEN().toUpperCase() === pieceType);
    let orig = '';
    for (const p of pieceList) {
        if (p.evaluate(chess.board, dx, dy)) {
            orig = `${chess.board.xToFile[p.x]}${chess.board.yToRank[p.y]}`;
            break;
        }
    }
    return `${orig}${dest}${promotion}`;
}

// Polyglot 16-bit move -> UCI string (e.g. "e2e4", "e7e8q")
// FIX: map Polyglot castling (rook square as TO) to UCI king destination.
function polyglotToUci(move) {
    // bits: 0..2 to-file, 3..5 to-rank, 6..8 from-file, 9..11 from-rank, 12..14 promo
    const toFile   =  (move      ) & 0x7;
    const toRank   =  (move >>  3) & 0x7;
    const fromFile =  (move >>  6) & 0x7;
    const fromRank =  (move >>  9) & 0x7;
    const promo    =  (move >> 12) & 0x7; // 0:none, 1:N,2:B,3:R,4:Q

    const sq = (f, r) => String.fromCharCode(97 + f) + (r + 1);

    let from = sq(fromFile, fromRank);
    let to   = sq(toFile,   toRank);

    // Map Polyglot castle targets (rook squares) to UCI king destinations.
    if (from === 'e1' && to === 'h1') to = 'g1';   // O-O
    else if (from === 'e1' && to === 'a1') to = 'c1'; // O-O-O
    else if (from === 'e8' && to === 'h8') to = 'g8'; // O-O
    else if (from === 'e8' && to === 'a8') to = 'c8'; // O-O-O

    let uci = from + to;

    if (promo > 0) {
        const map = ['n', 'b', 'r', 'q'];
        uci += map[promo - 1];
    }
    return uci;
}

// Keep polyglotToSan “translator-only”, but make it robust:
// 1) Use the fixed polyglotToUci
// 2) Try to match that UCI to a legal built move and format with coordsToSan
// 3) Fall back to uciToSan if no exact match (shouldn’t happen, but harmless)
function polyglotToSan(chess, move) {
    const uci = polyglotToUci(move);

    // Try to resolve via current legal moves so SAN is 100% consistent with your engine.
    const entries = chess.legalMovesAI();
    for (const e of entries) {
        const built = chess.validate(e);
        if (!built) continue;
        // If you have builtToUci available, use it; otherwise compare from/dest directly.
        if (chess.board.builtToUci) {
            if (chess.board.builtToUci(built) === uci) {
                return coordsToSan(chess, built);
            }
        } else {
            // Minimal fallback match: compare from->to squares.
            //  eslint-disable-next-line no-unused-vars
            const [moves, orig, dest] = built || [];
            if (orig && dest) {
                const from = chess.board.xToFile[orig[0]] + chess.board.yToRank[orig[1]];
                const to   = chess.board.xToFile[dest[0]] + chess.board.yToRank[dest[1]];
                if (uci.slice(0,4) === from + to) {
                    return coordsToSan(chess, built);
                }
            }
        }
    }

    // Fallback: translate UCI→SAN directly (still correct now that castling is fixed)
    return uciToSan(chess, uci);
}

// translates a 'built move' ([moves, orig, dest, meta]) into SAN
function coordsToSan(chess, built) {
    const board = chess.board;
    if (!built || !Array.isArray(built)) return '';

    const [moves, orig] = built;

    // normalize 'w'/'b' or Color.* → Color.*
    const norm = tc => (tc === 'w' || tc === Color.WHITE) ? Color.WHITE : Color.BLACK;

    // --- Castling ---
    if (moves.length === 2 && moves[0].castle && moves[1].castle) {
        const kingMove = moves.find(m => m.piece instanceof King);
        const toX = kingMove.destX;
        let san = (toX === 6) ? 'O-O' : 'O-O-O';

        // check / mate suffix
        chess.push(moves);
        try {
            const opp = norm(board.turnColor); // after move, opponent to move
            if (board.checkForCheck(opp)) {
                const hasReply = board.canMove(opp);
                san += hasReply ? '+' : '#';
            }
        } finally {
            chess.pop();
        }
        return san;
    }

    // --- Normal / capture / promotion ---
    const place = moves.find(m => m.destX >= 0 && m.destY >= 0);
    if (!place) return ''; // safety

    const toX = place.destX, toY = place.destY;
    const moverBefore = board.get(orig[0], orig[1]); // piece before applying the move

    // capture detection (includes EP: captured piece shows up as a removal with -1,-1)
    const captured = moves.some(m =>
        m.destX < 0 && m.destY < 0 && m.piece && m.piece.color !== moverBefore.color
    );

    // promotion if a pawn moves to last rank
    const isPromotion = (moverBefore instanceof Pawn) && (toY === 0 || toY === 7);

    const fromFile = board.xToFile[orig[0]];
    const fromRank = board.yToRank[orig[1]];
    const toSq     = board.xToFile[toX] + board.yToRank[toY];

    let san = '';

    if (isPromotion) {
        // Pawn promotion SAN: [file][x?]dest=Piece
        if (captured) san += fromFile + 'x';
        san += toSq + '=' + place.piece.toFEN().toUpperCase();
    } else if (moverBefore instanceof Pawn) {
        // Regular pawn move
        if (captured) san += fromFile + 'x';
        san += toSq;
    } else {
        // Piece move (with disambiguation if needed)
        san += moverBefore.toFEN().toUpperCase();

        const candidates = board.teamMap[moverBefore.color].filter(p =>
            p !== moverBefore &&
            p.constructor === moverBefore.constructor &&
            p.x >= 0 && p.y >= 0 &&
            p.evaluate(board, toX, toY)
        );

        if (candidates.length > 0) {
            const shareFile = candidates.some(p => p.x === orig[0]);
            const shareRank = candidates.some(p => p.y === orig[1]);

            if (!shareFile)       san += fromFile;
            else if (!shareRank)  san += fromRank;
            else                  san += fromFile + fromRank;
        }

        if (captured) san += 'x';
        san += toSq;
    }

    // suffix + or # if this move gives check/mate
    chess.push(moves);
    try {
        const opp = norm(board.turnColor); // after move
        if (board.checkForCheck(opp)) {
            const hasReply = board.canMove(opp);
            san += hasReply ? '+' : '#';
        }
    } finally {
        chess.pop();
    }

    return san;
}

module.exports = {
    uciToSan,
    sanToUci,
    polyglotToUci,
    polyglotToSan,
    coordsToSan,
};
