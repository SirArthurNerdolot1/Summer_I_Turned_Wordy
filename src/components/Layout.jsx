import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";

export default function Layout({ children, todayLabel, userStreak, userName, onLogout, isAdmin, onLeaderboardToggle }) {
  const navigate = useNavigate();

  const handleAdminClick = () => {
    navigate("/admin");
  };

  return (
    <>
      <div className="min-h-screen bg-zinc-50 text-slate-900 font-sans">
        <div className="max-w-4xl mx-auto p-4">
          <Header
            todayLabel={todayLabel}
            userStreak={userStreak}
            userName={userName}
            onToggleLeaderboard={onLeaderboardToggle}
            onLogout={onLogout}
            onOpenAdmin={handleAdminClick}
            isAdmin={isAdmin}
          />
          <main className="mt-4">
            {children}
          </main>
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t text-center py-2 text-xs text-zinc-500">
        Built with ❤️ for ELS learners
      </footer>
    </>
  );
}
