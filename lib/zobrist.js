const fs = require('fs');
const path = require("path");
const Pawn = require('./pieces/pawn');

const PIECE_INDEX = {
    P: 0, p: 1,
    N: 2, n: 3,
    B: 4, b: 5,
    R: 6, r: 7,
    Q: 8, q: 9,
    K: 10, k: 11
};

// Load the 781 Polyglot random numbers (pre-generated and saved to JSON)
const constantsPath = path.join(__dirname, "polyglot-constants.json");
const CONSTANTS = JSON.parse(fs.readFileSync(constantsPath, "utf-8"));

// Extract tables
const PIECES = CONSTANTS.pieces.map(row => row.map(BigInt));
const CASTLING = CONSTANTS.castling.map(BigInt);
const EP_FILES = CONSTANTS.enPassant.map(BigInt);
const TURN = BigInt(CONSTANTS.turn);

function getHash(board, turn, castling, epPawn) {
    return(boardHash(board) ^ castleHash(castling) ^ epHash(epPawn, board) ^ turnHash(turn))
}

function boardHash(board) {
    let hash = BigInt(0);

    // polyglot constants are stored 0 -> 63 for each piece
    // but hashing starts at h8 and works backwards to a1
    // BOARD HASH IS ONLY CORRECT FOR OPENING POSITION
    for (let y = 7; y >= 0; y--) {
        for (let x = 7; x >= 0; x--) {

            const piece = board[y][x];
            if (!piece) continue;

            const square = y * 8 + x;

            const pieceFen = piece.toFEN();
            const index = PIECE_INDEX[pieceFen];
            hash ^= PIECES[index][square];
            console.log(index, square, hash);
        }
    }
    console.log('board hash', hash);
    return hash;
}

function castleHash(castling) {
    let hash = BigInt(0);
    if (castling.includes('K')) hash ^= CASTLING[0];
    if (castling.includes('Q')) hash ^= CASTLING[1];
    if (castling.includes('k')) hash ^= CASTLING[2];
    if (castling.includes('q')) hash ^= CASTLING[3];

    console.log('castle hash', hash);

    return hash;
}

// only hash if there's actually a pawn ready to capture it.
// Legality of the potential capture is irrelevant.
function epHash(epPawn, board) {
    if (epPawn) {
        // get adjacent
        let left = board[epPawn.y][epPawn.x-1]
        let right = board[epPawn.y][epPawn.x+1]

        // if undefined OR not a pawn OR not the opposite color, return 0
        if (
            (!left || left.color === epPawn.color || !(left instanceof Pawn)) &&
            (!right || right.color === epPawn.color || !(right instanceof Pawn)) 
        ) {
           return BigInt(0);
        }
        
        // it doesn't matter if two pawns can make the same ep capture.
        // if one can do it, hash the file of the capturable pawn
        const file = ep.charCodeAt(0) - 97;
        console.log('ep_files', EP_FILES);
        console.log('file', file);
        console.log('ep hash', EP_FILES[file]);
        return EP_FILES[file];
    }
    console.log('ep hash 0');
    return BigInt(0);
}

function turnHash(turn) {
    if (turn === 'w') {
        console.log('turn hash', TURN);
        return TURN;    
    } 
    console.log('turn hash 0');
    return BigInt(0);
}

module.exports = {
    getHash,
};

