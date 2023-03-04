const Chess = require('./lib/chess');
const AI = require('./lib/ai');

AI.mainFrame((new Chess()).toFEN());

