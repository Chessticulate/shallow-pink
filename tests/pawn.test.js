const Color = require("../lib/color");
const Pawn = require("../lib/pieces/pawn");
const King = require("../lib/pieces/king");
const Board = require("../lib/board");

// TODO
// Promotion, En Passant

test("pawn constructor", () => {
    let pawn = new Pawn(Color.WHITE, 0, 6);
    expect(pawn.color).toBe(Color.WHITE);
    expect(pawn.x).toBe(0);
    expect(pawn.y).toBe(6);
    expect(pawn.firstMove).toBe(true);
    expect(pawn.enPassantable).toBe(false);
});

test("pawn can only move forward 2 spaces on first move", () => {
    let board = new Board();
    let whitePawn = board.get(0, 6);

    expect(whitePawn.evaluate(board, 0, 4)).toBe(true);

    let blackPawn = board.get(3, 1);
    blackPawn.firstMove = false;

    expect(blackPawn.evaluate(board, 3, 3)).toBe(false);
});

test("pawn can only move forward onto empty spaces", () => {
    let board = new Board();
    let pawnAWhite = board.get(0, 6);
    let pawnABlack = board.get(0, 1);

    expect(pawnAWhite.evaluate(board, 0, 4)).toBe(true);
    expect(pawnABlack.evaluate(board, 0, 3)).toBe(true);

    board.set(0, 4, pawnAWhite);
    board.set(0, 3, pawnABlack);

    expect(pawnAWhite.evaluate(board, 0, 3)).toBe(false);
    expect(pawnABlack.evaluate(board, 0, 4)).toBe(false);
});

test("pawn can only move diagonally onto space occupied by opponent", () => {
    let board = new Board();
    let pawnBWhite = board.get(1, 6);
    let pawnBBlack = board.get(1, 1);

    expect(pawnBWhite.evaluate(board, 0, 5)).toBe(false);
    expect(pawnBBlack.evaluate(board, 0, 2)).toBe(false);

    board.set(0, 5, pawnBBlack);
    board.set(0, 2, pawnBWhite);

    expect(pawnBWhite.evaluate(board, 0, 5)).toBe(true);
    expect(pawnBBlack.evaluate(board, 0, 2)).toBe(true);
});

test("white pawns can only move up, black pawns can only move down", () => {
    let board = new Board();
    board.board = Array(8)
        .fill()
        .map(() => Array(8).fill(null));
    let pawnDBlack = new Pawn(Color.BLACK, 3, 1);
    let pawnDWhite = new Pawn(Color.WHITE, 3, 6);
    board.set(3, 1, pawnDBlack);
    board.set(3, 6, pawnDWhite);

    expect(pawnDBlack.evaluate(board, 3, 0)).toBe(false);
    expect(pawnDBlack.evaluate(board, 3, 2)).toBe(true);

    expect(pawnDWhite.evaluate(board, 3, 7)).toBe(false);
    expect(pawnDWhite.evaluate(board, 3, 5)).toBe(true);
});

test("en passant", () => {
    let board = new Board();
    board.board = Array(8)
        .fill()
        .map(() => Array(8).fill(null));

    let kingWhite = new King(Color.WHITE, 4, 7);
    board.set(4, 7, kingWhite);
    let pawnDWhite = new Pawn(Color.WHITE, 3, 4);
    board.set(3, 4, pawnDWhite);

    let kingBlack = new King(Color.BLACK, 4, 0);
    board.set(4, 0, kingBlack);
    let pawnEBlack = new Pawn(Color.BLACK, 4, 4);
    board.set(4, 4, pawnEBlack);

    pawnDWhite.enPassantable = false;
    expect(pawnEBlack.evaluate(board, 3, 5)).toBe(false);
    pawnDWhite.enPassantable = true;
    expect(pawnEBlack.evaluate(board, 3, 5)).toBe(true);
});

test("pawn flipPerspective", () => {
    const whitePawn = new Pawn(Color.WHITE, 0, 6);

    expect(whitePawn.x).toBe(0);
    expect(whitePawn.y).toBe(6);
    whitePawn.moveSet.forEach((move) => {
        expect(move[1] < 0).toBe(true);
    });

    whitePawn.flipPerspective();

    expect(whitePawn.x).toBe(7);
    expect(whitePawn.y).toBe(1);
    whitePawn.moveSet.forEach((move) => {
        expect(move[1] > 0).toBe(true);
    });
});
