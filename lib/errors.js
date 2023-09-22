class InvalidFENException extends Error {
    constructor() {
        super('Invalid FEN string');
        this.name = this.constructor.name;
    }
}

module.exports = {InvalidFENException};
