
const Bishop = require('./bishop');
const Color = require('./color');
const King = require('./king');
const Knight = require('./knight');
const Pawn = require('./pawn');
const Queen = require('./queen');
const Rook = require('./rook');


const Move = class {
    constructor(pieceMoved, originX, originY, pieceTaken) {
        this.pieceMoved = pieceMoved;
        this.originX = originX;
        this.originY = originY;
        this.pieceTaken = pieceTaken;
    }
}


class Board {
    constructor (board) {
        this.board = Array(8).fill().map(() => Array(8).fill(null))
        this.loadPieces(Color.WHITE);
        this.loadPieces(Color.BLACK);
        this.moveHistory = [];
    }

    loadPieces(color) {
        let row = color == Color.WHITE ? 6 : 1;

        for (let col = 0; col < 8; col++) {
            this.board[row][col] = new Pawn('pawn' + String.fromCharCode(65 + col), color, row, col);
        }

        row = color == Color.WHITE ? 7 : 0;
        let col = color == Color.WHITE ? 7 : 0;
        let dir = color == Color.WHITE ? -1 : 1;

        this.board[row][0] = new Rook('rookQ', color, row, 0);
        this.board[row][1] = new Knight('knightQ', color, row, 1);
        this.board[row][2] = new Bishop('bishopQ', color, row, 2);
        this.board[row][3] = new Queen('queen', color, row, 3);
        this.board[row][4] = new King('king', color, row, 4);
        this.board[row][5] = new Bishop('bishopK', color, row, 5);
        this.board[row][6] = new Knight('knightK', color, row, 6);
        this.board[row][7] = new Rook('rookK', color, row, 7);
    }

    getByAddress(x, y) {
        return this.board[y][x];
    }

    getById(pieceId, color) {
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j < 7; j++) {
                let cur = this.board[i][j];
                if (cur && cur.color === color && cur.ID === pieceId) {
                    return cur;
                }
            }
        }
    }

    move(piece, x, y) {
        this.moveHistory.push(
            new Move(
                piece,
                piece.x,
                piece.y,
                this.board[y][x],
            )
        )

        this.board[piece.y][piece.x] = null;
        this.board[y][x] = piece;
        piece.x = x;
        piece.y = y;
    }

    undo() {
        // remove from history
        let {pieceMoved, originX, originY, pieceTaken} = this.moveHistory.pop();

        // restore taken piece (if any)
        this.board[pieceMoved.y][pieceMoved.x] = pieceTaken;

        // restore moved piece
        this.board[originY][originY] = pieceMoved;
        pieceMoved.x = originX;
        pieceMoved.y = originY;
    }

    checkForCheck(color) {
        for (let row = 0; row < 7; row++) {
            for (let col = 0; col < 7; col++) {
                let currPiece = this.getByAddress
            }
        }
    }

    checkForMate(color) {
    }

    checkForStalemate() {
    }

    pathClear(pointA, pointB) {
        /*  A _ _ _ B
         *    ^ ^ ^ 
         *   check the spaces between, but not the endpoints
         */
        const [x1, y1] = pointA;
        const [x2, y2] = pointB;
        const xDistance = x2 - x1;
        const yDistance = y2 - y1;

        let xDir = 0;
        if (xDistance < 0) {
            xDir = -1;
        } else if (xDistance > 0) {
            xDir = 1;
        }

        let yDir = 0;
        if (yDistance < 0) {
            yDir = -1;
        } else if (yDistance > 0) {
            yDir = 1;
        }

        let dist = 0;
        if (xDistance != 0) {
            dist = Math.abs(xDistance) - 1;
        } else {
            dist = Math.abs(yDistance) - 1;
        }

        for (int i = 0; i < dist; i++) {
            x1 += xDir;
            y1 += yDir;

            if (this.getByAddress(x1, y1) != null) {
                return false;
            }
        }

        return true;
    }

    toString() {
        // horizontal line that divides the ranks '----'
        let line = Array(17).fill('-');
        line[17] = '\n';

        // alternating vertical divider and empty space '| | |'
        let rank = Array(17).fill().map((_, i) => { return i % 2 ? ' ' : '|' });
        rank[17] = '\n';

        let boardStrArr = [];
        for (let row = 0; row < 17; row++) {
            if (row % 2 == 0) {
                boardStrArr[row] = line;
            } else {
                // need to copy rank since we may modify
                boardStrArr[row] = [...rank];
                const boardRow = Math.floor(row/2);
                for (let col = 1, boardCol = 0; boardCol < 8; col+=2,boardCol++) {
                    // replace ' ' with piece if present
                    boardStrArr[row][col] = this.board[boardRow][boardCol] || ' ';
                }
            }
        }

        return boardStrArr.map(row => row.join('')).join('');
    }
}
