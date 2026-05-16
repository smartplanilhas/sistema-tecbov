create table if not exists people (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  is_client boolean not null default false,
  is_supplier boolean not null default false,
  name text not null,
  document text,
  trade_name text,
  contact_name text,
  phone text,
  email text,
  zip_code text,
  state text,
  city text,
  address text,
  address_number text,
  complement text,
  neighborhood text,
  state_registration text,
  municipal_registration text,
  birth_date date,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table people enable row level security;

create policy "people_select" on people
  for select using (tenant_id in (select user_tenant_ids()));

create policy "people_insert" on people
  for insert with check (tenant_id in (select user_tenant_ids()));

create policy "people_update" on people
  for update using (tenant_id in (select user_tenant_ids()));

create policy "people_delete" on people
  for delete using (tenant_id in (select user_tenant_ids()));
