const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Request logging middleware for Auth endpoints
app.use((req, res, next) => {
  if (req.path.startsWith('/auth/')) {
    console.log(`[SubTrakr Auth Backend] ${req.method} ${req.path} - Payload:`, req.body || {});
  }
  next();
});

// Initialize SQLite database using native node:sqlite (Node 22+) or better-sqlite3 fallback
const dbPath = path.join(__dirname, 'subtrakr.db');
let db;

try {
  const { DatabaseSync } = require('node:sqlite');
  const dbInstance = new DatabaseSync(dbPath);
  dbInstance.exec('PRAGMA foreign_keys = ON;');
  db = {
    exec: (sql) => dbInstance.exec(sql),
    prepare: (sql) => {
      const stmt = dbInstance.prepare(sql);
      return {
        all: (...params) => stmt.all(...params),
        run: (...params) => stmt.run(...params),
      };
    },
    transaction: (fn) => (items) => {
      dbInstance.exec('BEGIN IMMEDIATE');
      try {
        fn(items);
        dbInstance.exec('COMMIT');
      } catch (err) {
        dbInstance.exec('ROLLBACK');
        throw err;
      }
    }
  };
} catch {
  const Database = require('better-sqlite3');
  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
}

// Apply schema
const schemaSql = fs.readFileSync(path.join(__dirname, 'schema_sqlite.sql'), 'utf8');
db.exec(schemaSql);
try { db.exec('ALTER TABLE local_otps ADD COLUMN full_name TEXT;'); } catch (e) {}
try { db.exec('DELETE FROM entities WHERE rowid NOT IN (SELECT MAX(rowid) FROM entities GROUP BY user_id, lower(name), type);'); } catch (e) {}

console.log(`[SubTrakr Local Backend] SQLite database initialized at ${dbPath}`);

// ── Mock Supabase Auth Endpoints ──────────────────────────────────────────
const MOCK_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'admin@subtrakr.me',
  phone: '+919999999999',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'Local Admin' },
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const MOCK_SESSION = {
  access_token: 'local-mock-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'local-mock-refresh-token',
  user: MOCK_USER,
};

