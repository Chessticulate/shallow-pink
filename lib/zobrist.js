const fs = require('fs');
const path = require('path');
const Pawn = require('./pieces/pawn');
const Color = require('./color');

const PIECE_INDEX = {
    p: 0,
    P: 1,
    n: 2,
    N: 3,
    b: 4,
    B: 5,
    r: 6,
    R: 7,
    q: 8,
    Q: 9,
    k: 10,
    K: 11,
};

// Load the 781 Polyglot random numbers (pre-generated and saved to JSON)
const constantsPath = path.join(__dirname, './utils/polyglot-constants.json');
const CONSTANTS = JSON.parse(fs.readFileSync(constantsPath, 'utf-8'));
const xToFile = {
    0: 'a',
    1: 'b',
    2: 'c',
    3: 'd',
    4: 'e',
    5: 'f',
    6: 'g',
    7: 'h',
};

let prevCastleState;
let prevEpFile;

// Extract tables
const PIECES = CONSTANTS.pieces.map((row) => row.map(BigInt));
const CASTLING = CONSTANTS.castling.map(BigInt);
const EP_FILES = CONSTANTS.enPassant.map(BigInt);
const TURN = BigInt(CONSTANTS.turn);

function initHash(board, teamMap, turn, castling, epPawn) {
    // zobrist maintains its own castling variable
    // this is to check if castling state has updated from its previous state
    // same with ep
    prevCastleState = castling;
    prevEpFile = epHash(epPawn, board);
    return (
        boardHash(teamMap) ^
        castleHash(castling) ^
        prevEpFile ^
        turnHash(turn)
    );
}

function boardHash(teamMap) {
    let hash = BigInt(0);

    [Color.WHITE, Color.BLACK].forEach((color) => {
        teamMap[color].forEach((piece) => {
            const square = 8 * (7 - piece.y) + piece.x;
            const index = PIECE_INDEX[piece.toFEN()];
            hash ^= PIECES[index][square];
        });
    });
    return hash;
}

function castleHash(castling) {
    let hash = BigInt(0);
    if (castling.includes('K')) hash ^= CASTLING[0];
    if (castling.includes('Q')) hash ^= CASTLING[1];
    if (castling.includes('k')) hash ^= CASTLING[2];
    if (castling.includes('q')) hash ^= CASTLING[3];


    return hash;
}

// only hash if there's actually a pawn ready to capture it.
// Legality of the potential capture is irrelevant.
function epHash(epPawn, board) {
    if (!epPawn || epPawn.x < 0) {
        prevEpFile = BigInt(0);
        return BigInt(0);
    }

    // get adjacent
    let left = board[epPawn.y][epPawn.x - 1];
    let right = board[epPawn.y][epPawn.x + 1];

    // if undefined OR not a pawn OR not the opposite color, return 0
    if (
        (!left || left.color === epPawn.color || !(left instanceof Pawn)) &&
        (!right || right.color === epPawn.color || !(right instanceof Pawn))
    ) {
        prevEpFile = BigInt(0);
        return BigInt(0);
    }

    // if one can do it, hash the file of the capturable pawn
    const file = xToFile[epPawn.x].charCodeAt(0) - 97;
    prevEpFile = EP_FILES[file];
    return EP_FILES[file];
}

function turnHash(turn) {
    if (turn === 'w') {
        return TURN;
    }
    return BigInt(0);
}

function updateHash(piece, capture, promotingPawn, orig, castleInfo, board) {
    let hash = board.hash;
    let square;
    let index;

    // piece, capture and orig should be undefined in the case of castle
    if (castleInfo.orig.length === 2) {
        let king = castleInfo['pieces'][0];
        let rook = castleInfo['pieces'][1];
        
        // king origin 
        let [origX, origY]  = castleInfo['orig'][0];
        square = 8 * (7 - origY) + origX;
        index = PIECE_INDEX[king.toFEN()];
        hash ^= PIECES[index][square];
        
        // rook origin
        [origX, origY]  = castleInfo['orig'][1];
        square = 8 * (7 - origY) + origX;
        index = PIECE_INDEX[rook.toFEN()];
        hash ^= PIECES[index][square];
        
        // king dest
        square = 8 * (7 - king.y) + king.x;
        index = PIECE_INDEX[king.toFEN()];
        hash ^= PIECES[index][square];

        // rook dest
        square = 8 * (7 - rook.y) + rook.x;
        index = PIECE_INDEX[rook.toFEN()];
        hash ^= PIECES[index][square];
    } else {
        
        // capture, unhash captured piece (use piece.x and y for dest, capture x, y = -1)
        // CAPTURE IN THE CASE OF EP IS NOT PIECE.X AND PIECE.Y
        if (capture) {
            let capSquareX, capSquareY;
            const destFile = piece.x;
            const isEpCapture =
            (piece instanceof Pawn) &&
            (capture instanceof Pawn) &&
            prevEpFile !== 0n &&
            EP_FILES[destFile] === prevEpFile;

            if (isEpCapture) {
                const dy = (piece.color === Color.WHITE) ? 1 : -1;
                capSquareX = piece.x;
                capSquareY = piece.y + dy;     // square behind destination
            } else {
                capSquareX = piece.x;          // normal capture: captured piece was on destination
                capSquareY = piece.y;
            }

            const square = 8 * (7 - capSquareY) + capSquareX;
            const index = PIECE_INDEX[capture.toFEN()];
            hash ^= PIECES[index][square];
        }

        // promotion, unhash pawn being promoted from origin
        if (promotingPawn) {
            square = 8 * (7 - orig[1]) + orig[0];
            index = PIECE_INDEX[promotingPawn.toFEN()];
            hash ^= PIECES[index][square];
        }
        // normal move, unhash moving piece from origin
        else {
            square = 8 * (7 - orig[1]) + orig[0];
            index = PIECE_INDEX[piece.toFEN()];
            hash ^= PIECES[index][square];
        }

        // hash movedpiece with destination
        square = 8 * (7 - piece.y) + piece.x;
        index = PIECE_INDEX[piece.toFEN()];
        hash ^= PIECES[index][square];
    }

    // unhash castling rights
    // only if castleState has changed
    if (board.castleState != prevCastleState) {
        hash ^= castleHash(prevCastleState);
        hash ^= castleHash(board.castleState);
        prevCastleState = board.castleState;
    }
   
    // unhash ep file
    // if previous ep file = -, do nothing
    if (prevEpFile) {
        hash ^= prevEpFile;
    }

    // hash ep
    hash ^= epHash(board.enPassantList[board.enPassantList.length - 1], board.board); 

    // hash turn side
    hash ^= TURN;
    
    return hash;
}

module.exports = {
    initHash,
    updateHash,
};
