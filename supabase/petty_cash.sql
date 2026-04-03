-- Run in Supabase SQL Editor (after existing migrations)

ALTER TABLE cash_entries
  ADD COLUMN IF NOT EXISTS category text
  CHECK (category IS NULL OR category IN ('income', 'expense', 'petty_cash', 'opening'));

CREATE TABLE IF NOT EXISTS petty_cash (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  party_name text,
  item text,
  quantity numeric,
  rate numeric,
  amount numeric NOT NULL,
  purpose text NOT NULL,
  note text,
  date date NOT NULL DEFAULT current_date,
  cash_entry_id uuid NOT NULL REFERENCES cash_entries(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_petty_cash_created_at ON petty_cash (created_at DESC);
