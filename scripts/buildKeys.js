// build keys is a script that should generate zobrist keys for the empty chess board,
// as well as all the individual pieces

// it should output these keys to keys.txt
// upon creation of a new chess object, keys.js will read from keys.txt and the board and pieces will be able to grab 
// their keys by importing keys.js







// two keys for each color
function generateKey() {
    let whiteKey = crypto.randomBytes(8); // Generate 8 random bytes (64 bits)
    let blackKey = crypto.randomBytes(8); 
    keys.push(BigInt(whiteKey.readUInt32LE(0)) + (BigInt(whiteKey.readUInt32LE(4)) << 32n));
    keys.push(BigInt(blackKey.readUInt32LE(0)) + (BigInt(blackKey.readUInt32LE(4)) << 32n));
}