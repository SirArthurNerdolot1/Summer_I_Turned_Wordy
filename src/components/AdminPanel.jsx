import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, RefreshCcw, ShieldCheck, Sparkles } from "lucide-react";
import MiniCrosswordGrid, { gridToWords, normalizeGrid } from "./MiniCrosswordGrid";

const defaultCrosswordGrid = [
  ["T", "H", "I", "S"],
  ["H", "A", "V", "E"],
  ["I", "V", "A", "N"],
  ["S", "E", "N", "T"],
];

const defaultAcrossClues = [
  'Across 1: "The thing here sounds like hiss with a T" (4)',
  'Across 2: "To possess, in a simple hidden-style clue" (4)',
  'Across 3: "Hidden inside arrIVAN" (4)',
  'Across 4: "Past tense of send" (4)',
];

const defaultDownClues = [
  'Down 1: "The thing here sounds like hiss with a T" (4)',
  'Down 2: "To possess, in a simple hidden-style clue" (4)',
  'Down 3: "Hidden inside arrIVAN" (4)',
  'Down 4: "Past tense of send" (4)',
];

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
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [hint, setHint] = useState("Focus on anagrams, homophones, and hidden words.");
  const [pyramidTargets, setPyramidTargets] = useState("RED, READ, TREAD, THREAD");
  const [grid, setGrid] = useState(defaultCrosswordGrid);
  const [acrossClues, setAcrossClues] = useState(defaultAcrossClues);
  const [downClues, setDownClues] = useState(defaultDownClues);
  const [activeCell, setActiveCell] = useState({ row: 0, col: 0 });
  const [direction, setDirection] = useState("across");
  const [userForm, setUserForm] = useState(defaultUserForm);
  const [message, setMessage] = useState("");
  const [userMessage, setUserMessage] = useState("");

  useEffect(() => {
    setDate(new Date().toISOString().slice(0, 10));
  }, []);

  const updateUser = (field, value) => {
    setUserForm((current) => ({ ...current, [field]: value }));
  };

  const normalizedGrid = useMemo(() => normalizeGrid(grid), [grid]);
  const currentWords = useMemo(() => gridToWords(normalizedGrid), [normalizedGrid]);

  const updateClue = (setter) => (index, value) => {
    setter((current) => current.map((clue, clueIndex) => (clueIndex === index ? value : clue)));
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    const trimmedAcrossClues = acrossClues.map((clue) => String(clue).trim());
    const trimmedDownClues = downClues.map((clue) => String(clue).trim());

    if (trimmedAcrossClues.some((clue) => !clue) || trimmedDownClues.some((clue) => !clue)) {
      setMessage("Fill all four across clues and all four down clues.");
      return;
    }

    if (normalizedGrid.some((row) => row.some((cell) => !cell))) {
      setMessage("Fill all 16 crossword cells before publishing.");
      return;
    }

    const payload = {
      date,
      pyramidTargets: pyramidTargets.split(",").map((item) => item.trim()).filter(Boolean),
      crypticSolution: currentWords.across,
      crypticClues: trimmedAcrossClues,
      miniCryptic: {
        size: 4,
        grid: normalizedGrid,
        across: currentWords.across.map((answer, index) => ({
          answer,
          clue: trimmedAcrossClues[index],
        })),
        down: currentWords.down.map((answer, index) => ({
          answer,
          clue: trimmedDownClues[index],
        })),
      },
      hint,
    };

    try {
      await onSubmitPuzzle(payload);
      setMessage("Daily puzzle saved.");
    } catch (error) {
      setMessage(error.message || "Failed to save puzzle.");
    }
  };

  const submitUser = async (event) => {
    event.preventDefault();
    setUserMessage("");
    try {
      await onSubmitUser(userForm);
      setUserMessage("Admin user saved.");
      setUserForm(defaultUserForm);
    } catch (error) {
      setUserMessage(error.message || "Failed to save admin user.");
    }
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
            Fill the 4x4 crossword grid, then write four across clues and four down clues beside it.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-700">Date</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-900"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-700">Hint</span>
              <input
                type="text"
                value={hint}
                onChange={(event) => setHint(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-900"
                placeholder="A helpful hint for the day"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-zinc-700">Word Pyramid words</span>
            <input
              value={pyramidTargets}
              onChange={(event) => setPyramidTargets(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-900"
              placeholder="RED, READ, TREAD, THREAD"
            />
            <span className="mt-2 block text-xs text-zinc-500">Comma-separated, exactly four words.</span>
          </label>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="space-y-4 rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Grid</div>
                <div className="mt-1 font-serif text-xl text-zinc-950">Mini crossword editor</div>
              </div>

              <MiniCrosswordGrid
                value={grid}
                onChange={setGrid}
                activeCell={activeCell}
                onActiveCellChange={setActiveCell}
                direction={direction}
                onDirectionChange={setDirection}
              />

              <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
                <div className="font-medium text-zinc-900">Live answer preview</div>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Across</div>
                    <div className="mt-2 space-y-1 font-mono text-sm text-zinc-700">
                      {currentWords.across.map((word, index) => (
                        <div key={`preview-across-${index}`}>
                          {index + 1}. {word || "____"}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Down</div>
                    <div className="mt-2 space-y-1 font-mono text-sm text-zinc-700">
                      {currentWords.down.map((word, index) => (
                        <div key={`preview-down-${index}`}>
                          {index + 1}. {word || "____"}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="font-serif text-xl text-zinc-950">Across clues</div>
                <div className="mt-4 space-y-3">
                  {acrossClues.map((clue, index) => (
                    <label key={`across-clue-${index}`} className="block">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Across {index + 1}
                      </span>
                      <input
                        value={clue}
                        onChange={(event) => updateClue(setAcrossClues)(index, event.target.value)}
                        className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-900"
                        placeholder={`Across ${index + 1} clue`}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="font-serif text-xl text-zinc-950">Down clues</div>
                <div className="mt-4 space-y-3">
                  {downClues.map((clue, index) => (
                    <label key={`down-clue-${index}`} className="block">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Down {index + 1}
                      </span>
                      <input
                        value={clue}
                        onChange={(event) => updateClue(setDownClues)(index, event.target.value)}
                        className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-900"
                        placeholder={`Down ${index + 1} clue`}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {message ? <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Saving..." : "Save daily puzzle"}
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
                  <div className="mt-1 text-xs text-zinc-600">
                    Cryptic: {Array.isArray(puzzle.miniCryptic?.across) ? puzzle.miniCryptic.across.map((entry) => entry.answer).join(', ') : Array.isArray(puzzle.crypticSolution) ? puzzle.crypticSolution.join(', ') : 'n/a'}
                  </div>
                  <div className="mt-1 text-xs text-zinc-600">
                    Clues: {Array.isArray(puzzle.miniCryptic?.across) ? `${puzzle.miniCryptic.across.length} across / ${Array.isArray(puzzle.miniCryptic?.down) ? puzzle.miniCryptic.down.length : 0} down` : Array.isArray(puzzle.crypticClues) ? `${puzzle.crypticClues.length} legacy clues` : 'n/a'}
                  </div>
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
