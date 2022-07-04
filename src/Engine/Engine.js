// Board object

const Board = class {
    constructor() {
        whiteTeam = [,,,,,,,,,,,,,,,]
        blackTeam = [,,,,,,,,,,,,,,,]
    }
}





// Pieces Class---------------------------------------
const Color ={
    White: "white",
    Black: "black"
}

const Piece = class {
    constructor(color, id, address) {
        this.color = color;
        this.id = id;
        this.address = address;
    }
}

function setAddress() {

}

function getAddress() {

}

// Pieces --------------------------------------------

const Pawn = class extends Piece {
    constructor(color, id, address) {
        super(color, id, address)
    }
}

const Knight = class extends Piece {
    constructor(color, id, address) {
        super(color, id, address)
    }
}

const Bishop = class extends Piece {
    constructor(color, id, address) {
        super(color, id, address)
    }
}

const Rook = class extends Piece {
    constructor(color, id, address) {
        super(color, id, address)
    }
}

const Queen = class extends Piece {
    constructor(color, id, address) {
        super(color, id, address)
    }
}

const King = class extends Piece {
    constructor(color, id, address) {
        super(color, id, address)
    }
}


// Game loop------------------------------------------

function startGame() {
    
    // black
    new Rook(Color.Black, "rookQ", 0, 0);
    new Knight(Color.Black, "knightQ", 1, 0);
    new Bishop(Color.Black, "bishopQ", 2, 0);
    new Queen(Color.Black, "queen", 3, 0);
    new King(Color.Black, "king", 4, 0);
    new Bishop(Color.Black, "bishopK", 5, 0);
    new Knight(Color.Black, "knightK", 6, 0);
    new Rook(Color.Black, "rookK", 7, 0);

    new Pawn(Color.Black, "pawnA", 0, 1);
    new Pawn(Color.Black, "pawnB", 1, 1);
    new Pawn(Color.Black, "pawnC", 2, 1);
    new Pawn(Color.Black, "pawnD", 3, 1);
    new Pawn(Color.Black, "pawnE", 4, 1);
    new Pawn(Color.Black, "pawnF", 5, 1);
    new Pawn(Color.Black, "pawnG", 6, 1);
    new Pawn(Color.Black, "pawnH", 7, 1);

    // white
    new Rook(Color.White, "rookQ", 0, 7);
    new Knight(Color.White, "knightQ", 1, 7);
    new Bishop(Color.White, "bishopQ", 2, 7);
    new Queen(Color.White, "queen", 3, 7);
    new King(Color.White, "king", 4, 7);
    new Bishop(Color.White, "bishopK", 5, 7);
    new Knight(Color.White, "knightK", 6, 7);
    new Rook(Color.White, "rookK", 7, 7);

    new Pawn(Color.White, "pawnA", 0, 6);
    new Pawn(Color.White, "pawnB", 1, 6);
    new Pawn(Color.White, "pawnC", 2, 6);
    new Pawn(Color.White, "pawnD", 3, 6);
    new Pawn(Color.White, "pawnE", 4, 6);
    new Pawn(Color.White, "pawnF", 5, 6);
    new Pawn(Color.White, "pawnG", 6, 6);
    new Pawn(Color.White, "pawnH", 7, 6);
}






// Utility Functions ---------------------------------