'use strict';

const { performance } = require('node:perf_hooks');
const Chess = require('../lib/chess');
const AI = require('../lib/ai');

const depth = parseInt(process.argv[2] || '3', 10);
console.log('depth =', depth);

const game = new Chess();

const t0 = performance.now();
const best = AI.miniMaxBB ? AI.miniMaxBB(game, depth) : AI.miniMax(game, depth);
const t1 = performance.now();

console.log('AI move:', best);
console.log('best move: ', best);

const stats = AI.data || AI.dataBB || {};
const visited = stats.nodeCount ?? 0;
const pruned  = stats.prunedNodes ?? 0;
const memo    = stats.tptNodes ?? 0;

const elapsed = (t1 - t0) / 1000;
console.log('nodes visited: ', visited);
console.log('nodes pruned: ', pruned);
console.log('nodes memoized: ', memo);
console.log(`elapsed: ${elapsed.toFixed(9)}s`);
console.log('NPS:', visited ? visited / elapsed : 0);

