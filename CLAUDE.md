@AGENTS.md

# Incident Report Tracker — Northern Lights Petroleum

Mobile-first web app for drivers, dispatchers, and managers to submit and review fuel/transport incident reports.

## Stack
- Next.js 16.2.6 (App Router, Server Actions) + React 19 + TypeScript + Tailwind CSS v4
- Supabase — Auth, Postgres, Storage, RLS
- Vercel — production deployment
- Project path: `/Users/nick/Downloads/incident-report-tracker/incident-report-tracker/`

## Key conventions
- `middleware.ts` is deprecated in Next.js 16 — use `proxy.ts` for new proxy logic (currently still works with warning)
- Server actions live in `app/actions/` (global) or colocated `app/[route]/actions.ts`
- Supabase clients: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server/RSC)
- All dropdown data comes from the `lookup_options` table — never hardcode options
- Date formatting via `lib/format.ts` `formatDate()` — always use this, never raw YYYY-MM-DD strings
- `params` and `searchParams` in Next.js 16 App Router are Promises — must be awaited
- Toast pattern: server actions `redirect('/path?toast=Message+text')`, `<FlashBanner />` reads + clears the param
- Brand colors defined in `globals.css` as `--color-brand-*` — use `brand-600/700/800` Tailwind classes, never raw teal
- Logo at `public/logo.png` (NLP green logo), hero image at `public/NPT truck logo.jpeg` (login background)
- Date input uses `app/submit/DatePicker.tsx` — shows "May 15, 2026" format, native calendar on click, submits YYYY-MM-DD via hidden input

## Routes
| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Redirects → `/submit` |
| `/login` | Public | Email/password login with hero truck/aurora background |
| `/forgot-password` | Public | Send password reset email |
| `/auth/callback` | Public | Supabase code exchange; supports `?next=` param |
| `/auth/reset` | Authenticated | Set new password after reset |
| `/submit` | All authenticated | Incident submission form |
| `/dashboard` | All authenticated | Incident list with filters, search, pagination, inline status update |
| `/incidents/[id]` | All authenticated | Detail view; dispatchers/managers manage status + notes; drivers see notes read-only |
| `/incidents/[id]/edit` | Manager only | Edit all fields of a submitted incident |
| `/profile` | All authenticated | View role, update display name; drivers see incident stats |
| `/admin` | Manager only | Manage drivers, customers, lookup options |
| `/api/export` | Manager only | CSV download of incidents |

## Database tables
- `profiles` — extends auth.users; `role`: driver / dispatcher / manager; `full_name` used for driver auto-fill
- `lookup_options` — all dropdowns; categories: `incident_type`, `reported_to`, `dispatcher`, `root_cause`
- `drivers` — admin-managed, `is_active` flag
- `customers` — admin-managed, `is_active` flag, optional `province`
- `incidents` — main table; status: open / in_review / closed; `submitted_by` = auth.uid()
- `incident_photos` — references Storage bucket `incident-photos`; path: `{incident_id}/{timestamp-random}.ext`
- `incident_notes` — dispatcher/manager notes, `author_id` references auth.users; drivers can read notes on their own incidents

Helper function `auth_user_role()` is security definer — used in RLS to avoid recursion on profiles.

## Supabase grants applied (run in SQL Editor)
```sql
GRANT SELECT, INSERT, UPDATE ON public.incidents TO authenticated;
GRANT SELECT, INSERT ON public.incident_notes TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT, UPDATE ON public.drivers TO authenticated;
GRANT INSERT, UPDATE ON public.customers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lookup_options TO authenticated;
GRANT SELECT, INSERT ON public.incident_photos TO authenticated;

-- Storage bucket policies
CREATE POLICY "Authenticated upload photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'incident-photos');
CREATE POLICY "Authenticated view photos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'incident-photos');

-- Profile update
CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Drivers read notes on own incidents
CREATE POLICY "Drivers read own incident notes" ON incident_notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM incidents WHERE incidents.id = incident_notes.incident_id AND incidents.submitted_by = auth.uid())
  );
```

## Roles & permissions
- **Driver** — submits incidents (driver field auto-fills from profile name), sees only own incidents on dashboard, sees notes on own incidents (read-only), profile shows incident stats
- **Dispatcher** — sees all incidents, updates status (inline on dashboard + detail page), adds notes
- **Manager** — full access + Admin panel + CSV export + Edit incident + Admin nav link

