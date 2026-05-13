import React from "react";
import { Trophy, X } from "lucide-react";

export default function Leaderboard({ open, onClose, entries = [], currentUserId }) {
  return (
    <div className={`fixed top-0 right-0 h-full w-full md:w-96 bg-white shadow-2xl transform transition-transform ${open ? "translate-x-0" : "translate-x-full"} z-50`}>
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-zinc-700" />
          <div className="font-serif text-lg">Leaderboard</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-2 rounded hover:bg-zinc-100"><X className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {entries.map((u) => (
          <div key={u.id} className={`flex items-center justify-between p-2 rounded ${u.id === currentUserId ? "bg-sky-50 border-l-2 border-sky-300" : "bg-white"}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center">{(u.username || u.name || "?")[0]}</div>
              <div>
                <div className="font-medium">{u.username || u.name}{u.id === currentUserId ? " (You)" : ""}</div>
                <div className="text-xs text-zinc-500">Rank #{u.rank}</div>
              </div>
            </div>
            <div className="text-sm font-medium">{u.score}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
