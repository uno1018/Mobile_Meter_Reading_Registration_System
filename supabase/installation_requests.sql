-- Device installation requests for one Water District.
--
-- Run this in each Water District's own Supabase project -- one project per
-- district. Do NOT run it in the central project: that project holds only the
-- RegistrationApp registry, and device records must stay in the district that
-- owns them. Safe to re-run.

-- The table was originally named installation_request. Rename it in place so
-- projects created before the rename keep their rows, and so the create below
-- does not leave an empty second table beside the populated one. Skipped once
-- the new name is present, which makes this safe to re-run.
do $$
begin
  if to_regclass('public.installation_request') is not null
     and to_regclass('public.installation_requests') is null then
    alter table public.installation_request rename to installation_requests;
  end if;
end;
$$;

create table if not exists public.installation_requests (
  id bigint primary key generated always as identity,
  device_id text not null unique,
  manufacturer text,
  device_model text,
  os_version text,
  sdk_int integer,
  app_version text,
  app_version_code integer,
  installed_at timestamptz not null default now(),
  registration_status text not null default 'PENDING'
    check (registration_status in ('PENDING', 'APPROVED', 'DENIED', 'DISABLED')),
  -- Holds what the status was before a district wide disable, so enabling puts
  -- every device back where it was instead of making you re-approve them all.
  status_before_disable text,
  first_registered_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Districts created before DISABLED existed carry the older constraint, under
-- whichever name the table had when it was written.
alter table public.installation_requests
  drop constraint if exists installation_request_registration_status_check;
alter table public.installation_requests
  drop constraint if exists installation_requests_registration_status_check;
alter table public.installation_requests
  add constraint installation_requests_registration_status_check
  check (registration_status in ('PENDING', 'APPROVED', 'DENIED', 'DISABLED'));

alter table public.installation_requests
  add column if not exists status_before_disable text;

-- A rename carries the index over under its old name, so drop it rather than
-- ending up with two indexes covering the same column.
drop index if exists public.installation_request_installed_at_idx;

create index if not exists installation_requests_installed_at_idx
  on public.installation_requests (installed_at desc);

-- updated_at is maintained server side so it cannot be forged by a client.
create or replace function public.set_installation_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists installation_request_set_updated_at on public.installation_requests;
drop trigger if exists installation_requests_set_updated_at on public.installation_requests;
drop function if exists public.set_installation_request_updated_at();

create trigger installation_requests_set_updated_at
before update on public.installation_requests
for each row execute function public.set_installation_requests_updated_at();

alter table public.installation_requests enable row level security;

-- District wide kill switch for devices.
--
-- This has to live here rather than in the central registry: phones only ever
-- talk to their own district project, so a flag in RegistrationApp would stop
-- the console connecting without affecting a single handset. Turning this off
-- blocks new registrations and makes every device read back DISABLED, however
-- it was previously decided.
create table if not exists public.district_service (
  id boolean primary key default true check (id),
  devices_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.district_service (id, devices_enabled)
values (true, true)
on conflict (id) do nothing;

alter table public.district_service enable row level security;

revoke all on public.district_service from anon, authenticated;

-- Read as the owner so devices can be gated without exposing the table. A
-- district with no row yet is treated as enabled, matching the default above.
create or replace function public.district_devices_enabled()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select devices_enabled from public.district_service where id), true);
$$;

revoke all on function public.district_devices_enabled() from public;
grant execute on function public.district_devices_enabled() to anon, authenticated;

-- Devices self-register with the district anon key, so anon needs insert. The
-- grant is column scoped: registration_status is omitted, so a device cannot
-- submit itself as APPROVED -- the column falls back to its PENDING default.
-- Anon gets no select; the whole device inventory must not be readable by
-- anyone holding the anon key. Status checks go through the function below.
revoke all on public.installation_requests from anon;

grant insert (
  device_id,
  manufacturer,
  device_model,
  os_version,
  sdk_int,
  app_version,
  app_version_code
) on public.installation_requests to anon;

