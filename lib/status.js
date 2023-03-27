const Status = {
    // no errors occurred while carrying out the move
    MOVEOK: 'move ok',

    // invalid move, either because the piece
    // is incapable of the desired movement,
    // or because another piece impedes it.
    INVALIDMOVE: 'invalid move',

    // the desired move cannot be carried out
    // because it does not take the player out
    // of check.
    STILLINCHECK: 'player is still in check',

    // the desired move puts player in check
    PUTSINCHECK: 'move puts player in check',

    CHECK: 'check',

    // insufficient material, threefold repetition, 50 move rule
    INSUFFICIENTMATERIAL: 'insufficient material',
    THREEFOLDREPETITION: 'three-fold repetition',
    FIFTYMOVERULE: 'fifty-move rule',
    DRAW: 'draw',

    STALEMATE: 'stalemate',
    CHECKMATE: 'checkmate',

    // the game is over
    GAMEOVER: 'game over',

    // promotion state
    PROMOTION: 'promotion pending',

    // invalid promotion piece
    INVALIDPROMOTION: 'invalid piece type'
}

module.exports = Status;
