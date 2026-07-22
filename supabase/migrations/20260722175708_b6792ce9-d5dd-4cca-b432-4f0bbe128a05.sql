
alter type public.app_role add value if not exists 'agent';

alter table public.profiles add column if not exists phone text;

create table if not exists public.agent_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  region text not null,
  monthly_volume text,
  note text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

grant select, insert, update on public.agent_applications to authenticated;
grant all on public.agent_applications to service_role;
alter table public.agent_applications enable row level security;

create policy "Users read own application" on public.agent_applications
  for select to authenticated using (auth.uid() = user_id);
create policy "Users create own application" on public.agent_applications
  for insert to authenticated with check (auth.uid() = user_id and status = 'pending');
create policy "Users update own pending" on public.agent_applications
  for update to authenticated using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id);
create policy "Admins read all applications" on public.agent_applications
  for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Admins update all applications" on public.agent_applications
  for update to authenticated using (public.has_role(auth.uid(),'admin'));

create trigger t_agent_apps_upd before update on public.agent_applications
  for each row execute function public.tg_updated_at();
