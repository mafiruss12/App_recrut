-- K2L Recrutement - schéma de production
-- À appliquer dans Supabase SQL Editor après sauvegarde des données existantes.
-- Les comptes Auth doivent être provisionnés dans Supabase Auth, puis liés par user_id.

create extension if not exists pgcrypto;

create table if not exists public.commerciaux (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  phone varchar(20) unique not null,
  name varchar(255) not null default '',
  localite varchar(150) not null default '',
  cabinet varchar(150) not null default '',
  partenaire varchar(150) not null default '',
  action varchar(255) not null default '',
  role varchar(20) not null default 'commercial' check (role in ('commercial', 'manager')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  last_active_at timestamptz not null default timezone('utc'::text, now())
);

-- Migration depuis l'ancien modèle.
alter table public.commerciaux add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.commerciaux alter column name set default '';
alter table public.commerciaux alter column localite set default '';
alter table public.commerciaux alter column cabinet set default '';
alter table public.commerciaux alter column partenaire set default '';
alter table public.commerciaux alter column action set default '';
alter table public.commerciaux alter column role set default 'commercial';
update public.commerciaux
set role = 'commercial'
where role is null or role not in ('commercial', 'manager');
alter table public.commerciaux alter column role set not null;
alter table public.commerciaux alter column is_active set default true;
alter table public.commerciaux drop column if exists code;
alter table public.commerciaux drop column if exists session_token;
create unique index if not exists commerciaux_user_id_unique on public.commerciaux(user_id) where user_id is not null;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  client_phone varchar(30) not null,
  client_phone_clean varchar(20) not null,
  commercial_id uuid not null references public.commerciaux(id) on delete restrict,
  commercial_name varchar(255) not null default '',
  commercial_phone varchar(20) not null default '',
  cabinet varchar(150) not null default '',
  localite varchar(150) not null default '',
  partenaire varchar(150) not null default '',
  action varchar(255) not null default '',
  status varchar(30) not null default 'synced' check (status in ('synced', 'pending', 'failed', 'duplicate_blocked')),
  notes text not null default '',
  synced_to_sheets boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  synced_at timestamptz
);

-- Les anciennes lignes peuvent être orphelines après l’ancien ON DELETE SET NULL.
-- Les nouvelles insertions sont protégées par la policy RLS et doivent toujours fournir commercial_id.
alter table public.clients alter column synced_at drop default;

create index if not exists idx_clients_commercial_id on public.clients(commercial_id);
create index if not exists idx_clients_created_at on public.clients(created_at desc);

-- Conserve les historiques mais marque les doublons historiques avant la contrainte.
with ranked_duplicates as (
  select id,
         row_number() over (partition by client_phone_clean order by created_at asc, id asc) as row_number
  from public.clients
  where client_phone_clean is not null and client_phone_clean <> ''
)
update public.clients
set status = 'duplicate_blocked'
where id in (select id from ranked_duplicates where row_number > 1);

create unique index if not exists clients_phone_clean_unique
on public.clients(client_phone_clean)
where client_phone_clean <> '' and status <> 'duplicate_blocked';

create table if not exists public.app_settings (
  key varchar(100) primary key,
  value jsonb not null,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.commerciaux
    where user_id = auth.uid()
      and role = 'manager'
      and is_active = true
  );
$$;

create or replace function public.current_commercial_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.commerciaux
  where user_id = auth.uid()
    and is_active = true
  limit 1;
$$;

create or replace function public.prevent_commercial_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_manager() then
    new.user_id := old.user_id;
    new.phone := old.phone;
    new.role := old.role;
    new.is_active := old.is_active;
  end if;
  return new;
end;
$$;

drop trigger if exists commerciaux_protect_privileges on public.commerciaux;
create trigger commerciaux_protect_privileges
before update on public.commerciaux
for each row execute function public.prevent_commercial_privilege_escalation();

revoke all on function public.is_manager() from public;
revoke all on function public.current_commercial_id() from public;
revoke all on function public.prevent_commercial_privilege_escalation() from public;
grant execute on function public.is_manager() to authenticated;
grant execute on function public.current_commercial_id() to authenticated;

alter table public.commerciaux enable row level security;
alter table public.clients enable row level security;
alter table public.app_settings enable row level security;

-- Aucun accès anonyme à des données de recrutement.
revoke all on table public.commerciaux from anon;
revoke all on table public.clients from anon;
revoke all on table public.app_settings from anon;
grant select on table public.commerciaux, public.clients to authenticated;
grant update (name, localite, cabinet, partenaire, action, last_active_at) on public.commerciaux to authenticated;
grant insert on table public.commerciaux to authenticated;
grant insert, update, delete on table public.clients to authenticated;
grant all on table public.app_settings to authenticated;

drop policy if exists "Allow anon read/write on commerciaux" on public.commerciaux;
drop policy if exists "Allow anon read/write on clients" on public.clients;
drop policy if exists "Allow anon read/write on app_settings" on public.app_settings;
drop policy if exists commerciaux_select_authenticated on public.commerciaux;
drop policy if exists commerciaux_update_authenticated on public.commerciaux;
drop policy if exists commerciaux_insert_manager on public.commerciaux;
drop policy if exists clients_select_authenticated on public.clients;
drop policy if exists clients_insert_authenticated on public.clients;
drop policy if exists clients_update_manager on public.clients;
drop policy if exists clients_delete_manager on public.clients;
drop policy if exists settings_manager_only on public.app_settings;

create policy commerciaux_select_authenticated
on public.commerciaux for select to authenticated
using (user_id = auth.uid() or public.is_manager());

create policy commerciaux_update_authenticated
on public.commerciaux for update to authenticated
using (user_id = auth.uid() or public.is_manager())
with check (user_id = auth.uid() or public.is_manager());

create policy commerciaux_insert_manager
on public.commerciaux for insert to authenticated
with check (public.is_manager());

create policy clients_select_authenticated
on public.clients for select to authenticated
using (commercial_id = public.current_commercial_id() or public.is_manager());

create policy clients_insert_authenticated
on public.clients for insert to authenticated
with check (commercial_id = public.current_commercial_id() or public.is_manager());

create policy clients_update_manager
on public.clients for update to authenticated
using (public.is_manager())
with check (public.is_manager());

create policy clients_delete_manager
on public.clients for delete to authenticated
using (public.is_manager());

create policy settings_manager_only
on public.app_settings for all to authenticated
using (public.is_manager())
with check (public.is_manager());

-- Après création d'un compte dans Supabase Auth, l'administrateur doit le lier :
-- update public.commerciaux set user_id = '<AUTH_USER_UUID>' where phone = '+225...';
-- Ne jamais remettre de code ou de session_token dans cette table.
