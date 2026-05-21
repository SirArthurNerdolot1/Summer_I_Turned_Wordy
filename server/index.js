const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch {
  nodemailer = null;
}

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'lingodaily-dev-secret';
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const PASSWORD_RESET_TOKEN_TTL_MINUTES = Math.max(5, Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES) || 60);
const PASSWORD_RESET_URL_BASE = process.env.PASSWORD_RESET_URL_BASE || process.env.CLIENT_URL || 'http://localhost:5173/reset-password';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeUsername(value) {
  return String(value || '').trim();
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

function buildResetLink(token) {
  const baseUrl = new URL(PASSWORD_RESET_URL_BASE);
  baseUrl.searchParams.set('token', token);
  return baseUrl.toString();
}

function getSmtpTransportConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;

  return {
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  };
}

async function deliverPasswordResetEmail(user, resetLink) {
  const fromAddress = process.env.SMTP_FROM || process.env.MAIL_FROM || process.env.EMAIL_FROM || 'no-reply@localhost';
  const smtpConfig = getSmtpTransportConfig();

  if (smtpConfig && nodemailer) {
    const transporter = nodemailer.createTransport(smtpConfig);
    await transporter.sendMail({
      from: fromAddress,
      to: user.email,
      subject: 'Reset your password',
      text: `Reset your password using this link: ${resetLink}\n\nThis link expires in ${PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes.`,
      html: `<p>Reset your password using this link:</p><p><a href="${resetLink}">${resetLink}</a></p><p>This link expires in ${PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes.</p>`,
    });
    return { deliveryMode: 'smtp' };
  }

  console.log(`[Password Reset] ${user.email}: ${resetLink}`);
  return { deliveryMode: 'log' };
}

function findUserByLoginIdentifier(db, identifier) {
  const normalizedIdentifier = String(identifier || '').trim();
  if (!normalizedIdentifier) {
    return null;
  }

  const normalizedEmail = normalizedIdentifier.toLowerCase();
  return (
    db.users.find((user) => normalizeUsername(user.username).toLowerCase() === normalizedIdentifier.toLowerCase()) ||
    db.users.find((user) => normalizeEmail(user.email) === normalizedEmail)
  );
}

function findUserByResetToken(db, token) {
  if (!token) {
    return null;
  }

  const tokenHash = hashResetToken(token);
  return (
    db.users.find((user) => {
      const storedTokenHash = user.passwordReset?.tokenHash;
      const expiresAt = Number(user.passwordReset?.expiresAt || 0);
      return storedTokenHash && storedTokenHash === tokenHash && expiresAt > Date.now();
    }) || null
  );
}

const DAILY_FALLBACK_PUZZLES = [
  {
    pyramidTargets: ['SUN', 'SAND', 'SHAND', 'SHOULD'],
    crypticSolution: ['CODE', 'WORD', 'PLAY', 'MATH'],
    crypticClues: [
      'Program text hidden in plain sight (4)',
      'A unit of language and meaning (4)',
      'Engage in a game or contest (4)',
      'Numerical reasoning and logic (4)',
    ],
    hint: 'Look for short, familiar building blocks and hidden wordplay.',
  },
  {
    pyramidTargets: ['MAP', 'MATE', 'MATER', 'MATTER'],
    crypticSolution: ['CLUE', 'GRID', 'NOTE', 'RISE'],
    crypticClues: [
      'A cryptic hint for solving a puzzle (4)',
      'The crossword layout itself (4)',
      'A short reminder written down (4)',
      'Move upward, or what these games do daily (4)',
    ],
    hint: 'Check for progression, anagrams, and smooth letter chains.',
  },
  {
    pyramidTargets: ['PEA', 'PEAR', 'SPEAR', 'SPECIAL'],
    crypticSolution: ['TIME', 'WIND', 'HINT', 'LINK'],
    crypticClues: [
      'What daily puzzles reset to at midnight (4)',
      'Air in motion, or what a clue may do (4)',
      'A small clue or tip (4)',
      'A connection between pieces (4)',
    ],
    hint: 'Use the date to pick a consistent but fresh daily set.',
  },
  {
    pyramidTargets: ['BEE', 'BEAN', 'BREAD', 'BROADER'],
    crypticSolution: ['LAMP', 'VAST', 'DAWN', 'MIND'],
    crypticClues: [
      'A source of light in the room (4)',
      'Wide in scope (4)',
      'The start of day, and the reset point (4)',
      'What puzzle fans keep sharp (4)',
    ],
    hint: 'Each answer should feel like a clean daily starter set.',
  },
];

