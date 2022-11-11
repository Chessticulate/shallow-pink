module.exports = class Move {
  constructor(piece, destX, destY, firstMove) {
      this.piece = piece;
      this.destX = destX;
      this.destY = destY;
      // this prevents firstMove from being undefined
      this.firstMove = firstMove ? true : false;
  }
}
