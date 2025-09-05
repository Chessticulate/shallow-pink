#!/usr/bin/env node
'use strict';

const Chess = require('../lib/chess');
const { perftRoot } = require('../lib/search_bb');

const depth = Number(process.argv[2] || 3);
const game = new Chess();

console.log(`perft(${depth}) = ${perftRoot(game.board, depth)}`);