function getLocalDateKey(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function hashDateKey(dateKey) {
  return Array.from(dateKey).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function normalizePuzzleWord(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizePuzzleClue(value) {
  return String(value || '').trim();
}

function normalizeMiniCrypticEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const answer = normalizePuzzleWord(entry.answer ?? entry.solution ?? entry.word);
      const clue = normalizePuzzleClue(entry.clue ?? entry.text);
      if (!answer || !clue) {
        return null;
      }

      return {
        number: index + 1,
        answer,
        clue,
      };
    })
    .filter(Boolean);
}

function buildMiniCrypticRecord(puzzle) {
  const richMiniCryptic = puzzle?.miniCryptic && typeof puzzle.miniCryptic === 'object' ? puzzle.miniCryptic : null;
  const legacyAcrossAnswers = Array.isArray(puzzle?.crypticSolution)
    ? puzzle.crypticSolution.map(normalizePuzzleWord).filter(Boolean)
    : [];
  const legacyAcrossClues = Array.isArray(puzzle?.crypticClues)
    ? puzzle.crypticClues.map(normalizePuzzleClue).filter(Boolean)
    : [];

  if (richMiniCryptic) {
    const size = Number(richMiniCryptic.size || richMiniCryptic.gridSize || 4);
    const across = normalizeMiniCrypticEntries(richMiniCryptic.across || []);
    const down = normalizeMiniCrypticEntries(richMiniCryptic.down || []);

    if (size !== 4) {
      return { error: 'Mini cryptics must be 4x4 puzzles' };
    }
    if (across.length !== 4 || down.length !== 4) {
      return { error: 'Provide exactly 4 across clues and 4 down clues' };
    }
    if (across.some((entry) => entry.answer.length !== 4) || down.some((entry) => entry.answer.length !== 4)) {
      return { error: 'Across and down answers must each be exactly 4 letters' };
    }
    if (across.some((entry) => /[^A-Z]/.test(entry.answer)) || down.some((entry) => /[^A-Z]/.test(entry.answer))) {
      return { error: 'Across and down answers must contain letters only' };
    }

    const grid = across.map((entry) => entry.answer.split(''));
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        if (grid[row][col] !== down[col].answer[row]) {
          return { error: 'Across and down answers must intersect consistently' };
        }
      }
    }

    return {
      size: 4,
      grid,
      across,
      down,
    };
  }

  if (legacyAcrossAnswers.length === 4) {
    return {
      size: 4,
      grid: legacyAcrossAnswers.map((word) => word.split('')),
      across: legacyAcrossAnswers.map((answer, index) => ({
        number: index + 1,
        answer,
        clue: legacyAcrossClues[index] || '',
      })),
      down: [],
    };
  }

  return {
    size: 4,
    grid: [
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
    ],
    across: [],
    down: [],
  };
}

function serializeDailyPuzzle(puzzle, dateStr) {
  const miniCryptic = buildMiniCrypticRecord(puzzle);
  const crypticSolution = miniCryptic.across.map((entry) => entry.answer);
  const crypticClues = miniCryptic.across.map((entry) => entry.clue);
  const pyramidTargets = Array.isArray(puzzle?.pyramidTargets)
    ? puzzle.pyramidTargets.map(normalizePuzzleWord).filter(Boolean)
    : [];

  const letters = Array.from(
    new Set(
      crypticSolution
        .join('')
        .split('')
        .filter(Boolean)
    )
  ).sort();

  return {
    date: dateStr,
    pyramidTargets,
    crypticSolution,
    crypticClues,
    miniCryptic,
    streetScrabble: {
      letters,
      validAnswers: crypticSolution,
      timeLimit: 180,
    },
    hint: String(puzzle?.hint || '').trim(),
    timestamp: getMidnightUTC(dateStr),
  };
}

function serializeAdminPuzzle(puzzle) {
  const dateStr = String(puzzle?.date || getLocalDateKey());
  const dailyPuzzle = serializeDailyPuzzle(puzzle, dateStr);
  return {
    date: dailyPuzzle.date,
    pyramidTargets: dailyPuzzle.pyramidTargets,
    crypticSolution: dailyPuzzle.crypticSolution,
    crypticClues: dailyPuzzle.crypticClues,
    miniCryptic: dailyPuzzle.miniCryptic,
    hint: dailyPuzzle.hint,
  };
}

