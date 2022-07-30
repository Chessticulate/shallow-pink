import Piece from "./Piece.js";

const Bishop = class extends Piece {

    constructor(color, id, address){
        super(color, id, address);
    }

    // public boolean possibleMove(int x, int y) {
    //     // cannot capture own piece
    //     if (this.sameColor(Board.getPiece(x, y))) {
    //         return false;
    //     }

    //     // invalid move for bishop
    //     if (Math.abs(getX() - x) != Math.abs(getY() - y)) {
    //         return false;
    //     }

    //     if (Board.isPathClear(getX(), getY(), x, y)) {
    //         return true;
    //     }

    //     return false;
    // }

    // public String toString() {
    //     if (this.getColor() == Color.WHITE) {
    //         return "♗";
    //     }
    //     return "♝";
    // }
 
    // public boolean canMove() {
    //     // reset x and y to original position after each while loop
    //     int originX = this.getX();
    //     int originY = this.getY();

    //     int x = originX;
    //     int y = originY;
    //     // top left
    //     while ((--x) >= 0 && (--y) >= 0) {
    //         if (this.testMove(x, y)) {
    //             return true;
    //         }
    //     }

    //     x = originX;
    //     y = originY;
    //     // top right
 		// while ((++x) <= 7 && (--y) >= 0) {
 		// 	if (this.testMove(x, y)) {
 		// 		return true;
 		// 	}
 		// }

 		// x = originX;
 		// y = originY;
 		// // bottom left
    //     while ((--x) >= 0 && (++y) <= 7) {
    //         if (this.testMove(x, y)) {
    //             return true;
    //         }
    //     }

 		// x = originX;
 		// y = originY;
    //     // bottom right
    //     while ((++x) <= 7 && (++y) <= 7) {
    //         if (this.testMove(x, y)) {
    //             return true;
    //         }
    //     }

    //     return false;
    // }
}

export default { Bishop }
