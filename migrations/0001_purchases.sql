CREATE TABLE purchases (
  id TEXT PRIMARY KEY NOT NULL,
  offer_id TEXT NOT NULL CHECK (offer_id IN ('monthly', 'yearly')),
  device_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  request_id TEXT NOT NULL,
  UNIQUE (device_id, request_id)
);
CREATE INDEX purchases_device_date ON purchases (device_id, created_at DESC);
