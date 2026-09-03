CREATE TABLE IF NOT EXISTS fulfillments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stripe_checkout_session_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id TEXT,
  stripe_event_id TEXT NOT NULL UNIQUE,
  customer_email TEXT,
  product_slug TEXT NOT NULL,
  payment_link_id TEXT NOT NULL,
  amount_total INTEGER NOT NULL,
  currency TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  fulfilled_at TEXT NOT NULL,
  access_expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fulfillments_session
  ON fulfillments (stripe_checkout_session_id);

CREATE INDEX IF NOT EXISTS idx_fulfillments_access
  ON fulfillments (product_slug, payment_status, access_expires_at);
