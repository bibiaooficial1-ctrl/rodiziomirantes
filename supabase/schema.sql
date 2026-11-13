-- Execute no SQL Editor do Supabase.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  price_kz numeric(12,2) not null check (price_kz >= 0),
  image_url text,
  category_id uuid references public.categories(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  reservation_date date not null,
  reservation_time time not null,
  guests integer not null check (guests between 1 and 30),
  notes text default '',
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.reservations enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin'); $$;

drop policy if exists "profile self or admin read" on public.profiles;
create policy "profile self or admin read" on public.profiles for select to authenticated using (id=auth.uid() or public.is_admin());
drop policy if exists "categories public read" on public.categories;
create policy "categories public read" on public.categories for select to anon,authenticated using (true);
drop policy if exists "categories admin manage" on public.categories;
create policy "categories admin manage" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "active products public read" on public.products;
create policy "active products public read" on public.products for select to anon,authenticated using (is_active=true or public.is_admin());
drop policy if exists "products admin manage" on public.products;
create policy "products admin manage" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "public create reservations" on public.reservations;
create policy "public create reservations" on public.reservations for insert to anon,authenticated with check (status='pending');
drop policy if exists "admin read reservations" on public.reservations;
create policy "admin read reservations" on public.reservations for select to authenticated using (public.is_admin());
drop policy if exists "admin update reservations" on public.reservations;
create policy "admin update reservations" on public.reservations for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Bucket público para leitura das fotos; escrita e remoção apenas por administrador.
insert into storage.buckets (id,name,public) values ('menu-images','menu-images',true)
on conflict (id) do update set public=true;
drop policy if exists "menu images public read" on storage.objects;
create policy "menu images public read" on storage.objects for select to anon,authenticated using (bucket_id='menu-images');
drop policy if exists "menu images admin upload" on storage.objects;
create policy "menu images admin upload" on storage.objects for insert to authenticated with check (bucket_id='menu-images' and public.is_admin());
drop policy if exists "menu images admin update" on storage.objects;
create policy "menu images admin update" on storage.objects for update to authenticated using (bucket_id='menu-images' and public.is_admin()) with check (bucket_id='menu-images' and public.is_admin());
drop policy if exists "menu images admin delete" on storage.objects;
create policy "menu images admin delete" on storage.objects for delete to authenticated using (bucket_id='menu-images' and public.is_admin());

insert into public.categories(name) values ('Rodízio'),('Carnes'),('Acompanhamentos'),('Bebidas'),('Sobremesas')
on conflict (name) do nothing;

-- Depois de criar a conta do proprietário em Authentication > Users,
-- execute esta instrução substituindo pelo email real:
-- update public.profiles set role='admin' where email='EMAIL_DO_PROPRIETARIO';
-- Se o perfil ainda não existir:
-- insert into public.profiles(id,email,role)
-- select id,email,'admin' from auth.users where email='EMAIL_DO_PROPRIETARIO'
-- on conflict(id) do update set role='admin';
