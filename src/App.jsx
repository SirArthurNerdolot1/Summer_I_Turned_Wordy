import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import GamePage from "./pages/GamePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import AdminPage from "./pages/AdminPage";
import NotFoundPage from "./pages/NotFoundPage";
import { useDailyGameState } from "./hooks/useDailyGameState";

function formatDate(d = new Date()) {
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const defaultAuthForm = {
  email: "",
  password: "",
  username: "",
};

const resetPasswordEndpoint = "/api/auth/forgot-password";

function AuthPage({
  authMode,
  setAuthMode,
  authForm,
  setAuthForm,
  authLoading,
  authError,
  submitAuth,
  requestPasswordReset,
}) {
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  const updateAuthField = (field, value) => {
    setAuthForm((form) => ({ ...form, [field]: value }));
  };

  useEffect(() => {
    if (authMode !== "login") {
      setResetOpen(false);
      setResetEmail("");
      setResetError("");
      setResetMessage("");
    }
  }, [authMode]);

  async function handleResetRequest(event) {
    event.preventDefault();
    setResetLoading(true);
    setResetError("");
    setResetMessage("");
    try {
      const result = await requestPasswordReset(resetEmail);
      setResetMessage(
        result?.message ||
          "If an account exists for that email, a reset link has been sent."
      );
    } catch (error) {
      setResetError(error.message || "Unable to send reset request.");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-slate-900 font-sans flex items-center justify-center px-4">
      <div className="w-full max-w-4xl grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-zinc-200 bg-zinc-950 text-zinc-50 p-8 shadow-2xl">
          <div className="inline-flex rounded-sm bg-white text-zinc-950 px-3 py-2 font-serif text-lg tracking-tight">
            ELS
          </div>
          <h1 className="mt-8 font-serif text-4xl leading-tight">
            Daily games for ELS readers, writers, and puzzle minds.
          </h1>
          <p className="mt-4 max-w-xl text-zinc-300 text-sm sm:text-base">
            Sign in with your username and password, or create an account with
            your email, username, and password to save your score and appear on
            the leaderboard.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-zinc-300 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              Word Pyramid with per-word scoring
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              Cryptic crossword progress
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              Persistent leaderboard storage
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl">
          <div className="flex rounded-full bg-zinc-100 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
              }}
              className={`flex-1 rounded-full px-4 py-2 ${
                authMode === "login"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600"
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("register");
                setResetOpen(false);
                setResetError("");
                setResetMessage("");
              }}
              className={`flex-1 rounded-full px-4 py-2 ${
                authMode === "register"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={submitAuth} className="mt-6 space-y-4">
            {authMode === "register" && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-zinc-700">
                  Username
                </span>
                <input
                  value={authForm.username}
                  onChange={(event) =>
                    updateAuthField("username", event.target.value)
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-900"
                  placeholder="Your username"
                  required
                />
              </label>
            )}
            {authMode === "login" && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-zinc-700">
                  Username
                </span>
                <input
                  value={authForm.username}
                  onChange={(event) =>
                    updateAuthField("username", event.target.value)
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-900"
                  placeholder="Your username"
                  autoComplete="username"
                  required
                />
              </label>
            )}
            {authMode === "register" ? (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-zinc-700">
                  Email
                </span>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(event) =>
                    updateAuthField("email", event.target.value)
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-900"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>
            ) : null}
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700">
                Password
              </span>
              <input
                type="password"
                value={authForm.password}
                onChange={(event) =>
                  updateAuthField("password", event.target.value)
                }
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-900"
                placeholder={
                  authMode === "login" ? "Your password" : "At least 8 characters"
                }
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
                required
                minLength={8}
              />
            </label>

            {authError ? (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {authError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-xl bg-zinc-900 px-4 py-3 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {authLoading
                ? "Please wait..."
                : authMode === "login"
                  ? "Log in"
                  : "Create account"}
            </button>
          </form>

          {authMode === "login" && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  setResetOpen((open) => !open);
                  setResetError("");
                  setResetMessage("");
                }}
                className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
              >
                Forgot password?
              </button>
            </div>
          )}

          {authMode === "login" && resetOpen && (
            <form
              onSubmit={handleResetRequest}
              className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <p className="text-sm font-medium text-zinc-900">
                Send a reset link
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Enter the email address tied to your account.
              </p>
              <label className="mt-3 block">
                <span className="mb-1 block text-sm font-medium text-zinc-700">
                  Email
                </span>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(event) => setResetEmail(event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-900"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>
              {resetError ? (
                <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {resetError}
                </p>
              ) : null}
              {resetMessage ? (
                <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {resetMessage}
                </p>
              ) : null}
              <div className="mt-4 flex gap-3">
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resetLoading ? "Sending..." : "Send reset link"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetOpen(false);
                    setResetError("");
                    setResetMessage("");
                  }}
                  className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <p className="mt-4 text-xs leading-5 text-zinc-500">
            Passwords are stored hashed on the backend.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const { puzzle: dailyPuzzle, dateKey: dailySessionKey } = useDailyGameState();
  const [userScore, setUserScore] = useState(0);
  const [userStreak, setUserStreak] = useState(2);
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const [leaderOpen, setLeaderOpen] = useState(false);

  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState(defaultAuthForm);
  const [authUser, setAuthUser] = useState(null);
  const [authToken, setAuthToken] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [adminPuzzles, setAdminPuzzles] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminBusy, setAdminBusy] = useState(false);
  const [toasts, setToasts] = useState([]);

  const todayLabel = useMemo(() => formatDate(new Date()), []);

  const pyramidTargets = useMemo(() => {
    if (
      Array.isArray(dailyPuzzle?.pyramidTargets) &&
      dailyPuzzle.pyramidTargets.length === 4
    ) {
      return dailyPuzzle.pyramidTargets;
    }
    return ["RED", "READ", "TREAD", "THREAD"];
  }, [dailyPuzzle]);

  const crypticSolution = useMemo(() => {
    if (
      Array.isArray(dailyPuzzle?.crypticSolution) &&
      dailyPuzzle.crypticSolution.length === 4
    ) {
      return dailyPuzzle.crypticSolution;
    }
    return ["THIS", "HAVE", "IVAN", "SENT"];
  }, [dailyPuzzle]);

  const crypticClues = useMemo(() => {
    if (
      Array.isArray(dailyPuzzle?.crypticClues) &&
      dailyPuzzle.crypticClues.length === 4
    ) {
      return dailyPuzzle.crypticClues;
    }
    return [];
  }, [dailyPuzzle]);

  const isAdmin = authUser?.role === "admin";

  function addToast(message, type = "info") {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((items) => [...items, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((items) => items.filter((toast) => toast.id !== id));
    }, 3000);
  }

  async function api(path, options = {}, tokenOverride = authToken) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    if (tokenOverride) {
      headers.Authorization = `Bearer ${tokenOverride}`;
    }
    const response = await fetch(path, { ...options, headers });
    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }
    if (!response.ok) {
      throw new Error(payload.message || "Request failed");
    }
    return payload;
  }

  async function loadLeaderboard(token = authToken) {
    const data = await api("/api/leaderboard", {}, token);
    setLeaderboard(data.leaderboard || []);
  }

  async function loadAdminData(token = authToken) {
    const [statsData, puzzleData] = await Promise.all([
      api("/api/admin/stats", {}, token),
      api("/api/admin/puzzles", {}, token),
    ]);
    setAdminStats(statsData.stats || null);
    setAdminPuzzles(puzzleData.puzzles || []);
  }

  async function loadAdminUsers(token = authToken) {
    const data = await api("/api/admin/users", {}, token);
    setAdminUsers(data.users || []);
  }

  async function loadSession(token) {
    const session = await api("/api/me", {}, token);
    setAuthUser(session.user);
    setUserScore(session.user.score || 0);
    setUserStreak(session.user.streak || 0);
    setHasPlayedToday(false);
    await loadLeaderboard(token);
    if ((session.user.role || "player") === "admin") {
      await loadAdminData(token);
      await loadAdminUsers(token);
    }
  }

  async function requestPasswordReset(email) {
    const normalizedEmail = String(email || "").trim();
    if (!normalizedEmail) {
      throw new Error("Email is required");
    }
    return api(
      resetPasswordEndpoint,
      {
        method: "POST",
        body: JSON.stringify({ email: normalizedEmail }),
      },
      ""
    );
  }

  useEffect(() => {
    const storedToken = localStorage.getItem("lingodaily_token") || "";
    setAuthToken(storedToken);
  }, []);

  // Initialize session on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!authToken) {
        setSessionReady(true);
        return;
      }
      try {
        await loadSession(authToken);
      } catch {
        localStorage.removeItem("lingodaily_token");
        setAuthToken("");
        setAuthUser(null);
        setUserScore(0);
        setUserStreak(0);
        setLeaderboard([]);
      } finally {
        if (alive) {
          setSessionReady(true);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [authToken]);

  async function submitAuth(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      if (authMode === "register") {
        const body = {
          email: authForm.email,
          password: authForm.password,
          username: authForm.username,
        };
        await api(
          "/api/auth/register",
          {
            method: "POST",
            body: JSON.stringify(body),
          },
          ""
        );
        addToast("Account created! Please log in with your credentials.");
        setAuthMode("login");
        setAuthForm({ ...defaultAuthForm, email: authForm.email });
        setAuthError("");
      } else {
        const body = {
          username: authForm.username,
          password: authForm.password,
        };
        const result = await api(
          "/api/auth/login",
          {
            method: "POST",
            body: JSON.stringify(body),
          },
          ""
        );
        localStorage.setItem("lingodaily_token", result.token);
        setAuthToken(result.token);
        setAuthUser(result.user);
        setUserScore(result.user.score || 0);
        setUserStreak(result.user.streak || 0);
        setHasPlayedToday(false);
        await loadLeaderboard(result.token);
        if ((result.user.role || "player") === "admin") {
          await loadAdminData(result.token);
        }
        addToast("Welcome back!");
        navigate("/");
      }
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("lingodaily_token");
    setAuthToken("");
    setAuthUser(null);
    setUserScore(0);
    setUserStreak(0);
    setHasPlayedToday(false);
    setLeaderboard([]);
    setAuthForm(defaultAuthForm);
    addToast("Signed out");
    navigate("/");
  }

  async function persistScore(delta) {
    if (typeof delta !== "number" || delta === 0) {
      return;
    }
    setUserScore((score) => score + delta);
    setHasPlayedToday((played) => {
      if (!played) {
        setUserStreak((streak) => streak + 1);
      }
      return true;
    });
    try {
      const result = await api("/api/score", {
        method: "POST",
        body: JSON.stringify({ delta }),
      });
      setUserScore(result.user.score || 0);
      setUserStreak(result.user.streak || 0);
      setLeaderboard(result.leaderboard || []);
    } catch (error) {
      addToast(error.message, "error");
      try {
        await loadLeaderboard();
      } catch {
        // ignore transient leaderboard reload failures
      }
    }
  }

  async function saveDailyPuzzle(payload) {
    setAdminBusy(true);
    try {
      const result = await api("/api/admin/puzzles", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setAdminPuzzles(result.puzzles || []);
      await loadAdminData();
      await loadAdminUsers();
      await loadLeaderboard();
      addToast("Daily puzzle published");
    } catch (error) {
      addToast(error.message, "error");
    } finally {
      setAdminBusy(false);
    }
  }

  async function saveAdminUser(payload) {
    setAdminBusy(true);
    try {
      await api("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await loadAdminData();
      await loadAdminUsers();
      await loadLeaderboard();
      addToast("Admin user saved");
    } catch (error) {
      addToast(error.message, "error");
    } finally {
      setAdminBusy(false);
    }
  }

  async function refreshAdmin() {
    setAdminBusy(true);
    try {
      await Promise.all([
        loadAdminData(),
        loadAdminUsers(),
        loadLeaderboard(),
      ]);
    } catch (error) {
      addToast(error.message, "error");
    } finally {
      setAdminBusy(false);
    }
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center text-slate-900">
        <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm font-serif text-lg">
          Loading ELS...
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <AuthPage
        authMode={authMode}
        setAuthMode={setAuthMode}
        authForm={authForm}
        setAuthForm={setAuthForm}
        authLoading={authLoading}
        authError={authError}
        submitAuth={submitAuth}
        requestPasswordReset={requestPasswordReset}
      />
    );
  }

  // Authenticated user - render router with layout
  return (
    <AuthProvider
      value={{
        authUser,
        authToken,
        userScore,
        userStreak,
        hasPlayedToday,
      }}
    >
      <Layout
        todayLabel={todayLabel}
        userStreak={userStreak}
        userName={authUser.username}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        onLeaderboardToggle={() => setLeaderOpen(!leaderOpen)}
      >
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                authUser={authUser}
                userScore={userScore}
                hasPlayedToday={hasPlayedToday}
                isAdmin={isAdmin}
              />
            }
          />
          <Route
            path="/game/:gameId"
            element={
              <GamePage
                dailySessionKey={dailySessionKey}
                pyramidTargets={pyramidTargets}
                crypticSolution={crypticSolution}
                crypticClues={crypticClues}
                dailyPuzzle={dailyPuzzle}
                onScoreChange={persistScore}
                onComplete={() => setHasPlayedToday(true)}
                addToast={addToast}
              />
            }
          />
          <Route
            path="/leaderboard"
            element={
              <LeaderboardPage
                leaderboard={leaderboard}
                currentUserId={authUser.id}
              />
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute isAdmin={isAdmin}>
                <AdminPage
                  stats={adminStats}
                  puzzles={adminPuzzles}
                  users={adminUsers}
                  onRefresh={refreshAdmin}
                  onSubmitPuzzle={saveDailyPuzzle}
                  onSubmitUser={saveAdminUser}
                  busy={adminBusy}
                />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>

      <div className="fixed bottom-6 right-6 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-xl px-4 py-3 text-sm shadow-lg text-white ${
              toast.type === "error" ? "bg-red-600" : "bg-zinc-900"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </AuthProvider>
  );
}
