const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'nexus.db'));

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      plan TEXT DEFAULT 'free',
      visits_limit INTEGER DEFAULT 6000,
      visits_used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      target_url TEXT NOT NULL,
      visits_total INTEGER NOT NULL,
      visits_sent INTEGER DEFAULT 0,
      geo TEXT DEFAULT 'ID',
      device TEXT DEFAULT 'mixed',
      traffic_source TEXT DEFAULT 'organic',
      min_duration INTEGER DEFAULT 30,
      max_duration INTEGER DEFAULT 180,
      bounce_rate INTEGER DEFAULT 30,
      pages_per_session INTEGER DEFAULT 3,
      status TEXT DEFAULT 'pending',
      proxy_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS proxies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      host TEXT NOT NULL,
      port INTEGER NOT NULL,
      username TEXT,
      password TEXT,
      protocol TEXT DEFAULT 'http',
      geo TEXT DEFAULT 'ID',
      isp TEXT,
      status TEXT DEFAULT 'active',
      last_checked DATETIME,
      latency INTEGER
    );

    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id TEXT NOT NULL,
      proxy_id INTEGER,
      status TEXT DEFAULT 'sent',
      duration INTEGER,
      pages INTEGER DEFAULT 1,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan TEXT NOT NULL,
      visits_limit INTEGER NOT NULL,
      price INTEGER NOT NULL,
      status TEXT DEFAULT 'active',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME
    );
  `);
  console.log('✅ Database initialized');
}

module.exports = { db, initDB };
