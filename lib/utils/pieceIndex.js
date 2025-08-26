

// piece index returns the "piece code" of a piece given its fen str
// piece codes are used commonly in chess engines for bit boards and zobrist hashing among other things
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

module.exports = PIECE_INDEX;
