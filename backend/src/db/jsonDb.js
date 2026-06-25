// ⚠️ LEGACY — NOT USED ANYMORE. Kept only for reference.
//
// This was the original file-based data layer, used before the app moved to
// Postgres (see postgresDb.js, which every route now imports instead). It
// doesn't work on Vercel anyway, since serverless functions have an
// ephemeral/read-only filesystem — any writes here would vanish on the next
// request. Safe to delete this file entirely once you've confirmed
// postgresDb.js is working for you.
//
// Lightweight file-persisted JSON "database".
// No native dependencies (works in any sandboxed/offline environment).
// Each table is an array of row objects kept in memory and flushed to disk on every write.

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'db.json');

function loadRaw() {
  if (!fs.existsSync(DATA_FILE)) {
    return {};
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

let state = loadRaw();

function persist() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

function ensureTable(name) {
  if (!state[name]) {
    state[name] = { rows: [], seq: 1 };
  }
  return state[name];
}

const db = {
  /** Get all rows in a table (returns live array reference - do not mutate directly) */
  all(table) {
    return ensureTable(table).rows;
  },

  /** Find rows matching predicate */
  find(table, predicate) {
    return ensureTable(table).rows.filter(predicate);
  },

  /** Find first row matching predicate */
  findOne(table, predicate) {
    return ensureTable(table).rows.find(predicate) || null;
  },

  /** Find by id */
  findById(table, id) {
    return ensureTable(table).rows.find((r) => r.id === id) || null;
  },

  /** Insert a row, auto-assigns id if not present. Returns inserted row. */
  insert(table, row) {
    const t = ensureTable(table);
    const newRow = { id: row.id || t.seq++, ...row };
    if (!row.id) {
      // id already set above via t.seq++, make sure seq stays ahead
    } else if (row.id >= t.seq) {
      t.seq = row.id + 1;
    }
    t.rows.push(newRow);
    persist();
    return newRow;
  },

  /** Update row by id with partial fields. Returns updated row or null. */
  update(table, id, patch) {
    const t = ensureTable(table);
    const idx = t.rows.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    t.rows[idx] = { ...t.rows[idx], ...patch, id: t.rows[idx].id };
    persist();
    return t.rows[idx];
  },

  /** Update first row matching predicate */
  updateWhere(table, predicate, patch) {
    const t = ensureTable(table);
    const idx = t.rows.findIndex(predicate);
    if (idx === -1) return null;
    t.rows[idx] = { ...t.rows[idx], ...patch, id: t.rows[idx].id };
    persist();
    return t.rows[idx];
  },

  /** Delete by id */
  remove(table, id) {
    const t = ensureTable(table);
    const before = t.rows.length;
    t.rows = t.rows.filter((r) => r.id !== id);
    persist();
    return t.rows.length < before;
  },

  /** Replace entire table contents (used by seed scripts) */
  setAll(table, rows) {
    const t = ensureTable(table);
    t.rows = rows;
    t.seq = rows.reduce((max, r) => Math.max(max, (r.id || 0) + 1), 1);
    persist();
  },

  /** Force write to disk */
  save() {
    persist();
  },
};

module.exports = db;
