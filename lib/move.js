module.exports = class Move {
    constructor(piece, destX, destY, firstMove, enPassantable) {
        this.piece = piece;
        this.destX = destX;
        this.destY = destY;
        // don't allow optional params to be undefined
        this.firstMove = firstMove ? true : false;
        this.enPassantable = enPassantable ? enPassantable : null;
    }
};
