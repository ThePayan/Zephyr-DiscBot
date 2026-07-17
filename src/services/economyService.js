// src/services/economyService.js
// Global (cross-server) economy: users are keyed by their Discord user ID,
// so coins follow the user no matter which guild they play in.
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DAILY_AMOUNT = 1000;

const dataDir = path.join(__dirname, '../../data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'economy.db'));
db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id            TEXT PRIMARY KEY,
        username      TEXT,
        coins         INTEGER NOT NULL DEFAULT 0,
        last_daily    TEXT,
        daily_streak  INTEGER NOT NULL DEFAULT 0,
        games_played  INTEGER NOT NULL DEFAULT 0,
        games_won     INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_users_coins ON users (coins DESC);
`);

const stmts = {
    upsert: db.prepare(`
        INSERT INTO users (id, username) VALUES (?, ?)
        ON CONFLICT(id) DO UPDATE SET username = excluded.username
    `),
    get: db.prepare('SELECT * FROM users WHERE id = ?'),
    addCoins: db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?'),
    debit: db.prepare('UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?'),
    claimDaily: db.prepare('UPDATE users SET coins = coins + ?, last_daily = ?, daily_streak = ? WHERE id = ?'),
    recordGame: db.prepare('UPDATE users SET games_played = games_played + 1, games_won = games_won + ? WHERE id = ?'),
    top: db.prepare('SELECT id, username, coins FROM users ORDER BY coins DESC, id ASC LIMIT ?'),
    rank: db.prepare('SELECT COUNT(*) + 1 AS rank FROM users WHERE coins > (SELECT coins FROM users WHERE id = ?)')
};

function localDate(offsetDays = 0) {
    return new Date(Date.now() + offsetDays * 86_400_000).toLocaleDateString('en-CA'); // YYYY-MM-DD
}

const economy = {
    DAILY_AMOUNT,

    /** Formats a coin amount for display */
    fmt(amount) {
        return `🪙 ${amount.toLocaleString('en-US')}`;
    },

    /** Creates the user if needed and keeps their username fresh for the leaderboard */
    ensureUser(id, username) {
        stmts.upsert.run(id, username);
        return stmts.get.get(id);
    },

    getUser(id) {
        return stmts.get.get(id);
    },

    addCoins(id, amount) {
        stmts.addCoins.run(amount, id);
        return stmts.get.get(id).coins;
    },

    /** Atomically takes coins; returns false if the balance is insufficient */
    tryDebit(id, amount) {
        return stmts.debit.run(amount, id, amount).changes > 0;
    },

    /** Claims the daily reward (one per calendar day). */
    claimDaily(id) {
        const user = stmts.get.get(id);
        const today = localDate();

        const nextMidnight = new Date();
        nextMidnight.setHours(24, 0, 0, 0);
        const nextTimestamp = Math.floor(nextMidnight.getTime() / 1000);

        if (user.last_daily === today) {
            return { claimed: false, coins: user.coins, streak: user.daily_streak, nextTimestamp };
        }

        const streak = user.last_daily === localDate(-1) ? user.daily_streak + 1 : 1;
        stmts.claimDaily.run(DAILY_AMOUNT, today, streak, id);

        return {
            claimed: true,
            amount: DAILY_AMOUNT,
            coins: user.coins + DAILY_AMOUNT,
            streak,
            nextTimestamp
        };
    },

    recordGame(id, won) {
        stmts.recordGame.run(won ? 1 : 0, id);
    },

    top(limit = 10) {
        return stmts.top.all(limit);
    },

    rank(id) {
        return stmts.rank.get(id)?.rank ?? null;
    }
};

module.exports = economy;
