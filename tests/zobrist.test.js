'use strict';

const Chess = require('../lib/chess');
const Status = require('../lib/status');

test('zobrist hash', () => {
    let chess = new Chess();

    // Known Polyglot key for the initial position:
    expect(chess.board.hash).toBe(5060803636482931868n); // 0x463b96181691fc9c

    const moves = [
        'e4', 'd5',
        'e5', 'f5',
        'exf6', 'Nxf6',
        'Bb5', 'Nbd7',
        'Nf3', 'e5',
        'O-O', 'd4',
        'c4', 'dxc3',
        'h3', 'cxb2',
        'Nxe5','bxa1=Q',
        'Bxd7+', 'Bxd7',
        'Nxd7', 'Qxd7',
        'Qg4', 'O-O-O',
    ];

    // Expected Polyglot keys each ply:
    const expectedHashes = [
        9384546495678726550n,  // e4
        528813709611831216n,   // d5
        7363297126586722772n,  // e5
        2496273314520498040n,  // f5 (set EP on f6)
        14016596989027940020n, // exf6 (EP capture)
        5096198414277821317n,  // Nxf6
        8459876503828877318n,  // Bb5+ (check)
        5081467232698777034n,  // Nbd7
        11376114030867012855n, // Nf3
        1700138797499393217n,  // e5 (sets EP on e6)
        7632862560890159057n,  // O-O (castling)
        10052045776613496118n, // d4
        547476100084438867n,   // c4 (sets EP on c3)
        4360992996207018016n,  // dxc3
        15309566612785400274n, // h3
        12944632245834489960n, // cxb2
        1001882185224324446n, // Nxe5
        5744473208627688320n, // bxa1=Q
        12699928198327211416n, // Bxd7+
        556824494294503238n, // Bxd7
        1701648896240034565n, // Nxd7
        9373609099685908392n, // Qxd7
        15541866783832184229n, // Qg4
        16472294009026691487n, // O-O-O

    ];

    for (let i = 0; i < moves.length; i++) {
        const res = chess.move(moves[i]);

        // Only Bb5 gives check in this line
        if (moves[i] === 'Bb5') {
            expect(res).toBe(Status.CHECK);
        } else {
            expect([Status.MOVEOK, Status.CHECK]).toContain(res);
        }

        expect(chess.board.hash).toBe(expectedHashes[i]);
        // console.log(chess.toFEN());
    }
    // verify that creating a new chess obj from the end fen str results in correct hash
    chess = new Chess("2kr1b1r/pppq2pp/5n2/8/6Q1/7P/P2P1PP1/qNB2RK1 w - - 2 13");
    expect(chess.board.hash).toBe(16472294009026691487n);
});
