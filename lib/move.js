module.exports = class Move {
    constructor(piece, destX, destY, firstMove, promotion, castle) {
        this.piece = piece;
        this.destX = destX;
        this.destY = destY;
        // don't allow optional params to be undefined
        this.firstMove = firstMove ? true : false;
        this.promotion = promotion ? promotion : null;
        this.castle = castle ? castle : false;
    }
};
