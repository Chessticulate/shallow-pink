'use strict';

const Chess = require('../lib/chess');
const Board = require('../lib/board');
const Color = require('../lib/color');
const Status = require('../lib/status');
const King = require('../lib/pieces/king');
const Queen = require('../lib/pieces/queen');
const Knight = require('../lib/pieces/knight');
const Pawn = require('../lib/pieces/pawn');
const {InvalidFENException} = require('../lib/errors');

test('chess constructor', () => {
    let chess = new Chess();

    expect(chess.turn).toBe(1);
    expect(chess.board instanceof Board).toBe(true);
    expect(chess.gameOver).toBe(false);
    expect(chess.draw).toBe(false);
    expect(chess.checkmate).toBe(false);
    expect(chess.check).toBe(false);

    // test resume from fen str
    expect(chess.move("e4")).toBe(Status.MOVEOK);
    expect(chess.move("c5")).toBe(Status.MOVEOK);
    expect(chess.toFEN()).toBe("rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2");
    let fenChess = new Chess(chess.toFEN(), chess.states);

    expect(fenChess.turn).toBe(3);
    expect(fenChess.fiftyMoveCounter).toBe(0);
    expect(fenChess.states).toBe(chess.states);
    expect(fenChess.board instanceof Board).toBe(true);
    expect(JSON.stringify(fenChess.board.enPassantable)).toBe(JSON.stringify(chess.board.enPassantable));
    expect(fenChess.gameOver).toBe(false);
    expect(fenChess.draw).toBe(false);
    expect(fenChess.checkmate).toBe(false);
    expect(fenChess.check).toBe(false);
    expect(fenChess.toString()).toBe(chess.toString());

    // late game test, additional test to make sure castling appears as - if no castling sides are available
    let lateGame = new Chess('r1bq1bnr/1p1p1k1p/p3p1p1/5p2/2BQP3/1PN5/P1P2PPP/R1B1R1K1 b - - 2 10');

    expect(lateGame.toFEN()).toBe('r1bq1bnr/1p1p1k1p/p3p1p1/5p2/2BQP3/1PN5/P1P2PPP/R1B1R1K1 b - - 2 10');

    // FEN validation tests

    // 9 spaces in the 4th rank
    let badFen = "rnbqkbnr/pp1ppppp/8/2p5/9P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2";
    expect(() => new Chess(badFen)).toThrow(InvalidFENException);
    
    // too many cooks (kings)
    let badFen2 = "rnbqkbnr/pp1ppppp/8/2p5/9P3/8/PPPP1PPP/RNBQKKBNR w KQkq c6 0 2";
    expect(() => new Chess(badFen2)).toThrow(InvalidFENException);

});

test('undo move', () => {
    let chess = new Chess();

    chess.move('f3');
    chess.move('e5');
    chess.move('g4');

    let hash = chess.board.toFEN();
    let map = chess.states;
    let check = chess.check;
    let fen1 = chess.toFEN();

    chess.move('d5');
    expect(fen1 === chess.toFEN()).toBe(false);
    chess.undo();
    expect(fen1).toBe(chess.toFEN());

    expect(chess.turn).toBe(4);
    expect(chess.gameOver).toBe(false);
    expect(chess.draw).toBe(false);
    expect(chess.check).toBe(check);
    expect(chess.prevMove).toBe('g4');
    expect(chess.fiftyMoveCounter).toBe(0);
    expect(chess.states).toBe(map);
    expect(chess.board.toFEN()).toBe(hash);

    // instead of redoing d5, do Qh4 checkmate 
    let gameOver = chess.gameOver;

    expect(chess.move('Qh4')).toBe(Status.CHECKMATE);

    chess.undo();

    expect(chess.turn).toBe(4);
    expect(chess.gameOver).toBe(false);
    expect(chess.draw).toBe(false);
    expect(chess.check).toBe(false);
    expect(chess.prevMove).toBe('g4');
    expect(chess.fiftyMoveCounter).toBe(0);
    expect(chess.states).toBe(map);
    expect(chess.board.toFEN()).toBe(hash);    
});

