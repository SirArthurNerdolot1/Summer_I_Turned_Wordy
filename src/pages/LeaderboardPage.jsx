import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getLocalDateKey } from "../utils/dateUtils";

export default function LeaderboardPage({ leaderboard = [], currentUserId }) {
  const [scope, setScope] = useState("daily"); // 'daily' | 'global'
  const [items, setItems] = useState(leaderboard);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchBoard() {
      setIsLoading(true);
      setError(null);

      try {
        const base = 
          scope === "daily"
            ? `/api/leaderboard/daily?date=${getLocalDateKey()}&limit=50&offset=0`
            : `/api/leaderboard/global?limit=50&offset=0`;

        const res = await fetch(base);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setItems(Array.isArray(data) ? data : data.items || []);
      } catch (err) {
        setError(err.message || "Failed to load leaderboard");
        // fallback to provided prop
        if (!cancelled) setItems(leaderboard || []);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchBoard();

    return () => {
      cancelled = true;
    };
  }, [scope, leaderboard]);

  return (
    <div>
      <h2 className="font-serif text-2xl mb-4">Leaderboard</h2>
      <p className="text-sm text-zinc-600 mb-6">
        Global rankings for "Summer I Turned Wordy" daily word games.
      </p>

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setScope("daily")}
          className={`px-3 py-1 rounded-md text-sm font-medium border transition-colors ${
            scope === "daily"
              ? "bg-sky-600 text-white border-sky-600"
              : "bg-white text-zinc-700 border-zinc-200"
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setScope("global")}
          className={`px-3 py-1 rounded-md text-sm font-medium border transition-colors ${
            scope === "global"
              ? "bg-sky-600 text-white border-sky-600"
              : "bg-white text-zinc-700 border-zinc-200"
          }`}
        >
          All-Time
        </button>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 shadow-sm p-4">
        {isLoading ? (
          <div className="text-sm text-zinc-500">Loading...</div>
        ) : (
          <div className="space-y-3">
            {items.map((u, idx) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: idx * 0.02 }}
                className={`flex items-center justify-between p-3 rounded ${
                  u.id === currentUserId
                    ? "bg-sky-50 border-l-2 border-sky-300"
                    : "bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center font-medium text-sm">
                    {(u.username || u.name || "?")[0]}
                  </div>
                  <div>
                    <div className="font-medium">
                      {u.username || u.name}
                      {u.id === currentUserId ? " (You)" : ""}
                    </div>
                    <div className="text-xs text-zinc-500">Rank #{u.rank}</div>
                  </div>
                </div>
                <div className="text-sm font-medium">{u.score}</div>
              </motion.div>
            ))}
            {items.length === 0 && (
              <div className="text-sm text-zinc-500">No results available.</div>
            )}
            {error && (
              <div className="text-sm text-red-600">Error: {error}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
