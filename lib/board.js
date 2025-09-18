'use strict';

const Bishop = require('./pieces/bishop');
const King = require('./pieces/king');
const Knight = require('./pieces/knight');
const Pawn = require('./pieces/pawn');
const Queen = require('./pieces/queen');
const Rook = require('./pieces/rook');

const Color = require('./color');
const Move = require('./move');

const { initHash, updateHash, epFileOf } = require('./zobrist');

module.exports = class Board {
    constructor(fenStr) {
        this.board = Array(8)
            .fill()
            .map(() => Array(8).fill(null));
        this.teamMap = {};
        this.teamMap[Color.WHITE] = [];
        this.teamMap[Color.BLACK] = [];
        this.history = [];
        this.searchStack = [];

        // ep and castleState history maintained for move undoing
        this.enPassantList = [];
        this.castleStateList = [];

        // addressing
        this.perspective = Color.WHITE;
        this.xToFile = {
            0: 'a',
            1: 'b',
            2: 'c',
            3: 'd',
            4: 'e',
            5: 'f',
            6: 'g',
            7: 'h',
        };
        this.yToRank = {
            7: '1',
            6: '2',
            5: '3',
            4: '4',
            3: '5',
            2: '6',
            1: '7',
            0: '8',
        };
        this.fileToX = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7 };
        this.rankToY = { 1: 7, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1, 8: 0 };
        if (!fenStr) {
            this.loadPieces(Color.WHITE);
            this.whiteKing = this.teamMap[Color.WHITE].find(
                (piece) => piece instanceof King,
            );
            this.loadPieces(Color.BLACK);
            this.blackKing = this.teamMap[Color.BLACK].find(
                (piece) => piece instanceof King,
            );
            this.turnColor = 'w';
            this.castleState = 'KQkq';

            // opening position hash
            // ep is - in opening position, not required in initHash
            this.hash = initHash(
                this,
                this.teamMap,
                this.turnColor,
                this.castleState,
            );
            return;
        }

        let [boardState, turnColor, castleState, enPassant, ,] = fenStr.split(' ');
        this.castleState = castleState;

        let x = 0,
            y = 0;
        [...boardState].forEach((char) => {
            let color;
            if (char.charCodeAt(0) < 91 && char.charCodeAt(0) > 64) {
                color = Color.WHITE;
            }
            if (char.charCodeAt(0) < 123 && char.charCodeAt(0) > 96) {
                color = Color.BLACK;
            }
            switch (char.toUpperCase()) {
            case '/':
                y++;
                x = 0;
                break;
            case 'P':
                {
                    let pawn = new Pawn(color, x, y);
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
            case 'K':
                {
                    let king = new King(color, x, y);
                    this.teamMap[color].push(this.set(x, y, king));
                    if (color === Color.WHITE) {
                        king.firstMove = castleState.includes('Q') || castleState.includes('K');
                        this.whiteKing = king;
                    } else {
                        king.firstMove = castleState.includes('q') || castleState.includes('k');
                        this.blackKing = king;
                    }
                }
                break;
            default: {
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
        if (
            this.board.forEach((row) => {
                if (row.length != 8) {
                    throw new Error('invalid board dimensions from FEN string');
                }
            })
        )
            if (
                this.teamMap[Color.WHITE].filter((piece) => piece.toFEN() === 'K')
                    .length !== 1
            ) {
                throw new Error('invalid king count from FEN string');
            }

        if (
            this.teamMap[Color.BLACK].filter((piece) => piece.toFEN() === 'k')
                .length !== 1
        ) {
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

        // zobrist hash constructed from valid fen
        this.hash = initHash(
            this,
            this.teamMap,
            this.turnColor,
            this.castleState,
            this.enPassantList[0],
        );
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
        this.board = Array(8)
            .fill()
            .map(() => Array(8).fill(null));

        this.teamMap[Color.WHITE] = [];
        this.teamMap[Color.BLACK] = [];

        this.whiteKing = null;
        this.blackKing = null;
    }

    get(x, y) {
        return this.board[y][x];
    }

    set(x, y, piece) {
        return (this.board[y][x] = piece);
    }

    checkForCheck(color) {
        const king = color === Color.WHITE ? this.whiteKing : this.blackKing;
        const otherTeam = this.teamMap[color === Color.WHITE ? Color.BLACK : Color.WHITE];
        return (
            otherTeam.find((piece) => piece.evaluate(this, king.x, king.y)) !==
      undefined
        );
    }

    insufficientMaterial() {
        if (
            this.teamMap[Color.WHITE].length > 2 ||
            this.teamMap[Color.BLACK].length > 2
        ) {
            return false;
        }

        let draw = 0;

        // this if only checks for bishops or knights, but what if there is less? king vs king for example
        [Color.WHITE, Color.BLACK].forEach((color) => {
            if (this.teamMap[color].find((piece) => piece instanceof Pawn)) {
                return false;
            }
            if (
                this.teamMap[color].find(
                    (piece) => piece instanceof Bishop || piece instanceof Knight,
                ) !== undefined
            ) {
                draw++;
            } else if (this.teamMap[color].length === 1) {
                draw++;
            }
        });

        // both teams have insufficient material if draw === 2
        return draw === 2;
    }

    canMove(color) {
        return (
            this.teamMap[color].find((piece) => piece.canMove(this)) !== undefined
        );
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

        const xDir = king.x - rook.x > 0 ? -1 : 1;

        // check for lines of check
        const otherTeam = this.teamMap[color === Color.WHITE ? Color.BLACK : Color.WHITE];
        for (let count = 2; count > 0; count--) {
            if (
                otherTeam.find((piece) =>
                    piece.evaluate(this, king.x + count * xDir, king.y),
                )
            ) {
                return null;
            }
        }

        let newKingX = king.x + 2 * xDir;
        let newRookX = newKingX + -1 * xDir;

        let moves = [
            new Move(king, newKingX, king.y, null, null, true),
            new Move(rook, newRookX, rook.y, null, null, true),
        ];
        // moveSquares is just for highlighting, so king and rook origin are fine to indicate a castle
        let orig = [king.x, king.y];
        let dest = [rook.x, rook.y];

        return [moves, orig, dest];
    }

    getCastleState() {
        let castleState = '';
        let whiteKing = this.whiteKing;
        let whiteRookQ = this.get(0, 7);
        let whiteRookK = this.get(7, 7);

        let blackKing = this.blackKing;
        let blackRookQ = this.get(0, 0);
        let blackRookK = this.get(7, 0);

        if (whiteKing.firstMove) {
            if (whiteRookK?.firstMove) {
                castleState += 'K';
            }
            if (whiteRookQ?.firstMove) {
                castleState += 'Q';
            }
        }
        if (blackKing.firstMove) {
            if (blackRookK?.firstMove) {
                castleState += 'k';
            }
            if (blackRookQ?.firstMove) {
                castleState += 'q';
            }
        }
        return castleState;
    }

    // the original buildMove was separated into two separate functions buildMoveCoords, and buildMoveSAN
    // coords is used to build move objects without SAN (just coords, no strings)
    // much faster for legal move generation for ai search
    buildMoveCoords(piece, destX, destY, promoChar = null) {
        // Castling when called via coords: king moves two files on same rank
        if (piece instanceof King && Math.abs(destX - piece.x) === 2 && destY === piece.y) {
            const xDir = (destX - piece.x) > 0 ? 1 : -1;
            const rookX = xDir > 0 ? 7 : 0;
            const rook = this.get(rookX, piece.y);
            if (!(rook instanceof Rook)) return null;

            const newKingX = piece.x + 2 * xDir;
            const newRookX = newKingX - xDir;

            const moves = [
                new Move(piece, newKingX, piece.y, null, null, true),
                new Move(rook,  newRookX, rook.y,  null, null, true),
            ];
            const orig = [piece.x, piece.y];
            const dest = [rook.x,  rook.y];
            return [moves, orig, dest, { isCapture: false, isPromotion: false }];
        }

        const destPiece = this.get(destX, destY);
        let capture = destPiece !== null;
        let taken = destPiece;

        // En passant: pawn moves diagonally to empty square capturing adjacent pawn
        if (piece instanceof Pawn && piece.x !== destX && destPiece === null) {
            const adj = this.get(destX, piece.y);
            if (adj instanceof Pawn && adj.enPassantable) {
                capture = true;
                taken = adj;
            } else {
                return null; // diagonal pawn move without EP target
            }
        }

        // Promotions
        const promoting = (piece instanceof Pawn) && (destY === 0 || destY === 7);
        if (promoting && !promoChar) return null; // require explicit promotion kind

        const moves = [];
        if (capture && taken) {
            // captured piece removed first
            moves.push(new Move(taken, -1, -1));
        }

        if (promoting) {
            // remove pawn (flag this Move as promotion-removal) then place new piece
            moves.push(new Move(piece, -1, -1, null, true));
            const color = piece.color;
            let newPiece;
            switch (promoChar) {
            case 'Q': newPiece = new Queen(color, -1, -1); break;
            case 'R': newPiece = new Rook (color, -1, -1); break;
            case 'B': newPiece = new Bishop(color, -1, -1); break;
            case 'N': newPiece = new Knight(color, -1, -1); break;
            default: return null;
            }
            newPiece.firstMove = false;
            moves.push(new Move(newPiece, destX, destY, false));
        } else {
            // normal move
            moves.push(new Move(piece, destX, destY));
        }

        const orig = [piece.x, piece.y];
        const dest = [destX, destY];
        return [moves, orig, dest, { isCapture: capture, isPromotion: promoting }];
    }

    // builds moves using SAN notation
    // SAN is kept only to deconstruct input from user
    // it is not used internally by the engine
    // deconstructed input is passed to buildMoveCoords to create move objects
    // those are then used by either move or make to apply the moveObj to the board
    buildMoveSAN(moveStr, color) {
        if (moveStr === 'O-O-O' || moveStr === 'O-O') {
            // Keep using your castle() helper (it validates path + attacked squares)
            return this.castle(moveStr, color);
        }

        // Split off promotion if present (e.g. "exd8=Q")
        let promotion;
        [moveStr, promotion] = moveStr.split('=');

        if (moveStr.length < 2 || moveStr.length > 6) return null;

        const destX = this.fileToX[moveStr[moveStr.length - 2]];
        const destY = this.rankToY[moveStr[moveStr.length - 1]];
        if (destX === undefined || destY === undefined) return null;

        // Determine piece type from first char
        let pieceType;
        switch (moveStr[0]) {
        case 'R': pieceType = Rook;   break;
        case 'N': pieceType = Knight; break;
        case 'B': pieceType = Bishop; break;
        case 'Q': pieceType = Queen;  break;
        case 'K': pieceType = King;   break;
        default:  pieceType = Pawn;   break;
        }

        // Parse optional disambiguation and 'x'
        let capture = false;
        let origX, origY;

        if (pieceType === Pawn) {
            if (moveStr.length === 4) {
                if (moveStr[1] !== 'x') return null;
                capture = true;
                origX = this.fileToX[moveStr[0]];
            } else if (moveStr.length !== 2) {
                return null;
            }
        } else {
            const c1 = moveStr[1];
            const c2 = moveStr[2];
            const c3 = moveStr[3];
            if (moveStr.length === 3) {
                // e.g., "Nf3" (no extras)
            } else if (moveStr.length === 4) {
                if (!((capture = c1 === 'x') || (origX = this.fileToX[c1]) !== undefined || (origY = this.rankToY[c1]) !== undefined)) {
                    return null;
                }
            } else if (moveStr.length === 5) {
                if (!((origX = this.fileToX[c1]) !== undefined || (origY = this.rankToY[c1]) !== undefined)) return null;
                if (!((capture = c2 === 'x') || (origY = this.rankToY[c2]))) return null;
            } else if (moveStr.length === 6) {
                if (!((capture = c3 === 'x') || (origX = this.fileToX[c1]) !== undefined || (origY = this.rankToY[c2]) !== undefined)) {
                    return null;
                }
            } else {
                return null;
            }
        }
    
        // Find the (single) piece that can make this move (respecting disambiguation)
        const pieceList = this.teamMap[color].filter((p) => {
            if (!(p instanceof pieceType)) return false;
            if (origX !== undefined && p.x !== origX) return false;
            if (origY !== undefined && p.y !== origY) return false;
            return p.evaluate(this, destX, destY);
        });
        
        if (pieceList.length !== 1) return null;
        const pieceMoved = pieceList[0];

        // Promotions must have '=X'
        if (pieceType === Pawn && (destY === 0 || destY === 7) && !promotion) return null;

        // Build low-level move list once
        const built = this.buildMoveCoords(pieceMoved, destX, destY, promotion || null);
        if (!built) return null;
        const [moves, orig, dest, meta] = built;

        // Validate that the SAN 'x' matches whether a capture actually occurs (incl. EP)
        if (capture !== meta.isCapture) return null;

        // Keep same return shape as before (no meta)
        return [moves, orig, dest];
    }

    applyMove(moveList, { search = false, undoing = false } = {}) {
        // Save "previous" state (BEFORE any changes).
        const prevCastleState = this.castleState;
        const prevEpPawn = this.enPassantList[this.enPassantList.length - 1];
        const prevEpFile = epFileOf(prevEpPawn, this.board); // 0n if none

        // We'll describe every atomic change for hashing.
        // Each entry: { fen: 'P'|'p'|'N'|..., from:[x,y]|null, to:[x,y]|null }
        const xors = [];

        let enPassantPiece = null;

        const undoMove = [];

        for (const moveObj of moveList) {
            // eslint-disable-next-line no-unused-vars
            let { piece, destX, destY, firstMove, promotion, castle } = moveObj;
            const team = this.teamMap[piece.color];
            const origX = piece.x;
            const origY = piece.y;

            // record XOR-out if it was on-board
            if (origX >= 0) {
                xors.push({ fen: piece.toFEN(), from: [origX, origY], to: null });
            }

            // detect double pawn push for EP
            if (
                piece instanceof Pawn &&
                piece.firstMove &&
                Math.abs(piece.y - destY) === 2 &&
                destY !== -1
            ) {
                enPassantPiece = piece;
            }

            // toggle firstMove
            if (piece.firstMove) {
                firstMove = true;
                piece.firstMove = false;
            } else if (firstMove) {
                piece.firstMove = true;
                firstMove = false;
            }

            // clear origin square if it was on-board
            if (origX >= 0) this.set(origX, origY, null);

            if (castle) {
                // if this piece was off-board (being restored), put it back on the team
                if (origX < 0 && team.indexOf(piece) === -1) team.push(piece);

                this.set(destX, destY, piece);
                piece.x = destX; piece.y = destY;

                xors.push({ fen: piece.toFEN(), from: null, to: [destX, destY] });
            } else if (destX < 0) {
                // removal (capture or promotion pawn removal)
                const i = team.indexOf(piece);
                if (i !== -1) team.splice(i, 1);
                piece.x = -1; piece.y = -1;
                // (no XOR-in)
            } else {
                // normal placement (mover or newly created promoted piece)
                if (origX < 0 && team.indexOf(piece) === -1) team.push(piece);

                this.set(destX, destY, piece);
                piece.x = destX; piece.y = destY;

                xors.push({ fen: piece.toFEN(), from: null, to: [destX, destY] });
            }

            // keep castle rights updated
            this.castleState = this.getCastleState();

            // build inverse step
            undoMove.unshift(new Move(piece, origX, origY, firstMove));
        }

        // Clear current EP flag before setting a new one (we already saved "prev" above).
        if (this.enPassantList[this.enPassantList.length - 1]) {
            this.enPassantList[this.enPassantList.length - 1].enPassantable = false;
            this.enPassant = '-';
        }

        if (undoing) {
            // Rolling state backward.
            this.enPassantList.pop();
            const ep = this.enPassantList[this.enPassantList.length - 1];
            if (ep) {
                ep.enPassantable = true;
                this.enPassant = `${this.xToFile[ep.x]}${ep.color === Color.WHITE ? '3' : '6'}`;
            } else {
                this.enPassant = undefined;
            }
            this.castleState = this.castleStateList.pop();
        } else {
            // Rolling state forward.
            this.castleStateList.push(prevCastleState);
            this.enPassantList.push(enPassantPiece);
            if (enPassantPiece) {
                enPassantPiece.enPassantable = true;
                this.enPassant = `${this.xToFile[enPassantPiece.x]}${enPassantPiece.color === Color.WHITE ? '3' : '6'}`;
            }
            if (search) this.searchStack.push(undoMove);
            else        this.history.push(undoMove);
        }

        // Flip side-to-move.
        this.turnColor = (this.turnColor === 'w') ? 'b' : 'w';

        // Incremental hash update using the recorded deltas and the "prev" castle/EP.
        this.hash = updateHash(this, xors, prevCastleState, prevEpFile);
    }
 
    // Keep these wrappers small and explicit:
    move(moveList, undoing = false) {
        this.applyMove(moveList, { search: false, undoing });
    }

    // accept & ignore legacy arg (some callers pass true)
    undo(/* _compat */) {
        const undoMove = this.history.pop();
        if (!undoMove) return;
        this.applyMove(undoMove, { search: false, undoing: true });
    }

    make(moveList) {
        this.applyMove(moveList, { search: true, undoing: false });
    }

    unmake() {
        if (!this.searchStack || !this.searchStack.length) return;
        const undoMove = this.searchStack.pop();
        this.applyMove(undoMove, { search: true, undoing: true });
    }

    flipPerspective() {
        this.perspective = this.perspective === Color.WHITE ? Color.BLACK : Color.WHITE;
        this.board = this.board.map((rank) => rank.reverse()).reverse();

        // flips address maps
        for (let i = 0; i < 8; i++) {
            let file = String.fromCharCode(97 + i);
            let rank = `${i + 1}`;
            let y = this.perspective == Color.WHITE ? 7 - i : i;
            let x = this.perspective == Color.WHITE ? i : 7 - i;

            this.xToFile[x] = file;
            this.yToRank[y] = rank;
            this.fileToX[file] = x;
            this.rankToY[rank] = y;
        }

        // loop through teamMaps for pawns and update their movesets
        [Color.WHITE, Color.BLACK].forEach((color) => {
            this.teamMap[color].forEach((piece) => {
                piece.flipPerspective();
            });
        });
    }

    toFEN() {
        if (this.perspective === Color.BLACK) {
            // reverses pieces
            this.board = this.board.map((rank) => rank.reverse()).reverse();
        }

        let fen = '';
        let row = '';
        let count;
        for (let i = 0; i < 8; i++) {
            count = 0;
            for (let j = 0; j < 8; j++) {
                if (this.get(j, i) === null) {
                    count++;
                } else {
                    row += `${count > 0 ? count : ''}${this.get(j, i).toFEN()}`;
                    count = 0;
                }
            }
            row += `${count > 0 ? count : ''}`;
            fen += `${row}${i < 7 ? '/' : ''}`;
            row = '';
        }

        if (this.perspective === Color.BLACK) {
            // reverses pieces
            this.board = this.board.map((rank) => rank.reverse()).reverse();
        }
        return fen;
    }

    toString() {
    // horizontal line that divides the ranks '----'
        let line = Array(17).fill('-');
        line[17] = '\n';

        // alternating vertical divider and empty space '| | |'
        let rank = Array(17)
            .fill()
            .map((_, i) => {
                return i % 2 ? ' ' : '|';
            });
        rank[17] = '\n';

        let boardStrArr = [];
        for (let row = 0; row < 17; row++) {
            if (row % 2 == 0) {
                boardStrArr[row] = line;
            } else {
                // need to copy rank since we may modify
                boardStrArr[row] = [...rank];
                const boardRow = Math.floor(row / 2);
                for (let col = 1, boardCol = 0; boardCol < 8; col += 2, boardCol++) {
                    // replace ' ' with piece if present
                    boardStrArr[row][col] = this.get(boardCol, boardRow) || ' ';
                }
            }
        }

        return boardStrArr.map((row) => row.join('')).join('');
    }
};
