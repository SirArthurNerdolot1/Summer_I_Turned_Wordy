import React, { useEffect, useMemo, useState } from "react";
import Header from "./components/Header";
import Leaderboard from "./components/Leaderboard";
import AdminPanel from "./components/AdminPanel";
import WordPyramid from "./games/WordPyramid";
import ClearCryptics from "./games/ClearCryptics";

function formatDate(d = new Date()) {
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

const defaultAuthForm = {
  email: "",
  password: "",
  username: "",
};

export default function App(){
  const [currentView, setCurrentView] = useState('home');
  const [userScore, setUserScore] = useState(0);
  const [userStreak, setUserStreak] = useState(2);
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const [leaderOpen, setLeaderOpen] = useState(false);

  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState(defaultAuthForm);
  const [authUser, setAuthUser] = useState(null);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('lingodaily_token') || '');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [dailyPuzzle, setDailyPuzzle] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [adminPuzzles, setAdminPuzzles] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminBusy, setAdminBusy] = useState(false);
  const [toasts, setToasts] = useState([]);

  const todayLabel = useMemo(() => formatDate(new Date()), []);

  const pyramidTargets = useMemo(() => {
    if (Array.isArray(dailyPuzzle?.pyramidTargets) && dailyPuzzle.pyramidTargets.length === 4) {
      return dailyPuzzle.pyramidTargets;
    }
    return ["RED", "READ", "TREAD", "THREAD"];
  }, [dailyPuzzle]);

  const crypticSolution = useMemo(() => {
    if (Array.isArray(dailyPuzzle?.crypticSolution) && dailyPuzzle.crypticSolution.length === 4) {
      return dailyPuzzle.crypticSolution;
    }
    return ["THIS", "HAVE", "IVAN", "SENT"];
  }, [dailyPuzzle]);

  const crypticClues = useMemo(() => {
    if (Array.isArray(dailyPuzzle?.crypticClues) && dailyPuzzle.crypticClues.length === 4) {
      return dailyPuzzle.crypticClues;
    }
    return [];
  }, [dailyPuzzle]);

  const isAdmin = authUser?.role === 'admin';

  function addToast(message, type = 'info') {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((items) => [...items, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((items) => items.filter((toast) => toast.id !== id));
    }, 3000);
  }

  async function api(path, options = {}, tokenOverride = authToken) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
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
      throw new Error(payload.message || 'Request failed');
    }
    return payload;
  }

  async function loadLeaderboard(token = authToken) {
    const data = await api('/api/leaderboard', {}, token);
    setLeaderboard(data.leaderboard || []);
  }

  async function loadDailyPuzzle() {
    const data = await api('/api/puzzles/today', {}, '');
    setDailyPuzzle(data.puzzle || null);
  }

  async function loadAdminData(token = authToken) {
    const [statsData, puzzleData] = await Promise.all([
      api('/api/admin/stats', {}, token),
      api('/api/admin/puzzles', {}, token),
    ]);
    setAdminStats(statsData.stats || null);
    setAdminPuzzles(puzzleData.puzzles || []);
  }

  async function loadAdminUsers(token = authToken) {
    const data = await api('/api/admin/users', {}, token);
    setAdminUsers(data.users || []);
  }

  async function loadSession(token) {
    const session = await api('/api/me', {}, token);
    setAuthUser(session.user);
    setUserScore(session.user.score || 0);
    setUserStreak(session.user.streak || 0);
    setHasPlayedToday(false);
    await loadLeaderboard(token);
    if ((session.user.role || 'player') === 'admin') {
      await loadAdminData(token);
      await loadAdminUsers(token);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!authToken) {
        setSessionReady(true);
        return;
      }
      try {
        await loadSession(authToken);
        await loadDailyPuzzle();
      } catch {
        localStorage.removeItem('lingodaily_token');
        setAuthToken('');
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
  }, []);

  async function submitAuth(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const route = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = authMode === 'login'
        ? { email: authForm.email, password: authForm.password }
        : { email: authForm.email, password: authForm.password, username: authForm.username };
      const result = await api(route, {
        method: 'POST',
        body: JSON.stringify(body),
      }, '');
      localStorage.setItem('lingodaily_token', result.token);
      setAuthToken(result.token);
      setAuthUser(result.user);
      setUserScore(result.user.score || 0);
      setUserStreak(result.user.streak || 0);
      setHasPlayedToday(false);
      setCurrentView('home');
      await loadLeaderboard(result.token);
      await loadDailyPuzzle();
      if ((result.user.role || 'player') === 'admin') {
        await loadAdminData(result.token);
      }
      addToast(authMode === 'login' ? 'Welcome back' : 'Account created');
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('lingodaily_token');
    setAuthToken('');
    setAuthUser(null);
    setUserScore(0);
    setUserStreak(0);
    setHasPlayedToday(false);
    setCurrentView('home');
    setLeaderboard([]);
    setAuthForm(defaultAuthForm);
    addToast('Signed out');
  }

  async function persistScore(delta) {
    if (typeof delta !== 'number' || delta === 0) {
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
      const result = await api('/api/score', {
        method: 'POST',
        body: JSON.stringify({ delta }),
      });
      setUserScore(result.user.score || 0);
      setUserStreak(result.user.streak || 0);
      setLeaderboard(result.leaderboard || []);
    } catch (error) {
      addToast(error.message, 'error');
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
      const result = await api('/api/admin/puzzles', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setDailyPuzzle(result.puzzle || null);
      setAdminPuzzles(result.puzzles || []);
      await loadAdminData();
      await loadAdminUsers();
      await loadLeaderboard();
      addToast('Daily puzzle published');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setAdminBusy(false);
    }
  }

  async function saveAdminUser(payload) {
    setAdminBusy(true);
    try {
      await api('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await loadAdminData();
      await loadAdminUsers();
      await loadLeaderboard();
      addToast('Admin user saved');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setAdminBusy(false);
    }
  }

  async function refreshAdmin() {
    setAdminBusy(true);
    try {
      await Promise.all([loadAdminData(), loadAdminUsers(), loadDailyPuzzle(), loadLeaderboard()]);
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setAdminBusy(false);
    }
  }

  const updateAuthField = (field, value) => {
    setAuthForm((form) => ({ ...form, [field]: value }));
  };

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
      <div className="min-h-screen bg-zinc-50 text-slate-900 font-sans flex items-center justify-center px-4">
        <div className="w-full max-w-4xl grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-zinc-200 bg-zinc-950 text-zinc-50 p-8 shadow-2xl">
            <div className="inline-flex rounded-sm bg-white text-zinc-950 px-3 py-2 font-serif text-lg tracking-tight">ELS</div>
            <h1 className="mt-8 font-serif text-4xl leading-tight">Daily games for ELS readers, writers, and puzzle minds.</h1>
            <p className="mt-4 max-w-xl text-zinc-300 text-sm sm:text-base">
              Sign in or create an account with your email, password, and username to save your score and appear on the leaderboard.
            </p>
            <div className="mt-8 grid gap-3 text-sm text-zinc-300 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Word Pyramid with per-word scoring</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Cryptic crossword progress</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Persistent leaderboard storage</div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl">
            <div className="flex rounded-full bg-zinc-100 p-1 text-sm font-medium">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
                className={`flex-1 rounded-full px-4 py-2 ${authMode === 'login' ? 'bg-zinc-900 text-white' : 'text-zinc-600'}`}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setAuthError(''); }}
                className={`flex-1 rounded-full px-4 py-2 ${authMode === 'register' ? 'bg-zinc-900 text-white' : 'text-zinc-600'}`}
              >
                Register
              </button>
            </div>

            <form onSubmit={submitAuth} className="mt-6 space-y-4">
              {authMode === 'register' && (
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-zinc-700">Username</span>
                  <input
                    value={authForm.username}
                    onChange={(event) => updateAuthField('username', event.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-900"
                    placeholder="Your username"
                    required
                  />
                </label>
              )}
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-zinc-700">Email</span>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(event) => updateAuthField('email', event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-900"
                  placeholder="you@example.com"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-zinc-700">Password</span>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(event) => updateAuthField('password', event.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-900"
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                />
              </label>

              {authError ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{authError}</p> : null}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full rounded-xl bg-zinc-900 px-4 py-3 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {authLoading ? 'Please wait...' : authMode === 'login' ? 'Log in' : 'Create account'}
              </button>
            </form>

            <p className="mt-4 text-xs leading-5 text-zinc-500">
              Use any email address. Passwords are stored hashed on the backend.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-slate-900 font-sans">
      <div className="max-w-4xl mx-auto p-4">
        <Header todayLabel={todayLabel} userStreak={userStreak} userName={authUser.username} onToggleLeaderboard={()=>setLeaderOpen((s)=>!s)} onLogout={handleLogout} onOpenAdmin={() => setCurrentView('admin')} isAdmin={isAdmin} />

        <main className="mt-4">
          {currentView==='home' && (
            <div>
              <h2 className="font-serif text-2xl mb-3">Play</h2>
              <p className="mb-4 text-sm text-zinc-600">Signed in as {authUser.username}. Your score is stored in the backend and shown on the leaderboard.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div onClick={()=>setCurrentView('pyramid')} className="cursor-pointer rounded-md border border-zinc-200 bg-white p-4 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-serif text-lg">Word Pyramid</div>
                      <div className="text-sm text-zinc-500">A stacked Wordle variant for vocabulary building.</div>
                    </div>
                    <div className="text-zinc-400 text-sm">3-6 letters</div>
                  </div>
                </div>

                <div onClick={()=>setCurrentView('cryptic')} className="cursor-pointer rounded-md border border-zinc-200 bg-white p-4 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-serif text-lg">Clear Cryptics</div>
                      <div className="text-sm text-zinc-500">Mini cryptic-style crossword for ELS learners.</div>
                    </div>
                    <div className="text-zinc-400 text-sm">4x4</div>
                  </div>
                </div>
                {isAdmin ? (
                  <div onClick={()=>setCurrentView('admin')} className="cursor-pointer rounded-md border border-zinc-200 bg-white p-4 shadow-sm hover:shadow-md transition sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-serif text-lg">Admin Dashboard</div>
                        <div className="text-sm text-zinc-500">Publish daily puzzles and review platform stats.</div>
                      </div>
                      <div className="text-zinc-400 text-sm">Admin</div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-6">
                <h3 className="font-serif text-xl mb-2">Your Stats</h3>
                <div className="flex gap-4">
                  <div className="bg-white border border-zinc-200 rounded p-3 flex-1">
                    <div className="text-sm text-zinc-600">Score</div>
                    <div className="text-2xl font-medium">{userScore}</div>
                  </div>
                  <div className="bg-white border border-zinc-200 rounded p-3 w-36">
                    <div className="text-sm text-zinc-600">Played Today</div>
                    <div className="text-xl">{hasPlayedToday? 'Yes':'No'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentView==='pyramid' && (
            <div>
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl">Word Pyramid</h2>
                <div className="text-sm text-zinc-500">Stacked word challenge</div>
              </div>
              <div className="mt-4">
                <WordPyramid targets={pyramidTargets} onScoreChange={persistScore} onComplete={()=>{ setHasPlayedToday(true); }} addToast={addToast} />
              </div>
              <div className="mt-6"><button onClick={()=>setCurrentView('home')} className="text-sm text-zinc-600 hover:underline">Back</button></div>
            </div>
          )}

          {currentView==='cryptic' && (
            <div>
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl">Clear Cryptics</h2>
                <div className="text-sm text-zinc-500">4x4 ELS-friendly mini crossword</div>
              </div>
              <div className="mt-4">
                <ClearCryptics
                  onSolve={()=>{ persistScore(300); setHasPlayedToday(true); }}
                  addToast={addToast}
                  solutionWords={crypticSolution}
                  cluesData={crypticClues}
                  dailyHint={dailyPuzzle?.hint || ''}
                />
              </div>
              <div className="mt-6"><button onClick={()=>setCurrentView('home')} className="text-sm text-zinc-600 hover:underline">Back</button></div>
            </div>
          )}

          {currentView==='admin' && isAdmin && (
            <AdminPanel stats={adminStats} puzzles={adminPuzzles} users={adminUsers} onRefresh={refreshAdmin} onSubmitPuzzle={saveDailyPuzzle} onSubmitUser={saveAdminUser} busy={adminBusy} />
          )}
        </main>
      </div>

      <Leaderboard open={leaderOpen} onClose={()=>setLeaderOpen(false)} entries={leaderboard} currentUserId={authUser.id} />

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t text-center py-2 text-xs text-zinc-500">Built with ❤️ for ELS learners</footer>

      <div className="fixed bottom-6 right-6 z-50 space-y-2">
        {toasts.map((toast) => (
          <div key={toast.id} className={`rounded-xl px-4 py-3 text-sm shadow-lg text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-zinc-900'}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
