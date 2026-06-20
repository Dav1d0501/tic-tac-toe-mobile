// Returns the winning symbol, Draw, or null if the game is still going
export const checkWinner = (board, size) => {

  for (let i = 0; i < size; i++) {
    const rowStart = i * size;
    const first = board[rowStart];

    if (!first) continue;

    let isWin = true;
    for (let j = 1; j < size; j++) {
      if (board[rowStart + j] !== first) {
        isWin = false;
        break;
      }
    }
    if (isWin) return first;
  }

  for (let i = 0; i < size; i++) {
    const first = board[i];
    if (!first) continue;

    let isWin = true;
    for (let j = 1; j < size; j++) {
      if (board[i + (j * size)] !== first) {
        isWin = false;
        break;
      }
    }
    if (isWin) return first;
  }

  let first = board[0];
  if (first) {
    let isWin = true;
    for (let i = 1; i < size; i++) {
      if (board[i * (size + 1)] !== first) {
        isWin = false;
        break;
      }
    }
    if (isWin) return first;
  }

  first = board[size - 1];
  if (first) {
    let isWin = true;
    for (let i = 1; i < size; i++) {
      if (board[(i + 1) * (size - 1)] !== first) {
        isWin = false;
        break;
      }
    }
    if (isWin) return first;
  }

  if (board.every(cell => cell !== null)) {
    return 'Draw';
  }

  return null;
};
