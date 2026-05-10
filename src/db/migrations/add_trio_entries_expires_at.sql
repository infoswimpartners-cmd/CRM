-- Add expires_at to trio_entries to handle 10-minute payment timeout
ALTER TABLE trio_entries ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