test('record move', () => {
    let chess = new Chess();
    let moveStr = 'e4';
    chess.check = true;

    chess.recordMove(moveStr);
    expect(chess.prevMove).toBe('e4+');

    moveStr = 'a6'
    chess.checkmate = true;

    chess.recordMove(moveStr);
    expect(chess.prevMove).toBe('a6#');

    moveStr = 'Qxd5';
    chess.gameOver = true;

    // checkmate
    chess.recordMove(moveStr);
    expect(chess.prevMove).toBe('Qxd5#');

    // draw
    chess = new Chess();
    chess.gameOver = true;
    chess.draw = true;

    chess.recordMove(moveStr);
    expect(chess.prevMove).toBe('Qxd5');
});

test('game over', () => {
    let chess = new Chess();
    let moveStr = 'a4';
    chess.gameOver = true;

    expect(chess.move(moveStr)).toBe(Status.GAMEOVER);
});

test('invalid move (incorrect syntax/ impossible move)', () => {
    let chess = new Chess();
    let moveStr = 'a10';

    expect(chess.move(moveStr)).toBe(Status.INVALIDMOVE);
});

test('illegal move (puts in check/ still in check)', () => {
    let chess = new Chess();
    let moveStr = 'Ka8';
    chess.board.wipe();

    let whiteKing = new King(Color.WHITE, 1, 0);
    let blackKing = new King(Color.BLACK, 7, 7);
    let blackQueen = new Queen(Color.BLACK, 3, 0);

    chess.board.teamMap[Color.WHITE] = [whiteKing];
    chess.board.teamMap[Color.BLACK] = [blackKing, blackQueen];
    chess.board.whiteKing = whiteKing;
    chess.board.blackKing = blackKing;

    chess.board.set(1, 0, whiteKing);
    chess.board.set(7, 7, blackKing);
    chess.board.set(3, 0, blackQueen);

    expect(chess.move(moveStr)).toBe(Status.PUTSINCHECK);

     // STILLINCHECK
     chess.check = true;
     expect(chess.move(moveStr)).toBe(Status.STILLINCHECK);
});

test('check', () => {
    let chess = new Chess();
    let moveStr = 'Qh7';

    chess.board.wipe();
    chess.draw = false;
    chess.gameOver = false;

    let whiteKing = new King(Color.WHITE, 0, 1);
    let blackKing = new King(Color.BLACK, 2, 2);
    let blackQueen = new Queen(Color.BLACK, 7, 5);

    chess.board.teamMap[Color.WHITE] = [whiteKing];
    chess.board.teamMap[Color.BLACK] = [blackKing, blackQueen];
    chess.board.whiteKing = whiteKing;
    chess.board.blackKing = blackKing;

    chess.board.set(7, 5, blackQueen);
    chess.board.set(2, 2, blackKing);
    chess.board.set(0, 1, whiteKing);
    chess.turn = 2;


    expect(chess.move(moveStr)).toBe(Status.CHECK);
});

test('checkmate', () => {
    let chess = new Chess();
    let moveStr = 'Qb7';

    chess.board.wipe();
    chess.check = false;

    let whiteKing = new King(Color.WHITE, 0, 1);
    let blackKing = new King(Color.BLACK, 2, 2);
    let blackQueen = new Queen(Color.BLACK, 1, 3);

    chess.board.teamMap[Color.WHITE] = [whiteKing];
    chess.board.teamMap[Color.BLACK] = [blackKing, blackQueen];
    chess.board.whiteKing = whiteKing;
    chess.board.blackKing = blackKing;

    chess.board.set(1, 3, blackQueen);
    chess.board.set(2, 2, blackKing);
    chess.board.set(0, 1, whiteKing);
    chess.turn = 2;

    expect(chess.move(moveStr)).toBe(Status.CHECKMATE);
});

test('stalemate', () => {
    let chess = new Chess();
    let moveStr = 'Qc8';

    chess.board.wipe();
    chess.gameOver = false;
    chess.checkmate = false;
    chess.check = false;

    let whiteKing = new King(Color.WHITE, 0, 1);
    let blackKing = new King(Color.BLACK, 2, 2);
    let blackQueen = new Queen(Color.BLACK, 7, 5);

    chess.board.teamMap[Color.WHITE] = [whiteKing];
    chess.board.teamMap[Color.BLACK] = [blackKing, blackQueen];
    chess.board.whiteKing = whiteKing;
    chess.board.blackKing = blackKing;

    chess.board.set(7, 5, blackQueen);
    chess.board.set(2, 2, blackKing);
    chess.board.set(0, 1, whiteKing);
    chess.turn = 2;

    expect(chess.move(moveStr)).toBe(Status.STALEMATE);
});

