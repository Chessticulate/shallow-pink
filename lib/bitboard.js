
// returns the index of a square (0 - 63) given x and y coords
// y << 3 | x = (y * 8) + x
function sq(x, y) { return (y << 3) | x; }

// returns a 64 bit board with only one square set (at sqIdx)
// basically a means of isolating a single square
function BB_SQ(sqIdx) { return 1n << BigInt(sqIdx); }

// checks if square is occupied
function onBoard(x, y) { return x >= 0 && x < 8 && y >= 0 && y < 8; }

// pop least-significant 1-bit; returns [bbWithout, index]
// -bb = ~bb + 1
// bb = 0110, -bb = 1001 + 1 = 1010
// 0110 & 1010 = 0010, the least signifigant bit

// XOR lsb with original bb returns the bb without lsb
// the purpose of this function is to remove bits (pieces)
// from a bitboard.
function popLSB(bb) {
    const lsb = bb & -bb;
    return [bb ^ lsb, bitIndex(lsb)];
}

// return bit index 
// given a 64 bit number, shift lsb one bit until its 0
function bitIndex(lsb) {
    let i = 0;
    while (lsb >> 1n) { lsb >>= 1n; i++; }
    return i;
}

// ray-scan along a diagonal direction until blocker
function rayDiagFrom(x, y, dx, dy, occAll) {
    let attacks = 0n;
    let nx = x + dx, ny = y + dy;
    while (onBoard(nx, ny)) {
        const s = sq(nx, ny);
        const m = BB_SQ(s);
        attacks |= m;
        if (occAll & m) break; // stop behind the first blocker
        nx += dx; ny += dy;
    }
    return attacks;
}
