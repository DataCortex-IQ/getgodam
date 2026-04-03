-- Run in Supabase SQL Editor (after existing schema)

CREATE TABLE IF NOT EXISTS item_costs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id uuid REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  label text NOT NULL,
  amount numeric NOT NULL,
  note text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_item_costs_item_id ON item_costs (item_id);

-- Example for Sugar:
-- Ex factory rate: 87.5
-- Bhada (w. VAT): 3.84
-- Load/unload: 0.35
-- Sale bhada: 0.5
-- Total landed cost: 92.04