function createFallbackPuzzle(dateKey) {
  const index = hashDateKey(dateKey) % DAILY_FALLBACK_PUZZLES.length;
  const template = DAILY_FALLBACK_PUZZLES[index];
  return {
    date: dateKey,
    pyramidTargets: template.pyramidTargets,
    crypticSolution: template.crypticSolution,
    crypticClues: template.crypticClues,
    hint: template.hint,
    source: 'generated',
  };
}

function resolveDailyPuzzle(db, dateKey = getLocalDateKey()) {
  return db.dailyPuzzles.find((entry) => entry.date === dateKey) || createFallbackPuzzle(dateKey);
}

function getMidnightUTC(dateStr) {
  // Parse YYYY-MM-DD and return timestamp for midnight UTC of that date
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)).getTime();
}

function buildDailyPuzzleResponse(puzzle, dateStr) {
  return serializeDailyPuzzle(puzzle, dateStr);
}

function ensureDataFile() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    const initial = {
      users: [
        { id: 1, username: 'Ada', email: 'ada@example.com', passwordHash: bcrypt.hashSync('password123', 10), score: 1200, streak: 8, role: 'player', globalScore: 1200, dailyScores: {}, createdAt: new Date().toISOString() },
        { id: 2, username: 'Ben', email: 'ben@example.com', passwordHash: bcrypt.hashSync('password123', 10), score: 980, streak: 5, role: 'player', globalScore: 980, dailyScores: {}, createdAt: new Date().toISOString() },
        { id: 3, username: 'Cara', email: 'cara@example.com', passwordHash: bcrypt.hashSync('password123', 10), score: 720, streak: 4, role: 'player', globalScore: 720, dailyScores: {}, createdAt: new Date().toISOString() },
        { id: 4, username: 'Diego', email: 'diego@example.com', passwordHash: bcrypt.hashSync('password123', 10), score: 540, streak: 3, role: 'player', globalScore: 540, dailyScores: {}, createdAt: new Date().toISOString() },
        { id: 5, username: 'Elly', email: 'elly@example.com', passwordHash: bcrypt.hashSync('password123', 10), score: 400, streak: 2, role: 'player', globalScore: 400, dailyScores: {}, createdAt: new Date().toISOString() },
        { id: 6, username: 'Admin', email: 'admin@lingodaily.com', passwordHash: bcrypt.hashSync('admin12345', 10), score: 0, streak: 0, role: 'admin', globalScore: 0, dailyScores: {}, createdAt: new Date().toISOString() },
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

// ============================================================================
// LEADERBOARD HELPER FUNCTIONS
// ============================================================================

/**
 * Validate date format YYYY-MM-DD
 */
function isValidDateFormat(dateStr) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

/**
 * Validate UUID format (basic check)
 */
function isValidUUID(uuid) {
  return /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(String(uuid));
}

/**
 * Validate score is positive number
 */
function isValidScore(score) {
  return Number.isFinite(score) && score > 0;
}

/**
 * Get user by ID
 */
function getUserById(userId) {
  const db = readDb();
  return db.users.find((u) => u.id === userId);
}

/**
 * Initialize user leaderboard fields if missing
 */
function ensureUserLeaderboardFields(user) {
  if (!user.globalScore) {
    user.globalScore = user.score || 0;
  }
  if (!user.dailyScores) {
    user.dailyScores = {};
  }
  if (!user.createdAt) {
    user.createdAt = new Date().toISOString();
  }
  return user;
}

/**
 * Calculate rank for a user in a scope
 * @param {number} userId - User ID
 * @param {string} scope - 'daily' or 'global'
 * @param {Array} users - Array of users
 * @param {string} dateStr - Date for daily scope (YYYY-MM-DD)
 * @returns {Object} { rank, totalPlayers, userScore, percentile, nextRankScore }
 */
function calculateRank(userId, scope, users, dateStr = getLocalDateKey()) {
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return null;
  }

  // Build ranking list based on scope
  let rankingList = [];
  
  if (scope === 'daily') {
    // Get today's score for each user
    rankingList = users
      .map((u) => ({
        id: u.id,
        score: u.dailyScores?.[dateStr]?.totalScore || 0,
        completedAt: u.dailyScores?.[dateStr]?.completedAt,
        createdAt: u.createdAt,
      }))
      .filter((u) => u.score > 0); // Only users who played today
  } else {
    // Global scope
    rankingList = users
      .map((u) => ({
        id: u.id,
        score: u.globalScore || 0,
        createdAt: u.createdAt,
      }))
      .filter((u) => u.score > 0); // Only users with positive scores
  }

  // Sort by score descending, then by createdAt ascending (earliest first for ties)
  rankingList.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  // Find user's rank (1-indexed)
  const userRankEntry = rankingList.find((u) => u.id === userId);
  if (!userRankEntry) {
    return {
      rank: rankingList.length + 1,
      totalPlayers: rankingList.length,
      userScore: scope === 'daily' ? user.dailyScores?.[dateStr]?.totalScore || 0 : user.globalScore || 0,
      percentile: 0,
      nextRankScore: rankingList.length > 0 ? rankingList[0].score : 0,
    };
  }

  const rank = rankingList.findIndex((u) => u.id === userId) + 1;
  const totalPlayers = rankingList.length;
  const userScore = userRankEntry.score;
  const percentile = Math.round(((totalPlayers - rank + 1) / totalPlayers) * 100);

  // Find next rank score (score needed to beat rank above)
  const nextRankScore = rank > 1 ? rankingList[rank - 2].score : userScore;

  return {
    rank,
    totalPlayers,
    userScore,
    percentile,
    nextRankScore,
  };
}

/**
 * Get daily leaderboard for a specific date
 */
function getDailyLeaderboard(dateStr, limit = 50, offset = 0) {
  const db = readDb();
  const leaderboard = db.users
    .map((user) => {
      const dailyData = user.dailyScores?.[dateStr] || { totalScore: 0, completed: false };
      return {
        userId: user.id,
        username: user.username,
        score: dailyData.totalScore,
        gameCount: Object.keys(dailyData.gameScores || {}).length,
        completedAt: dailyData.completedAt,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Tie-breaker: earliest completion time
      const aTime = new Date(a.completedAt || '9999-12-31').getTime();
      const bTime = new Date(b.completedAt || '9999-12-31').getTime();
      return aTime - bTime;
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  const total = leaderboard.length;
  const paginatedLeaderboard = leaderboard.slice(offset, offset + limit);

  return {
    date: dateStr,
    leaderboard: paginatedLeaderboard,
    totalPlayers: total,
    limit,
    offset,
  };
}

/**
 * Get global leaderboard
 */
function getGlobalLeaderboard(limit = 50, offset = 0) {
  const db = readDb();
  const leaderboard = db.users
    .map((user) => {
      const totalDaysPlayed = Object.keys(user.dailyScores || {}).length;
      const avgDailyScore =
        totalDaysPlayed > 0
          ? Math.round(
              Object.values(user.dailyScores || {}).reduce((sum, day) => sum + (day.totalScore || 0), 0) /
                totalDaysPlayed
            )
          : 0;
      return {
        userId: user.id,
        username: user.username,
        globalScore: user.globalScore || 0,
        totalDaysPlayed,
        avgDailyScore,
      };
    })
    .filter((entry) => entry.globalScore > 0)
    .sort((a, b) => {
      if (b.globalScore !== a.globalScore) {
        return b.globalScore - a.globalScore;
      }
      return a.totalDaysPlayed - b.totalDaysPlayed; // Tie-breaker: more days played is better
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  const total = leaderboard.length;
  const paginatedLeaderboard = leaderboard.slice(offset, offset + limit);

  return {
    leaderboard: paginatedLeaderboard,
    totalPlayers: total,
    limit,
    offset,
  };
}

/**
 * Update user score with a game result
 */
function updateUserScore(userId, gameResult) {
  const db = readDb();
  const user = db.users.find((u) => u.id === Number(userId));
  
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  const { gameName, score, date = getLocalDateKey() } = gameResult;

  // Ensure user has leaderboard fields
  ensureUserLeaderboardFields(user);

  // Initialize daily score entry if needed
  if (!user.dailyScores[date]) {
    user.dailyScores[date] = {
      gameScores: {},
      totalScore: 0,
      completed: false,
      completedAt: new Date().toISOString(),
    };
  }

  // Update game score
  user.dailyScores[date].gameScores[gameName] = score;

  // Recalculate daily total
  const dailyTotal = Object.values(user.dailyScores[date].gameScores).reduce((sum, s) => sum + s, 0);
  user.dailyScores[date].totalScore = dailyTotal;
  user.dailyScores[date].completed = true;
  user.dailyScores[date].completedAt = new Date().toISOString();

  // Update global score
  user.globalScore = Object.values(user.dailyScores).reduce((sum, day) => sum + (day.totalScore || 0), 0);

  // Also update legacy score field for backward compatibility
  user.score = user.globalScore;

  writeDb(db);

  // Calculate new rank
  const rankInfo = calculateRank(userId, 'global', db.users);

  return {
    success: true,
    globalScore: user.globalScore,
    dailyScore: user.dailyScores[date].totalScore,
    newGlobalRank: rankInfo?.rank || 0,
  };
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
  res.json({ status: 'ok' });
});

app.get('/api/daily-puzzle', (req, res) => {
  const dateParam = req.query.date;
  
  // Validate and parse date parameter if provided
  let dateStr = getLocalDateKey();
  
  if (dateParam) {
    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
    }
    dateStr = dateParam;
  }
  
  const db = readDb();
  const puzzle = resolveDailyPuzzle(db, dateStr);
  const response = buildDailyPuzzleResponse(puzzle, dateStr);
  
  res.json(response);
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, username } = req.body || {};
  if (!email || !password || !username) {
    return res.status(400).json({ message: 'Email, password, and username are required' });
  }
  const db = readDb();
  const normalizedEmail = normalizeEmail(email);
  const normalizedUsername = normalizeUsername(username);
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
    globalScore: 0,
    dailyScores: {},
    createdAt: new Date().toISOString(),
  };
  db.nextId += 1;
  db.users.push(user);
  writeDb(db);
  const token = signUser(user);
  res.status(201).json({ token, user: sanitizeUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password, username, identifier } = req.body || {};
  const loginIdentifier = username || email || identifier;
  if (!loginIdentifier || !password) {
    return res.status(400).json({ message: 'Username or email and password are required' });
  }
  const db = readDb();
  const user = findUserByLoginIdentifier(db, loginIdentifier);
  if (!user || !bcrypt.compareSync(String(password), user.passwordHash)) {
    return res.status(401).json({ message: 'Invalid username, email, or password' });
  }
  const token = signUser(user);
  res.json({ token, user: sanitizeUser(user) });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const db = readDb();
  const user = db.users.find((entry) => normalizeEmail(entry.email) === normalizedEmail);
  if (!user) {
    return res.json({ message: 'If the email exists, a reset link has been generated.' });
  }

  const resetToken = generateResetToken();
  const expiresAt = Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000;
  user.passwordReset = {
    tokenHash: hashResetToken(resetToken),
    expiresAt,
    requestedAt: new Date().toISOString(),
  };
  writeDb(db);

  const resetLink = buildResetLink(resetToken);

  try {
    const delivery = await deliverPasswordResetEmail(user, resetLink);
    return res.json({
      message: 'Password reset link generated',
      resetLink,
      expiresAt,
      deliveryMode: delivery.deliveryMode,
    });
  } catch (error) {
    console.error('[Password Reset] Failed to send email, falling back to log:', error.message);
    console.log(`[Password Reset] ${user.email}: ${resetLink}`);
    return res.json({
      message: 'Password reset link generated',
      resetLink,
      expiresAt,
      deliveryMode: 'log',
    });
  }
});

app.post('/api/auth/reset-password', (req, res) => {
  const { token, newPassword } = req.body || {};
  const safeToken = String(token || '').trim();
  const safePassword = String(newPassword || '').trim();

  if (!safeToken || safePassword.length < 8) {
    return res.status(400).json({ message: 'Reset token and a new password with at least 8 characters are required' });
  }

  const db = readDb();
  const user = findUserByResetToken(db, safeToken);
  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired reset token' });
  }

  user.passwordHash = bcrypt.hashSync(safePassword, 10);
  delete user.passwordReset;
  writeDb(db);

  res.json({ message: 'Password has been reset successfully' });
});

app.get('/api/puzzles/today', (_req, res) => {
  const db = readDb();
  const today = getLocalDateKey();
  const puzzle = resolveDailyPuzzle(db, today);
  res.json({ puzzle: serializeAdminPuzzle(puzzle) });
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

// ============================================================================
// LEADERBOARD API ENDPOINTS
// ============================================================================

/**
 * POST /api/game-result
 * Save a game result and update user scores
 */
app.post('/api/game-result', authRequired, (req, res) => {
  const { gameName, score, timeSeconds, date, gameId } = req.body || {};

  // Validation
  if (!gameName || !isValidScore(score)) {
    return res.status(400).json({ message: 'gameName and positive score are required' });
  }

  const dateStr = date || getLocalDateKey();
  if (!isValidDateFormat(dateStr)) {
    return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
  }

  const user = getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const result = updateUserScore(req.user.id, {
    gameName: gameName.toLowerCase().replace(/\s+/g, '-'),
    score: Math.floor(score),
    date: dateStr,
    gameId: gameId || gameName.toLowerCase().replace(/\s+/g, '-'),
    timeSeconds,
  });

  if (!result.success) {
    return res.status(500).json({ message: result.error });
  }

  console.log(`[Game Result] User ${user.username} scored ${score} in ${gameName} on ${dateStr}`);
  res.json({
    success: true,
    globalScore: result.globalScore,
    dailyScore: result.dailyScore,
    newGlobalRank: result.newGlobalRank,
  });
});

/**
 * GET /api/leaderboard/daily
 * Get daily leaderboard for a specific date
 * Query params: ?date=YYYY-MM-DD&limit=50&offset=0
 */
app.get('/api/leaderboard/daily', (req, res) => {
  const dateStr = req.query.date || getLocalDateKey();
  const limit = Math.min(Number(req.query.limit) || 50, 100); // Max 100 per request
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  // Validate date
  if (!isValidDateFormat(dateStr)) {
    return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
  }

  const leaderboardData = getDailyLeaderboard(dateStr, limit, offset);
  res.json(leaderboardData);
});

/**
 * GET /api/leaderboard/global
 * Get global leaderboard
 * Query params: ?limit=50&offset=0
 */
app.get('/api/leaderboard/global', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100); // Max 100 per request
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const leaderboardData = getGlobalLeaderboard(limit, offset);
  res.json(leaderboardData);
});

/**
 * GET /api/user/:userId/rank
 * Get user's rank in a specific scope
 * Query params: ?scope=daily|global&date=YYYY-MM-DD (date only for daily scope)
 */
app.get('/api/user/:userId/rank', (req, res) => {
  const userId = Number(req.params.userId);
  const scope = (req.query.scope || 'global').toLowerCase();
  const dateStr = req.query.date || getLocalDateKey();

  // Validation
  if (!Number.isFinite(userId)) {
    return res.status(400).json({ message: 'Invalid userId' });
  }

  if (scope !== 'daily' && scope !== 'global') {
    return res.status(400).json({ message: 'scope must be "daily" or "global"' });
  }

  if (scope === 'daily' && !isValidDateFormat(dateStr)) {
    return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
  }

  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const rankInfo = calculateRank(userId, scope, db.users, dateStr);
  if (!rankInfo) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json({
    userId,
    username: user.username,
    rank: rankInfo.rank,
    totalPlayers: rankInfo.totalPlayers,
    userScore: rankInfo.userScore,
    percentile: rankInfo.percentile,
    nextRankScore: rankInfo.nextRankScore,
    scope,
  });
});

/**
 * GET /api/user/:userId/stats
 * Get detailed user stats
 */
app.get('/api/user/:userId/stats', (req, res) => {
  const userId = Number(req.params.userId);

  if (!Number.isFinite(userId)) {
    return res.status(400).json({ message: 'Invalid userId' });
  }

  const db = readDb();
  const user = db.users.find((u) => u.id === Number(userId));
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  ensureUserLeaderboardFields(user);

  // Calculate stats
  const dailyScoresArray = Object.values(user.dailyScores || {}).filter((day) => day.totalScore > 0);
  const totalGamesPlayed = dailyScoresArray.reduce((sum, day) => sum + Object.keys(day.gameScores || {}).length, 0);
  const averageScore = dailyScoresArray.length > 0 ? Math.round(user.globalScore / dailyScoresArray.length) : 0;
  const bestScore = dailyScoresArray.length > 0 ? Math.max(...dailyScoresArray.map((day) => day.totalScore)) : 0;

  // Calculate daily streak
  let dailyStreak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().slice(0, 10);
    if (user.dailyScores?.[dateStr]?.totalScore > 0) {
      dailyStreak++;
    } else if (i > 0) {
      break;
    }
  }

  // Find last played date
  const lastPlayedDate = dailyScoresArray.length > 0 ? Object.keys(user.dailyScores || {}).sort().reverse()[0] : null;

  // Get global rank
  const globalRankInfo = calculateRank(userId, 'global', db.users);

  res.json({
    userId,
    username: user.username,
    email: user.email,
    globalRank: globalRankInfo?.rank || 0,
    globalScore: user.globalScore || 0,
    dailyStreak,
    totalGamesPlayed,
    averageScore,
    bestScore,
    totalDaysPlayed: dailyScoresArray.length,
    lastPlayedDate,
    joinedDate: user.createdAt,
  });
});

app.get('/api/admin/stats', adminRequired, (_req, res) => {
  const db = readDb();
  const users = db.users || [];
  const today = getLocalDateKey();
  const todayPuzzle = resolveDailyPuzzle(db, today);
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
    recentPuzzles: db.dailyPuzzles.slice(-7).reverse().map((puzzle) => serializeAdminPuzzle(puzzle)),
  });
});