## Key files
- `lib/format.ts` — `formatDate(dateStr)` converts YYYY-MM-DD → "May 12, 2026"
- `lib/supabase/client.ts` / `server.ts` — Supabase browser/server clients
- `app/submit/DatePicker.tsx` — custom date picker: shows formatted date, opens native calendar on click
- `app/dashboard/DriverFilter.tsx` — client component for driver dropdown filter
- `app/dashboard/SearchInput.tsx` — client component for text search (driver, customer, description)
- `app/dashboard/StatusSelect.tsx` — client component for inline status update from dashboard table
- `app/dashboard/actions.ts` — `updateIncidentStatusInline` (revalidates dashboard, no redirect)
- `app/admin/ConfirmForm.tsx` — client component for confirmation dialogs
- `app/components/FlashBanner.tsx` — reads `?toast=` URL param, shows green toast for 3s, clears param
- `app/incidents/[id]/actions.ts` — updateIncidentStatus, addIncidentNote (redirect with toast)
- `app/incidents/[id]/edit/` — edit form + actions for manager field corrections
- `app/profile/` — profile page + actions (updateProfile)
- `app/api/export/route.ts` — CSV export, manager-only, respects all dashboard filters
- `supabase/schema.sql` — full DB schema + seed data

## Dashboard filters + search
URL params: `?filter=day|week|month|year|all` + `?status=open|in_review|closed|all` + `?driver=<uuid>|all` + `?search=<text>` + `?page=<n>`
Search queries drivers by name, customers by name, and incidents by description (parallel Supabase lookups, then `.or()` filter).
`buildHref()` helper stacks all params. Page resets to 1 on any filter/search change.
Pagination: 25 per page using Supabase `.range()` + `{ count: 'exact' }`.

## Driver auto-fill
Submit page fetches `profiles.full_name` + `role` for the logged-in user.
If `role === 'driver'`, matches name (case-insensitive) against `drivers.full_name` and passes `defaultDriverId` to `IncidentForm`.

## Photo upload
- File input in `IncidentForm` accepts multiple images (`accept="image/*"`)
- `submitIncident` action inserts incident first, then uploads each photo to Storage at `{incident_id}/{timestamp-random}.ext`
- Inserts row into `incident_photos` per photo; failed uploads are silently skipped (incident still saves)
- Detail page fetches `incident_photos`, generates signed URLs (1 hour), renders 2–3 col image grid
- `next.config.ts` sets `experimental.serverActions.bodySizeLimit: '20mb'`

## Brand / UI
- Brand green: `#2D6A4F` (primary), `#1F4D39` (hover/dark), `#52B788` (accent), `#74C69D` (light)
- Defined as `--color-brand-*` CSS variables in `globals.css`, used as `brand-600/700/800` Tailwind classes
- Login page: hero background `public/NPT truck logo.jpeg` + dark green overlay + frosted glass form card
- All page headers: NLP logo (`public/logo.png`) at `height: 2rem`, `+ New Incident` teal button in dashboard header
- Stats cards: colored left border (`border-l-4`) per status — gray/yellow/teal/green

## Seed data
- Incident types: Spill, Accident, Mix, Loading Error, Runout, Retain, Redirect
- Reported to: Dori, Rob, Gary, Dave, Saurleen, Zach, Barry
- Dispatchers: Dori, Dave, Sarleen (hard-deleted when removed, not deactivated)
- Root causes: Driver, Dispatch, Customer

---

## Completed stages

### Stage 1 — Database schema
Full Supabase schema with RLS policies, seed data, `incident-photos` storage bucket.

### Stage 2 — Authentication
Supabase Auth email/password login, profiles table with role, middleware route protection.
Login page branded "Northern Lights Petroleum".

### Stage 3 — Incident submission form
Mobile-friendly form at `/submit` with all fields. Server action validates and inserts.
Redirects to `/dashboard` on success. Driver field auto-fills for driver role users.

### Stage 4 — Dashboard
`/dashboard` with stats cards (total/open/in review/closed), incident table (desktop) + cards (mobile), View → links.

### Stage 5 — Incident detail + review
`/incidents/[id]` full detail view. Dispatchers/managers see Update Status form + Notes section.
Toast feedback after status update and note added.

### Stage 6 — Admin panel
`/admin` — manager-only. Drivers, Customers, Lookup Options sections.
Deactivate/reactivate for drivers, customers, incident types, reported-to, root causes.
Dispatchers hard-deleted with confirmation dialog.

