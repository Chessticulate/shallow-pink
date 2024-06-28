'use strict';

const Chess = require('./lib/chess');
module.exports = Chess;

const blessed = require('blessed');

// Create a screen object.
const screen = blessed.screen({
  smartCSR: true
});

screen.title = 'Chess Board';

// Create a box to hold the board.
const box = blessed.box({
  top: 'center',
  left: 'center',
  width: '70%',
  height: '70%',
  content: '',
  tags: true,
  border: {
    type: 'line'
  },
  style: {
    fg: 'white',
    bg: 'black',
    border: {
      fg: '#f0f0f0'
    }
  }
});

// Create a prompt box to capture user input
const promptBox = blessed.textbox({
  bottom: 0,
  left: 'center',
  width: '70%',
  height: 3,
  border: {
    type: 'line'
  },
  style: {
    fg: 'white',
    bg: 'black',
    border: {
      fg: '#f0f0f0'
    }
  },
  inputOnFocus: true
});

// Append the boxes to the screen.
screen.append(box);
screen.append(promptBox);

function playChess() {
    const chess = new Chess();

    function renderBoard() {
        box.setContent(chess.toString());
        screen.render();
    }

    if (process.argv.includes('--ai-white')) {
        let move = chess.suggestMove(3);
        let result = chess.move(move);
        box.setContent(`AI move: ${move}, result: ${result}`);
    }

    renderBoard();

    screen.key(['escape', 'q', 'C-c'], (ch, key) => {
        return process.exit(0);
    });

    promptBox.on('submit', (line) => {
        if (chess.gameOver) {
            screen.destroy();
            return process.exit(0);
        }

        let result = chess.move(line);

        if (chess.gameOver) {
            renderBoard();
            screen.destroy();
            return process.exit(0);
        }

        box.setContent(result + '\n' + chess.toString());

        if (result === Chess.Status.MOVEOK || result === Chess.Status.CHECK) {
            if (process.argv.includes('--ai-black') || process.argv.includes('--ai-white')) {
                let move = chess.suggestMove(3);
                chess.move(move);
                box.setContent(box.getContent() + `\nAI move: ${move}`);
            }
        }

        renderBoard();
        promptBox.clearValue();
        promptBox.focus();
    });

    promptBox.focus();
    screen.render();
}

if (require.main === module) {
    playChess();
}

