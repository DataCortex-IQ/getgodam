-- Run in Supabase SQL Editor if `sauda` already exists without `direction`

ALTER TABLE sauda
  ADD COLUMN IF NOT EXISTS direction text
  DEFAULT 'purchase'
  CHECK (direction IN ('purchase', 'sale'));
