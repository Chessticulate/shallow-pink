const fs = require('fs');
const path = require("path");
const Pawn = require('./pieces/pawn');
const Color = require('./color');

const PIECE_INDEX = {
    p: 0, P: 1,
    n: 2, N: 3,
    b: 4, B: 5,
    r: 6, R: 7,
    q: 8, Q: 9,
    k: 10, K: 11
};

// Load the 781 Polyglot random numbers (pre-generated and saved to JSON)
const constantsPath = path.join(__dirname, "polyglot-constants.json");
const CONSTANTS = JSON.parse(fs.readFileSync(constantsPath, "utf-8"));
const xToFile = {0: 'a', 1: 'b', 2: 'c', 3: 'd', 4: 'e', 5: 'f', 6: 'g', 7: 'h'};

// Extract tables
const PIECES = CONSTANTS.pieces.map(row => row.map(BigInt));
const CASTLING = CONSTANTS.castling.map(BigInt);
const EP_FILES = CONSTANTS.enPassant.map(BigInt);
const TURN = BigInt(CONSTANTS.turn);

function initHash(board, teamMap, turn, castling, epPawn) {
    return(boardHash(teamMap) ^ castleHash(castling) ^ epHash(epPawn, board) ^ turnHash(turn))
}

function boardHash(teamMap) {
    let hash = BigInt(0);

    [Color.WHITE, Color.BLACK].forEach(color => {
        teamMap[color].forEach(piece => {
            const square = 8 * (7 - piece.y) + piece.x;
            const index = PIECE_INDEX[piece.toFEN()];
            hash ^= PIECES[index][square];
            console.log(index, square, hash);
        });
    });
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
           console.log('ep hash 0');
           return BigInt(0);
        }
        
        // it doesn't matter if two pawns can make the same ep capture.
        // if one can do it, hash the file of the capturable pawn
        const file = xToFile[epPawn.x].charCodeAt(0) - 97;
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

// states to update
// PIECES: unhash piece at origin, hash destination
//         if capture unhash captured piece
//         if castle unhash king origin, rook origin
//         rehash king dest, rook dest
//         if promotion unhash pawn origin, rehash promotion destination (could be a capture too)
//         hasndle undoing appropriately 
// 
// CASTLE: if king or rook move/captured, update castleState, hash out castle options
//         restore previous castle state if undoing 
//
// ENPASS: if pawn makes ep move, check capturability, hash file if appropriate
//         unhash previous file if there is one
//         hash previous epfile if undoing
//
// TURN:   update turn, alternate turn hash after every move 
//         decrement turn # if undoing


// Hash from fen is now working
// next up is to create the hash update from move functionality
function updateZobristHash(info) {
    const from = origY * 8 + origX;
    const to = destY * 8 + destX;
    const idx = PIECE_TO_INDEX[piece];
    const zob = this.zobristTable; // { pieces, castling, enPassant, side }

    let hash = this.zobristHash;

    // Remove piece from original square
    hash ^= zob.pieces[idx][from];

    // Remove captured piece (if any)
    if (capturedPiece) {
        const capIdx = PIECE_TO_INDEX[capturedPiece];
        hash ^= zob.pieces[capIdx][to];
    }

    // Add piece to destination square
    hash ^= zob.pieces[idx][to];

    // Remove old castling rights
    for (let i = 0; i < 4; i++) {
        if (prevCastlingRights.includes('KQkq'[i])) {
            hash ^= zob.castling[i];
        }
    }

    // Add new castling rights
    for (let i = 0; i < 4; i++) {
        if (newCastlingRights.includes('KQkq'[i])) {
            hash ^= zob.castling[i];
        }
    }

    // Remove old en passant (if any)
    if (prevEnPassantFile !== null) {
        hash ^= zob.enPassant[prevEnPassantFile];
    }

    // Add new en passant (if any)
    if (newEnPassantFile !== null) {
        hash ^= zob.enPassant[newEnPassantFile];
    }

    // Flip side to move
    hash ^= zob.side;

    // Set new hash
    this.zobristHash = hash;
}


module.exports = {
    initHash,
};

