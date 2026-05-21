export function getFeedback(guess, target) {
  const g = guess.toUpperCase(); const t = target.toUpperCase();
  const feedback = Array(g.length).fill("gray");
  const counts = {};
  for (let i=0;i<t.length;i++){ if (g[i]!==t[i]) counts[t[i]] = (counts[t[i]]||0)+1; }
  for (let i=0;i<g.length;i++) if (g[i]===t[i]) feedback[i] = "green";
  for (let i=0;i<g.length;i++){ if (feedback[i]==='green') continue; const ch = g[i]; if (counts[ch]){ feedback[i] = 'yellow'; counts[ch]--; } }
  return feedback;
}

/**
 * Calculate score for Mini Cryptic game
 * @param {number} baseScore - Starting score (usually 100)
 * @param {number} durationSeconds - Time taken in seconds
 * @param {boolean} perfectPlay - Whether all answers were correct on first try
 * @returns {number} Final score
 */
export function calculateMiniCrypticScore(baseScore = 100, durationSeconds, perfectPlay = false) {
  let score = baseScore;
  
  // Time multiplier: faster = higher score (100 * 60) / durationSeconds
  const timeMultiplier = Math.max(0.5, (100 * 60) / (durationSeconds || 1));
  score = Math.round(score * timeMultiplier);
  
  // Bonus for perfect play (no mistakes)
  if (perfectPlay) {
    score += 50;
  }
  
  return Math.round(score);
}

/**
 * Calculate score for Street Scrabble game
 * @param {number} wordCount - Number of valid words found
 * @param {number} durationSeconds - Time spent
 * @param {number} totalTimeLimit - Total time available (default 180s)
 * @returns {number} Final score
 */
export function calculateStreetScrabbleScore(wordCount = 0, durationSeconds, totalTimeLimit = 180) {
  // Base: each valid word = 10 points
  let score = wordCount * 10;
  
  // Time bonus: (remainingSeconds / totalSeconds) * 50
  const remainingSeconds = Math.max(0, totalTimeLimit - durationSeconds);
  const timeBonus = Math.round((remainingSeconds / totalTimeLimit) * 50);
  score += timeBonus;
  
  return Math.round(score);
}

/**
 * Format milliseconds to "1m 23s" format
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} Formatted time string
 */
export function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

/**
 * Extract word positions from a Scrabble-style board state
 * Returns arrays of horizontal and vertical words
 * @param {Array} boardState - Array of { row, col, letter } placements
 * @returns {Object} { horizontalWords: [...], verticalWords: [...] }
 */
export function getWordPositions(boardState) {
  if (!boardState || boardState.length === 0) {
    return { horizontalWords: [], verticalWords: [] };
  }

  // Group cells by row for horizontal words
  const rowMap = {};
  boardState.forEach(({ row, col, letter }) => {
    if (!rowMap[row]) rowMap[row] = [];
    rowMap[row].push({ col, letter });
  });

  // Group cells by column for vertical words
  const colMap = {};
  boardState.forEach(({ row, col, letter }) => {
    if (!colMap[col]) colMap[col] = [];
    colMap[col].push({ row, letter });
  });

  // Extract horizontal words (sequences in same row)
  const horizontalWords = [];
  Object.entries(rowMap).forEach(([row, cells]) => {
    const sorted = cells.sort((a, b) => a.col - b.col);
    let currentWord = [];
    let currentStartCol = sorted[0].col;

    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].col !== sorted[i - 1].col + 1) {
        // Gap detected, save current word if length > 1
        if (currentWord.length > 1) {
          horizontalWords.push({
            word: currentWord.map(c => c.letter).join(''),
            row: parseInt(row),
            startCol: currentStartCol,
            direction: 'across',
          });
        }
        currentWord = [];
        currentStartCol = sorted[i].col;
      }
      currentWord.push(sorted[i]);
    }

    // Save last word if length > 1
    if (currentWord.length > 1) {
      horizontalWords.push({
        word: currentWord.map(c => c.letter).join(''),
        row: parseInt(row),
        startCol: currentStartCol,
        direction: 'across',
      });
    }
  });

  // Extract vertical words (sequences in same column)
  const verticalWords = [];
  Object.entries(colMap).forEach(([col, cells]) => {
    const sorted = cells.sort((a, b) => a.row - b.row);
    let currentWord = [];
    let currentStartRow = sorted[0].row;

    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].row !== sorted[i - 1].row + 1) {
        // Gap detected, save current word if length > 1
        if (currentWord.length > 1) {
          verticalWords.push({
            word: currentWord.map(c => c.letter).join(''),
            col: parseInt(col),
            startRow: currentStartRow,
            direction: 'down',
          });
        }
        currentWord = [];
        currentStartRow = sorted[i].row;
      }
      currentWord.push(sorted[i]);
    }

    // Save last word if length > 1
    if (currentWord.length > 1) {
      verticalWords.push({
        word: currentWord.map(c => c.letter).join(''),
        col: parseInt(col),
        startRow: currentStartRow,
        direction: 'down',
      });
    }
  });

  return { horizontalWords, verticalWords };
}
