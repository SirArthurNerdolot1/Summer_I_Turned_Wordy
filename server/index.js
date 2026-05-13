const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'lingodaily-dev-secret';
const DB_PATH = path.join(__dirname, 'data', 'db.json');

function ensureDataFile() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    const initial = {
      users: [
        { id: 1, username: 'Ada', email: 'ada@example.com', passwordHash: bcrypt.hashSync('password123', 10), score: 1200, streak: 8, role: 'player' },
        { id: 2, username: 'Ben', email: 'ben@example.com', passwordHash: bcrypt.hashSync('password123', 10), score: 980, streak: 5, role: 'player' },
        { id: 3, username: 'Cara', email: 'cara@example.com', passwordHash: bcrypt.hashSync('password123', 10), score: 720, streak: 4, role: 'player' },
        { id: 4, username: 'Diego', email: 'diego@example.com', passwordHash: bcrypt.hashSync('password123', 10), score: 540, streak: 3, role: 'player' },
        { id: 5, username: 'Elly', email: 'elly@example.com', passwordHash: bcrypt.hashSync('password123', 10), score: 400, streak: 2, role: 'player' },
        { id: 6, username: 'Admin', email: 'admin@lingodaily.com', passwordHash: bcrypt.hashSync('admin12345', 10), score: 0, streak: 0, role: 'admin' },
      ],
      dailyPuzzles: [
        {
          date: new Date().toISOString().slice(0, 10),
          pyramidTargets: ['RED', 'READ', 'TREAD', 'THREAD'],
          crypticSolution: ['THIS', 'HAVE', 'IVAN', 'SENT'],
          crypticClues: [
            'The thing here sounds like hiss with a T (4)',
            'To possess, in a simple hidden-style clue (4)',
            'Hidden inside arrIVAN (4)',
            'Past tense of send (4)',
          ],
          hint: 'Focus on anagrams, sound-alikes, and hidden words.',
        },
      ],
      nextId: 7,
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
  }
}

function readDb() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function signUser(user) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    score: user.score,
    streak: user.streak,
    role: user.role || 'player',
  };
}

function adminRequired(req, res, next) {
  authRequired(req, res, () => {
    if ((req.user.role || 'player') !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  });
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: 'Missing token' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const db = readDb();
    const user = db.users.find((u) => u.id === payload.sub);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function getOptionalUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return null;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const db = readDb();
    return db.users.find((u) => u.id === payload.sub) || null;
  } catch {
    return null;
  }
}

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, username } = req.body || {};
  if (!email || !password || !username) {
    return res.status(400).json({ message: 'Email, password, and username are required' });
  }
  const db = readDb();
  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedUsername = String(username).trim();
  if (!normalizedEmail || !normalizedUsername || String(password).length < 8) {
    return res.status(400).json({ message: 'Provide a valid email, username, and password with at least 8 characters' });
  }
  const existing = db.users.find((u) => u.email === normalizedEmail || u.username.toLowerCase() === normalizedUsername.toLowerCase());
  if (existing) {
    return res.status(409).json({ message: 'Email or username already exists' });
  }
  const passwordHash = bcrypt.hashSync(String(password), 10);
  const user = {
    id: db.nextId,
    username: normalizedUsername,
    email: normalizedEmail,
    passwordHash,
    score: 0,
    streak: 0,
    role: 'player',
  };
  db.nextId += 1;
  db.users.push(user);
  writeDb(db);
  const token = signUser(user);
  res.status(201).json({ token, user: sanitizeUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  const db = readDb();
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = db.users.find((u) => u.email === normalizedEmail);
  if (!user || !bcrypt.compareSync(String(password), user.passwordHash)) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  const token = signUser(user);
  res.json({ token, user: sanitizeUser(user) });
});

app.get('/api/puzzles/today', (_req, res) => {
  const db = readDb();
  const today = new Date().toISOString().slice(0, 10);
  const puzzle = db.dailyPuzzles.find((entry) => entry.date === today) || db.dailyPuzzles[db.dailyPuzzles.length - 1] || null;
  res.json({ puzzle });
});

