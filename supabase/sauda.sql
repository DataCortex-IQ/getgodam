-- Run in Supabase SQL Editor (after existing schema)

CREATE TABLE IF NOT EXISTS sauda (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ledger_id uuid REFERENCES ledgers(id) ON DELETE SET NULL,
  item_id uuid REFERENCES items(id) ON DELETE SET NULL,
  party_name text NOT NULL,
  item_name text NOT NULL,
  quantity numeric NOT NULL,
  unit text NOT NULL,
  rate numeric NOT NULL,
  amount numeric NOT NULL,
  date date NOT NULL DEFAULT current_date,
  note text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sauda_item_id ON sauda(item_id);
CREATE INDEX IF NOT EXISTS idx_sauda_ledger_id ON sauda(ledger_id);
CREATE INDEX IF NOT EXISTS idx_sauda_created_at ON sauda (created_at DESC);
