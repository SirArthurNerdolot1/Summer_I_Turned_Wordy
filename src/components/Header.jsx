import React from "react";
import { LayoutDashboard, LogOut, Trophy, User } from "lucide-react";

export default function Header({ todayLabel, userStreak, userName, onToggleLeaderboard, onLogout, onOpenAdmin, isAdmin }) {
  return (
    <header className="flex items-center justify-between gap-4 py-4">
      <div className="flex items-center gap-3">
        <div className="rounded-sm bg-zinc-900 text-white px-3 py-2 font-serif text-lg tracking-tight">ELS</div>
        <div className="text-zinc-600 text-sm hidden md:block">{todayLabel}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 bg-white border border-zinc-200 px-3 py-1 rounded-md shadow-sm text-sm text-zinc-700">
          <User className="w-4 h-4" />
          <span className="max-w-32 truncate">{userName}</span>
        </div>
        <div className="flex items-center gap-2 bg-white border border-zinc-200 px-3 py-1 rounded-md shadow-sm">
          <span className="text-sm">🔥</span>
          <span className="font-medium">{userStreak}</span>
        </div>
        <button className="p-2 rounded-md hover:bg-zinc-100" onClick={onToggleLeaderboard} aria-label="Leaderboard">
          <Trophy className="w-5 h-5 text-zinc-700" />
        </button>
        {isAdmin ? (
          <button className="p-2 rounded-md hover:bg-zinc-100" onClick={onOpenAdmin} aria-label="Admin dashboard">
            <LayoutDashboard className="w-5 h-5 text-zinc-700" />
          </button>
        ) : null}
        <button className="p-2 rounded-md hover:bg-zinc-100" onClick={onLogout} aria-label="Log out">
          <LogOut className="w-5 h-5 text-zinc-700" />
        </button>
      </div>
    </header>
  );
}