test('50 move rule', () => {
    let chess = new Chess();
    chess.fiftyMoveCounter = 99;

    expect(chess.move('Nf3')).toBe(Status.FIFTYMOVERULE);

    chess = new Chess();
    chess.fiftyMoveCounter = 99;

    expect(chess.move('e4')).toBe(Status.MOVEOK);
});

test('insufficient material', () => {
    let chess2 = new Chess('8/8/8/8/1k6/1N6/8/7K w - - 0 1');
    expect(chess2.board.insufficientMaterial()).toBe(true);
})

test('generateMoveStrs', () => {
    let chess = new Chess();

    // simple movement
    let pawnDBlack = chess.board.get(3, 1);
    expect(JSON.stringify(chess.generateMoveStrs(pawnDBlack, 3, 3))).toBe("[\"d5\"]");
    let knightQWhite = chess.board.get(1, 7);
    expect(JSON.stringify(chess.generateMoveStrs(knightQWhite, 2, 5))).toBe("[\"Nc3\"]");

    let i = 1;
    ["d4", "Nc6", "d5", "e5"].forEach(move => {
        chess.board.move(chess.board.buildMove(move, (i % 2 ? Color.WHITE : Color.BLACK))[0]);
        i++;
    });
    let pawnDWhite = chess.board.get(3, 3);
    expect(JSON.stringify(chess.generateMoveStrs(pawnDWhite, 4, 2))).toBe("[\"dxe6\"]");

    // promotion
    chess.board.wipe();
    let whiteKing = new King(Color.WHITE, 0, 7);
    let blackKing = new King(Color.WHITE, 7, 0);
    let whitePawn = new Pawn(Color.WHITE, 1, 1);
    chess.board.whiteKing = whiteKing;
    chess.board.blackKing = blackKing;

    chess.board.teamMap[Color.WHITE] = [
        chess.board.set(0, 7, whiteKing),
        chess.board.set(1, 1, whitePawn)
    ];
    chess.board.teamMap[Color.BLACK] = [
        chess.board.set(7, 0, blackKing)
    ];

    expect(JSON.stringify(chess.generateMoveStrs(whitePawn, 1, 0))).toBe("[\"b8=Q\",\"b8=N\"]");

    let blackKnight = new Knight(Color.BLACK, 0, 0);
    chess.board.teamMap[Color.BLACK].push(chess.board.set(blackKnight, 0, 0));
    expect(JSON.stringify(chess.generateMoveStrs(whitePawn, 0, 0))).toBe("[\"bxa8=Q\",\"bxa8=N\"]");

    // disambiguation
    chess.board.wipe();
    chess.board.whiteKing = whiteKing;
    chess.board.blackKing = blackKing;
    let queen1 = new Queen(Color.WHITE, 1, 1);
    let queen2 = new Queen(Color.WHITE, 1, 5);
    let queen3 = new Queen(Color.WHITE, 5, 5);

    chess.board.teamMap[Color.WHITE] = [
        chess.board.set(0, 7, whiteKing),
        chess.board.set(1, 1, queen1),
        chess.board.set(5, 5, queen3),
    ];
    chess.board.teamMap[Color.BLACK] = [
        chess.board.set(7, 0, blackKing)
    ];

    expect(JSON.stringify(chess.generateMoveStrs(queen3, 3, 3))).toBe("[\"Qfd5\"]");
    chess.board.teamMap[Color.WHITE].push(chess.board.set(1, 5, queen2));
    expect(JSON.stringify(chess.generateMoveStrs(queen1, 3, 3))).toBe("[\"Q7d5\"]");
    expect(JSON.stringify(chess.generateMoveStrs(queen2, 3, 3))).toBe("[\"Qb3d5\"]");
});

