'use strict';

const Bishop = require('./pieces/bishop');
const King = require('./pieces/king');
const Knight = require('./pieces/knight');
const Pawn = require('./pieces/pawn');
const Queen = require('./pieces/queen');
const Rook = require('./pieces/rook');

const Color = require('./color');
const Status = require('./status');


const Move = class {
    constructor(pieceMoved, originX, originY, pieceTaken) {
        this.pieceMoved = pieceMoved;
        this.originX = originX;
        this.originY = originY;
        this.pieceTaken = pieceTaken;
    }
}


module.exports = class Board {
    constructor () {
        this.board = Array(8).fill().map(() => Array(8).fill(null))
        this.loadPieces(Color.WHITE);
        this.loadPieces(Color.BLACK);
        this.moveHistory = [];
    }

    loadPieces(color) {
        let y = color == Color.WHITE ? 6 : 1;

        for (let x = 0; x < 8; x++) {
            this.board[y][x] = new Pawn('pawn' + String.fromCharCode(65 + x), color, x, y);
        }

        y = y === 6 ? 7 : 0;

        this.board[y][0] = new Rook('rookQ', color, 0, y);
        this.board[y][1] = new Knight('knightQ', color, 1, y);
        this.board[y][2] = new Bishop('bishopQ', color, 2, y);
        this.board[y][3] = new Queen('queen', color, 3, y);
        this.board[y][4] = new King('king', color, 4, y);
        this.board[y][5] = new Bishop('bishopK', color, 5, y);
        this.board[y][6] = new Knight('knightK', color, 6, y);
        this.board[y][7] = new Rook('rookK', color, 7, y);
    }

    getByAddress(x, y) {
        return this.board[y][x];
    }

    getById(pieceId, color) {
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                let cur = this.board[i][j];
                if (cur && cur.color === color && cur.id === pieceId) {
                    return cur;
                }
            }
        }
        return null;
    }

    set(x, y, piece) {
        this.board[y][x] = piece;
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
        this.board[originY][originX] = pieceMoved;
        pieceMoved.x = originX;
        pieceMoved.y = originY;
    }

    checkForCheck(color) {
        const king = this.getById("king", color);
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                let currPiece = this.board[row][col];
                if (currPiece && currPiece.color !== color &&
                    currPiece.evaluate(this, king.x, king.y)) {
                        return true;
                }
            }
        }
        return false;
    }

    checkForMate(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const currPiece = this.getByAddress(row, col);
                if (currPiece && currPiece.color === color &&
                    currPiece.canMove(this)) {
                    return false;
                }
            }
        }
        return true;
    }

    checkForStalemate(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                let currPiece = this.getByAddress(row, col);
                if (currPiece && currPiece.color === color && 
                    currPiece.canMove(this)) {
                    return false;
                }
            }
        }
        return true;
    }

    pathClear(x1, y1, x2, y2) {
        /*  A _ _ _ B
         *    ^ ^ ^ 
         *   check the spaces between, but not the endpoints
         */
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

        for (let i = 0; i < dist; i++) {
            x1 += xDir;
            y1 += yDir;

            if (this.getByAddress(x1, y1) !== null) {
                return false;
            }
        }

        return true;
    }

    promote(pawn, pieceType) {
        
        switch(pieceType.toLowerCase()) {
            case 'queen':
                this.board[pawn.y][pawn.x] = new Queen(pawn.id, pawn.color, pawn.x, pawn.y);
                break; 
            case 'rook':
                this.board[pawn.y][pawn.x] = new Rook(pawn.id, pawn.color, pawn.x, pawn.y);
                break;
            case 'bishop':
                this.board[pawn.y][pawn.x] = new Bishop(pawn.id, pawn.color, pawn.x, pawn.y);
                break;
            case 'knight':
                this.board[pawn.y][pawn.x] = new Knight(pawn.id, pawn.color, pawn.x, pawn.y);
                break;
	        default:
		        return false;
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
