# Mobile Meter Reading Registration System

React 19 + Vite + TypeScript dashboard for authorizing Android meter-reading devices across multiple Water District Supabase projects.

## Stack

- React 19, Vite, TypeScript
- Supabase JS
- TanStack Query and TanStack Table
- React Router
- React Hook Form and Zod
- Tailwind CSS
- Lucide React

## Setup

Use Node.js 22.22.0 or newer for the cleanest install path with the current React Router package.

1. Copy `.env.example` to `.env.local`.
2. Set the central Supabase project values:

```bash
VITE_SUPABASE_URL=https://your-central-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-central-project-anon-key
```

3. Install and run:

```bash
npm install
npm run dev
```

## Supabase

Run `supabase/central_registration_app.sql` in the central Supabase project. Add one row to `RegistrationApp` for each Water District. No code changes are needed when a new district is added.

Run `supabase/installation_requests.sql` in each Water District project. It creates `installation_requests`, keeps `updated_at` server side with a trigger, and restricts access: devices may insert a PENDING request with the anon key, they get no read access to the table at all, and a device reads back its own status through `get_registration_status(device_id)`.

Do not run it in the central project. The central project holds only the `RegistrationApp` registry; device records stay in the district project that owns them.

### District admin key

The console signs in to the central project, so the token it holds is signed by that project's key. A district project cannot verify it — each Supabase project verifies only its own keys, and PostgREST matches a token to a key by its `kid`, which a foreign token never carries. Sharing a signing secret between projects does not work around this.

The console therefore authenticates to a district with a per-district admin key, checked inside `admin_list_installation_requests` and `admin_set_registration_status`. Adding a district takes two steps:

1. In **Add Water District**, click **Generate** next to Admin Key. The dialog shows the statement to run.
2. In the **district** project's SQL editor, run `select public.set_district_admin_key('<the generated key>');`

The district stores only a SHA-256 hash, so the value in the registry row is the only copy. **Test Connection** verifies the key as well as the schema, so a mismatch is caught before the row is saved.

### Disabling a district

**Disable Devices** on the district page switches off the whole district. It writes `DISABLED` onto the `APPROVED` rows in that project's `installation_requests`, so a handset polling `get_registration_status` sees it without the Android app needing to know districts exist, and the insert policy stops new devices registering. `PENDING` and `DENIED` rows are left alone — neither grants access, so there is nothing to take away.

The previous status is saved to `status_before_disable` and restored when you enable the district again, so switching off and back on does not lose approvals. Approving a device while a district is disabled is staged the same way and applies on enable, rather than handing access straight back; denying is applied immediately, since it only takes access away.

This lives in the district project, not `RegistrationApp`. Phones only ever talk to their own district, so a flag in the central registry would stop the console connecting without affecting a single handset — `active` on `RegistrationApp` does exactly that and nothing more.

To rotate a key later, edit the district and click **Regenerate**. The statement to run reappears, and it is only shown when the key actually changed — editing a name or description leaves the district untouched. Deleting a district removes the registry row only; its devices stay in its own project, so re-adding it brings the inventory back.

The app creates Water District clients at runtime with:

```ts
createClient(supabase_url, supabase_anon_key)
```

No Water District credentials are hardcoded.

## Administrator Auth

The UI blocks approve and deny actions unless an administrator is signed in through the central Supabase project. The dynamic Water District client forwards the current access token as an authorization header for RLS.

For independent Supabase projects, make sure every Water District project can validate the administrator token strategy you choose. If projects do not share compatible JWT trust, use matching administrator accounts/claims per district project or route updates through a secured backend/Edge Function.

## Deployment

For Vercel, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Project Settings, connect the GitHub repository, and deploy with:

```bash
npm run build
```
