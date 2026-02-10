const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const app = express();
const session = require("express-session");

const PORT = process.env.PORT || 3001;

// Middleware
app.set("trust proxy", 1);

// ✅ 세션 먼저
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// ✅ 그 다음 passport
app.use(passport.initialize());
app.use(passport.session());
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    (accessToken, refreshToken, profile, done) => done(null, profile)
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// 기타 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve static files (index.html, css, js)

// Database Setup
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Error opening database ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create table if not exists
        db.run(`CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            date TEXT,
            createdAt TEXT,
            priority TEXT DEFAULT 'low',
            completed INTEGER DEFAULT 0
        )`, (err) => {
            // Migration: Add priority column if it doesn't exist (for existing DB)
            if (!err) {
                db.run(`ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'low'`, (err) => {
                    // Ignore error if column already exists
                });
            }
        });
    }
});

// API Endpoints

// GET all tasks
app.get('/api/tasks', (req, res) => {
    const { startDate, endDate } = req.query;
    let query = "SELECT * FROM tasks";
    const params = [];

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        // Convert integer completed to boolean for frontend
        const tasks = rows.map(task => ({
            ...task,
            completed: !!task.completed,
            priority: task.priority || 'low'
        }));
        res.json({
            "message": "success",
            "data": tasks
        });
    });
});

// POST new task
app.post('/api/tasks', (req, res) => {
    const { text, date, createdAt, priority } = req.body;
    const sql = 'INSERT INTO tasks (text, date, createdAt, priority, completed) VALUES (?,?,?,?,?)';
    const params = [text, date, createdAt, priority || 'low', 0];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": {
                id: this.lastID,
                text,
                date,
                createdAt,
                priority: priority || 'low',
                completed: false
            }
        });
    });
});

// PATCH update task (toggle complete)
// PATCH update task (toggle complete or edit content)
app.patch('/api/tasks/:id', (req, res) => {
    const { text, date, completed, priority } = req.body;

    let updates = [];
    let params = [];

    if (text !== undefined) {
        updates.push("text = ?");
        params.push(text);
    }
    if (date !== undefined) {
        updates.push("date = ?");
        params.push(date);
    }
    if (priority !== undefined) {
        updates.push("priority = ?");
        params.push(priority);
    }
    if (completed !== undefined) {
        updates.push("completed = ?");
        params.push(completed ? 1 : 0);
    }

    if (updates.length === 0) {
        res.status(400).json({ "error": "No fields to update" });
        return;
    }

    params.push(req.params.id);

    const sql = `UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`;

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "changes": this.changes
        });
    });
});

// DELETE task
app.delete('/api/tasks/:id', (req, res) => {
    const sql = 'DELETE FROM tasks WHERE id = ?';
    const params = [req.params.id];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "deleted", changes: this.changes });
    });
});
app.get('/health', (req, res) => {
  res.json({ ok: true });
});
// Google 로그인 시작
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// Google 로그인 콜백
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => res.redirect("/")
);

// Start Server
app.listen(PORT, '0.0.0.0', () => console.log(`Server on ${PORT}`));
