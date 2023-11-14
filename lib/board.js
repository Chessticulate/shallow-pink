'use strict';

const Bishop = require('./pieces/bishop');
const King = require('./pieces/king');
const Knight = require('./pieces/knight');
const Pawn = require('./pieces/pawn');
const Queen = require('./pieces/queen');
const Rook = require('./pieces/rook');

const Color = require('./color');
const Move = require('./move');
const Keys = require('../scripts/keys.json');

module.exports = class Board {
    constructor (fenStr) {
        this.board = Array(8).fill().map(() => Array(8).fill(null));
        this.teamMap = {};
        this.teamMap[Color.WHITE] = [];
        this.teamMap[Color.BLACK] = [];
        this.enPassantList = [];
        this.history = [];

        // zobrist keys for each individual square 
        this.keys = Keys.boardKeys;

        // addressing
        this.perspective = Color.WHITE;
        this.xToFile = {0: 'a', 1: 'b', 2: 'c', 3: 'd', 4: 'e', 5: 'f', 6: 'g', 7: 'h'};
        this.yToRank = {7: '1', 6: '2', 5: '3', 4: '4', 3: '5', 2: '6', 1: '7', 0: '8'};
        this.fileToX = {'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'g': 6, 'h': 7};
        this.rankToY = {'1': 7, '2': 6, '3': 5, '4': 4, '5': 3, '6': 2, '7': 1, '8': 0};

        if (!fenStr) {
            this.loadPieces(Color.WHITE);
            this.whiteKing = this.teamMap[Color.WHITE].find(piece => piece instanceof King);
            this.loadPieces(Color.BLACK);
            this.blackKing = this.teamMap[Color.BLACK].find(piece => piece instanceof King);
            this.castleState = 'KQkq';

            // key for current board position
            this.key = this.initKey();
            return;
        }

        let [boardState, turnColor, castleState, enPassant,,] = fenStr.split(' ');
        this.castleState = castleState;

        let x = 0, y = 0;
        [...boardState].forEach(char => {
            let color;
            if (char.charCodeAt(0) < 91 && char.charCodeAt(0) > 64) {
                color = Color.WHITE;
            }
            if (char.charCodeAt(0) < 123 && char.charCodeAt(0) > 96) {
                color = Color.BLACK;
            }
            switch(char.toUpperCase()) {
            case '/':
                y++;
                x = 0;
                break;
            case 'P': {
                let pawn =  new Pawn(color, x, y);
                pawn.firstMove = color === Color.WHITE ? pawn.y === 6 : pawn.y === 1; 
                this.teamMap[color].push(this.set(x, y, pawn));
            }
                break;
            case 'N':
                this.teamMap[color].push(this.set(x, y, new Knight(color, x, y)));
                break;
            case 'B':
                this.teamMap[color].push(this.set(x, y, new Bishop(color, x, y)));
                break;
            case 'R':
                this.teamMap[color].push(this.set(x, y, new Rook(color, x, y)));
                break;
            case 'Q':
                this.teamMap[color].push(this.set(x, y, new Queen(color, x, y)));
                break;
            case 'K': {
                let king = new King(color, x, y);
                this.teamMap[color].push(this.set(x, y, king));
                if (color === Color.WHITE) {
                    king.firstMove = castleState.includes('Q') || castleState.includes('K');
                    this.whiteKing = king;
                }
                else {
                    king.firstMove = castleState.includes('q') || castleState.includes('k');
                    this.blackKing = king;
                }
            }
                break;
            default:
            {
                let spaces = parseInt(char);
                if (isNaN(spaces)) {
                    throw new Error('invalid char');
                }
                x += spaces;
            }
            }
            // if color is defined, a piece was added, so increment x by 1
            if (color) x++;
        });
        
        // fen validation
        if (this.board.forEach(row => { if (row.length != 8) {
            throw new Error('invalid board dimensions from FEN string');
        }}))

            if (this.teamMap[Color.WHITE].filter(piece => piece.toFEN() === 'K').length !== 1) {
                throw new Error('invalid king count from FEN string');
            }

        if (this.teamMap[Color.BLACK].filter(piece => piece.toFEN() === 'k').length !== 1) {
            throw new Error('invalid king count from FEN string');
        }

        // need to check first that corner is occupied by a rook before checking first move
        if (this.get(0, 0) instanceof Rook) {
            this.get(0, 0).firstMove = castleState.includes('q');
        }
        if (this.get(0, 7) instanceof Rook) {
            this.get(0, 7).firstMove = castleState.includes('Q');
        }
        if (this.get(7, 0) instanceof Rook) {
            this.get(7, 0).firstMove = castleState.includes('k');
        }
        if (this.get(7, 7) instanceof Rook) {
            this.get(7, 7).firstMove = castleState.includes('K');
        }

        if (enPassant !== '-') {
            let px = this.fileToX[enPassant[0]];
            let py = this.rankToY[enPassant[1]];
            py += py === 2 ? 1 : -1;
            let pawn = this.get(px, py);
            if (!(pawn instanceof Pawn)) {
                throw new Error('invalid enpassant from FEN string');
            }
            this.enPassantList.push(pawn);
            this.enPassantList[0].enPassantable = true;
            // en passant square recorded from fen
            this.enPassant = enPassant;
        }
        // if enPassant = '-' this.enPassant should be undefined
        else {
            this.enPassant = undefined;
        }

        this.turnColor = turnColor;

        // key for current board position
        this.key = this.initKey();
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

    insufficientMaterial() {

        if (this.teamMap[Color.WHITE].length > 2 || this.teamMap[Color.BLACK].length > 2) {
            return false;
        }

        let draw = 0;

        // this if only checks for bishops or knights, but what if there is less? king vs king for example
        [Color.WHITE, Color.BLACK].forEach(color => {
            if (this.teamMap[color].find(piece => piece instanceof Pawn)) {
                return false;
            }
            if (this.teamMap[color].find(piece => piece instanceof Bishop || piece instanceof Knight) !== undefined) {
                draw++;
            }
            else if (this.teamMap[color].length === 1) {
                draw++;
            }
        });

        // both teams have insufficient material if draw === 2
        return draw === 2;

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

        let rookX = moveStr === 'O-O-O' ? 0 : 7;
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
        ];
    }

    buildMove(moveStr, color) {
        if (moveStr === 'O-O-O' || moveStr === 'O-O') {
            return this.castle(moveStr, color);
        }

        // split moveStr in two if it's a promotion
        let promotion;
        [moveStr, promotion] = moveStr.split('=');

        if (moveStr.length < 2 || moveStr.length > 6) {
            return null;
        }

        const destX = this.fileToX[moveStr[moveStr.length-2]];
        const destY = this.rankToY[moveStr[moveStr.length-1]];

        // check for invalid coord chars
        if (destX === undefined || destY === undefined) {
            return null;
        }

        let pieceType, pieceMoved, pieceTaken;
        let origX, origY;
        let capture = false;

        // determine piece type
        switch(moveStr[0]) {
        case 'R':
            pieceType = Rook;
            break;
        case 'N':
            pieceType = Knight;
            break;
        case 'B':
            pieceType = Bishop;
            break;
        case 'Q':
            pieceType = Queen;
            break;
        case 'K':
            pieceType = King;
            break;
        default:
            pieceType = Pawn;
            break;
        }

        // pull out optional parameters
        if (pieceType === Pawn) {
            if (moveStr.length === 4) { // capture
                if (moveStr[1] !== 'x') {
                    return null;
                }
                origX = this.fileToX[moveStr[0]];
                capture = true;
            } else if (moveStr.length !== 2) { // regular move
                return null;
            }
        } else {
            let char1 = moveStr[1];
            let char2 = moveStr[2];
            let char3 = moveStr[3];

            if (moveStr.length == 4) {
                if (!((capture = (char1 === 'x')) || (origX = this.fileToX[char1]) !== undefined || (origY = this.rankToY[char1]) !== undefined)) {
                    return null;
                }
            } else if (moveStr.length == 5) {
                if (!((origX = this.fileToX[char1]) !== undefined || (origY = this.rankToY[char1]) !== undefined)) {
                    return null;
                }
                if (!((capture = (char2 === 'x')) || (origY = this.rankToY[char1]))) {
                    return null;
                }
            } else if (moveStr.length == 6) {
                if (!((capture = (char3 === 'x')) || (origX = this.fileToX[char1]) !== undefined || (origY = this.rankToY[char2]) !== undefined)) {
                    return null;
                }
            } else if (moveStr.length !== 3) {
                return null;
            }
        }

        // find pieces that CAN do this move
        let pieceList = this.teamMap[color].filter(piece => {
            if (!(piece instanceof pieceType)) {
                return false;
            }
            if (origX !== undefined && piece.x !== origX) {
                return false;
            }
            if (origY !== undefined && piece.y !== origY) {
                return false;
            }
            return piece.evaluate(this, destX, destY);
        });

        // if more than one piece can do the move, then it's ambiguous
        if (pieceList.length !== 1) {
            return null;
        }
        pieceMoved = pieceList[0];

        pieceTaken = this.get(destX, destY);
        if (pieceType === Pawn) {
            // is this a pawn doing an enpassant?
            if (capture && pieceTaken === null) {
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

        if ((pieceTaken && !capture) || (capture && !pieceTaken)) {
            return null;
        }

        let moves = [new Move(pieceMoved, destX, destY)];

        if (capture) {
            moves.unshift(new Move(pieceTaken, -1, -1));
        }

        if (promotion && (destY !== 0 && destY !== 7)) {
            return null;
        }

        if (promotion) {
            let newPiece;
            switch(promotion) {
            case 'Q':
                newPiece = new Queen(color, -1, -1);
                break;
            case 'R':
                newPiece = new Rook(color, -1, -1);
                break;
            case 'B':
                newPiece = new Bishop(color, -1, -1);
                break;
            case 'N':
                newPiece = new Knight(color, -1, -1);
                break;
            default:
                return null;
            }
            newPiece.firstMove = false;

            let index = capture ? 1 : 0;

            moves[index].destX = -1;
            moves[index].destY = -1;

            moves.push(new Move(newPiece, destX, destY));
        }

        return moves;
    }

    move(moveList, undoing) {        
        let undoMove = [];
        let enPassantPiece = null;

        // list of required info for update key function
        let update = {
            origX: undefined,                // origin X of moving piece    x
            origY: undefined,                // origin Y of moving piece    x
            piece: null,                     // moving piece                x
            capture: null,                   // captured piece (origin is moving pieces destination)      x
            promotion: null,                 // promotion piece                                           x
            castle: null,                    // castle obj containing rook and king                         
            // castleState: undefined,          // string of which castle sides to hash out of position key
            enPassant: undefined             // obj containing previous enPass string and current enPass  x
        };
        
        // just realized something quite big
        // castleState update cannot be implemented without more info about the previous move
        // this is because undoing a king or rooks first move should restore its previous castle state
        //  

        if (moveList.length > 1) {
            // console.log(`${undoing === true ? 'undoing' : 'doing'}`);
            // console.log(moveList);

            // if (!this.castleState === '') {
            //     // check for king moves
            //     if (moveList[0].piece instanceof King || moveList[1].piece instanceof King) {
            //         const king = moveList[0].piece instanceof King ? moveList[0].piece : moveList[1].piece;
            //         let sides = king.color === Color.WHITE ? 'KQ' : 'kq';
            //         update.castleState = this.castleState.filter(side => sides.includes(side));
            //         console.log(update.castleState)
            //     }
            //     // check for rook moves
            //     if (moveList[0].piece instanceof Rook || moveList[1].piece instanceof Rook) {
            //         // this ones tricky
            //         // what if a rook captures a rook
            //         // we need to make sure that the right rook is selected to have its castleSide removed
            //         const rook = moveList[0].piece instanceof Rook ? moveList[0].piece : moveList[1].piece;
                    
            //         // if we are doing, and moveList[1] is a rook
                    
            //     }
            // }
            
            // if moveList contains king and rook AND they the same color, its a castle
            if ((moveList[0].piece instanceof King && moveList[1] instanceof Rook)
                 && moveList[0].piece.color === moveList[1].piece.color) {
                
                // if first element is a king remove it from the front, otherwise remove it from the back
                // rook is only piece left in moveList
                let king = moveList[0] instanceof King ? moveList.shift().piece : moveList.pop().piece;
                let rook = moveList[0].piece;

                update.castle = { 
                    king: king, 
                    rook: rook,
                    kingOrigX: king.x,
                    kingOrigY: king.y,
                    rookOrigX: rook.x,
                    rookOrigY: rook.y
                };

                // castleState needs to include the castle states that need to be removed from the position key
                // no need to check castleState here, castle would be impossible if castleState were ''
                // update.castleState = king.color === Color.WHITE ? 'KQ' : 'kq';
            }

            if (moveList > 2) {
                // if undoing, promotion, piece, capture
                if (undoing) {
                    // promotion = pawn that is unpromoting
                    // piece = the previously promotion piece
                    update.piece = moveList[0].piece;
                    update.promotion = moveList[1].piece;
                    // if capture is a rook, check if its firstMove is true
                    // if it is update.castleState MIGHT need to be defined
                    update.capture = moveList[2].piece;
                    // orig x and y is the promotions x and y
                    update.origX = moveList[0].piece.x;
                    update.origY = moveList[0].piece.y;

                }

                // if doing, capture, piece, promotion
                else {
                    update.capture = moveList[0].piece;
                    // if capture is a rook, check if its firstMove is true
                    // if it is update.castleState MIGHT need to be defined
                    update.piece = moveList[1].piece;
                    update.promotion = moveList[2].piece;
                    // orig x and y is the moving pieces x and y
                    update.origX = moveList[1].piece.x;
                    update.origY = moveList[1].piece.y;

                }
            }

            else if (undoing) {
                // undoing a promotion is a little weird
                // If undoing a promotion, keyUpdate.promotion should = a pawn
                // its basically a promotion in reverse, where the og promoted piece, queen for example
                // is essentially "promoting" to a pawn 

                // moveList[1] = capture or promotion, moveList[0] = piece
                // if both piece in moveList are of the same color, then the move is a promotion
                if (moveList[1].piece.color === moveList[0].piece.color) {
                    update.promotion = moveList[0].piece; 
                    update.piece = moveList[1].piece;
                }
                // otherwise it is a capture
                else {
                    update.piece = moveList[0].piece;
                    update.capture = moveList[1].piece;
                    // if capture is a rook, check if its firstMove is true
                    // if it is update.castleState MIGHT need to be defined
                }
                update.origX = moveList[0].piece.x;
                update.origY = moveList[0].piece.y;

            }

            // otherwise, orig x and y is the second items x and y
            else {
                // moveList[0] = capture or promotion, moveList[1] = piece
                if (moveList[0].piece.color === moveList[1].piece.color) {
                    update.promotion = moveList[0].piece;
                }
                else {
                    update.capture = moveList[0].piece;
                    // if capture is a rook, check if its firstMove is true
                    // if it is update.castleState MIGHT need to be defined
                }
                update.piece = moveList[1].piece;
                update.origX = moveList[1].piece.x;
                update.origY = moveList[1].piece.y;

            }
        }
        // if there is no capture or promotion, origin is simply moving pieces origin
        // castle State does not need to be updated here since there is no capture
        else {
            update.piece = moveList[0].piece;
            update.origX = moveList[0].piece.x;
            update.origY = moveList[0].piece.y;

        }

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
            if (piece instanceof Pawn && piece.firstMove && Math.abs(piece.y - destY) === 2 && destY !== -1) {
                enPassantPiece = piece;
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

            // check if piece is being removed
            if (destX === -1) {
                team.splice(team.indexOf(piece), 1);
            } else { // otherwise place piece onto board
                this.set(destX, destY, piece);
            }

            undoMove.unshift(new Move(piece, origX, origY, firstMove));
        });

        if (!undoing) {
            this.history.push(undoMove);
        }

        // enpassant tracking
        if (this.enPassantList[this.enPassantList.length - 1]) {
            this.enPassantList[this.enPassantList.length - 1].enPassantable = false;
            this.enPassant = undefined;
        }
        if (undoing) {
            this.enPassantList.pop();
            // previous en passant piece
            let ep = this.enPassantList[this.enPassantList.length - 1]; 

            if (ep) {
                this.enPassantList[this.enPassantList.length - 1].enPassantable = true;
                this.enPassant = `${this.xToFile[ep.x]}${ep.color === Color.WHITE ? '3' : '6'}`;
            }
        }
        else {
            this.enPassantList.push(enPassantPiece);
            if (enPassantPiece) {
                enPassantPiece.enPassantable = true;
                this.enPassant = `${this.xToFile[enPassantPiece.x]}${enPassantPiece.color === Color.WHITE ? '3' : '6'}`;
            }
        }
        update.enPassant = this.enPassant;
        this.updateKey(update);
    }

    undo() {
        this.move(this.history.pop(), true);
    }

    stateHash(str) {	
        let hash = 0;	
        for (let i = 0, len = str.length; i < len; i++) {	
            let chr = str.charCodeAt(i);	
            hash = (hash << 5) - hash + chr;	
            hash |= 0; // Convert to 32bit integer	
        }	
        return hash;	
    }

    flipPerspective() {
        this.perspective = Color.WHITE ? Color.BLACK : Color.WHITE;
        this.board = this.board.map(rank => rank.reverse()).reverse();

        // flips address maps
        for (let i = 0; i < 8; i++) {
            let file = String.fromCharCode(97+i);
            let rank = `${i+1}`;
            let y = this.perspective == Color.WHITE ? 7-i : i;
            let x = this.perspective == Color.WHITE ? i : 7-i;

            this.xToFile[x] = file;
            this.yToRank[y] = rank;
            this.fileToX[file] = x;
            this.rankToY[rank] = y;
        }

        // loop through teamMaps for pawns and update their movesets
        [Color.WHITE, Color.BLACK].forEach(color => {
            this.teamMap[color].forEach(piece => {
                piece.flipPerspective();
            });
        });
    }

    // generate zobrist key from initial board position
    initKey() {
        let key = 0n;
        // hashing pieces to board squares
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col]; 
                if (piece) {
                    // XOR the piece's Zobrist key with the random value and update the key
                    key ^= BigInt(piece.key) ^ BigInt(this.keys[row][col]);
                }
            }
        }
        // hash castling sides, 
        // if (this.castleState.includes('k')) {
        //     key ^= BigInt(Keys.castleKeys.kingSideB);
        // }
        // if (this.castleState.includes('q')) {
        //     key ^= BigInt(Keys.castleKeys.queenSideB);
        // }
        // if (this.castleState.includes('K')) {
        //     key ^= BigInt(Keys.castleKeys.kingSideW);
        // }
        // if (this.castleState.includes('Q')) {
        //     key ^= BigInt(Keys.castleKeys.queenSideW);
        // }

        // enPassant squares
        if (this.enPassant) {
            key ^= BigInt(Keys.enPassantKeys[this.enPassant]);
        }

        // turn key
        let turnKey = this.turnColor === 'w' ? Keys.turnKeys.white : Keys.turnKeys.black;
        key ^= BigInt(turnKey);

        return key;
    }

    // update recieves all the info of the new board state
    updateKey(update) {
        let origX = update.origX, origY = update.origY;
        let destX = update.piece.x, destY = update.piece.y;

        // if there is no castle, still check the castleState to see if castle side keys should be updated
        // castle state should contain the castle sides that need to be removed from the hash
        // for example, if white O-O, then castle state should = 'KQ' which will then be removed from the hash
        // if (update.castleState) {
            
        //     // hashout castle side key
        //     if (update.castleState.includes('k')) {
        //         this.key ^= BigInt(Keys.castleKeys.kingSideB);
        //     }
        //     else if (update.castleState.includes('q')) {
        //         this.key ^= BigInt(Keys.castleKeys.queenSideB);                
        //     }
        //     else if (update.castleState.includes('K')) {
        //         this.key ^= BigInt(Keys.castleKeys.kingSideW);                
        //     }
        //     else if (update.castleState.includes('Q')) {
        //         this.key ^= BigInt(Keys.castleKeys.queenSideW);                
        //     }
        // }

        // update.castle should handle JUST the keys of the resulting castle move
        // castleState will handle hashing out the castle side keys 
        if (update.castle) {
            let king = update.castle.king, rook = update.castle.rook;
            let kingOrigX = update.castle.kingOrigX;
            let kingOrigY = update.castle.kingOrigY;
            let rookOrigX = update.castle.rookOrigX;
            let rookOrigY = update.castle.rookOrigY;

            // XOR kings orig x and y
            this.key ^= BigInt(king.key) ^ BigInt(this.keys[kingOrigX][kingOrigY]);
            // XOR Rooks orig x and y
            this.key ^= BigInt(rook.key) ^ BigInt(this.keys[rookOrigX][rookOrigY]);
            // XOR kings new x and y
            this.key ^= BigInt(king.key) ^ BigInt(this.keys[king.x][king.y]);
            // XOR Rooks new x and y
            this.key ^= BigInt(king.key) ^ BigInt(this.keys[rook.x][rook.y]);

            return;
        }

        // xor piece with orig coords
        this.key ^= BigInt(update.piece.key) ^ BigInt(this.keys[origX][origY]);

        // capture 
        if (update.capture) {
            // XOR captured piece with dest coords
            this.key ^= BigInt(update.capture.key) ^ BigInt(this.keys[destX][destY]);
        }

        // promotion
        // if there is a promotion, XOR new piece with dest coords 
        if (update.promotion) {
            this.key ^= BigInt(update.promotion.key) ^ BigInt(this.keys[destX][destY]);
        }

        // otherwise XOR moved piece with dest coords 
        else {
            // XOR piece with dest coords
            this.key ^= BigInt(update.piece.key) ^ BigInt(this.keys[destX][destY]);
        }

        // en passant squares
        // previous enPassant key needs to be hashed out before new enPassant Key is hashed
        if (update.enPassant) {
            if (update.enPassant.previous) {
                this.key ^= BigInt(Keys.enPassantKeys[update.enPassant.previous]);
            }

            if (update.enPassant.current) {
                this.key ^= BigInt(Keys.enPassantKeys[update.enPassant.current]);
            }
        }

        // turn 
        let turnKey = this.turnColor === 'w' ? Keys.turnKeys.white : Keys.turnKeys.black;
        this.key ^= BigInt(turnKey); 
    }

    toFEN() {
        if (this.perspective === Color.BLACK) {
            // reverses pieces 
            this.board = this.board.map(rank => rank.reverse()).reverse();
        }

        let fen = '';
        let row = '';
        let count;
        for (let i = 0; i < 8; i++) {
            count = 0;
            for (let j = 0; j < 8; j++) {
                if (this.get(j, i) === null) {
                    count++;
                }
                else {                    
                    row += `${(count > 0 ? count : '')}${this.get(j, i).toFEN()}`;
                    count = 0;
                }
            }
            row += `${count > 0 ? count : ''}`;
            fen += `${row}${i < 7 ? '/' : ''}`;
            row = '';
        }

        if (this.perspective === Color.BLACK) {
            // reverses pieces 
            this.board = this.board.map(rank => rank.reverse()).reverse();
        }
        return fen;
    }

    toString() {
        // horizontal line that divides the ranks '----'
        let line = Array(17).fill('-');
        line[17] = '\n';

        // alternating vertical divider and empty space '| | |'
        let rank = Array(17).fill().map((_, i) => { return i % 2 ? ' ' : '|'; });
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
};

