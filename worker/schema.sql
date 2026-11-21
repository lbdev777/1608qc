-- 1608 / Base des commandes (Cloudflare D1). Idempotent : peut être rejouée sans risque.
CREATE TABLE IF NOT EXISTS orders(
  id TEXT PRIMARY KEY,
  idem TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Demande reçue',
  items_json TEXT NOT NULL,
  subtotal INTEGER NOT NULL,
  discount INTEGER NOT NULL,
  total INTEGER NOT NULL,
  percent INTEGER NOT NULL,
  first_name TEXT NOT NULL,
  city TEXT NOT NULL,
  pii_enc TEXT NOT NULL,
  ip_hash TEXT,
  email_hash TEXT,
  reminded_at TEXT,
  admin_note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_ip ON orders(ip_hash, created_at);
CREATE TABLE IF NOT EXISTS notifications(
  order_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  sent_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_try TEXT,
  last_error TEXT,
  PRIMARY KEY(order_id, chat_id)
);
CREATE INDEX IF NOT EXISTS idx_notif_pending ON notifications(sent_at, last_try);
CREATE TABLE IF NOT EXISTS events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  at TEXT NOT NULL,
  type TEXT NOT NULL,
  note TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_order ON events(order_id, at);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email_hash);
CREATE TABLE IF NOT EXISTS counter(name TEXT PRIMARY KEY, n INTEGER NOT NULL);
INSERT OR IGNORE INTO counter(name,n) VALUES('order',3000);
CREATE TABLE IF NOT EXISTS lookups(ip_hash TEXT NOT NULL, at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_lookups ON lookups(ip_hash, at);
