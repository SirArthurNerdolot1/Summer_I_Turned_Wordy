import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Feather, Grid3x3, Link as LinkIcon } from "lucide-react";

export default function HomePage({ authUser, userScore, hasPlayedToday, isAdmin }) {
  const navigate = useNavigate();
  const [hoveredGame, setHoveredGame] = useState(null);

  const games = [
    {
      id: "pyramid",
      name: "Word Pyramid",
      description: "A stacked Wordle variant for vocabulary building.",
      icon: Feather,
      color: "from-blue-500 to-blue-600",
      delay: 0,
    },
    {
      id: "cryptic",
      name: "Clear Cryptics",
      description: "Mini cryptic-style crossword for ELS learners.",
      icon: Grid3x3,
      color: "from-purple-500 to-purple-600",
      delay: 0.1,
    },
    {
      id: "connections",
      name: "Connections",
      description: "Daily word grouping with four themed sets.",
      icon: LinkIcon,
      color: "from-green-500 to-green-600",
      delay: 0.2,
    },
  ];

  const handleGameClick = (gameId) => {
    navigate(`/game/${gameId}`);
  };

  return (
    <div>
      <h2 className="font-serif text-2xl mb-3">Play</h2>
      <p className="mb-6 text-sm text-zinc-600">
        Signed in as {authUser.username}. Your score is stored in the backend
        and shown on the leaderboard.
      </p>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {games.map((game) => {
          const Icon = game.icon;
          return (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: game.delay,
                ease: "easeOut",
              }}
              onHoverStart={() => setHoveredGame(game.id)}
              onHoverEnd={() => setHoveredGame(null)}
              onClick={() => handleGameClick(game.id)}
              className="cursor-pointer"
            >
              <motion.div
                className="relative rounded-lg border border-zinc-200 bg-white overflow-hidden h-full p-6 shadow-sm"
                animate={{
                  y: hoveredGame === game.id ? -8 : 0,
                  boxShadow:
                    hoveredGame === game.id
                      ? "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
                      : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                }}
                transition={{ duration: 0.3 }}
              >
                {/* Background gradient accent */}
                <div
                  className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${game.color} opacity-10 rounded-full blur-3xl -mr-10 -mt-10`}
                />

                {/* Content */}
                <div className="relative z-10 flex flex-col h-full">
                  {/* Icon */}
                  <motion.div
                    className={`w-12 h-12 rounded-lg bg-gradient-to-br ${game.color} text-white flex items-center justify-center mb-4`}
                    animate={{
                      scale: hoveredGame === game.id ? 1.1 : 1,
                      rotate: hoveredGame === game.id ? 5 : 0,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <Icon size={24} />
                  </motion.div>

                  {/* Text */}
                  <h3 className="font-serif text-xl font-semibold text-zinc-900 mb-2">
                    {game.name}
                  </h3>
                  <p className="text-sm text-zinc-600 mb-4 flex-grow">
                    {game.description}
                  </p>

                  {/* CTA Button */}
                  <motion.button
                    className={`w-full py-2 px-4 rounded-md font-semibold text-sm transition-colors bg-gradient-to-r ${game.color} text-white`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Play Now
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Admin Panel */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          onHoverStart={() => setHoveredGame("admin")}
          onHoverEnd={() => setHoveredGame(null)}
          onClick={() => navigate("/admin")}
          className="cursor-pointer mb-8"
        >
          <motion.div
            className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm overflow-hidden"
            animate={{
              y: hoveredGame === "admin" ? -8 : 0,
              boxShadow:
                hoveredGame === "admin"
                  ? "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
                  : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative flex items-center justify-between">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500 to-orange-600 opacity-10 rounded-full blur-3xl -mr-16 -mt-16" />
              <div className="relative z-10">
                <h3 className="font-serif text-lg font-semibold text-zinc-900">
                  Admin Dashboard
                </h3>
                <p className="text-sm text-zinc-600">
                  Publish daily puzzles and review platform stats.
                </p>
              </div>
              <motion.button
                className="relative z-10 px-6 py-2 rounded-md font-semibold text-sm bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Manage
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* User Stats */}
      <div>
        <h3 className="font-serif text-xl mb-4">Your Stats</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            className="bg-white border border-zinc-200 rounded-lg p-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <p className="text-sm text-zinc-600 mb-2">Total Score</p>
            <motion.div
              className="text-4xl font-bold text-blue-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.3 }}
            >
              {userScore}
            </motion.div>
          </motion.div>

          <motion.div
            className="bg-white border border-zinc-200 rounded-lg p-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <p className="text-sm text-zinc-600 mb-2">Played Today</p>
            <div className="text-4xl font-bold">
              {hasPlayedToday ? (
                <motion.span
                  className="text-green-600"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.7 }}
                >
                  ✓
                </motion.span>
              ) : (
                <span className="text-zinc-400">−</span>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
