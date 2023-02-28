const Color = require('../lib/color');
const Board = require('../lib/board');
const Pawn = require('../lib/pieces/pawn');
const King = require('../lib/pieces/king');

const AI = require('../lib/ai');
const Chess = require('../lib/chess');


test('generateMoveStrs', () => {
    let board = new Board();
    let pawnDBlack = board.get(3, 1);

    expect(JSON.stringify(AI.generateMoveStrs(pawnDBlack, board, 3, 3))).toBe("[\"d5\"]");

    let knightQWhite = board.get(1, 7);

    expect(JSON.stringify(AI.generateMoveStrs(knightQWhite, board, 2, 5))).toBe("[\"Nc3\"]");
    
    let i = 1;

    ["d4", "Nc6", "d5", "e5"].forEach(move => {
        board.move(board.buildMove(move, (i % 2 ? Color.WHITE : Color.BLACK)));
        i++;
    });

    let pawnDWhite = board.get(3, 3);
    expect(JSON.stringify(AI.generateMoveStrs(pawnDWhite, board, 4, 2))).toBe("[\"dxe6\"]");

    board.wipe();
    let whiteKing = new King(Color.WHITE, 7, 7);
    let blackKing = new King(Color.WHITE, 1, 7);
    let whitePawn = new Pawn(Color.WHITE, 1, 1);
    board.whiteKing = whiteKing;
    board.blackKing = blackKing;

    board.teamMap[Color.WHITE] = [
        board.set(0, 7, whiteKing),
        board.set(3, 1, whitePawn)
    ];
    board.teamMap[Color.BLACK] = [
        board.set(7, 7, blackKing)
    ];

    expect(JSON.stringify(AI.generateMoveStrs(whitePawn, board, 1, 0))).toBe("[\"b8=Q\",\"b8=N\",\"b8=B\",\"b8=R\"]");
});

test('validMoves', () => {
    let chess = new Chess();
    let moveSet = AI.legalMoves(chess.toFEN());

    // all possible moves from opening position
    let whiteOpeningMoveSet = [
        'a3',  'a4',  'b3',  'b4',
        'c3',  'c4',  'd3',  'd4',
        'e3',  'e4',  'f3',  'f4',
        'g3',  'g4',  'h3',  'h4',
        'Nc3', 'Na3', 'Nh3', 'Nf3'
    ];
    let blackOpeningMoveSet = [
        'Nc6', 'Na6', 'Nh6', 'Nf6',
        'a6',  'a5',  'b6',  'b5',
        'c6',  'c5',  'd6',  'd5',
        'e6',  'e5',  'f6',  'f5',
        'g6',  'g5',  'h6',  'h5'
    ];

    expect(moveSet).toEqual(whiteOpeningMoveSet);

    chess.move('e4');
    moveSet = AI.legalMoves(chess.toFEN());

    expect(moveSet).toEqual(blackOpeningMoveSet);

    // late game position
    let exampleSet1 = [
        'Bh7', 'Bxf7', 'Ne7', 'Na7',
        'Nxd6', 'Nb6', 'Kb5', 'Ka5',
        'Kc4', 'Ka4', 'Kc3', 'Ka3', 
        'Rxf3', 'Re3', 'Rd3', 'Rc3',
        'Ra3', 'Rb2', 'Rb1', 'exd6', 
        'd8=Q', 'd8=R', 'd8=B', 'd8=N',
        'f6', 'e6', 'g4'
    ];

    chess = new Chess('2N3B1/2pP1p2/3p4/4PPr1/1K6/1R3pP1/3p1p1k/8 w - - 0 1');
    moveSet = AI.legalMoves(chess.toFEN());

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
        'Qd3', 'Qxb3', 'Qxd2', 'Bxc5',
        'Ba5', 'Bxc3', 'Bxa3', 'Rxg4',
        'Rh3', 'Rf3', 'Re3', 'Rd3',
        'Rxc3', 'Rg2', 'Rg1', 'Nxg4',
        'Nh3', 'Nd3', 'Nh1', 'Nd1',
        'exf5', 'bxc3', 'bxa3', 'c8=Q',
        'c8=R', 'c8=B', 'c8=N', 'h7',
        'e5', 'e3'
    ];

    chess = new Chess('n2R4/P1Pn4/1rB1NpKP/1pqQ1r1P/pB2PPp1/ppp3R1/1P1bPN1p/1bk5 w - - 0 1');
    moveSet = AI.legalMoves(chess.toFEN());

    expect(moveSet.length).toBe(exampleSet2.length);
    moveSet.forEach(move => {
        expect(exampleSet2.includes(move)).toBe(true);
    });
});