grant select on public.installation_requests to authenticated;
grant update (registration_status) on public.installation_requests to authenticated;

drop policy if exists "Allow installation request reads" on public.installation_requests;
drop policy if exists "Only registration admins can update installation status" on public.installation_requests;
drop policy if exists "Devices may submit a registration request" on public.installation_requests;
drop policy if exists "Registration admins read every request" on public.installation_requests;
drop policy if exists "Registration admins decide requests" on public.installation_requests;

create policy "Devices may submit a registration request"
on public.installation_requests
for insert
to anon
with check (registration_status = 'PENDING' and public.district_devices_enabled());

create policy "Registration admins read every request"
on public.installation_requests
for select
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'registration_admin');

create policy "Registration admins decide requests"
on public.installation_requests
for update
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'registration_admin')
with check (registration_status in ('PENDING', 'APPROVED', 'DENIED'));

-- Lets a device read back only its own status, instead of granting anon select
-- over the entire table. Returns null when the device is not registered.
--
-- Disabling a district writes DISABLED onto every row, so no special case is
-- needed here: the stored status is the answer.
create or replace function public.get_registration_status(p_device_id text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select registration_status
  from public.installation_requests
  where device_id = p_device_id;
$$;

grant execute on function public.get_registration_status(text) to anon, authenticated;

-- Console access to this district.
--
-- The console signs in to the central project, so the token it holds is signed
-- by that project's key. This project cannot verify it: each Supabase project
-- verifies only its own keys, and PostgREST matches a token to a key by its
-- kid, which a foreign token will never carry. Sharing a signing secret across
-- projects does not work around that.
--
-- So the console authenticates to this district with a per-district admin key
-- instead, checked inside the security definer functions below. Only the hash
-- of that key is stored, so reading this table does not yield a usable key.
create extension if not exists "pgcrypto";

create table if not exists public.district_admin_credential (
  -- Single row: the check constrains id to true, so a second insert conflicts.
  id boolean primary key default true check (id),
  key_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.district_admin_credential enable row level security;

-- No grants and no policies: the table is unreachable through PostgREST at
-- all. The functions below read it as the owner, which is the only access path.
revoke all on public.district_admin_credential from anon, authenticated;

-- Sets this district's admin key. Run it from the SQL editor with the same
-- value stored in the district's registry row in the central project:
--
--   select public.set_district_admin_key('paste-the-key-here');
create or replace function public.set_district_admin_key(p_key text)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  insert into public.district_admin_credential (id, key_hash, updated_at)
  values (true, encode(digest(p_key, 'sha256'), 'hex'), now())
  on conflict (id) do update
    set key_hash = excluded.key_hash,
        updated_at = now();
$$;

-- Postgres grants execute on a new function to public by default, which here
-- would let anyone holding the anon key overwrite the admin key and take over
-- the district. Revoke it and grant it to no one: the SQL editor runs as the
-- owner and does not need the grant.
revoke all on function public.set_district_admin_key(text) from public;

create or replace function public.district_admin_key_matches(p_admin_key text)
returns boolean
language sql
security definer
set search_path = public, extensions
stable
as $$
  select exists (
    select 1
    from public.district_admin_credential
    where key_hash = encode(digest(p_admin_key, 'sha256'), 'hex')
  );
$$;

revoke all on function public.district_admin_key_matches(text) from public;

-- The console's read path. Returns nothing without the key, so the anon key on
-- its own still exposes no part of the device inventory.
create or replace function public.admin_list_installation_requests(p_admin_key text)
returns setof public.installation_requests
language plpgsql
security definer
set search_path = public, extensions
stable
as $$
begin
  if not public.district_admin_key_matches(p_admin_key) then
    raise exception 'Invalid district admin key' using errcode = '42501';
  end if;

  return query
    select *
    from public.installation_requests
    order by installed_at desc nulls last;
end;
$$;

revoke all on function public.admin_list_installation_requests(text) from public;
grant execute on function public.admin_list_installation_requests(text) to anon, authenticated;

-- The console's decision path. The status is checked here as well as by the
-- column constraint so a bad value fails before the update is attempted.
create or replace function public.admin_set_registration_status(
  p_admin_key text,
  p_request_id bigint,
  p_status text
)
returns public.installation_requests
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  updated public.installation_requests;
begin
  if not public.district_admin_key_matches(p_admin_key) then
    raise exception 'Invalid district admin key' using errcode = '42501';
  end if;

  if p_status not in ('APPROVED', 'DENIED') then
    raise exception 'Status must be APPROVED or DENIED' using errcode = '22023';
  end if;

  -- Approving while the district is disabled would hand access straight back,
  -- so the approval is staged and applies when the district is switched on.
  -- Denying is always applied: it takes access away rather than granting it.
  -- updated_at is left to the trigger.
  if p_status = 'APPROVED' and not public.district_devices_enabled() then
    update public.installation_requests
    set registration_status = 'DISABLED',
        status_before_disable = 'APPROVED'
    where id = p_request_id
    returning * into updated;
  else
    update public.installation_requests
    set registration_status = p_status,
        status_before_disable = null
    where id = p_request_id
    returning * into updated;
  end if;

  if updated.id is null then
    raise exception 'No installation request with id %', p_request_id
      using errcode = 'P0002';
  end if;

  return updated;
end;
$$;

revoke all on function public.admin_set_registration_status(text, bigint, text) from public;
grant execute on function public.admin_set_registration_status(text, bigint, text) to anon, authenticated;

-- The console's view of the kill switch. Separate from district_devices_enabled
-- above, which anon may call: this one requires the admin key, so the console
-- can show the state without letting a handset probe it.
create or replace function public.admin_get_district_devices_enabled(p_admin_key text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
stable
as $$
begin
  if not public.district_admin_key_matches(p_admin_key) then
    raise exception 'Invalid district admin key' using errcode = '42501';
  end if;

  return public.district_devices_enabled();
end;
$$;

revoke all on function public.admin_get_district_devices_enabled(text) from public;
grant execute on function public.admin_get_district_devices_enabled(text) to anon, authenticated;

-- Flips the whole district. Disabling writes DISABLED onto the APPROVED rows,
-- so a handset polling get_registration_status sees it without the app needing
-- to know anything about districts. PENDING and DENIED are left alone: neither
-- grants access, so there is nothing to take away. The previous status is kept
-- in status_before_disable and restored on enable, so switching a district off
-- and back on does not lose approvals.
create or replace function public.admin_set_district_devices_enabled(
  p_admin_key text,
  p_enabled boolean
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.district_admin_key_matches(p_admin_key) then
    raise exception 'Invalid district admin key' using errcode = '42501';
  end if;

  insert into public.district_service (id, devices_enabled, updated_at)
  values (true, p_enabled, now())
  on conflict (id) do update
    set devices_enabled = excluded.devices_enabled,
        updated_at = now();

  if p_enabled then
    update public.installation_requests
    set registration_status = coalesce(status_before_disable, 'APPROVED'),
        status_before_disable = null
    where registration_status = 'DISABLED';
  else
    update public.installation_requests
    set status_before_disable = registration_status,
        registration_status = 'DISABLED'
    where registration_status = 'APPROVED';
  end if;

  return p_enabled;
end;
$$;

revoke all on function public.admin_set_district_devices_enabled(text, boolean) from public;
grant execute on function public.admin_set_district_devices_enabled(text, boolean) to anon, authenticated;

-- PostgREST caches the schema, so a freshly created function can keep coming
-- back as PGRST202 until it reloads.
notify pgrst, 'reload schema';

-- Android side:
--   register  ->  insert into installation_requests (device_id, manufacturer, ...)
--   poll      ->  select get_registration_status('<device_id>')
--
-- device_id is unique, so a reinstall hits a conflict rather than creating a
-- duplicate row. Have the device call get_registration_status first and only
-- insert when it returns null.
