import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ResultsModal from '../components/ResultsModal';
import { calculateStreetScrabbleScore, getWordPositions } from '../utils/wordUtils';
import { Trie } from '../utils/Trie';

const TOTAL_TIME = 180; // 3 minutes in seconds
const GRID_SIZE = 15;

/**
 * Street Scrabble Component
 * Drag-drop word placement game with timer and validation
 */
export default function StreetScrabble({
  letters = generateDefaultLetters(),
  validAnswers = getDefaultValidAnswers(),
  onScoreChange,
  onComplete,
  addToast,
}) {
  const navigate = useNavigate();

  // Game state
  const [letterBank, setLetterBank] = useState(letters);
  const [boardState, setBoardState] = useState([]); // { row, col, letter, id }
  const [timeRemaining, setTimeRemaining] = useState(TOTAL_TIME);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  
  // Trie for word validation
  const trieRef = useRef(new Trie(validAnswers));
  
  // Timestamp tracking
  const startTimeRef = useRef(Date.now());
  const pausedAtRef = useRef(null);

  // Timer effect
  useEffect(() => {
    if (gameOver || isPaused) return;

    const interval = setInterval(() => {
      setTimeRemaining(t => {
        if (t <= 1) {
          setGameOver(true);
          handleAutoSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameOver, isPaused]);

  // Validate words on board
  const validateWords = useCallback(() => {
    const { horizontalWords, verticalWords } = getWordPositions(boardState);
    const validWords = [];
    const invalidPositions = new Set();

    [...horizontalWords, ...verticalWords].forEach(wordData => {
      if (trieRef.current.search(wordData.word)) {
        validWords.push(wordData);
      } else {
        // Mark positions as invalid
        if (wordData.direction === 'across') {
          for (let i = 0; i < wordData.word.length; i++) {
            invalidPositions.add(`${wordData.row}-${wordData.startCol + i}`);
          }
        } else {
          for (let i = 0; i < wordData.word.length; i++) {
            invalidPositions.add(`${wordData.startRow + i}-${wordData.col}`);
          }
        }
      }
    });

    return { validWords, invalidPositions };
  }, [boardState]);

  // Handle letter drag from bank
  const handleDragStart = (e, letterId) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ letterId, source: 'bank' }));
  };

  // Handle cell drag-over
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle cell drop
  const handleCellDrop = (e, row, col) => {
    e.preventDefault();
    
    if (gameOver) return;

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const { letterId, source } = data;

      if (source === 'bank') {
        // Moving from bank to board
        const letter = letterBank.find(l => l.id === letterId);
        if (!letter) return;

        // Check if cell already occupied
        if (boardState.some(b => b.row === row && b.col === col)) {
          addToast?.('Cell is occupied', 'error');
          return;
        }

        // Place on board
        setBoardState([...boardState, { row, col, letter: letter.char, id: letterId }]);
        setLetterBank(letterBank.filter(l => l.id !== letterId));
      } else if (source === 'board') {
        // Moving from board to board (rearrange)
        const piece = boardState.find(b => b.id === letterId);
        if (!piece) return;

        // Check if destination is empty
        const isOccupied = boardState.some(b => b.row === row && b.col === col && b.id !== letterId);
        if (isOccupied) {
          addToast?.('Cell is occupied', 'error');
          return;
        }

        setBoardState(
          boardState.map(b =>
            b.id === letterId ? { ...b, row, col } : b
          )
        );
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  // Handle piece drag from board
  const handleBoardDragStart = (e, pieceId) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ letterId: pieceId, source: 'board' }));
  };

  // Handle piece drop back to bank
  const handleBankDrop = (e, bankIndex) => {
    e.preventDefault();
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const { letterId, source } = data;

      if (source === 'board') {
        const piece = boardState.find(b => b.id === letterId);
        if (!piece) return;

        // Return to bank
        setBoardState(boardState.filter(b => b.id !== letterId));
        setLetterBank([...letterBank, { id: letterId, char: piece.letter }]);
      }
    } catch (err) {
      console.error('Bank drop error:', err);
    }
  };

  // Calculate final score
  const calculateFinalScore = () => {
    const { validWords } = validateWords();
    const timeSpent = Math.max(1, TOTAL_TIME - timeRemaining);
    const score = calculateStreetScrabbleScore(validWords.length, timeSpent, TOTAL_TIME);
    return { score, validWordCount: validWords.length };
  };

  // Handle auto-submit on timer expiration
  const handleAutoSubmit = () => {
    const { score, validWordCount } = calculateFinalScore();
    const timeSpent = TOTAL_TIME - timeRemaining;

    const result = {
      gameName: 'Street Scrabble',
      score,
      timeSeconds: timeSpent,
      validWordCount,
      perfect: letterBank.length === 0,
    };

    setGameResult(result);
    setShowResults(true);

    if (onScoreChange) {
      onScoreChange(score);
    }
  };

  // Manual submit
  const handleSubmit = () => {
    setGameOver(true);
    handleAutoSubmit();
  };

  // Handle pause toggle
  const handlePauseToggle = () => {
    if (gameOver) return;
    
    if (isPaused) {
      // Resume
      const pausedDuration = Date.now() - pausedAtRef.current;
      startTimeRef.current += pausedDuration;
      setIsPaused(false);
    } else {
      // Pause
      pausedAtRef.current = Date.now();
      setIsPaused(true);
    }
  };

  // Handle results modal close
  const handleResultsClose = () => {
    setShowResults(false);
    setTimeout(() => {
      navigate('/', { state: { gameResult } });
    }, 500);
  };

  const { validWords, invalidPositions } = validateWords();
  const timerColor = timeRemaining <= 30 ? 'text-red-600' : timeRemaining <= 60 ? 'text-yellow-600' : 'text-zinc-600';

  return (
    <div className="animate-rise-in">
      {/* Header with Timer */}
      <div className="mb-6 flex justify-between items-center">
        <div className={`text-3xl font-mono font-bold ${timerColor}`}>
          {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
        </div>
        
        <div className="flex gap-3">
          {!gameOver && (
            <motion.button
              onClick={handlePauseToggle}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isPaused
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-yellow-500 hover:bg-yellow-600 text-white'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </motion.button>
          )}
          
          {!gameOver && (
            <motion.button
              onClick={handleSubmit}
              className="px-4 py-2 bg-zinc-900 text-white rounded-lg font-medium transition-all hover:bg-zinc-800"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Submit
            </motion.button>
          )}
        </div>
      </div>

      {/* Info bar */}
      <div className="mb-6 flex justify-between text-sm text-zinc-600">
        <div>Valid words: {validWords.length}</div>
        <div>Tiles used: {boardState.length} / {boardState.length + letterBank.length}</div>
        <div>Score: {calculateFinalScore().score}</div>
      </div>

      {/* Main game area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* Board */}
        <div className="lg:col-span-3">
          <motion.div
            className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 inline-block"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(28px, 1fr))` }}>
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
                const row = Math.floor(idx / GRID_SIZE);
                const col = idx % GRID_SIZE;
                const piece = boardState.find(b => b.row === row && b.col === col);
                const isInvalidWord = piece && invalidPositions.has(`${row}-${col}`);
                const isValidWord = piece && !isInvalidWord;

                return (
                  <motion.div
                    key={idx}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleCellDrop(e, row, col)}
                    className={`w-7 h-7 border ${
                      (row + col) % 2 === 0 ? 'bg-amber-100' : 'bg-amber-50'
                    } border-amber-300 flex items-center justify-center cursor-move relative text-xs font-bold`}
                    whileHover={{ scale: 1.1 }}
                  >
                    {piece ? (
                      <motion.div
                        draggable
                        onDragStart={(e) => handleBoardDragStart(e, piece.id)}
                        className={`w-6 h-6 rounded flex items-center justify-center text-white cursor-grab active:cursor-grabbing transition-colors ${
                          isValidWord ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        whileHover={{ scale: 1.15 }}
                        whileDrag={{ scale: 1.2, zIndex: 50 }}
                      >
                        {piece.letter}
                      </motion.div>
                    ) : (
                      <div className="text-xs text-amber-300">•</div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Letter Bank */}
        <motion.div
          className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="text-sm font-medium text-blue-900 mb-3">Letter Bank</div>
          <div
            onDragOver={handleDragOver}
            onDrop={(e) => handleBankDrop(e, 0)}
            className="min-h-[300px] bg-white border-2 border-dashed border-blue-300 rounded p-3 flex flex-wrap gap-2 content-start"
          >
            {letterBank.length === 0 ? (
              <div className="text-sm text-blue-500 w-full text-center py-6">No tiles</div>
            ) : (
              letterBank.map(letter => (
                <motion.div
                  key={letter.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, letter.id)}
                  className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-lg flex items-center justify-center font-bold cursor-grab active:cursor-grabbing shadow-md hover:shadow-lg transition-all"
                  whileHover={{ scale: 1.1 }}
                  whileDrag={{ scale: 1.15, rotate: 5, zIndex: 50 }}
                  animate={{ rotate: 0 }}
                >
                  {letter.char}
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Valid Words List */}
      {validWords.length > 0 && (
        <motion.div
          className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-sm font-medium text-green-900 mb-2">Valid Words ({validWords.length})</div>
          <div className="flex flex-wrap gap-2">
            {validWords.map((word, idx) => (
              <motion.span
                key={idx}
                className="px-3 py-1 bg-green-200 text-green-900 rounded-full text-sm font-medium"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                {word.word}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Pause Overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-lg p-8 text-center"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              <h2 className="font-serif text-2xl mb-4">Game Paused</h2>
              <p className="text-zinc-600 mb-6">Press Resume to continue</p>
              <motion.button
                onClick={handlePauseToggle}
                className="px-6 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Resume
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
 * Generate default letters for the game
 */
function generateDefaultLetters() {
  const letters = ['E', 'A', 'R', 'O', 'I', 'U', 'T', 'N', 'S', 'H', 'D', 'L'];
  return letters.map((char, idx) => ({ id: `letter-${idx}`, char }));
}

/**
 * Default valid answers for demonstration
 */
function getDefaultValidAnswers() {
  return [
    'STAR', 'STARE', 'RATE', 'RATS', 'RAT', 'TEARS', 'TEAR', 'TAR', 'TRES',
    'SEAT', 'SEAT', 'EATS', 'EAT', 'ATE', 'ART', 'ARTS', 'ARTS', 'HARD',
    'HARE', 'HATE', 'HEAD', 'HEAT', 'HEAR', 'SHEAR', 'SHARE', 'SHAD', 'SHED',
    'ROAD', 'ROADS', 'TOAD', 'TOADS', 'LOAD', 'LOADS', 'DEAL', 'DEALT', 'SEAL',
    'THREAD', 'DREAD', 'THREAD', 'HATE', 'HATED', 'DATED', 'DATE', 'HAND', 'HANDS',
    'AND', 'AND', 'SAND', 'STAND', 'STRAND', 'SUN', 'RUNS', 'RUN', 'STUN', 'SHUN',
    'HUT', 'SHUT', 'SLUT', 'SLUT', 'NUT', 'NUTS', 'BUT', 'BUTS', 'TAN', 'TANS',
    'DAN', 'DANS', 'RANT', 'RANTS', 'GRANT', 'GRANTS', 'TERN', 'TERNS', 'STERN', 'TEAS',
    'SEA', 'SEAS', 'SEAR', 'SEARS', 'DEAR', 'DEARS', 'NEAR', 'NEARS', 'HEAR', 'HEARS',
  ];
}
