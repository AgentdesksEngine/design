create extension if not exists pgcrypto;

-- ============================================================================
-- Identity
-- ============================================================================

create table profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text not null,
  display_name text,
  avatar_url text,
  allowed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint profiles_email_key unique (email)
);

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (auth_user_id, email, display_name, avatar_url, allowed)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    lower(new.email) like '%@radiusagent.com'
  )
  on conflict (email) do update set
    auth_user_id = excluded.auth_user_id,
    avatar_url = coalesce(profiles.avatar_url, excluded.avatar_url),
    display_name = coalesce(profiles.display_name, excluded.display_name),
    allowed = profiles.allowed or excluded.allowed;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- Design catalog metadata
-- ============================================================================

create table designs (
  slug text primary key,
  title text not null,
  description text not null,
  tags text[] not null default '{}',
  owner_name text,
  default_version text not null,
  latest_version text not null,
  thumbnail_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table design_versions (
  id uuid primary key default gen_random_uuid(),
  design_slug text not null references designs(slug) on delete cascade,
  version_slug text not null,
  title text not null,
  notes text not null default '',
  entry_path text not null,
  thumbnail_path text not null,
  created_at timestamptz,
  unique (design_slug, version_slug)
);

create table design_status (
  id uuid primary key default gen_random_uuid(),
  design_slug text not null,
  -- Empty string means design-level status. v1/v2/etc means version-level status.
  version_slug text not null default '',
  status text not null default 'DRAFT' check (status in ('DRAFT','IN_REVIEW','APPROVED','RELEASED','ARCHIVED')),
  released_to_prod boolean not null default false,
  released_at timestamptz,
  status_notes text not null default '',
  updated_by uuid references profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (design_slug, version_slug)
);

create index design_status_design_slug_idx on design_status (design_slug);
create index design_status_status_idx on design_status (status);

-- The browser never reads tables directly; APIs use the service role / database connection.
alter table profiles enable row level security;
alter table designs enable row level security;
alter table design_versions enable row level security;
alter table design_status enable row level security;

create policy "allowed profiles can read their own profile"
on profiles for select using (auth_user_id = auth.uid() and allowed = true);
