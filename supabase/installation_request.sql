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
    check (registration_status in ('PENDING', 'APPROVED', 'DENIED')),
  first_registered_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
with check (registration_status = 'PENDING');

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
