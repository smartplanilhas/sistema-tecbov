-- ─── Short ID para tenants ────────────────────────────────────────────────────
alter table public.tenants
  add column if not exists short_id text unique;

create sequence if not exists public.tenants_short_id_seq
  start with 1001 increment by 1;

create or replace function public.set_tenant_short_id()
returns trigger language plpgsql as $$
begin
  if new.short_id is null then
    new.short_id := lpad(nextval('public.tenants_short_id_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tenant_short_id on public.tenants;
create trigger trg_tenant_short_id
  before insert on public.tenants
  for each row execute function public.set_tenant_short_id();

-- Backfill para tenants existentes (ordem de criação)
do $$
declare r record;
begin
  for r in
    select id from public.tenants where short_id is null order by created_at asc
  loop
    update public.tenants
       set short_id = lpad(nextval('public.tenants_short_id_seq')::text, 4, '0')
     where id = r.id;
  end loop;
end $$;

-- ─── GeSmart Admin Team ────────────────────────────────────────────────────────
create table if not exists public.gesmart_admins (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  name     text not null,
  email    text not null,
  added_at timestamptz not null default now()
);
