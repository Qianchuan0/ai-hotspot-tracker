import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db;
let dbPath;
let saveTimer = null;

export function getDB() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

// 延迟保存到文件，避免频繁IO
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveDB();
  }, 1000);
}

function saveDB() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error('[DB] Save failed:', err.message);
  }
}

// 执行查询的辅助方法（返回对象数组）
export function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// 执行查询（返回单行）
export function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let row = null;
  if (stmt.step()) {
    row = stmt.getAsObject();
  }
  stmt.free();
  return row;
}

// 执行写操作（INSERT/UPDATE/DELETE）
export function run(sql, params = []) {
  db.run(sql, params);
  scheduleSave();
  return {
    changes: db.getRowsModified(),
    lastInsertRowid: getLastInsertId(),
  };
}

function getLastInsertId() {
  const result = get('SELECT last_insert_rowid() as id');
  return result ? result.id : null;
}

export async function initDB() {
  const dataDir = join(__dirname, '..', 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  dbPath = join(dataDir, 'hotspot.db');

  const SQL = await initSqlJs();

  // 如果已有数据库文件则加载
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  createTables();
  console.log('[DB] SQLite initialized (sql.js)');

  // 定期自动保存
  setInterval(() => saveDB(), 30000);

  // 进程退出时保存
  process.on('exit', () => saveDB());
  process.on('SIGINT', () => { saveDB(); process.exit(0); });
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      is_active INTEGER NOT NULL DEFAULT 1
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS hotspots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url_hash TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      source TEXT NOT NULL,
      summary TEXT,
      credibility TEXT,
      credibility_score REAL,
      heat_score REAL,
      warning TEXT,
      raw_content TEXT,
      raw_metadata TEXT,
      published_at INTEGER,
      collected_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      ai_analyzed_at INTEGER
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS hotspot_keywords (
      hotspot_id INTEGER,
      keyword_id INTEGER,
      relevance_score REAL,
      PRIMARY KEY (hotspot_id, keyword_id)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hotspot_id INTEGER,
      keyword_id INTEGER,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS rss_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      last_collected_at INTEGER
    );
  `);

  scheduleSave();
}