### Stage 7 — UX & polish
- Date formatting: "May 12, 2026" everywhere via `lib/format.ts`
- Dashboard filters: period pills + status pills + driver dropdown (all stack via URL params)
- Pagination: 25/page with Prev/Next and "Showing X–Y of Z"
- Confirmation dialogs: `ConfirmForm` client component
- Toast notifications: `FlashBanner` client component
- Forgot password: `/forgot-password` → email → `/auth/reset` flow
- CSV export: `/api/export` for managers, respects active filters, downloads dated file
- Driver auto-fill: pre-selects driver on submit form for driver-role users

### Stage 8 — Photo upload
- File input in `IncidentForm`, uploads to Supabase Storage `incident-photos` bucket
- Photos displayed as signed-URL grid on detail page
- Body size limit raised to 20MB in `next.config.ts`

### Stage 9 — Profile page
- `/profile` route for all users: view email, role badge, update display name
- Drivers see incident stats card: this year (total/open/in review/closed) + all time
- Dispatchers and managers see account info only

### Stage 10 — UI redesign
- Brand colors updated to NLP forest green (`#2D6A4F`) matching Gen 7 pricing tool
- Login page: truck + aurora hero image background with dark overlay + frosted glass card
- All headers: NLP logo, `+ New Incident` as teal button, shadow separator
- Dashboard stats cards: colored `border-l-4` accents, sub-labels, `shadow-sm`
- Table: uppercase column headers, teal "View" pill button
- Page title updated to "Northern Lights Petroleum — Incident Reports"

### Stage 11 — UX improvements
- **Search**: text search on dashboard across driver name, customer name, description
- **Inline status update**: dispatchers/managers can change status via dropdown in dashboard table row (no page navigation needed)
- **Edit incident**: managers can edit all fields of a submitted incident at `/incidents/[id]/edit`
- **Driver notes**: drivers can now read dispatcher/manager notes on their own incidents (add-note still gated to dispatcher/manager)
- **Custom date picker**: `DatePicker` component shows "May 15, 2026" format, opens native calendar on click

---

## To-Do

### Next up
- **Email notifications** — Alert dispatchers when a new incident is submitted
  - Option A: Supabase Edge Function triggered by DB webhook on `incidents` INSERT
  - Option B: Call Resend/SendGrid API inside `submitIncident` server action after insert
  - Needs: dispatcher email addresses (query profiles where role = 'dispatcher')
  - Also useful: notify driver when their incident status changes

### Planned

- **"New since last visit" indicator** — Badge on dashboard showing incidents added/updated since last login; store `last_seen_at` in profiles or localStorage

- **Print / PDF view** — Clean printable layout of a full incident report for insurance or compliance; could be a `/incidents/[id]/print` route with `@media print` CSS

- **Incident report signature** — Allow drivers to digitally sign/acknowledge their submitted report (simple checkbox + timestamp stored on incident)

- **Dashboard sort columns** — Click table column headers (Date, Driver, Status) to sort ascending/descending via URL params

- **Bulk status update** — Managers select multiple incidents via checkboxes and close/archive them in one action

- **Duplicate detection** — Flag when the same driver submits two incidents of the same type on the same day

- **Incident attachments beyond photos** — Allow PDF/document uploads (e.g. police report, bill of lading) stored in the same Storage bucket with a different path prefix

- **Driver performance summary** — Manager-only report showing incidents per driver over a date range, preventable rate, most common incident types

- **Mobile app wrapper** — PWA manifest + service worker so drivers can add to home screen and submit reports offline (queued for when back online)

---

## Dev setup
```bash
cd /Users/nick/Downloads/incident-report-tracker/incident-report-tracker
npm install
npm run dev
# → http://localhost:3000
```

`.env.local` is present with Supabase URL and anon key. Do not commit it.
Add `NEXT_PUBLIC_SITE_URL=https://your-vercel-url.vercel.app` for production password reset emails.

## Notes
- IDE working directory points to `__incident-report-tracker` — ignore it, it's a failed-download artifact
- Real project is at `incident-report-tracker/` one level up
- Nick's Supabase email: nick@northernlightspetroleum.ca / role: manager
- NLP logo source: `/Users/nick/Documents/invoice_automation/branding/nlp_v3.png`
- Hero image source: `public/NPT truck logo.jpeg` (AI-generated truck + northern lights)
- Gen 7 pricing tool brand colors sourced from `/Users/nick/Documents/Daily-Customer-Pricing/templates/gen7_login.html`
