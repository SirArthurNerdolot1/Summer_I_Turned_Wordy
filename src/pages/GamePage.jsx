import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import WordPyramid from "../games/WordPyramid";
import ClearCryptics from "../games/ClearCryptics";
import ConnectionsGame from "../games/ConnectionsGame";

export default function GamePage({
  dailySessionKey,
  pyramidTargets,
  crypticSolution,
  crypticClues,
  dailyPuzzle,
  onScoreChange,
  onComplete,
  addToast,
}) {
  const { gameId } = useParams();
  const navigate = useNavigate();

  const gameConfig = {
    pyramid: {
      title: "Word Pyramid",
      subtitle: "Stacked word challenge",
    },
    cryptic: {
      title: "Clear Cryptics",
      subtitle: "4x4 ELS-friendly mini crossword",
    },
    connections: {
      title: "Connections",
      subtitle: "Group sixteen words into four clean sets",
    },
  };

  const config = gameConfig[gameId];

  if (!config) {
    return (
      <div className="text-center py-8">
        <h2 className="font-serif text-2xl mb-2">Game Not Found</h2>
        <p className="text-zinc-600 mb-4">This game doesn't exist.</p>
        <button
          onClick={() => navigate("/")}
          className="text-sm text-zinc-600 hover:underline"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl">{config.title}</h2>
        <div className="text-sm text-zinc-500">{config.subtitle}</div>
      </div>
      <div className="mt-4">
        {gameId === "pyramid" && (
          <WordPyramid
            key={dailySessionKey}
            targets={pyramidTargets}
            onScoreChange={onScoreChange}
            onComplete={onComplete}
            addToast={addToast}
          />
        )}
        {gameId === "cryptic" && (
          <ClearCryptics
            key={dailySessionKey}
            puzzle={dailyPuzzle}
            onSolve={() => {
              onScoreChange(300);
              onComplete();
            }}
            addToast={addToast}
            solutionWords={crypticSolution}
            cluesData={crypticClues}
            dailyHint={dailyPuzzle?.hint || ""}
          />
        )}
        {gameId === "connections" && (
          <ConnectionsGame
            key={dailySessionKey}
            puzzle={dailyPuzzle}
            onScoreChange={onScoreChange}
            onComplete={onComplete}
            addToast={addToast}
            dateKey={dailySessionKey}
          />
        )}
      </div>
      <div className="mt-6">
        <button
          onClick={() => navigate("/")}
          className="text-sm text-zinc-600 hover:underline"
        >
          Back
        </button>
      </div>
    </div>
  );
}
