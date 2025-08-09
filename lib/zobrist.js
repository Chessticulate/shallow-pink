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
const constantsPath = path.join(__dirname, 'polyglot-constants.json');
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
            // console.log(index, square, hash);
        });
    });
    // console.log('board hash', hash);
    return hash;
}

function castleHash(castling) {
    let hash = BigInt(0);
    if (castling.includes('K')) hash ^= CASTLING[0];
    if (castling.includes('Q')) hash ^= CASTLING[1];
    if (castling.includes('k')) hash ^= CASTLING[2];
    if (castling.includes('q')) hash ^= CASTLING[3];

    // console.log('castle hash', hash)

    return hash;
}

// only hash if there's actually a pawn ready to capture it.
// Legality of the potential capture is irrelevant.
function epHash(epPawn, board) {
    if (epPawn) {
    // get adjacent
        console.log(epPawn);
        console.log(board);
        let left = board[epPawn.y][epPawn.x - 1];
        let right = board[epPawn.y][epPawn.x + 1];

        // if undefined OR not a pawn OR not the opposite color, return 0
        if (
            (!left || left.color === epPawn.color || !(left instanceof Pawn)) &&
            (!right || right.color === epPawn.color || !(right instanceof Pawn))
        ) {
            // console.log('ep hash 0');
            prevEpFile = BigInt(0);
            return BigInt(0);
        }

        // it doesn't matter if two pawns can make the same ep capture.
        // if one can do it, hash the file of the capturable pawn
        const file = xToFile[epPawn.x].charCodeAt(0) - 97;
        // console.log('ep hash', EP_FILES[file]);
        prevEpFile = EP_FILES[file];
        return EP_FILES[file];
    }
    // console.log('ep hash 0');
    prevEpFile = BigInt(0);
    return BigInt(0);
}

function turnHash(turn) {
    if (turn === 'w') {
        // console.log('turn hash', TURN);
        return TURN;
    }
    // console.log('turn hash 0');
    return BigInt(0);
}

// edge cases
// CASTLE: how does the move function handle castles
// castle state is being handled, but the movement of the pieces
// needs to be hashed as well
function updateHash(piece, capture, promotingPawn, orig, castleInfo, board) {

    // console.log('promotingPawn', promotingPawn);
    console.log('prevEpFile', prevEpFile);
    
    let hash = board.hash;
    let square;
    let index;

    // piece, capture and orig should be undefined in the case of castle
    if (castleInfo.orig.length === 2) {
        let king = castleInfo["pieces"][0];
        let rook = castleInfo["pieces"][1];
        
        // king origin 
        let [origX, origY]  = castleInfo["orig"][0];
        square = 8 * (7 - origY) + origX;
        index = PIECE_INDEX[king.toFEN()];
        hash ^= PIECES[index][square];
        
        // rook origin
        [origX, origY]  = castleInfo["orig"][1];
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
        // unhash captured piece (use piece.x and y for dest, capture x, y = -1)
        // CAPTURE IN THE CASE OF EP IS NOT PIECE.X AND PIECE.Y
        if (capture) {
            square = 8 * (7 - piece.y) + piece.x
            index = PIECE_INDEX[capture.toFEN()];
            hash ^= PIECES[index][square];
        }
        // unhash pawn being promoted from origin
        if (promotingPawn) {
            square = 8 * (7 - orig[0]) + orig[1]
            index = PIECE_INDEX[promotingPawn.toFEN()];
            hash ^= PIECES[index][square];
        }
        // unhash moving piece from origin
        else {
            square = 8 * (7 - orig[0]) + orig[1];
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
    }
   
    // unhash ep file
    // if previous ep file = -, do nothing
    if (prevEpFile) {
        hash ^= prevEpFile;
    }

    // hash movedpiece with destination
    square = 8 * (7 - piece.y) + piece.x;
    index = PIECE_INDEX[piece.toFEN()];
    hash ^= PIECES[index][square];

    // hash ep
    hash ^= epHash(board.enPassantList[0], board.board); 

    // hash turn side
    hash ^= TURN;
    
    return hash;
}

module.exports = {
    initHash,
    updateHash,
};
