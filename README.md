# ShallowPink
Chess library written in Node.js for the chessticulate website.

## Features
- Fully implemented chess engine with board and piece representation, move validation, and gamestate tracking
- Rudimentary ai using minimax algorithm
- can be used as a library or run directly as a simple command line game 

## Setup
1. Clone repository: `git clone git@github.com:chessticulate/ShallowPink`
2. install packages: `npm install`

## Development tools
- Run linter: `npx eslint`
- Run tests: `npm test`

## CI
Whenever you push up a new branch, the github workflows located under `./.github/workflows/` will be triggered. These workflows as of now check for the following:
- there are no linter errors.
- all the tests pass.
- the version number located in package.json is greater than the one in the main branch.

Be sure to run the commands under "Development tools" before pushing up changes. Or at least if you want to be able to merge. If any of these checks are failing, you will not be able to merge with main.

## How to run
- move for both sides: `node .`
- set ai to play for a side: `node . --ai-white`

