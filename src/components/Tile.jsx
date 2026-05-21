import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * NYT-style Tile component with 3D flip animations
 * Props:
 *   - letter: string (single character to display)
 *   - state: 'empty' | 'correct' | 'present' | 'absent'
 *   - onClick: function (called when tile is clicked)
 *   - disabled: boolean (prevents interaction)
 *   - isActive: boolean (triggers pop animation on typing)
 */
export default function Tile({ letter = "", state = "empty", onClick, disabled = false, isActive = false }) {
  const [isFlipping, setIsFlipping] = useState(false);
  const [displayState, setDisplayState] = useState(state);

  // Trigger flip animation when state changes
  useEffect(() => {
    if (state !== displayState) {
      setIsFlipping(true);
      const timer = setTimeout(() => {
        setDisplayState(state);
        setIsFlipping(false);
      }, 150); // Flip midpoint
      return () => clearTimeout(timer);
    }
  }, [state, displayState]);

  // Determine colors based on state
  const stateColors = {
    empty: {
      bg: "bg-white",
      border: "border-2 border-zinc-300",
      text: "text-zinc-900",
    },
    correct: {
      bg: "bg-green-500",
      border: "border-2 border-green-600",
      text: "text-white",
    },
    present: {
      bg: "bg-yellow-400",
      border: "border-2 border-yellow-500",
      text: "text-white",
    },
    absent: {
      bg: "bg-zinc-400",
      border: "border-2 border-zinc-500",
      text: "text-white",
    },
  };

  const colors = stateColors[displayState] || stateColors.empty;

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16
        rounded-md font-serif font-bold text-lg sm:text-xl lg:text-2xl
        ${colors.bg} ${colors.border} ${colors.text}
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center
        select-none
      `}
      // Entrance animation: scale in from 0.8
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      // Pop animation when typing (scale bounce)
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
    >
      {/* 3D flip animation container */}
      <motion.div
        animate={{
          rotateX: isFlipping ? 180 : 0,
        }}
        transition={{
          duration: 0.3,
          ease: "easeInOut",
        }}
        style={{ perspective: 1000 }}
      >
        <div
          style={{
            backfaceVisibility: "hidden",
          }}
        >
          {letter}
        </div>
      </motion.div>

      {/* Pop scale animation when isActive */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-md border-2 border-blue-400"
          initial={{ scale: 1, opacity: 1 }}
          animate={{ scale: 1.15, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      )}
    </motion.button>
  );
}
