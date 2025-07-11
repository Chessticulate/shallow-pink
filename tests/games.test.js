"use strict";

const Chess = require("../lib/chess");
const Board = require("../lib/board");
const Status = require("../lib/status");
const King = require("../lib/pieces/king");
const Color = require("../lib/color");
const Queen = require("../lib/pieces/queen");
const Rook = require("../lib/pieces/rook");
const Pawn = require("../lib/pieces/pawn");

test("full game (checkmate)", () => {
    let chess = new Chess();

    let moves = ["f3", "e5", "g4"];

    for (let i = 0; i < moves.length; i++) {
        expect(chess.move(moves[i])).toBe(Status.MOVEOK);
    }

    expect(chess.move("Qh4")).toBe(Status.CHECKMATE);
});

test("full game (stalemate)", () => {
    let chess = new Chess();

    let moves = [
        "e3",
        "a5",
        "Qh5",
        "Ra6",
        "Qxa5",
        "h5",
        "h4",
        "Rah6",
        "Qxc7",
        "f6",
        "Qxd7",
        "Kf7",
        "Qxb7",
        "Qd3",
        "Qxb8",
        "Qh7",
        "Qxc8",
        "Kg6",
        "Qe6",
    ];
    for (let i = 0; i < moves.length; i++) {
        if (moves[i] === "Qxd7") {
            expect(chess.move(moves[i])).toEqual(Status.CHECK);
        } else if (moves[i] === "Qe6") {
            expect(chess.move(moves[i])).toEqual(Status.STALEMATE);
        } else expect(chess.move(moves[i])).toEqual(Status.MOVEOK);
    }
});

test("draw (insufficient material)", () => {
    let chess = new Chess();
    let moves = [
        "e4",
        "d5",
        "exd5",
        "Qxd5",
        "Bd3",
        "Qxa2",
        "Bxh7",
        "Qxb1",
        "Bxg8",
        "Qxc2",
        "Bxf7",
        "Kxf7",
        "Rxa7",
        "Qxc1",
        "Rxb7",
        "Rxh2",
        "Rxb8",
        "Rxg2",
        "Qxc1",
        "Rxg1",
        "Rxg1",
        "Rxb8",
        "Qxc7",
        "Rxb2",
        "Qxc8",
        "Rxd2",
        "Qxf8",
        "Kxf8",
        "Rxg7",
        "Rxf2",
        "Rxe7",
        "Kxe7",
    ];

    for (let i = 0; i < moves.length; i++) {
        expect([Status.MOVEOK, Status.CHECK]).toContain(chess.move(moves[i]));
    }
    expect(chess.move("Kxf2")).toEqual(Status.INSUFFICIENTMATERIAL);
});

test.skip("draw (50 move rule)", () => {
    let chess = new Chess("rnbqkbnr//8/8/8/8//RNBQKBNR w KQkq - 45 1");

    let moves = ["Nf3", "Be6", "Nbd2", "Be7"];

    for (let i = 0; i < 25; i++) {
        expect(chess.move(moves[i])).toEqual(Status.MOVEOK);
    }
    expect(chess.move(moves[i])).toEqual(Status.FIFTYMOVERULE);
});

test("draw (threefold repetition)", () => {
    let chess = new Chess();

    let moves = ["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6"];

    for (let i = 0; i < moves.length; i++) {
        if (i === 8) {
            expect(chess.move(moves[i])).toBe(Status.THREEFOLDREPETITION);
            break;
        } else expect(chess.move(moves[i])).toBe(Status.MOVEOK);
    }
});
