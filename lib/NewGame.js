
// Board class
/**--------------------------------------------- */
const Board = class {
  constructor() {
    this.board = [
      ['','','','','','','',''],
      ['','','','','','','',''],
      ['','','','','','','',''],
      ['','','','','','','',''],
      ['','','','','','','',''],
      ['','','','','','','',''],
      ['','','','','','','',''],
      ['','','','','','','','']  
    ]
    console.log('board', this.board)
  }
  // for printing empty tiles on the board
  nullToString() {
    
  }
}

// Color 
/**------------------------------------------------- */
const Color = {
  White: "white",
  Black: "black"
}

// Team lists
/**------------------------------------------------- */
let white = [];
let black = [];


// Piece Class
/**------------------------------------------ */
const Piece = class {

  constructor(color, id, address) {
    this.color = color;
    this.id = id;
    this.address = address;
    this.isFirstMove = true;

    if (this.getColor() == Color.WHITE) {
        white.push(this);
    } else {
        black.push(this);
    }

    // in the piece constructor, initialize the piece on the board
    this.setPiece(address, this);
  }

  getId() {
    return this.id
  }

  getColor() {
    return this.color;
  }

  setAddress(address) {
    this.address = address;
  }

  getAddress() {
    return this.address
  }

  sameColor(otherPiece) {
    if (otherPiece == null) {
      return false;
    }
    return (this.color == otherPiece.getColor());
  }

  setPiece(address, piece) {
    if (piece != null) {
      piece.setAddress(address)
    }
    console.log("address", address)
    console.log("Piece", piece)
    let x = address[0];
    let y = address[1];
    console.log('x', x)
    console.log('y', y)
    // need to find javascript equivalent to board[x][y]= piece
    game.board.insert(y, insert(x, piece)) = piece;
  }

  move(address, piece) {
    if (this.possibleMove(x, y) != true) {
      return -1;
    }
  }
}


// King
/**------------------------------------------------------ */
const King = class extends Piece {
  constructor(color, id, address){
    super(color, id, address);
  }
  toString = function kingToString() {
    if (this.getColor() == Color.White) {
      return "♔";
    }
    else return "♚";
  }
}

// Queen
/**-------------------------------------------------------- */
const Queen = class extends Piece {
  constructor(color, id, address) {
    super(color, id, address);
  }
  toString = function queenToString() {
    if (this.getColor() == Color.White) {
      return "♕";
		}
		else return "♛";
  }
}

// Rook
/**------------------------------------------------------------ */
const Rook = class extends Piece {
  constructor(color, id, address){
    super(color, id, address);
  }
  toString = function rookToString() {
    if (this.getColor() == Color.White) {
      return "♖";
		}
		else return "♜";
  }
}

// Bishop
/**------------------------------------------------------------ */
const Bishop = class extends Piece {
  constructor(color, id, address){
    super(color, id, address);
  }
  toString = function bishopToString() {
    if (this.getColor() == Color.White) {
      return "♗";
    }
    else return "♝";
  }
}

// Knight
/**------------------------------------------------------------- */
const Knight = class extends Piece {
  constructor(color, id, address){
    super(color, id, address);
  }
  toString = function knightToString() {
    if (this.getColor() == Color.White) {
      return "♘";
    }
    else return "♞";
  }
}

// Pawn
/**------------------------------------------------------------- */
const Pawn = class extends Piece {
  constructor(color, id, address){
    super(color, id, address);
  }
  toString = function pawnToString() {
    if (this.getColor() == Color.White) {
      return "♙";
    }
    else return "♟";
  }
}


// Game class
/**--------------------------------------------- */

// import Pawn from './Pieces/Pawn.js'
// import Knight from './Pieces/Knight.js'
// import Bishop from './Pieces/Bishop.js'
// import Rook from './Pieces/Rook.js'
// import Queen from './Pieces/Queen.js'
// import King from './Pieces/King.js'
// import Color from './Color.js'
// import Board from './Board.js'

class Game {
    
    constructor () {
      this.gameOver = false

      // team lists
      this.white = [];
      this.black = [];
    
      // board
      this.Board = new Board();
        
    }
    

  printBoard() {
    console.log("    a   b   c   d   e   f   g   h");
    console.log("  ---------------------------------");
    let count = 8;
      for (let i = 0; i < 8; i++) {
        console.log(count, "| ");
        // console.log("| ");
        for (let j = 0; j < 8; j++) {

          if (this.board[i][j] === undefined) {
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
    new Rook(Color.Black, "rookQ", [0, 0]);
    new Knight(Color.Black, "knightQ", [1, 0]);
    new Bishop(Color.Black, "bishopQ", [2, 0]);
    new Queen(Color.Black, "queen", [3, 0]);
    new King(Color.Black, "king", [4, 0]);
    new Bishop(Color.Black, "bishopK", [5, 0]);
    new Knight(Color.Black, "knightK", [6, 0]);
    new Rook(Color.Black, "rookK", [7, 0]);

    new Pawn(Color.Black, "pawnA", [0, 1]);
    new Pawn(Color.Black, "pawnB", [1, 1]);
    new Pawn(Color.Black, "pawnC", [2, 1]);
    new Pawn(Color.Black, "pawnD", [3, 1]);
    new Pawn(Color.Black, "pawnE", [4, 1]);
    new Pawn(Color.Black, "pawnF", [5, 1]);
    new Pawn(Color.Black, "pawnG", [6, 1]);
    new Pawn(Color.Black, "pawnH", [7, 1]);

    // white
    new Rook(Color.White, "rookQ", [0, 7]);
    new Knight(Color.White, "knightQ", [1, 7]);
    new Bishop(Color.White, "bishopQ", [2, 7]);
    new Queen(Color.White, "queen", [3, 7]);
    new King(Color.White, "king", [4, 7]);
    new Bishop(Color.White, "bishopK", [5, 7]);
    new Knight(Color.White, "knightK", [6, 7]);
    new Rook(Color.White, "rookK", [7, 7]);

    new Pawn(Color.White, "pawnA", [0, 6]);
    new Pawn(Color.White, "pawnB", [1, 6]);
    new Pawn(Color.White, "pawnC", [2, 6]);
    new Pawn(Color.White, "pawnD", [3, 6]);
    new Pawn(Color.White, "pawnE", [4, 6]);
    new Pawn(Color.White, "pawnF", [5, 6]);
    new Pawn(Color.White, "pawnG", [6, 6]);
    new Pawn(Color.White, "pawnH", [7, 6]);
  }

  // set piece to provided coordinates
  // setPiece(piece) {
  //   if (piece != null) {
  //     piece.setAddress()
  //   }
  //   console.log("address", piece.address)
  //   console.log("Piece", piece)
  //   let x = address[0];
  //   let y = address[1];
  //   this.board[y][x] = piece;
  // }


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

game.main();




