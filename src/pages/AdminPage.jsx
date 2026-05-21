import React from "react";
import AdminPanel from "../components/AdminPanel";

export default function AdminPage({
  stats,
  puzzles,
  users,
  onRefresh,
  onSubmitPuzzle,
  onSubmitUser,
  busy,
}) {
  return (
    <AdminPanel
      stats={stats}
      puzzles={puzzles}
      users={users}
      onRefresh={onRefresh}
      onSubmitPuzzle={onSubmitPuzzle}
      onSubmitUser={onSubmitUser}
      busy={busy}
    />
  );
}
