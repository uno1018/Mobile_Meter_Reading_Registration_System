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

Each Water District project must already have `installation_request`. Run or adapt `supabase/district_installation_request_rls.sql` in each district project to enable reads and restrict updates to authenticated registration administrators.

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
