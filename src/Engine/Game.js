// import java.util.Scanner;

// public class Game {

// 	// TODO en passant
// 	public static void main(String[] args) {
// 		Scanner moveChoice = new Scanner(System.in);

// 		while (true) {
// 			Board.startGame();

// 			int turns = 0;
// 			Color color;

// 			while (true) {
// 				Board.printBoard();
// 				// check for check
// 				if (turns % 2 == 0) {
// 					color = Color.WHITE;
// 				} else
// 					color = Color.BLACK;

// 				if (Board.staleMate(color) == true) {
// 					System.out.println("game over, stalemate");
// 					break;
// 				}
// 				if (Board.checkForCheck(color) == true) {
// 					if (Board.mate(color) == true) {

// 						System.out.printf("Checkmate, %s wins \n", color == Color.WHITE ? "Black" : "White");
// 						break;
// 					}
// 					System.out.printf("%s is in Check! \n", color == Color.WHITE ? "White" : "Black");
// 				}

// 				// move choice
// 				System.out.printf("%s's turn \n", color == Color.WHITE ? "White" : "Black");

// 				String move = moveChoice.nextLine();
// 				// process move
// 				if (Board.processMove(move, color) == 0) {
// 					turns++;
// 				} else {
// 					System.out.println("illegal move");
// 				}

// 			}
// 			System.out.println("would you like to play again? y/n");
// 			if (moveChoice.next().equals("y")) {
// 				continue;
// 			} else
// 				System.exit(0);
// 		}
// 	}

// }

import Pawn from './Pieces/Pawn.js'
import Knight from './Pieces/Knight.js'
import Bishop from './Pieces/Bishop.js'
import Rook from './Pieces/Rook.js'
import Queen from './Pieces/Queen.js'
import King from './Pieces/King.js'
import Color from './Color.js'
import Board from './Board.js'


class Game {
    
    constructor () {
      this.gameOver = false

      // team lists
      this.white = [];
      this.black = [];
    
      // board
      this.Board = [
        [,,,,,,,],
        [,,,,,,,],
        [,,,,,,,],
        [,,,,,,,],
        [,,,,,,,],
        [,,,,,,,],
        [,,,,,,,],
        [,,,,,,,]  
      ]
        
    }
    

  printBoard() {
    console.log("    a   b   c   d   e   f   g   h");
    console.log("  ---------------------------------");
    let count = 8;
      for (let i = 0; i < 8; i++) {
        console.log(count, "| ");
        // console.log("| ");
        for (let j = 0; j < 8; j++) {

          if (this.board[i][j] == null) {
            console.log("  | ");
          } else {
            console.log(this.board[i][j], " | ");
          }
        }
        console.log(count);
        count--;
        console.log("\n")
        console.log("  ---------------------------------");
      }
      console.log("    a   b   c   d   e   f   g   h");
      console.log("\n");
  }

  // Game loop------------------------------------------

  startGame() {
    
    // black
    new Rook.constructor(Color.Black, "rookQ", [0, 0]);
    new Knight.constructor(Color.Black, "knightQ", [1, 0]);
    new Bishop.constructor(Color.Black, "bishopQ", [2, 0]);
    new Queen.constructor(Color.Black, "queen", [3, 0]);
    new King.constructor(Color.Black, "king", [4, 0]);
    new Bishop.constructor(Color.Black, "bishopK", [5, 0]);
    new Knight.constructor(Color.Black, "knightK", [6, 0]);
    new Rook.constructor(Color.Black, "rookK", [7, 0]);

    new Pawn.constructor(Color.Black, "pawnA", [0, 1]);
    new Pawn.constructor(Color.Black, "pawnB", [1, 1]);
    new Pawn.constructor(Color.Black, "pawnC", [2, 1]);
    new Pawn.constructor(Color.Black, "pawnD", [3, 1]);
    new Pawn.constructor(Color.Black, "pawnE", [4, 1]);
    new Pawn.constructor(Color.Black, "pawnF", [5, 1]);
    new Pawn.constructor(Color.Black, "pawnG", [6, 1]);
    new Pawn.constructor(Color.Black, "pawnH", [7, 1]);

    // white
    new Rook.constructor(Color.White, "rookQ", [0, 7]);
    new Knight.constructor(Color.White, "knightQ", [1, 7]);
    new Bishop.constructor(Color.White, "bishopQ", [2, 7]);
    new Queen.constructor(Color.White, "queen", [3, 7]);
    new King.constructor(Color.White, "king", [4, 7]);
    new Bishop.constructor(Color.White, "bishopK", [5, 7]);
    new Knight.constructor(Color.White, "knightK", [6, 7]);
    new Rook.constructor(Color.White, "rookK", [7, 7]);

    new Pawn.constructor(Color.White, "pawnA", [0, 6]);
    new Pawn.constructor(Color.White, "pawnB", [1, 6]);
    new Pawn.constructor(Color.White, "pawnC", [2, 6]);
    new Pawn.constructor(Color.White, "pawnD", [3, 6]);
    new Pawn.constructor(Color.White, "pawnE", [4, 6]);
    new Pawn.constructor(Color.White, "pawnF", [5, 6]);
    new Pawn.constructor(Color.White, "pawnG", [6, 6]);
    new Pawn.constructor(Color.White, "pawnH", [7, 6]);
  }

  // set piece to provided coordinates
  setPiece(address, piece) {
    if (piece != null) {
      piece.setAddress(address)
    }
    this.board[y][x] = piece;
  }


  // game loop
  main() {
    while(!this.gameOver) {
      this.startGame();
      this.printBoard();
      this.gameOver = true
    }
  }

}

const game = new Game();

export default game;