app.get('/api/admin/puzzles', adminRequired, (_req, res) => {
  const db = readDb();
  res.json({ puzzles: db.dailyPuzzles.slice().reverse().map((puzzle) => serializeAdminPuzzle(puzzle)) });
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
    globalScore: 0,
    dailyScores: {},
    createdAt: new Date().toISOString(),
  };
  db.nextId += 1;
  db.users.push(user);
  writeDb(db);
  res.status(201).json({ user: sanitizeUser(user) });
});

app.post('/api/admin/puzzles', adminRequired, (req, res) => {
  const { date, pyramidTargets, crypticSolution, crypticClues, miniCryptic, hint } = req.body || {};
  const normalizedDate = String(date || getLocalDateKey());
  if (!isValidDateFormat(normalizedDate)) {
    return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
  }
  const normalizedPyramidTargets = Array.isArray(pyramidTargets)
    ? pyramidTargets.map((word) => String(word).trim().toUpperCase()).filter(Boolean)
    : [];
  const incomingMiniCryptic = miniCryptic && typeof miniCryptic === 'object' ? miniCryptic : null;
  let normalizedCrypticSolution = Array.isArray(crypticSolution)
    ? crypticSolution.map((word) => String(word).trim().toUpperCase()).filter(Boolean)
    : [];
  let normalizedCrypticClues = Array.isArray(crypticClues)
    ? crypticClues.map((clue) => String(clue).trim()).filter(Boolean)
    : [];

  if (normalizedPyramidTargets.length !== 4) {
    return res.status(400).json({ message: 'Provide exactly 4 pyramid words' });
  }

  let normalizedMiniCryptic = null;
  if (incomingMiniCryptic) {
    normalizedMiniCryptic = buildMiniCrypticRecord({ miniCryptic: incomingMiniCryptic });
    if (normalizedMiniCryptic.error) {
      return res.status(400).json({ message: normalizedMiniCryptic.error });
    }
    normalizedCrypticSolution = normalizedMiniCryptic.across.map((entry) => entry.answer);
    normalizedCrypticClues = normalizedMiniCryptic.across.map((entry) => entry.clue);
  } else {
    if (normalizedCrypticSolution.length !== 4 || normalizedCrypticSolution.some((word) => word.length !== 4)) {
      return res.status(400).json({ message: 'Provide exactly 4 cryptic solution words of 4 letters each' });
    }
    if (normalizedCrypticClues.length !== 4) {
      return res.status(400).json({ message: 'Provide exactly 4 cryptic clues' });
    }
    normalizedMiniCryptic = buildMiniCrypticRecord({
      crypticSolution: normalizedCrypticSolution,
      crypticClues: normalizedCrypticClues,
    });
  }

  if (normalizedMiniCryptic.error) {
    return res.status(400).json({ message: normalizedMiniCryptic.error });
  }

  const db = readDb();
  const entry = {
    date: normalizedDate,
    pyramidTargets: normalizedPyramidTargets,
    crypticSolution: normalizedCrypticSolution,
    crypticClues: normalizedCrypticClues,
    miniCryptic: normalizedMiniCryptic,
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
