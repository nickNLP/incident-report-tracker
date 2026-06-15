-- ============================================================
-- Incident Report Tracker — Database Schema
-- Paste this into the Supabase SQL Editor and run it.
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users with role)
-- ============================================================
create table profiles (
  id        uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role      text not null check (role in ('driver', 'dispatcher', 'manager')),
  created_at timestamptz default now()
);

-- ============================================================
-- LOOKUP OPTIONS (all dropdowns stored here, not hardcoded)
-- category values: 'incident_type', 'reported_to', 'dispatcher', 'root_cause'
-- ============================================================
create table lookup_options (
  id         uuid primary key default uuid_generate_v4(),
  category   text not null,
  label      text not null,
  sort_order int  default 0,
  is_active  boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- DRIVERS (admin-managed, used in searchable dropdown)
-- ============================================================
create table drivers (
  id         uuid primary key default uuid_generate_v4(),
  full_name  text not null,
  is_active  boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- CUSTOMERS (admin-managed, used in searchable dropdown)
-- ============================================================
create table customers (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  province   text,
  is_active  boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- INCIDENTS (main table)
-- ============================================================
create table incidents (
  id                  uuid primary key default uuid_generate_v4(),
  date                date not null,
  incident_type_id    uuid references lookup_options(id),
  reported_to_id      uuid references lookup_options(id),
  driver_id           uuid references drivers(id),
  dispatcher_id       uuid references lookup_options(id),
  root_cause_id       uuid references lookup_options(id),
  preventable         boolean,
  customer_id         uuid references customers(id),
  description         text,
  corrective_action   text,
  product_type            text,
  spill_volume_litres     numeric,
  spill_location          text,
  reported_to_authority   boolean,
  authority_name          text,
  authority_ref           text,
  authority_reported_at   date,
  status              text not null default 'open' check (status in ('open', 'in_review', 'closed')),
  submitted_by        uuid references auth.users(id),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ============================================================
-- INCIDENT PHOTOS (multi-image, stored in Supabase Storage)
-- ============================================================
create table incident_photos (
  id           uuid primary key default uuid_generate_v4(),
  incident_id  uuid references incidents(id) on delete cascade,
  storage_path text not null,
  created_at   timestamptz default now()
);

-- ============================================================
-- INCIDENT NOTES (dispatcher / manager notes on an incident)
-- ============================================================
create table incident_notes (
  id          uuid primary key default uuid_generate_v4(),
  incident_id uuid references incidents(id) on delete cascade,
  author_id   uuid references auth.users(id),
  body        text not null,
  created_at  timestamptz default now()
);

-- ============================================================
-- AUTO-UPDATE updated_at ON incidents
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger incidents_updated_at
  before update on incidents
  for each row execute function update_updated_at();

-- ============================================================
-- ROLE HELPER (avoids recursive RLS on profiles table)
-- ============================================================
create or replace function auth_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from profiles where id = auth.uid()
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles        enable row level security;
alter table incidents       enable row level security;
alter table incident_photos enable row level security;
alter table incident_notes  enable row level security;
alter table lookup_options  enable row level security;
alter table drivers         enable row level security;
alter table customers       enable row level security;

-- Table-level grants (anon can read lookups; authenticated can do more)
grant select on public.lookup_options to anon;
grant select on public.drivers        to anon;
grant select on public.customers      to anon;
grant insert  on public.incidents     to anon;

-- Profiles
create policy "Users read own profile" on profiles
  for select using (auth.uid() = id);

create policy "Managers read all profiles" on profiles
  for select using (auth_user_role() = 'manager');

-- Incidents
create policy "Drivers see own incidents" on incidents
  for select using (submitted_by = auth.uid());

create policy "Dispatchers and managers see all incidents" on incidents
  for select using (auth_user_role() in ('dispatcher', 'manager'));

create policy "Authenticated users submit incidents" on incidents
  for insert with check (auth.uid() = submitted_by);

create policy "Dev: allow anon inserts" on incidents
  for insert to anon with check (submitted_by is null);

create policy "Dispatchers and managers update incidents" on incidents
  for update using (auth_user_role() in ('dispatcher', 'manager'));

-- Lookup options
create policy "Authenticated read lookup options" on lookup_options
  for select using (auth.role() = 'authenticated');

create policy "Dev: anon read lookup options" on lookup_options
  for select to anon using (true);

create policy "Managers manage lookup options" on lookup_options
  for all to authenticated using (auth_user_role() = 'manager');

-- Drivers
create policy "Authenticated read drivers" on drivers
  for select using (auth.role() = 'authenticated');

create policy "Dev: anon read drivers" on drivers
  for select to anon using (true);

create policy "Managers manage drivers" on drivers
  for all to authenticated using (auth_user_role() = 'manager');

-- Customers
create policy "Authenticated read customers" on customers
  for select using (auth.role() = 'authenticated');

create policy "Dev: anon read customers" on customers
  for select to anon using (true);

create policy "Managers manage customers" on customers
  for all to authenticated using (auth_user_role() = 'manager');

-- Photos
create policy "Authenticated read photos" on incident_photos
  for select using (auth.role() = 'authenticated');

create policy "Authenticated insert photos" on incident_photos
  for insert with check (auth.role() = 'authenticated');

-- Notes
create policy "Dispatchers and managers read notes" on incident_notes
  for select using (auth_user_role() in ('dispatcher', 'manager'));

create policy "Dispatchers and managers add notes" on incident_notes
  for insert with check (auth_user_role() in ('dispatcher', 'manager'));

-- ============================================================
-- SEED: Lookup options (from your CSV — managers can edit later)
-- ============================================================
insert into lookup_options (category, label, sort_order) values
  ('incident_type', 'Spill',          1),
  ('incident_type', 'Accident',       2),
  ('incident_type', 'Mix',            3),
  ('incident_type', 'Loading Error',  4),
  ('incident_type', 'Runout',         5),
  ('incident_type', 'Retain',         6),
  ('incident_type', 'Redirect',       7),
  ('reported_to',   'Dori',           1),
  ('reported_to',   'Rob',            2),
  ('reported_to',   'Gary',           3),
  ('reported_to',   'Dave',           4),
  ('reported_to',   'Saurleen',       5),
  ('reported_to',   'Zach',           6),
  ('reported_to',   'Barry',          7),
  ('dispatcher',    'Dori',           1),
  ('dispatcher',    'Dave',           2),
  ('dispatcher',    'Sarleen',        3),
  ('root_cause',    'Driver',         1),
  ('root_cause',    'Dispatch',       2),
  ('root_cause',    'Customer',       3);

-- ============================================================
-- STORAGE: Bucket for incident photos
-- ============================================================
insert into storage.buckets (id, name, public)
  values ('incident-photos', 'incident-photos', false)
  on conflict do nothing;

create policy "Authenticated upload photos" on storage.objects
  for insert with check (bucket_id = 'incident-photos' and auth.role() = 'authenticated');

create policy "Authenticated read photo objects" on storage.objects
  for select using (bucket_id = 'incident-photos' and auth.role() = 'authenticated');
