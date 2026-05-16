create table if not exists public.user_profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  whatsapp     text,
  position     text check (position in ('proprietario','funcionario','consultor','contador','estudante')),
  company_size text check (company_size in ('1-5','6-10','10-30','30-50','50-100','100+')),
  created_at   timestamptz not null default now()
);