// Helper function to format user objects matching GoTrue shape
function formatUserObj(row) {
  return {
    id: row.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: row.email || undefined,
    phone: row.phone || undefined,
    app_metadata: { provider: row.email ? 'email' : 'phone', providers: [row.email ? 'email' : 'phone'] },
    user_metadata: { full_name: row.full_name || 'Subscriber' },
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

const { randomUUID } = require('crypto');

function ensureSubscriberRecord(userId) {
  try {
    // 1. Ensure exactly one default 'Personal' entity exists for this user
    const existingEnt = db.prepare(`SELECT id FROM entities WHERE user_id = ? AND name = 'Personal' LIMIT 1`).all(userId)[0];
    if (!existingEnt) {
      const entId = randomUUID();
      db.prepare(`
        INSERT INTO entities (id, user_id, name, type)
        VALUES (?, ?, 'Personal', 'personal')
      `).run(entId, userId);
    }

    // 2. Ensure subscriber_billing row exists
    const freePlan = db.prepare(`SELECT id FROM plans WHERE code = 'free' LIMIT 1`).all()[0];
    const planId = freePlan ? freePlan.id : 'plan-free';
    const subId = randomUUID();

    db.prepare(`
      INSERT OR IGNORE INTO subscriber_billing (id, user_id, plan_id, status, billing_cycle)
      VALUES (?, ?, ?, 'active', 'monthly')
    `).run(subId, userId, planId);
  } catch (err) {
    console.error('[SubTrakr Local Backend] Failed to auto-create subscriber record:', err.message);
  }
}

// Startup database cleanup
try {
  db.prepare(`DELETE FROM auth_users WHERE id NOT LIKE '%-%-%-%-%'`).run();
} catch (e) {}

// Send OTP
app.post('/auth/v1/otp', (req, res) => {
  const identifier = req.body?.email || req.body?.phone;
  const fullName = req.body?.options?.data?.full_name || null;
  const code = '123456';
  if (identifier) {
    db.prepare(`
      INSERT INTO local_otps (id, identifier, code, full_name)
      VALUES (?, ?, ?, ?)
    `).run(randomUUID(), identifier, code, fullName);
    console.log(`\n======================================================`);
    console.log(`[SubTrakr Local Auth] Verification code for ${identifier}: ${code} (Name: ${fullName || 'N/A'})`);
    console.log(`======================================================\n`);
  }
  res.json({ message: "Verification code sent successfully." });
});

// Verify OTP
app.post('/auth/v1/verify', (req, res) => {
  const { email, phone, token, type } = req.body || {};
  const identifier = email || phone;
  
  // Look up full_name from request or local_otps fallback
  let fullName = req.body?.options?.data?.full_name;
  if (!fullName && identifier) {
    const otpRow = db.prepare(`SELECT full_name FROM local_otps WHERE identifier = ? AND full_name IS NOT NULL ORDER BY created_at DESC`).all(identifier)[0];
    if (otpRow?.full_name) fullName = otpRow.full_name;
  }

  let user = db.prepare(`SELECT * FROM auth_users WHERE email = ? OR phone = ?`).all(identifier, identifier)[0];

  if (!user) {
    const userId = randomUUID();
    db.prepare(`
      INSERT INTO auth_users (id, email, phone, full_name)
      VALUES (?, ?, ?, ?)
    `).run(userId, email || null, phone || null, fullName || 'Subscriber');
    user = db.prepare(`SELECT * FROM auth_users WHERE id = ?`).all(userId)[0];
    console.log(`[SubTrakr Local Auth] Created new user: ${user.id} (${fullName || identifier})`);
  } else if (fullName && user.full_name !== fullName) {
    db.prepare(`UPDATE auth_users SET full_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(fullName, user.id);
    user.full_name = fullName;
    console.log(`[SubTrakr Local Auth] Updated full_name for user: ${user.id} -> ${fullName}`);
  }

  ensureSubscriberRecord(user.id);
  const userObj = formatUserObj(user);
  res.json({
    access_token: 'local-mock-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'local-mock-refresh-token',
    user: userObj,
  });
});

app.all('/auth/v1/token', (req, res) => {
  res.json(MOCK_SESSION);
});

app.get('/auth/v1/user', (req, res) => {
  res.json(MOCK_USER);
});

app.put('/auth/v1/user', (req, res) => {
  const { data, password } = req.body || {};
  const authHeader = req.headers['authorization'];
  // If password or user metadata was updated
  if (data?.full_name) {
    db.prepare(`UPDATE auth_users SET full_name = ?, updated_at = CURRENT_TIMESTAMP ORDER BY updated_at DESC LIMIT 1`).run(data.full_name);
  }
  console.log(`[SubTrakr Local Auth] User updated profile/credentials.`);
  res.json(MOCK_USER);
});

app.post('/auth/v1/signup', (req, res) => {
  const email = req.body?.email;
  const phone = req.body?.phone;
  const fullName = req.body?.options?.data?.full_name || 'Subscriber';
  const identifier = email || phone || `user-${Date.now()}@subtrakr.me`;

  let user = db.prepare(`SELECT * FROM auth_users WHERE email = ? OR phone = ?`).all(identifier, identifier)[0];

  if (!user) {
    const userId = randomUUID();
    db.prepare(`
      INSERT INTO auth_users (id, email, phone, full_name)
      VALUES (?, ?, ?, ?)
    `).run(userId, email || null, phone || null, fullName);
    user = db.prepare(`SELECT * FROM auth_users WHERE id = ?`).all(userId)[0];
    console.log(`[SubTrakr Local Auth] Signed up new user: ${user.id} (${fullName})`);
  }

  ensureSubscriberRecord(user.id);
  const userObj = formatUserObj(user);
  res.json({
    access_token: 'local-mock-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'local-mock-refresh-token',
    user: userObj,
  });
});

app.post('/auth/v1/logout', (req, res) => {
  res.status(200).json({});
});

app.get('/auth/v1/admin/users', (req, res) => {
  try {
    const dbUsers = db.prepare(`SELECT * FROM auth_users ORDER BY created_at DESC`).all();
    const usersList = dbUsers.map(formatUserObj);
    res.json({ users: usersList });
  } catch (err) {
    res.status(500).json({ error: err.message, users: [] });
  }
});

app.get('/auth/v1/admin/users/:id', (req, res) => {
  const { id } = req.params;
  try {
    const userRow = db.prepare(`SELECT * FROM auth_users WHERE id = ?`).all(id)[0];
    if (userRow) {
      return res.json({ user: formatUserObj(userRow) });
    }
  } catch (e) {}
  res.status(404).json({ error: "User not found", user: null });
});

app.delete('/auth/v1/admin/users/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare(`DELETE FROM subscriber_billing WHERE user_id = ?`).run(id);
    db.prepare(`DELETE FROM entities WHERE user_id = ?`).run(id);
    db.prepare(`DELETE FROM subscriptions WHERE user_id = ?`).run(id);
    db.prepare(`DELETE FROM payment_history WHERE user_id = ?`).run(id);
    db.prepare(`DELETE FROM invoices WHERE user_id = ?`).run(id);
    db.prepare(`DELETE FROM billing_transactions WHERE user_id = ?`).run(id);
    const result = db.prepare(`DELETE FROM auth_users WHERE id = ?`).run(id);
    console.log(`[SubTrakr Local Backend] Deleted user: ${id} (rows changed: ${result.changes})`);
    return res.json({ id });
  } catch (err) {
    console.error('[SubTrakr Local Backend] Delete user failed:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.all('/auth/v1/admin/users/*', (req, res) => {
  res.status(404).json({ error: "Not found", user: null });
});

app.all('/auth/v1/*', (req, res) => {
  res.json(MOCK_SESSION);
});

// Helper to parse PostgREST eq parameters like ?id=eq.123
const RESERVED_PARAMS = ['select', 'order', 'limit', 'offset', 'head'];

function parseEqQuery(query) {
  const filter = {};
  for (const [key, val] of Object.entries(query)) {
    if (RESERVED_PARAMS.includes(key)) continue;
    if (typeof val === 'string' && val.startsWith('eq.')) {
      filter[key] = val.slice(3);
    } else {
      filter[key] = val;
    }
  }
  return filter;
}

// Generic route handler for PostgREST compatible endpoints: /rest/v1/:table
const ALLOWED_TABLES = [
  'entities',
  'payment_methods',
  'subscriptions',
  'payment_history',
  'invoices',
  'admin_users',
  'app_settings',
  'plans',
  'subscriber_billing',
  'billing_transactions',
];

app.get('/rest/v1/:table', (req, res) => {
  const { table } = req.params;
  if (!ALLOWED_TABLES.includes(table)) {
    return res.status(404).json({ error: 'Table not found' });
  }

  const filters = parseEqQuery(req.query);
  const keys = Object.keys(filters);
  
  let sql = `SELECT * FROM ${table}`;
  const params = [];
  if (keys.length > 0) {
    sql += ' WHERE ' + keys.map(k => `${k} = ?`).join(' AND ');
    params.push(...keys.map(k => filters[k]));
  }

  try {
    const rows = db.prepare(sql).all(...params);
    const acceptHeader = req.headers['accept'] || '';
    if (acceptHeader.includes('application/vnd.pgrst.object+json')) {
      if (rows.length === 0) {
        return res.status(406).json({ details: 'Results contain 0 rows', code: 'PGRST116' });
      }
      return res.json(rows[0]);
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/rest/v1/:table', (req, res) => {
  const { table } = req.params;
  if (!ALLOWED_TABLES.includes(table)) {
    return res.status(404).json({ error: 'Table not found' });
  }

  const body = Array.isArray(req.body) ? req.body : [req.body];
  if (body.length === 0) {
    return res.status(200).json([]);
  }

  try {
    const results = [];
    const transaction = db.transaction((items) => {
      for (const item of items) {
        if (!item.id) {
          item.id = randomUUID();
        }
        const columns = Object.keys(item);
        const placeholders = columns.map(() => '?').join(', ');
        const updateClause = columns.map(col => `${col} = excluded.${col}`).join(', ');
        const conflictTarget = (table === 'subscriber_billing' || table === 'admin_users') ? 'user_id' : 'id';
        const sql = `
          INSERT INTO ${table} (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT(${conflictTarget}) DO UPDATE SET ${updateClause}
        `;
        db.prepare(sql).run(...columns.map(col => item[col]));
        results.push(item);
      }
    });
    transaction(body);
    console.log(`[SubTrakr Local REST] Successfully upserted ${results.length} row(s) into ${table}`);
    res.status(201).json(results);
  } catch (err) {
    console.error(`[SubTrakr Local REST Error] Failed to upsert into ${table}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/rest/v1/:table', (req, res) => {
  const { table } = req.params;
  if (!ALLOWED_TABLES.includes(table)) {
    return res.status(404).json({ error: 'Table not found' });
  }

  const filters = parseEqQuery(req.query);
  const keys = Object.keys(filters);
  if (keys.length === 0) {
    return res.status(400).json({ error: 'DELETE without filter is restricted' });
  }

  const sql = `DELETE FROM ${table} WHERE ` + keys.map(k => `${k} = ?`).join(' AND ');
  const params = keys.map(k => filters[k]);

  try {
    const info = db.prepare(sql).run(...params);
    res.json({ count: info.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', database: 'sqlite', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[SubTrakr Local Backend] Server running on http://localhost:${PORT}`);
});
