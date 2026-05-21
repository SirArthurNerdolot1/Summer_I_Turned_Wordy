import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check } from "lucide-react";

/**
 * Results Modal with count-up animation for score
 * Props:
 *   - isOpen: boolean
 *   - onClose: function
 *   - gameResult: { gameName, score, timeSeconds, perfect }
 */
export default function ResultsModal({ isOpen, onClose, gameResult = {} }) {
  const [displayScore, setDisplayScore] = useState(0);
  const [copied, setCopied] = useState(false);

  const { gameName = "Game", score = 0, timeSeconds = 0, perfect = false } = gameResult;

  // Count-up animation for score
  useEffect(() => {
    if (!isOpen) return;

    setDisplayScore(0);
    let counter = 0;
    const targetScore = score;
    const duration = 1.5; // 1.5 seconds
    const steps = 60;
    const increment = targetScore / steps;
    const stepDuration = (duration * 1000) / steps;

    const timer = setInterval(() => {
      counter++;
      if (counter >= steps) {
        setDisplayScore(targetScore);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.round(counter * increment));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [isOpen, score]);

  // Format time as "1m 23s"
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  // Generate emoji grid (for Wordle-like games)
  const generateShareText = () => {
    const emoji = perfect ? "🟩🟩🟩\n🟩🟩🟩\n🟩🟩🟩\n🟩🟩🟩" : "🟨🟩🟨\n🟨🟩🟩\n🟩🟩🟩\n🟩🟩🟩";
    return `${gameName} - ${score} points\nTime: ${formatTime(timeSeconds)}\n\n${emoji}`;
  };

  const handleShare = async () => {
    const text = generateShareText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <motion.div
              className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-8"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <X size={24} />
              </button>

              {/* Celebration emoji (on perfect) */}
              {perfect && (
                <motion.div
                  className="text-6xl text-center mb-4"
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  🎉
                </motion.div>
              )}

              {/* Game name */}
              <h2 className="text-3xl font-serif text-center mb-2">{gameName}</h2>
              <p className="text-center text-zinc-500 mb-6">
                {perfect ? "Perfect score!" : "Great job!"}
              </p>

              {/* Score display with count-up animation */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6 text-center">
                <p className="text-sm text-zinc-600 mb-2">Final Score</p>
                <motion.div
                  className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600"
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  {displayScore}
                </motion.div>
              </div>

              {/* Time taken */}
              {timeSeconds > 0 && (
                <motion.div
                  className="text-center mb-6 text-zinc-600"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-sm mb-1">Time Taken</p>
                  <p className="text-xl font-semibold">{formatTime(timeSeconds)}</p>
                </motion.div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                {/* Share button with bounce effect */}
                <motion.button
                  onClick={handleShare}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors ${
                    copied
                      ? "bg-green-500 text-white"
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {copied ? (
                    <>
                      <Check size={18} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      Share
                    </>
                  )}
                </motion.button>

                {/* Close button */}
                <motion.button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-lg font-semibold border-2 border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