test('legal moves', () => {
    let chess = new Chess();
    let moveSet = chess.legalMoves();

    // all possible moves from opening position
    let whiteOpeningMoveSet = [
        'a3',  'a4',  'b3',  'b4',
        'c3',  'c4',  'd3',  'd4',
        'e3',  'e4',  'f3',  'f4',
        'g3',  'g4',  'h3',  'h4',
        'Nc3', 'Na3', 'Nh3', 'Nf3'
    ];
    let blackOpeningMoveSet = [
        'a6',  'a5',  'b6',  'b5',
        'c6',  'c5',  'd6',  'd5',
        'e6',  'e5',  'f6',  'f5',
        'g6',  'g5',  'h6',  'h5',
        'Nc6', 'Na6', 'Nh6', 'Nf6',
    ];

    expect(moveSet).toEqual(whiteOpeningMoveSet);

    chess.move('e4');
    moveSet = chess.legalMoves();

    expect(moveSet).toEqual(blackOpeningMoveSet);

    // late game position
    let exampleSet1 = [
        'Bh7', 'Bxf7', 'Ne7', 'Na7',
        'Nxd6', 'Nb6', 'Kb5', 'Ka5',
        'Kc4', 'Ka4', 'Kc3', 'Ka3', 
        'Rxf3', 'Re3', 'Rd3', 'Rc3',
        'Ra3', 'Rb2', 'Rb1', 'exd6', 
        'd8=Q', 'd8=N', 'f6', 'e6', 'g4'
    ];

    chess = new Chess('2N3B1/2pP1p2/3p4/4PPr1/1K6/1R3pP1/3p1p1k/8 w - - 0 1');
    moveSet = chess.legalMoves();

    expect(moveSet.length).toBe(exampleSet1.length);
    moveSet.forEach(move => {
        expect(exampleSet1.includes(move)).toBe(true);
    });

    // late game position 2
    let exampleSet2 = [
        'Rh8', 'Rg8', 'Rf8', 'Re8',
        'Rc8', 'Rb8', 'Rxa8', 'Rxd7',
        'Kh7', 'Kg7', 'Kf7', 'Kxf5',
        'Nf8', 'Ng7', 'Ng5', 'Nxc5',
        'Nd4', 'Bxa8', 'Bxd7', 'Bb7', 
        'Bxb5', 'Qxd7', 'Qd6', 'Qxf5',
        'Qe5', 'Qxc5', 'Qd4', 'Qc4',
        'Qd3', 'Qxb3', 'Qxd2+', 'Bxc5',
        'Ba5', 'Bxc3', 'Bxa3', 'Rxg4',
        'Rh3', 'Rf3', 'Re3', 'Rd3',
        'Rxc3+', 'Rg2', 'Rg1+', 'Nxg4',
        'Nh3', 'Nd3+', 'Nh1', 'Nd1',
        'exf5', 'bxc3', 'bxa3', 'c8=Q',
        'c8=N', 'h7', 'e5', 'e3'
    ];

    chess = new Chess('n2R4/P1Pn4/1rB1NpKP/1pqQ1r1P/pB2PPp1/ppp3R1/1P1bPN1p/1bk5 w - - 0 1');
    moveSet = chess.legalMoves();

    expect(JSON.stringify(moveSet.sort())).toBe(JSON.stringify(exampleSet2.sort()));
    expect(moveSet.length).toBe(exampleSet2.length);

    moveSet.forEach(move => {
        expect(exampleSet2.includes(move)).toBe(true);
    });

    // testing that legal moves returns castling moves

    // kings side castle position
    chess = new Chess('rnbqk2r/pp1p1ppp/3bpn2/2p5/2B1P3/P4N2/1PPP1PPP/RNBQK2R w KQkq - 0 1');
    moveSet = chess.legalMoves();

    expect(moveSet.includes('O-O')).toBe(true);
    
    let king = chess.board.get(4, 7);
    moveSet = chess.legalMoves(king)
    expect(moveSet.includes('O-O')).toBe(true);

    // same position but with blacks turn to move
    chess = new Chess('rnbqk2r/pp1p1ppp/3bpn2/2p5/2B1P3/P4N2/1PPP1PPP/RNBQK2R b KQkq - 0 1');
    moveSet = chess.legalMoves();

    expect(moveSet.includes('O-O')).toBe(true);

    // Queens side castle position
    chess = new Chess('r3kbnr/pbpp1ppp/1pn1pq2/8/6Q1/1PN1P3/PBPP1PPP/R3KBNR w KQkq - 0 1');
    moveSet = chess.legalMoves();

    expect(moveSet.includes('O-O-O')).toBe(true);

    // same position but its blacks turn
    chess = new Chess('r3kbnr/pbpp1ppp/1pn1pq2/8/6Q1/1PN1P3/PBPP1PPP/R3KBNR b KQkq - 0 1');
    moveSet = chess.legalMoves();

    expect(moveSet.includes('O-O-O')).toBe(true);

    // both sides
    chess = new Chess('r3k2r/pbppbppp/1pn1pq1n/8/6Q1/1PN1PN2/PBPPBPPP/R3K2R w KQkq - 0 1');
    moveSet = chess.legalMoves();

    expect(moveSet.includes('O-O', 'O-O-O')).toBe(true);

    // blacks turn 
    chess = new Chess('r3k2r/pbppbppp/1pn1pq1n/8/6Q1/1PN1PN2/PBPPBPPP/R3K2R b KQkq - 0 1');
    moveSet = chess.legalMoves();

    expect(moveSet.includes('O-O', 'O-O-O')).toBe(true);

    // test individual piece move set
    chess = new Chess();
    let knight = chess.board.get(6, 7);
    moveSet = chess.legalMoves(knight);
    expect(moveSet.includes('Nf3', 'Nh3')).toBe(true);

    let whitePawnA = chess.board.get(0, 6);
    moveSet = chess.legalMoves(whitePawnA);
    expect(moveSet.includes('a3', 'a4'));

    chess.move('a4');
    moveSet = chess.legalMoves(whitePawnA);
    expect(moveSet.length).toBe(0);

    // test castling not legal while in check
    chess = new Chess('rnbqk2r/ppp2ppp/7n/3pp3/4P3/b1PQ4/PP1P1PPP/RNB1KBNR w KQkq d6 0 5');
    chess.move('Qb5');
    expect(chess.legalMoves().includes('O-O')).toBe(false);  

    // test castling includes suffix (+ and #)
    chess = new Chess('rnbq1bnr/p1pppkp1/p6p/8/4P3/7N/PPPP2PP/RNBQK2R w KQ - 0 6');
    expect(chess.legalMoves().includes('O-O+')).toBe(true);
});


