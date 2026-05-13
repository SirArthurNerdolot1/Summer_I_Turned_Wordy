import React, { useEffect, useState } from "react";
import { CalendarDays, RefreshCcw, ShieldCheck, Sparkles } from "lucide-react";

const defaultForm = {
  date: new Date().toISOString().slice(0, 10),
  pyramidTargets: "RED, READ, TREAD, THREAD",
  crypticSolution: "THIS, HAVE, IVAN, SENT",
  crypticClues: "The thing here sounds like hiss with a T (4)\nTo possess, in a simple hidden-style clue (4)\nHidden inside arrIVAN (4)\nPast tense of send (4)",
  hint: "Focus on anagrams, homophones, and hidden words.",
};

const defaultUserForm = {
  email: "",
  username: "",
  password: "",
  role: "admin",
};

function StatCard({ label, value, sublabel }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-2 font-serif text-3xl text-zinc-950">{value}</div>
      {sublabel ? <div className="mt-1 text-xs text-zinc-500">{sublabel}</div> : null}
    </div>
  );
}

export default function AdminPanel({ stats, puzzles, users, onRefresh, onSubmitPuzzle, onSubmitUser, busy = false }) {
  const [form, setForm] = useState(defaultForm);
  const [userForm, setUserForm] = useState(defaultUserForm);
  const [message, setMessage] = useState("");
  const [userMessage, setUserMessage] = useState("");

  useEffect(() => {
    setForm((current) => ({ ...current, date: new Date().toISOString().slice(0, 10) }));
  }, []);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateUser = (field, value) => {
    setUserForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    const payload = {
      date: form.date,
      pyramidTargets: form.pyramidTargets.split(",").map((item) => item.trim()).filter(Boolean),
      crypticSolution: form.crypticSolution.split(",").map((item) => item.trim()).filter(Boolean),
      crypticClues: form.crypticClues.split("\n").map((item) => item.trim()).filter(Boolean),
      hint: form.hint,
    };
    await onSubmitPuzzle(payload);
    setMessage("Daily puzzle saved.");
  };

  const submitUser = async (event) => {
    event.preventDefault();
    setUserMessage("");
    await onSubmitUser(userForm);
    setUserMessage("Admin user saved.");
    setUserForm(defaultUserForm);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-zinc-200 bg-zinc-950 p-6 text-zinc-50 shadow-2xl">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5" />
          <div className="font-serif text-2xl">ELS Admin Dashboard</div>
        </div>
        <p className="mt-3 max-w-2xl text-sm text-zinc-300">
          Publish the daily Word Pyramid and Clear Cryptics puzzle, then watch usage metrics and leaderboard activity update from the backend.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-xs text-zinc-300">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Daily puzzle editor</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Live score storage</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Leaderboard sync</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Users" value={stats?.totalUsers ?? 0} />
        <StatCard label="Active Players" value={stats?.activePlayers ?? 0} />
        <StatCard label="Total Score" value={stats?.totalScore ?? 0} />
        <StatCard label="Puzzle Count" value={stats?.totalPuzzles ?? 0} />
        <StatCard label="Today's Puzzle" value={stats?.todayPuzzleExists ? "Live" : "Missing"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={submit} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-950">
            <Sparkles className="h-5 w-5" />
            <div className="font-serif text-2xl">Publish Daily Puzzle</div>
          </div>
          <p className="mt-2 text-sm text-zinc-600">
            Enter four pyramid words and four 4-letter cryptic answer rows. Clues should be simple and ESL-friendly.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-700">Date</span>
              <input
                type="date"
                value={form.date}
                onChange={(event) => update("date", event.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-900"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-700">Hint</span>
              <input
                type="text"
                value={form.hint}
                onChange={(event) => update("hint", event.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-900"
                placeholder="A helpful hint for the day"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-zinc-700">Word Pyramid words</span>
            <input
              value={form.pyramidTargets}
              onChange={(event) => update("pyramidTargets", event.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-900"
              placeholder="RED, READ, TREAD, THREAD"
            />
            <span className="mt-2 block text-xs text-zinc-500">Comma-separated, exactly four words.</span>
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-zinc-700">Cryptic answer rows</span>
            <input
              value={form.crypticSolution}
              onChange={(event) => update("crypticSolution", event.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-900"
              placeholder="THIS, HAVE, IVAN, SENT"
            />
            <span className="mt-2 block text-xs text-zinc-500">Comma-separated, exactly four 4-letter words.</span>
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-zinc-700">Cryptic clues</span>
            <textarea
              value={form.crypticClues}
              onChange={(event) => update("crypticClues", event.target.value)}
              className="min-h-40 w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-900"
              placeholder="One clue per line"
            />
            <span className="mt-2 block text-xs text-zinc-500">One clue per line, exactly four lines.</span>
          </label>

          {message ? <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}

          <div className="mt-5 flex flex-wrap gap-3">
              <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Saving...' : 'Save daily puzzle'}
            </button>
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh stats
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-zinc-700" />
              <div className="font-serif text-2xl">Latest Puzzles</div>
            </div>
            <div className="mt-4 space-y-3">
              {(puzzles || []).slice(0, 5).map((puzzle) => (
                <div key={puzzle.date} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-sm font-medium text-zinc-900">{puzzle.date}</div>
                  <div className="mt-2 text-xs text-zinc-600">Pyramid: {Array.isArray(puzzle.pyramidTargets) ? puzzle.pyramidTargets.join(' → ') : 'n/a'}</div>
                  <div className="mt-1 text-xs text-zinc-600">Cryptic: {Array.isArray(puzzle.crypticSolution) ? puzzle.crypticSolution.join(', ') : 'n/a'}</div>
                  {puzzle.hint ? <div className="mt-1 text-xs text-sky-800">Hint: {puzzle.hint}</div> : null}
                </div>
              ))}
              {!(puzzles || []).length ? <div className="text-sm text-zinc-500">No puzzles yet.</div> : null}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="font-serif text-2xl text-zinc-950">Create or Promote Admin</div>
            <p className="mt-2 text-sm text-zinc-600">
              Add a local admin/superuser account or promote an existing player by email/username.
            </p>
            <form onSubmit={submitUser} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-zinc-700">Email</span>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(event) => updateUser('email', event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-900"
                    placeholder="admin@example.com"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-zinc-700">Username</span>
                  <input
                    value={userForm.username}
                    onChange={(event) => updateUser('username', event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-900"
                    placeholder="admin-name"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-zinc-700">Password</span>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(event) => updateUser('password', event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-900"
                    placeholder="At least 8 characters"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-zinc-700">Role</span>
                  <select
                    value={userForm.role}
                    onChange={(event) => updateUser('role', event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-900"
                  >
                    <option value="admin">Admin</option>
                    <option value="superuser">Superuser</option>
                  </select>
                </label>
              </div>

              {userMessage ? <p className="rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-800">{userMessage}</p> : null}

              <button
                type="submit"
                className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Save admin user
              </button>
            </form>

            <div className="mt-6">
              <div className="font-medium text-zinc-900">Current users</div>
              <div className="mt-3 space-y-2 max-h-64 overflow-auto pr-1">
                {(users || []).map((user) => (
                  <div key={user.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-zinc-900">{user.username}</div>
                      <div className="text-xs uppercase tracking-wide text-zinc-500">{user.role}</div>
                    </div>
                    <div className="mt-1 text-xs text-zinc-600">{user.email}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
