module.exports = class Move {
    constructor(piece, destX, destY, firstMove, enPassantable, promotionOrig, castle) {
        this.piece = piece;
        this.destX = destX;
        this.destY = destY;
        // don't allow optional params to be undefined
        this.firstMove = firstMove ? true : false;
        // this might be dead code
        this.enPassantable = enPassantable ? enPassantable : null;
        this.promotionOrig = promotionOrig ? promotionOrig : null;
        this.castle = castle ? castle : false;
    }
};