app.get('/api/me', authRequired, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

app.get('/api/leaderboard', (req, res) => {
  const db = readDb();
  const sorted = db.users
    .map(sanitizeUser)
    .sort((a, b) => b.score - a.score)
    .map((user, index) => ({ ...user, rank: index + 1 }));
  const leaderboard = sorted.slice(0, 5);
  const me = getOptionalUser(req);
  if (me) {
    const meEntry = sorted.find((entry) => entry.id === me.id);
    if (meEntry && !leaderboard.some((entry) => entry.id === meEntry.id)) {
      leaderboard.push(meEntry);
    }
  }
  res.json({ leaderboard });
});

app.post('/api/score', authRequired, (req, res) => {
  const delta = Number(req.body?.delta ?? 0);
  if (!Number.isFinite(delta) || delta === 0) {
    return res.status(400).json({ message: 'A non-zero numeric delta is required' });
  }
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  user.score = Math.max(0, (user.score || 0) + delta);
  if (delta > 0) {
    user.streak = (user.streak || 0) + 1;
  }
  writeDb(db);
  const leaderboard = db.users
    .map(sanitizeUser)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
  res.json({ user: sanitizeUser(user), leaderboard });
});

app.get('/api/admin/stats', adminRequired, (_req, res) => {
  const db = readDb();
  const users = db.users || [];
  const today = new Date().toISOString().slice(0, 10);
  const todayPuzzle = db.dailyPuzzles.find((entry) => entry.date === today) || null;
  const totalScore = users.reduce((sum, user) => sum + (user.score || 0), 0);
  const activePlayers = users.filter((user) => (user.score || 0) > 0).length;
  res.json({
    stats: {
      totalUsers: users.filter((user) => (user.role || 'player') !== 'admin').length,
      adminUsers: users.filter((user) => (user.role || 'player') === 'admin').length,
      totalScore,
      activePlayers,
      totalPuzzles: db.dailyPuzzles.length,
      todayPuzzleExists: Boolean(todayPuzzle),
    },
    recentPuzzles: db.dailyPuzzles.slice(-7).reverse(),
  });
});

app.get('/api/admin/puzzles', adminRequired, (_req, res) => {
  const db = readDb();
  res.json({ puzzles: db.dailyPuzzles.slice().reverse() });
});

app.get('/api/admin/users', adminRequired, (_req, res) => {
  const db = readDb();
  const users = db.users
    .map(sanitizeUser)
    .sort((a, b) => b.score - a.score)
    .map((user, index) => ({ ...user, rank: index + 1 }));
  res.json({ users });
});

app.post('/api/admin/users', adminRequired, (req, res) => {
  const { email, username, password, role = 'admin' } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedUsername = String(username || '').trim();
  const normalizedRole = String(role || 'admin').trim().toLowerCase();

  if (!normalizedEmail && !normalizedUsername) {
    return res.status(400).json({ message: 'Provide an email or username' });
  }

  const db = readDb();
  const existing = db.users.find(
    (user) => user.email === normalizedEmail || user.username.toLowerCase() === normalizedUsername.toLowerCase()
  );

  if (existing) {
    existing.role = normalizedRole === 'superuser' ? 'admin' : normalizedRole;
    if (password) {
      const newPassword = String(password).trim();
      if (newPassword.length < 8) {
        return res.status(400).json({ message: 'Passwords must be at least 8 characters' });
      }
      existing.passwordHash = bcrypt.hashSync(newPassword, 10);
    }
    writeDb(db);
    return res.json({ user: sanitizeUser(existing) });
  }

  if (!normalizedEmail || !normalizedUsername) {
    return res.status(400).json({ message: 'Email and username are required to create a new admin' });
  }

  const safePassword = String(password || '').trim();
  if (safePassword.length < 8) {
    return res.status(400).json({ message: 'Provide a password with at least 8 characters' });
  }

  const duplicate = db.users.find((user) => user.email === normalizedEmail || user.username.toLowerCase() === normalizedUsername.toLowerCase());
  if (duplicate) {
    return res.status(409).json({ message: 'Email or username already exists' });
  }

  const user = {
    id: db.nextId,
    username: normalizedUsername,
    email: normalizedEmail,
    passwordHash: bcrypt.hashSync(safePassword, 10),
    score: 0,
    streak: 0,
    role: normalizedRole === 'superuser' ? 'admin' : normalizedRole,
  };
  db.nextId += 1;
  db.users.push(user);
  writeDb(db);
  res.status(201).json({ user: sanitizeUser(user) });
});

app.post('/api/admin/puzzles', adminRequired, (req, res) => {
  const { date, pyramidTargets, crypticSolution, crypticClues, hint } = req.body || {};
  const normalizedDate = String(date || new Date().toISOString().slice(0, 10));
  const normalizedPyramidTargets = Array.isArray(pyramidTargets)
    ? pyramidTargets.map((word) => String(word).trim().toUpperCase()).filter(Boolean)
    : [];
  const normalizedCrypticSolution = Array.isArray(crypticSolution)
    ? crypticSolution.map((word) => String(word).trim().toUpperCase()).filter(Boolean)
    : [];
  const normalizedCrypticClues = Array.isArray(crypticClues)
    ? crypticClues.map((clue) => String(clue).trim()).filter(Boolean)
    : [];

  if (normalizedPyramidTargets.length !== 4) {
    return res.status(400).json({ message: 'Provide exactly 4 pyramid words' });
  }
  if (normalizedCrypticSolution.length !== 4 || normalizedCrypticSolution.some((word) => word.length !== 4)) {
    return res.status(400).json({ message: 'Provide exactly 4 cryptic solution words of 4 letters each' });
  }
  if (normalizedCrypticClues.length !== 4) {
    return res.status(400).json({ message: 'Provide exactly 4 cryptic clues' });
  }

  const db = readDb();
  const entry = {
    date: normalizedDate,
    pyramidTargets: normalizedPyramidTargets,
    crypticSolution: normalizedCrypticSolution,
    crypticClues: normalizedCrypticClues,
    hint: String(hint || '').trim(),
  };
  const existingIndex = db.dailyPuzzles.findIndex((item) => item.date === normalizedDate);
  if (existingIndex >= 0) {
    db.dailyPuzzles[existingIndex] = entry;
  } else {
    db.dailyPuzzles.push(entry);
  }
  writeDb(db);
  res.status(201).json({ puzzle: entry, puzzles: db.dailyPuzzles.slice().reverse() });
});

app.listen(PORT, () => {
  ensureDataFile();
  console.log(`ELS backend running on http://localhost:${PORT}`);
});
