// build keys is a script that should generate zobrist keys for the empty chess board,
// as well as all the individual pieces

// it should output these keys to keys.txt
// upon creation of a new chess object, keys.js will read from keys.txt and the board and pieces will be able to grab 
// their keys by importing keys.js

const fs = require('fs');
const crypto = require('crypto');

class PieceKeys {
    constructor() {
        this.whiteKey = BigInt(crypto.randomBytes(8).readUInt32LE(0)) + (BigInt(crypto.randomBytes(8).readUInt32LE(4)) << 32n);
        this.blackKey = BigInt(crypto.randomBytes(8).readUInt32LE(0)) + (BigInt(crypto.randomBytes(8).readUInt32LE(4)) << 32n);
    }
}

const boardKeys = Array(8).fill().map(() => Array(8).fill(null));

function generateKeys() {
    // Board keys
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            let randomBytes = crypto.randomBytes(8); // Generate 8 random bytes (64 bits)
            let randomValue = BigInt(randomBytes.readUInt32LE(0)) + (BigInt(randomBytes.readUInt32LE(4)) << 32n);
            boardKeys[row][col] = randomValue.toString();
        }
    }

    // Piece keys
    const pawnKeys = new PieceKeys();
    const knightKeys = new PieceKeys();
    const bishopKeys = new PieceKeys();
    const rookKeys = new PieceKeys();
    const queenKeys = new PieceKeys();
    const kingKeys = new PieceKeys();

    // turn keys
    const white = BigInt(crypto.randomBytes(8).readUInt32LE(0)) + (BigInt(crypto.randomBytes(8).readUInt32LE(4)) << 32n);
    const black = BigInt(crypto.randomBytes(8).readUInt32LE(0)) + (BigInt(crypto.randomBytes(8).readUInt32LE(4)) << 32n);

    // castle keys
    const kingSideW = BigInt(crypto.randomBytes(8).readUInt32LE(0)) + (BigInt(crypto.randomBytes(8).readUInt32LE(4)) << 32n);
    const queenSideW = BigInt(crypto.randomBytes(8).readUInt32LE(0)) + (BigInt(crypto.randomBytes(8).readUInt32LE(4)) << 32n);
    const kingSideB = BigInt(crypto.randomBytes(8).readUInt32LE(0)) + (BigInt(crypto.randomBytes(8).readUInt32LE(4)) << 32n);
    const queenSideB = BigInt(crypto.randomBytes(8).readUInt32LE(0)) + (BigInt(crypto.randomBytes(8).readUInt32LE(4)) << 32n);

    // en passant keys
    const enPassantKeys = {};
    for (let char = 'a'; char <= 'h'; char = String.fromCharCode(char.charCodeAt(0) + 1)) {
        for (let i = 3; i <= 6; i+=3) {
            let key = char + `${i}`;
            let randomBytes = crypto.randomBytes(8); // Generate 8 random bytes (64 bits)
            let randomValue = BigInt(randomBytes.readUInt32LE(0)) + (BigInt(randomBytes.readUInt32LE(4)) << 32n);
            enPassantKeys[key] = randomValue.toString();
        }
    }

    // Convert BigInts to strings before saving to JSON
    const keys = {
        boardKeys,
        enPassantKeys,
        castleKeys: {
            kingSideW: kingSideW.toString(),
            queenSideW: queenSideW.toString(),
            kingSideB: kingSideB.toString(),
            queenSideB: queenSideB.toString()
        },
        turnKeys: {
            white: white.toString(),
            black: black.toString()
        },
        pawnKeys: {
            whiteKey: pawnKeys.whiteKey.toString(),
            blackKey: pawnKeys.blackKey.toString()
        },
        knightKeys: {
            whiteKey: knightKeys.whiteKey.toString(),
            blackKey: knightKeys.blackKey.toString()
        },
        bishopKeys: {
            whiteKey: bishopKeys.whiteKey.toString(),
            blackKey: bishopKeys.blackKey.toString()
        },
        rookKeys: {
            whiteKey: rookKeys.whiteKey.toString(),
            blackKey: rookKeys.blackKey.toString()
        },
        queenKeys: {
            whiteKey: queenKeys.whiteKey.toString(),
            blackKey: queenKeys.blackKey.toString()
        },
        kingKeys: {
            whiteKey: kingKeys.whiteKey.toString(),
            blackKey: kingKeys.blackKey.toString()
        }
    };

    fs.writeFileSync('keys.json', JSON.stringify(keys));
}

generateKeys();