import { checkWinner } from './gameLogic';

// Picks the computer move, unbeatable on 3x3 hard and smart otherwise
export const getBestMove = (board, size, difficulty) => {
  if (size === 3 && difficulty === 'hard') {
    return getMinimaxMove(board, size);
  }

  return getHeuristicMove(board, size);
};

// Tries every move and scores it with minimax to find the best one
const getMinimaxMove = (board, size) => {
  let bestScore = -Infinity;
  let move = null;
  const availableMoves = getAvailableMoves(board);

  for (let i of availableMoves) {
    const boardCopy = [...board];
    boardCopy[i] = 'O';

    let score = minimax(boardCopy, 0, false, size);

    if (score > bestScore) {
      bestScore = score;
      move = i;
    }
  }
  return move;
};

// Recursively scores a board assuming both players play perfectly
const minimax = (board, depth, isMaximizing, size) => {
  const result = checkWinner(board, size);
  if (result === 'O') return 10 - depth;
  if (result === 'X') return depth - 10;
  if (result === 'Draw') return 0;

  const availableMoves = getAvailableMoves(board);

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (let i of availableMoves) {
      board[i] = 'O';
      let score = minimax(board, depth + 1, false, size);
      board[i] = null;
      bestScore = Math.max(score, bestScore);
    }
    return bestScore;
  } else {
    let bestScore = Infinity;
    for (let i of availableMoves) {
      board[i] = 'X';
      let score = minimax(board, depth + 1, true, size);
      board[i] = null;
      bestScore = Math.min(score, bestScore);
    }
    return bestScore;
  }
};

// Rule based move for big boards, win, block, center, then random
const getHeuristicMove = (board, size) => {
  const availableMoves = getAvailableMoves(board);
  if (availableMoves.length === 0) return null;

  for (let move of availableMoves) {
    const boardCopy = [...board];
    boardCopy[move] = 'O';
    if (checkWinner(boardCopy, size) === 'O') return move;
  }

  for (let move of availableMoves) {
    const boardCopy = [...board];
    boardCopy[move] = 'X';
    if (checkWinner(boardCopy, size) === 'X') return move;
  }

  const center = Math.floor((size * size) / 2);
  if (board[center] === null) return center;

  const randomIndex = Math.floor(Math.random() * availableMoves.length);
  return availableMoves[randomIndex];
};

// Returns the indexes of empty cells
const getAvailableMoves = (board) => {
  return board
    .map((val, idx) => (val === null ? idx : null))
    .filter((val) => val !== null);
};
