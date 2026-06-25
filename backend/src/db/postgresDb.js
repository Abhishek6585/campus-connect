// Postgres-backed data layer using a single generic `records` table per
// logical "table name", storing each row as JSONB. This keeps the exact
// same table/row mental model as the old jsonDb.js (all/find/findOne/
// findById/insert/update/remove/setAll) so route files only need `await`
// added — no query-shape rewrites required.
//
// Why one generic table instead of a proper relational schema per entity:
// this lets us swap the storage engine without redesigning every route's
// queries. It's a reasonable tradeoff for a small app; if this grows much
// further, migrate to dedicated tables with real columns + indexes.

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
});

let schemaReady = null;

async function ensureSchema() {
  if (schemaReady) return schemaReady;
  schemaReady = pool.query(`
    CREATE TABLE IF NOT EXISTS records (
      table_name TEXT NOT NULL,
      id INTEGER NOT NULL,
      data JSONB NOT NULL,
      PRIMARY KEY (table_name, id)
    );
    CREATE TABLE IF NOT EXISTS sequences (
      table_name TEXT PRIMARY KEY,
      next_id INTEGER NOT NULL DEFAULT 1
    );
  `);
  return schemaReady;
}

async function nextId(tableName) {
  await ensureSchema();
  const { rows } = await pool.query(
    `INSERT INTO sequences (table_name, next_id) VALUES ($1, 2)
     ON CONFLICT (table_name) DO UPDATE SET next_id = sequences.next_id + 1
     RETURNING next_id - 1 AS id`,
    [tableName]
  );
  return rows[0].id;
}

async function bumpSequenceIfNeeded(tableName, id) {
  await ensureSchema();
  await pool.query(
    `INSERT INTO sequences (table_name, next_id) VALUES ($1, $2)
     ON CONFLICT (table_name) DO UPDATE SET next_id = GREATEST(sequences.next_id, $2)`,
    [tableName, id + 1]
  );
}

const db = {
  /** Get all rows in a table */
  async all(tableName) {
    await ensureSchema();
    const { rows } = await pool.query(
      'SELECT data FROM records WHERE table_name = $1 ORDER BY id ASC',
      [tableName]
    );
    return rows.map((r) => r.data);
  },

  /** Find rows matching a JS predicate (fetches all, filters in Node — fine at this scale) */
  async find(tableName, predicate) {
    const all = await db.all(tableName);
    return all.filter(predicate);
  },

  /** Find first row matching predicate */
  async findOne(tableName, predicate) {
    const all = await db.all(tableName);
    return all.find(predicate) || null;
  },

  /** Find by id */
  async findById(tableName, id) {
    await ensureSchema();
    const { rows } = await pool.query(
      'SELECT data FROM records WHERE table_name = $1 AND id = $2',
      [tableName, id]
    );
    return rows[0] ? rows[0].data : null;
  },

  /** Insert a row, auto-assigns id if not present. Returns inserted row. */
  async insert(tableName, row) {
    await ensureSchema();
    const id = row.id || (await nextId(tableName));
    if (row.id) await bumpSequenceIfNeeded(tableName, row.id);
    const newRow = { ...row, id };
    await pool.query(
      'INSERT INTO records (table_name, id, data) VALUES ($1, $2, $3)',
      [tableName, id, JSON.stringify(newRow)]
    );
    return newRow;
  },

  /** Update row by id with partial fields. Returns updated row or null. */
  async update(tableName, id, patch) {
    const existing = await db.findById(tableName, id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, id: existing.id };
    await pool.query(
      'UPDATE records SET data = $1 WHERE table_name = $2 AND id = $3',
      [JSON.stringify(updated), tableName, id]
    );
    return updated;
  },

  /** Update first row matching predicate */
  async updateWhere(tableName, predicate, patch) {
    const found = await db.findOne(tableName, predicate);
    if (!found) return null;
    return db.update(tableName, found.id, patch);
  },

  /** Delete by id. Returns true if a row was removed. */
  async remove(tableName, id) {
    await ensureSchema();
    const { rowCount } = await pool.query(
      'DELETE FROM records WHERE table_name = $1 AND id = $2',
      [tableName, id]
    );
    return rowCount > 0;
  },

  /** Replace entire table contents (used by seed scripts) */
  async setAll(tableName, rows) {
    await ensureSchema();
    await pool.query('DELETE FROM records WHERE table_name = $1', [tableName]);
    for (const row of rows) {
      const id = row.id;
      await pool.query(
        'INSERT INTO records (table_name, id, data) VALUES ($1, $2, $3)',
        [tableName, id, JSON.stringify(row)]
      );
    }
    const maxId = rows.reduce((max, r) => Math.max(max, r.id || 0), 0);
    await pool.query(
      `INSERT INTO sequences (table_name, next_id) VALUES ($1, $2)
       ON CONFLICT (table_name) DO UPDATE SET next_id = $2`,
      [tableName, maxId + 1]
    );
  },

  /** No-op for API compatibility with jsonDb.js (Postgres commits per-query already) */
  async save() {
    return true;
  },

  /** Expose pool for health checks / graceful shutdown if ever needed */
  _pool: pool,
};

module.exports = db;
