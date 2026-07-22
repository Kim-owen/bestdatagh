
-- ============ ROLES ============
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users can read their own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);
create policy "Admins can read all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can manage roles" on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "Users read own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "Admins read all profiles" on public.profiles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create profile + auto-promote first user to admin
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  user_count int;
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));

  select count(*) into user_count from auth.users;
  if user_count = 1 then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'user');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ BUNDLES ============
create table public.bundles (
  id uuid primary key default gen_random_uuid(),
  network text not null check (network in ('MTN','Telecel','AirtelTigo')),
  size_label text not null,
  size_mb int not null,
  price_ghs numeric(10,2) not null check (price_ghs >= 0),
  validity text not null default '90 days',
  popular boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.bundles to anon, authenticated;
grant all on public.bundles to service_role;
alter table public.bundles enable row level security;

create policy "Anyone reads active bundles" on public.bundles
  for select to anon, authenticated using (active = true or public.has_role(auth.uid(),'admin'));
create policy "Admins manage bundles" on public.bundles
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- ============ ORDERS ============
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('BD-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  user_id uuid references auth.users(id) on delete set null,
  customer_phone text,
  customer_email text,
  total_ghs numeric(10,2) not null default 0,
  status text not null default 'pending' check (status in ('pending','processing','delivered','failed','refunded')),
  source text not null default 'web' check (source in ('web','bulk','api')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;

create policy "Users read own orders" on public.orders
  for select to authenticated using (auth.uid() = user_id);
create policy "Admins read all orders" on public.orders
  for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Users create own orders" on public.orders
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Admins update orders" on public.orders
  for update to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  bundle_id uuid references public.bundles(id) on delete set null,
  network text not null,
  size_label text not null,
  recipient_phone text not null,
  unit_price_ghs numeric(10,2) not null,
  quantity int not null default 1 check (quantity > 0),
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
grant select, insert on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;

create policy "Users read own order items" on public.order_items
  for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "Admins read all items" on public.order_items
  for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Users create items on own orders" on public.order_items
  for insert to authenticated with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- ============ API KEYS ============
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  key_prefix text not null,
  key_hash text not null unique,
  last_used_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.api_keys to authenticated;
grant all on public.api_keys to service_role;
alter table public.api_keys enable row level security;

create policy "Users manage own api keys" on public.api_keys
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admins read all api keys" on public.api_keys
  for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- ============ REVIEWS moderation ============
create policy "Admins delete reviews" on public.reviews
  for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- ============ updated_at ============
create or replace function public.tg_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger t_bundles_upd before update on public.bundles for each row execute function public.tg_updated_at();
create trigger t_orders_upd before update on public.orders for each row execute function public.tg_updated_at();
create trigger t_profiles_upd before update on public.profiles for each row execute function public.tg_updated_at();

-- ============ SEED BUNDLES ============
insert into public.bundles (network, size_label, size_mb, price_ghs, validity, popular, sort_order) values
  ('MTN','1GB',1024,5.00,'90 days',false,10),
  ('MTN','2GB',2048,9.50,'90 days',true,20),
  ('MTN','5GB',5120,22.00,'90 days',true,30),
  ('MTN','10GB',10240,42.00,'90 days',false,40),
  ('MTN','20GB',20480,80.00,'90 days',false,50),
  ('Telecel','1GB',1024,5.20,'90 days',false,10),
  ('Telecel','2GB',2048,10.00,'90 days',true,20),
  ('Telecel','5GB',5120,23.00,'90 days',true,30),
  ('Telecel','10GB',10240,44.00,'90 days',false,40),
  ('AirtelTigo','1GB',1024,4.80,'90 days',false,10),
  ('AirtelTigo','2GB',2048,9.00,'90 days',true,20),
  ('AirtelTigo','5GB',5120,21.00,'90 days',true,30),
  ('AirtelTigo','10GB',10240,40.00,'90 days',false,40);