test('toFEN', () => {
    let chess = new Chess();

    let move1 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    let move2 = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2';
    let finalFen = 'r1bq1bnr/1p1p1k1p/p3p1p1/5p2/2BQP3/1PN5/P1P2PPP/R1B1R1K1 b - - 2 10';

    chess.move('e4');
    expect(chess.toFEN() === move1).toBe(true);

    chess.move('c5');
    expect(chess.toFEN() === move2).toBe(true);

    // check late game position
    chess = new Chess();

    let moveArr = [
        'e4', 'c5', 
        'd4', 'cxd4',
        'Nf3', 'Nc6',
        'Bc4', 'g6', 
        'Nc3', 'a6',
        'Nxd4', 'Nxd4',
        'Qxd4', 'f5',
        'O-O', 'e6',
        'b3', 'Kf7',
        'Re1'
    ];
    for (let i = 0; i < moveArr.length; i++) {
        chess.move(moveArr[i]);
    }

    expect(chess.toFEN()).toBe(finalFen);
});


test('toString', () => {
    let chess = new Chess();
    chess.toString();

    let chessStr =  
    "-----------------\n" +
    "|♖|♘|♗|♕|♔|♗|♘|♖|\n" +
    "-----------------\n" +
    "|♙|♙|♙|♙|♙|♙|♙|♙|\n" +
    "-----------------\n" +
    "| | | | | | | | |\n" +
    "-----------------\n" +
    "| | | | | | | | |\n" +
    "-----------------\n" +
    "| | | | | | | | |\n" +
    "-----------------\n" +
    "| | | | | | | | |\n" +
    "-----------------\n" +
    "|♟|♟|♟|♟|♟|♟|♟|♟|\n" +
    "-----------------\n" +
    "|♜|♞|♝|♛|♚|♝|♞|♜|\n" +
    "-----------------\n\n" +
    "white's turn"; 

    expect(chess.toString()).toBe(chessStr);
});
