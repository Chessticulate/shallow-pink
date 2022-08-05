const Error = {
    // no errors occurred while carrying out the move
    MOVEOK: 'move ok',

    // piece with specified pieceId has either been taken or does not exist
    PIECENOTFOUND: 'piece not found',

    // the specified address does not exist
    INVALIDADDRESS: 'invalid address',

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

    STALEMATE: 'stalemate',
    CHECKMATE: 'checkmate',

    // the game is over
    GAMEOVER: 'game over',
}

module.exports = Error;
