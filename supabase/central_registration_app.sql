-- Central registry of Water District Supabase projects.
-- Safe to re-run: policies are dropped before being recreated.

create extension if not exists "pgcrypto";

create table if not exists public."RegistrationApp" (
  id uuid primary key default gen_random_uuid(),
  water_district text not null,
  description text,
  supabase_url text not null,
  supabase_anon_key text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public."RegistrationApp" enable row level security;

-- Rows hold every district's Supabase URL and anon key, so no unauthenticated
-- role may read this table. Signup is open on this project, so being merely
-- authenticated is not sufficient either -- the registration_admin claim is required.
revoke all on public."RegistrationApp" from anon;
grant select, insert, update, delete on public."RegistrationApp" to authenticated;

drop policy if exists "Allow registry reads" on public."RegistrationApp";
drop policy if exists "Only registration admins can manage registry rows" on public."RegistrationApp";
drop policy if exists "Registration admins manage the registry" on public."RegistrationApp";

create policy "Registration admins manage the registry"
on public."RegistrationApp"
for all
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'registration_admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'registration_admin');

-- Grant an administrator access. Replace the email with a user that already
-- exists in Authentication > Users. The claim lives in app_metadata so the
-- user cannot alter it themselves. They must sign out and back in afterwards
-- for the new claim to appear in their JWT.
--
-- update auth.users
-- set raw_app_meta_data =
--   coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"registration_admin"}'::jsonb
-- where email = 'admin@example.com';

-- Register a Water District. One row per district; no code changes needed.
--
-- insert into public."RegistrationApp"
--   (water_district, description, supabase_url, supabase_anon_key, active)
-- values
--   ('Sample Water District', 'Production', 'https://sample-project.supabase.co', 'district-anon-key', true);
