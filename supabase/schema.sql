create extension if not exists "uuid-ossp";

create table if not exists ledgers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  vat_no text,
  pan_no text,
  type text check (type in ('supplier', 'customer', 'both')) not null,
  created_at timestamptz default now()
);

create table if not exists items (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  default_unit text not null,
  created_at timestamptz default now()
);

create table if not exists transactions (
  id uuid primary key default uuid_generate_v4(),
  type text check (type in ('purchase', 'sale')) not null,
  ledger_id uuid references ledgers(id) on delete restrict,
  item_id uuid references items(id) on delete restrict,
  quantity numeric not null,
  unit text not null,
  rate numeric not null,
  vat_pct numeric not null default 13,
  taxable_amount numeric not null,
  vat_amount numeric not null,
  total_amount numeric not null,
  invoice_no text,
  date date not null default current_date,
  created_at timestamptz default now()
);

-- Real items only (Ramesh actually stocks these)
insert into items (name, default_unit) values
  ('Sunflower Oil', 'CTN'),
  ('Sugar', 'BAG'),
  ('Chamal (Rice)', 'BAG'),
  ('Mustard Oil', 'CTN')
on conflict do nothing;

-- Real supplier only (from the actual invoice we saw)
insert into ledgers (name, vat_no, pan_no, type) values
  ('One Step Suppliers Pvt Ltd', '604372736', '', 'supplier')
on conflict do nothing;