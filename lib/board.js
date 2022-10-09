'use strict';

const Bishop = require('./pieces/bishop');
const King = require('./pieces/king');
const Knight = require('./pieces/knight');
const Pawn = require('./pieces/pawn');
const Queen = require('./pieces/queen');
const Rook = require('./pieces/rook');

const Color = require('./color');
const Status = require('./status');


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


const Move = class {
    constructor(pieceMoved, originX, originY, pieceTaken, destinationX, destinationY) {
        this.pieceMoved = pieceMoved;
        this.originX = originX;
        this.originY = originY;
        this.pieceTaken = pieceTaken;
        this.destinationX = destinationX;
        this.destinationY = destinationY;
    }
}


module.exports = class Board {
    constructor () {
        this.board = Array(8).fill().map(() => Array(8).fill(null));
        this.teamMap = { Color.WHITE: [], Color.BLACK: [] };

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

    get(x, y) {
        return this.board[y][x];
    }

    set(x, y, piece) {
        this.board[y][x] = piece;
    }

    buildMove(moveStr, color) {
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

        // is this a pawn doing an enpassant?
        if (pieceMoved instanceof Pawn && pieceTaken === null) {
            let adjacent = this.get(destX, pieceMoved.y);
            if (adjacent instanceof Pawn && adjacent.enPassantable) {
                pieceTaken = adjacent;
            } else {
                // this should never happen (should be caught by piece.evaluate())
                return null;
            }
        }

        return new Move(
            pieceMoved,
            pieceMoved.x,
            pieceMoved.y,
            pieceTaken,
            destX,
            destY,
        )
    }

    move(moveObj) {
        let {pieceMoved, originX, originY, pieceTaken, destinationX, destinationY} = moveObj;
        this.prevMove = moveObj;

        // remove taken piece, if any
        if (pieceTaken) {
            this.set(pieceTaken.x, pieceTaken.y, null);
            this.teamMap.splice(this.teamMap[pieceTaken.color].indexOf(pieceTaken), 1);
        }

        // place moved piece
        this.set(pieceMoved.x, pieceMoved.y, null);
        this.set(destinationX, destinationY, pieceMoved);
        pieceMoved.x = destinationX;
        pieceMoved.y = destinationY;
    }

    undo() {
        let {pieceMoved, originX, originY, pieceTaken} = this.prevMove;
        this.prevMove = null;

        // restore taken piece, if any
        this.set(pieceMoved.x, pieceMoved.y, null);
        if (pieceTaken) {
            this.set(pieceTaken.x, pieceTaken.y, pieceTaken);
            this.teamMap[pieceTaken.color].push(pieceTaken);
        }

        // restore moved piece
        this.set(originX, originY, pieceMoved);
        pieceMoved.x = originX;
        pieceMoved.y = originY;
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

    promote(fileRank, color, pieceType) {
        // parse destination address
        let destX, destY;
        if (fileRank.length !== 2 ||
            !(destX = fileMap[fileRank[0].toUpperCase()]) || 
            !(destY = rankMap[fileRank[1]])) {
            return false;
        }

        // find a pawn that is one move away from the destination
        let pawn = this.teamMap[color].filter(piece => 
            piece instanceof Pawn &&
            piece.x === destX &&
            (piece.y + (color === Color.WHITE ? -1 : 1)) === destY
        )[0];
        if (!pawn) {
            return false;
        }

        // create new piece
        let newPiece;
        switch(pieceType.toUpperCase()) {
            case 'Q':
                newPiece = new Queen(pawn.color, pawn.x, pawn.y);
                break;
            case 'R':
                newPiece = new Rook(pawn.color, pawn.x, pawn.y);
                break;
            case 'B':
                newPiece = new Bishop(pawn.color, pawn.x, pawn.y);
                break;
            case 'K':
                newPiece = new Knight(pawn.color, pawn.x, pawn.y);
                break;
            default:
                return false;
        }

        // remove pawn
        this.set(pawn.x, pawn.y, null);
        this.teamMap[color].splice(this.teamMap[color].indexOf(pawn), 1);

        // add new piece
        this.set(destX, destY, newPiece);
        this.teamMap[color].push(newPiece);

        return true;
    }

    castle(moveStr, color) {
        const king = color === Color.WHITE ? this.whiteKing : this.blackKing;

        let rookX = moveStr === "O-O-O" ? 0 : 7;
        let rookY = color === Color.WHITE ? 7 : 0;
        const rook = this.get(rookX, rookY);

        // if rook is captured return false
        if (!(rook instanceof Rook)) {
            return false;
        }

        // both king and rook cannot have moved previously
        if (king.firstMove === false || rook.firstMove === false) {
            return false;
        }

        if (!this.pathClear(king.x, king.y, rook.x, rook.y)) {
            return false
        }

        const xDir = (king.x - rook.x) > 0 ? -1 : 1;

        // check for lines of check
        const otherTeam = this.teamMap[color === Color.WHITE ? Color.BLACK : Color.WHITE];
        for (let count = 2; count > 0; count--) {
            if (otherTeam.find(piece => piece.evaluate(this, king.x + (count * xDir), king.y)) {
                return false;
            }
        }

        this.set(king.x, king.y, null);
        king.x = king.x + (2 * xDir);
        this.set(king.x, king.y, king);

        this.set(rook.x, rook.y, null);
        rook.x = xDir == 1 ? king.x - 1 : king.x + 1;
        this.set(rook.x, rook.y, rook);

        king.firstMove = false;
        rook.firstMove = false;

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
                    boardStrArr[row][col] = this.get(boardCol, boardRow) || ' ';
                }
            }
        }

        return boardStrArr.map(row => row.join('')).join('');
    }
}
