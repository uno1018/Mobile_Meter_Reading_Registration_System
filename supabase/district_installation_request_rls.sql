alter table public.installation_request enable row level security;

create policy "Allow installation request reads"
on public.installation_request
for select
to anon, authenticated
using (true);

create policy "Only registration admins can update installation status"
on public.installation_request
for update
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'registration_admin')
with check (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'registration_admin'
  and registration_status in ('PENDING', 'APPROVED', 'DENIED')
);

grant select on public.installation_request to anon, authenticated;
grant update (registration_status, updated_at) on public.installation_request to authenticated;
