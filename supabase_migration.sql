-- BulkDirect V2 Supabase Migration
-- Execute manually in Supabase SQL Editor

-- Create leads table
create table if not exists leads (
  id bigserial primary key,
  author text not null,
  category text not null,
  confidence integer default 0,
  pain_points text[] default '{}',
  is_valid boolean default false,
  score float default 0,
  source text default 'reddit',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create suppliers table
create table if not exists suppliers (
  id bigserial primary key,
  name text not null,
  category text not null,
  rating float default 0,
  min_order integer default 1,
  lead_time text default '7-10 jours',
  verified boolean default false,
  contact_email text,
  contact_phone text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create validations table
create table if not exists validations (
  id bigserial primary key,
  lead_id bigint references leads(id) on delete cascade,
  validation_score float default 0,
  validated_at timestamp with time zone default now(),
  validator_agent text default 'auto'
);

-- Create matches table (lead-supplier matching)
create table if not exists matches (
  id bigserial primary key,
  lead_id bigint references leads(id) on delete cascade,
  supplier_id bigint references suppliers(id) on delete cascade,
  match_score float default 0,
  matched_at timestamp with time zone default now()
);

-- Create indexes for performance
create index if not exists idx_leads_category on leads(category);
create index if not exists idx_leads_created_at on leads(created_at);
create index if not exists idx_suppliers_category on suppliers(category);
create index if not exists idx_suppliers_verified on suppliers(verified);
create index if not exists idx_matches_lead_id on matches(lead_id);
create index if not exists idx_matches_supplier_id on matches(supplier_id);

-- Enable RLS (Row Level Security)
alter table leads enable row level security;
alter table suppliers enable row level security;
alter table validations enable row level security;
alter table matches enable row level security;

-- Create policies for public read
create policy "leads_read" on leads for select using (true);
create policy "suppliers_read" on suppliers for select using (true);
create policy "validations_read" on validations for select using (true);
create policy "matches_read" on matches for select using (true);

-- Insert sample suppliers
insert into suppliers (name, category, rating, min_order, lead_time, verified) values
('FastParts Industrial', 'manufacturing', 4.8, 100, '5-7 jours', true),
('Global Bulk Supply', 'electronics', 4.5, 50, '10-14 jours', true),
('Premium Components Ltd', 'manufacturing', 4.9, 200, '3-5 jours', true)
on conflict do nothing;
