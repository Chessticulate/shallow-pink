'use strict';

const Bishop = require('./pieces/bishop');
const King = require('./pieces/king');
const Knight = require('./pieces/knight');
const Pawn = require('./pieces/pawn');
const Queen = require('./pieces/queen');
const Rook = require('./pieces/rook');

const Color = require('./color');
const Move = require('./move');


const fileMap = {
    'A': 0,
    'B': 1,
    'C': 2,
    'D': 3,
    'E': 4,
    'F': 5,
    'G': 6,
    'H': 7
};

const rankMap = {
    '1': 7,
    '2': 6,
    '3': 5,
    '4': 4,
    '5': 3,
    '6': 2,
    '7': 1,
    '8': 0
};


module.exports = class Board {
    constructor () {
        this.board = Array(8).fill().map(() => Array(8).fill(null));
        this.teamMap = {};
        this.teamMap[Color.WHITE] = [];
        this.teamMap[Color.BLACK] = [];

        this.loadPieces(Color.WHITE);
        this.whiteKing = this.teamMap[Color.WHITE].find(piece => piece instanceof King);

        this.loadPieces(Color.BLACK);
        this.blackKing = this.teamMap[Color.BLACK].find(piece => piece instanceof King);

        this.prevMove = null;
    }

    loadPieces(color) {
        let y = color == Color.WHITE ? 6 : 1;
        let teamList = this.teamMap[color];

        for (let x = 0; x < 8; x++) {
            teamList.push(this.set(x, y, new Pawn(color, x, y)));
        }

        y = y === 6 ? 7 : 0;

        teamList.push(this.set(0, y, new Rook(color, 0, y)));
        teamList.push(this.set(1, y, new Knight(color, 1, y)));
        teamList.push(this.set(2, y, new Bishop(color, 2, y)));
        teamList.push(this.set(3, y, new Queen(color, 3, y)));
        teamList.push(this.set(4, y, new King(color, 4, y)));
        teamList.push(this.set(5, y, new Bishop(color, 5, y)));
        teamList.push(this.set(6, y, new Knight(color, 6, y)));
        teamList.push(this.set(7, y, new Rook(color, 7, y)));
    }

    wipe() {
        this.board = Array(8).fill().map(() => Array(8).fill(null));
        
        this.teamMap[Color.WHITE] = [];
        this.teamMap[Color.BLACK] = [];

        this.whiteKing = null;
        this.blackKing = null;        
    }

    get(x, y) {
        return this.board[y][x];
    }

    set(x, y, piece) {
        return this.board[y][x] = piece;
    }

    checkForCheck(color) {
        const king = color === Color.WHITE ? this.whiteKing : this.blackKing;
        const otherTeam = this.teamMap[color === Color.WHITE ? Color.BLACK : Color.WHITE];
        return otherTeam.find(piece => piece.evaluate(this, king.x, king.y)) !== undefined;
    }

    canMove(color) {
        return this.teamMap[color].find(piece => piece.canMove(this)) !== undefined;
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

            if (this.get(x1, y1) !== null) {
                return false;
            }
        }

        return true;
    }

    castle(moveStr, color) {
        const king = color === Color.WHITE ? this.whiteKing : this.blackKing;

        let rookX = moveStr === "O-O-O" ? 0 : 7;
        let rookY = color === Color.WHITE ? 7 : 0;
        const rook = this.get(rookX, rookY);

        // if rook is not where it is expected, no-go
        if (!(rook instanceof Rook)) {
            return null;
        }

        // both king and rook cannot have moved previously
        if (king.firstMove === false || rook.firstMove === false) {
            return null;
        }

        if (!this.pathClear(king.x, king.y, rook.x, rook.y)) {
            return null;
        }

        const xDir = (king.x - rook.x) > 0 ? -1 : 1;

        // check for lines of check
        const otherTeam = this.teamMap[color === Color.WHITE ? Color.BLACK : Color.WHITE];
        for (let count = 2; count > 0; count--) {
            if (otherTeam.find(piece => piece.evaluate(this, king.x + (count * xDir), king.y))) {
                return null;
            }
        }

        let newKingX = king.x + (2 * xDir);
        let newRookX = newKingX + (-1 * xDir);

        return [
            new Move(king, newKingX, king.y),
            new Move(rook, newRookX, rook.y)
        ]
    }

    buildMove(moveStr, color) {
        if (moveStr === 'O-O-O' || moveStr === 'O-O') {
            return this.castle(moveStr, color);
        }

        // split moveStr in two if it's a promotion
        let promotion;
        if (moveStr.indexOf('=') > -1) {
            promotion = moveStr.substr(moveStr.indexOf('='));
            moveStr = moveStr.substr(0, moveStr.indexOf('='));
        }

        if (moveStr.length < 2 || moveStr.length > 6) {
            return null;
        }

        const destX = fileMap[moveStr[moveStr.length-2].toUpperCase()];
        const destY = rankMap[moveStr[moveStr.length-1]];

        let pieceType = null;
        let pieceMoved, pieceTaken = null;
        let origX, origY;
        let capture = false;

        // determine piece type
        switch(moveStr[0]) {
            case 'r':  // rook
                pieceType = Rook;
                break;
            case 'n':  // knight
                pieceType = Knight;
                break;
            case 'b':  // bishop
                pieceType = Bishop;
                break;
            case 'q':  // queen
                pieceType = Queen;
                break;
            case 'k':  // king
                pieceType = King;
                break;
            default:   // pawn
                pieceType = Pawn;
                break;
        }

        // pull out optional parameters
        if (pieceType === Pawn) {
            if (moveStr.length === 4) { // capture
                if (moveStr[1].toUpperCase() !== 'X') {
                    return null;
                }
                origX = fileMap[moveStr[0].toUpperCase()];
            } else if (moveStr.length !== 2) { // regular move
                return null;
            }
        } else {
            let char1 = moveStr[1].toUpperCase();
            let char2 = moveStr[2].toUpperCase();
            let char3 = moveStr[3].toUpperCase();

            if (moveStr.length == 4) {
                if (!((capture = (char1 === 'X')) || (origX = fileMap[char1]) || (origY = rankMap[char1]))) {
                    return null;
                }
            } else if (moveStr.length == 5) {
                if (!((origX = fileMap[char1]) || (origY = rankMap[char1]))) {
                    return null;
                }
                if (!((capture = (char2 === 'X')) || (origY = rankMap[char1]))) {
                    return null;
                }
            } else if (moveStr.length == 6) {
                if (!((capture = (char3 === 'X')) || (origX = fileMap[char1]) || (origY = rankMap[char2]))) {
                    return null;
                }
            } else if (moveStr.length !== 3) {
                return null;
            }
        }

        // check for invalid coord chars
        if (destX === undefined || destY === undefined) {
            return null;
        }

        // 'x' must be present in moveStr if a piece is being taken
        pieceTaken = this.get(destX, destY);
        if (pieceTaken && !capture) {
            return null;
        }

        // find pieces that CAN do this move
        let pieceList = this.teamMap[color].filter(piece => {
            if (!(piece instanceof pieceType)) {
                return false;
            }
            if (origX && piece.x !== origX) {
                return false;
            }
            if (origY && piece.y !== origY) {
                return false;
            }
            return piece.evaluate(this, destX, destY);
        });

        // if more than once piece can do the move, then it's ambiguous
        if (pieceList.length !== 1) {
            return null;
        }
        pieceMoved = pieceList[0];

        if (pieceMoved instanceof Pawn) {
            // is this a pawn doing an enpassant?
            if (pieceTaken === null) {
                let adjacent = this.get(destX, pieceMoved.y);
                if (adjacent instanceof Pawn && adjacent.enPassantable) {
                    pieceTaken = adjacent;
                } else {
                    // this should never happen (should be caught by piece.evaluate())
                    return null;
                }
            }

            // can't move to end-zone without promoting
            if ((destY === 0 || destY === 7) && !promotion) {
                return null;
            }
        }

        let moves = [
            new Move(pieceMoved, destX, destY),
            new Move(pieceTaken, -1, -1),
        ];

        if (promotion) {
            if (promotion.length !== 2) {
                return null;
            }
            let newPiece;
            switch(promotion[1].toUpperCase()) {
                case 'Q':
                    newPiece = new Queen(pawn.color, -1, -1);
                    break;
                case 'R':
                    newPiece = new Rook(pawn.color, -1, -1);
                    break;
                case 'B':
                    newPiece = new Bishop(pawn.color, -1, -1);
                    break;
                case 'K':
                    newPiece = new Knight(pawn.color, -1, -1);
                    break;
                default:
                    return null;
            }
            newPiece.firstMove = false;
            moves.push(new Move(newPiece, destX, destY));
        }

        return moves;
    }

    move(moveList) {
        this.prevMove = [];
        moveList.forEach(moveObj => {
            let {piece, destX, destY, firstMove} = moveObj;
            let team = this.teamMap[piece.color];
            let origX = piece.x;
            let origY = piece.y;

            /* if origX/Y == -1, the piece is being restored via undo() or
             * it is a promotion.
            */
            if (origX === -1) {
                team.push(piece);
            } else { // otherwise just "pick up" the piece
                this.set(piece.x, piece.y, null);
            }

            // en passant
            if (piece instanceof Pawn && piece.firstMove && Math.abs(piece.y - destY) === 2) {
                piece.enPassantable = true;
                this.enPassantable = piece;
            } else if (this.enPassantable) {
                this.enPassantable.enPassantable = false;
                this.enPassantable = null;
            }

            if (piece.firstMove) {
                firstMove = true;
                piece.firstMove = false;
            } else if (firstMove) {
                piece.firstMove = true;
                firstMove = false;
            }

            piece.x = destX;
            piece.y = destY;

            if (destX === -1) {
                team.splice(team.indexOf(piece), 1);
            } else {
                this.set(destX, destY, piece);
            }

            this.prevMove.unshift(new Move(piece, origX, origY, firstMove));
        });
    }

    undo() {
        if (this.prevMove) {
            this.move(this.prevMove);
        }
        this.prevMove = null;
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
                    boardStrArr[row][col] = this.get(boardCol, boardRow) || ' ';
                }
            }
        }

        return boardStrArr.map(row => row.join('')).join('');
    }
}

