import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Tile from '../components/Tile';
import ResultsModal from '../components/ResultsModal';
import { calculateMiniCrypticScore } from '../utils/wordUtils';

/**
 * Mini Cryptic Crossword Component
 * 5x5 or 4x4 grid with keyboard navigation and validation
 */
export default function MiniCryptic({
  gridData = generateDefaultGrid(),
  clues = {},
  onScoreChange,
  onComplete,
  addToast,
}) {
  const navigate = useNavigate();
  
  // Game state
  const [grid, setGrid] = useState(gridData);
  const [userAnswers, setUserAnswers] = useState(
    Array(grid.length).fill(null).map(() => Array(grid[0].length).fill(''))
  );
  const [activeCell, setActiveCell] = useState({ row: 0, col: 0 });
  const [activeDirection, setActiveDirection] = useState('across');
  const [submitted, setSubmitted] = useState(false);
  const [mistakes, setMistakes] = useState(new Set());
  const [showResults, setShowResults] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  
  // Timestamp tracking
  const startTimeRef = useRef(Date.now());
  const [duration, setDuration] = useState(0);

  // Timer for display
  useEffect(() => {
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Find cells for current word (across or down from active cell)
  const getCurrentWordCells = useCallback(() => {
    const cells = [];
    const { row, col } = activeCell;
    
    if (activeDirection === 'across') {
      let c = col;
      // Move to start of word
      while (c > 0 && grid[row][c - 1]?.letter) c--;
      // Collect cells
      while (c < grid[row].length && grid[row][c]?.letter) {
        cells.push({ row, col: c });
        c++;
      }
    } else {
      let r = row;
      // Move to start of word
      while (r > 0 && grid[r - 1][col]?.letter) r--;
      // Collect cells
      while (r < grid.length && grid[r][col]?.letter) {
        cells.push({ row: r, col });
        r++;
      }
    }
    
    return cells;
  }, [activeCell, activeDirection, grid]);

  // Find next cell in direction
  const findNextCell = useCallback((currentRow, currentCol, direction) => {
    const { row: r, col: c } = activeCell;
    
    if (direction === 'across') {
      for (let col = c + 1; col < grid[0].length; col++) {
        if (grid[r][col]?.letter) return { row: r, col };
      }
      return { row: r, col: c };
    } else {
      for (let row = r + 1; row < grid.length; row++) {
        if (grid[row][c]?.letter) return { row, col: c };
      }
      return { row: r, col: c };
    }
  }, [activeCell, grid]);

  // Keyboard event handler
  useEffect(() => {
    function handleKeyDown(e) {
      if (submitted) return;

      const { row, col } = activeCell;
      const char = e.key.toUpperCase();

      // Letter input
      if (/^[A-Z]$/.test(char)) {
        e.preventDefault();
        const newAnswers = userAnswers.map(r => [...r]);
        newAnswers[row][col] = char;
        setUserAnswers(newAnswers);
        
        // Auto-advance to next cell
        const wordCells = getCurrentWordCells();
        const currentIndex = wordCells.findIndex(c => c.row === row && c.col === col);
        if (currentIndex < wordCells.length - 1) {
          const nextCell = wordCells[currentIndex + 1];
          setActiveCell(nextCell);
        }
      }
      // Backspace
      else if (e.key === 'Backspace') {
        e.preventDefault();
        const newAnswers = userAnswers.map(r => [...r]);
        if (newAnswers[row][col]) {
          newAnswers[row][col] = '';
          setUserAnswers(newAnswers);
        } else {
          // Move to previous cell if current is empty
          const wordCells = getCurrentWordCells();
          const currentIndex = wordCells.findIndex(c => c.row === row && c.col === col);
          if (currentIndex > 0) {
            const prevCell = wordCells[currentIndex - 1];
            setActiveCell(prevCell);
            newAnswers[prevCell.row][prevCell.col] = '';
            setUserAnswers(newAnswers);
          }
        }
      }
      // Arrow keys for navigation
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        let newRow = row - 1;
        while (newRow >= 0 && !grid[newRow][col]?.letter) newRow--;
        if (newRow >= 0) setActiveCell({ row: newRow, col });
      }
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        let newRow = row + 1;
        while (newRow < grid.length && !grid[newRow][col]?.letter) newRow++;
        if (newRow < grid.length) setActiveCell({ row: newRow, col });
      }
      else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        let newCol = col - 1;
        while (newCol >= 0 && !grid[row][newCol]?.letter) newCol--;
        if (newCol >= 0) setActiveCell({ row, col: newCol });
      }
      else if (e.key === 'ArrowRight') {
        e.preventDefault();
        let newCol = col + 1;
        while (newCol < grid[0].length && !grid[row][newCol]?.letter) newCol++;
        if (newCol < grid[0].length) setActiveCell({ row, col: newCol });
      }
      // Tab to toggle direction
      else if (e.key === 'Tab') {
        e.preventDefault();
        setActiveDirection(d => d === 'across' ? 'down' : 'across');
      }
      // Enter to submit
      else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCell, activeDirection, userAnswers, submitted, grid, getCurrentWordCells]);

  // Handle grid cell click
  const handleCellClick = (row, col) => {
    if (grid[row][col]?.letter) {
      if (activeCell.row === row && activeCell.col === col) {
        // Toggle direction on same cell click
        setActiveDirection(d => d === 'across' ? 'down' : 'across');
      } else {
        setActiveCell({ row, col });
      }
    }
  };

  // Validate and submit
  const handleSubmit = () => {
    if (submitted) return;

    let numCorrect = 0;
    let numTotal = 0;
    const newMistakes = new Set();

    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col]?.letter) {
          numTotal++;
          const answer = userAnswers[row][col];
          const correct = grid[row][col].letter.toUpperCase();
          
          if (answer.toUpperCase() === correct) {
            numCorrect++;
          } else {
            newMistakes.add(`${row}-${col}`);
          }
        }
      }
    }

    setMistakes(newMistakes);
    setSubmitted(true);

    const perfectPlay = newMistakes.size === 0;
    const score = calculateMiniCrypticScore(100, duration, perfectPlay);

    const result = {
      gameName: 'Mini Cryptic',
      score,
      timeSeconds: duration,
      perfect: perfectPlay,
      correct: numCorrect,
      total: numTotal,
    };

    setGameResult(result);
    setShowResults(true);

    // Trigger score update
    if (onScoreChange) {
      onScoreChange(score);
    }
  };

  // Handle results modal close
  const handleResultsClose = () => {
    setShowResults(false);
    // Navigate back to home after a delay
    setTimeout(() => {
      navigate('/', { state: { gameResult } });
    }, 500);
  };

  // Get current word clue
  const getCurrentClue = () => {
    const wordCells = getCurrentWordCells();
    if (wordCells.length === 0) return '';
    
    const firstCell = wordCells[0];
    const clueKey = `${firstCell.row}-${firstCell.col}-${activeDirection}`;
    return clues[clueKey] || 'No clue available';
  };

  // Render timer
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const wordCells = getCurrentWordCells();

  return (
    <div className="animate-rise-in">
      <div className="mb-6 flex justify-between items-center">
        <div className="text-sm text-zinc-600">
          <span className="font-mono">{formatTime(duration)}</span>
        </div>
        <div className="text-sm text-zinc-500">
          {submitted && mistakes.size === 0 ? (
            <span className="text-green-600 font-medium">Perfect!</span>
          ) : submitted ? (
            <span className="text-orange-600 font-medium">
              {grid.length * grid[0].length - mistakes.size} / {grid.length * grid[0].length} correct
            </span>
          ) : (
            <span>Arrow keys to navigate • Tab for direction • Enter to submit</span>
          )}
        </div>
      </div>

      {/* Grid */}
      <motion.div
        className="mb-6 flex justify-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="inline-block">
          {grid.map((gridRow, rowIdx) => (
            <div key={rowIdx} className="flex gap-1">
              {gridRow.map((cell, colIdx) => {
                const isActive = activeCell.row === rowIdx && activeCell.col === colIdx;
                const isInWord = wordCells.some(c => c.row === rowIdx && c.col === colIdx);
                const isMistake = submitted && mistakes.has(`${rowIdx}-${colIdx}`);
                const answer = userAnswers[rowIdx][colIdx];
                const isCorrect = submitted && answer.toUpperCase() === cell.letter.toUpperCase();

                if (!cell?.letter) {
                  return (
                    <div
                      key={colIdx}
                      className="w-12 h-12 bg-zinc-900 rounded-sm"
                    />
                  );
                }

                return (
                  <motion.div
                    key={colIdx}
                    onClick={() => handleCellClick(rowIdx, colIdx)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Tile
                      letter={answer}
                      state={
                        !submitted ? 'empty' :
                        isCorrect ? 'correct' :
                        isMistake ? 'absent' : 'present'
                      }
                      disabled={submitted}
                      isActive={isActive}
                    />
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Clue Display */}
      <motion.div
        className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-sm font-medium text-blue-900 mb-1">
          {activeDirection.charAt(0).toUpperCase() + activeDirection.slice(1)}
        </div>
        <div className="text-base text-blue-800">
          {getCurrentClue()}
        </div>
      </motion.div>

      {/* Submit Button */}
      {!submitted && (
        <motion.div
          className="flex justify-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-zinc-900 text-white rounded-lg font-medium transition-all hover:bg-zinc-800 active:scale-95"
          >
            Submit Puzzle
          </button>
        </motion.div>
      )}

      {/* Results Modal */}
      <ResultsModal
        isOpen={showResults}
        onClose={handleResultsClose}
        gameResult={gameResult}
      />
    </div>
  );
}

/**
 * Generate default 5x5 crossword grid
 * Structure: { letter: string, direction: string, clueId: string }
 */
function generateDefaultGrid() {
  return [
    [
      { letter: 'S', direction: 'both' },
      { letter: 'T', direction: 'both' },
      null,
      { letter: 'A', direction: 'both' },
      { letter: 'R', direction: 'both' },
    ],
    [
      { letter: 'T', direction: 'both' },
      null,
      { letter: 'R', direction: 'both' },
      { letter: 'E', direction: 'both' },
      { letter: 'E', direction: 'both' },
    ],
    [
      null,
      { letter: 'A', direction: 'both' },
      { letter: 'I', direction: 'both' },
      { letter: 'S', direction: 'both' },
      null,
    ],
    [
      { letter: 'C', direction: 'both' },
      { letter: 'R', direction: 'both' },
      { letter: 'O', direction: 'both' },
      { letter: 'W', direction: 'both' },
      { letter: 'S', direction: 'both' },
    ],
    [
      { letter: 'L', direction: 'both' },
      null,
      { letter: 'W', direction: 'both' },
      { letter: 'E', direction: 'both' },
      { letter: 'D', direction: 'both' },
    ],
  ];
}
