# Campus Connect — Student Portal (Full Stack)

A student-portal app modeled on your screenshots: a mobile-style student app
(Dashboard, Attendance, Marks, Timetable, Messages, Profile menu) backed by a
real Node.js/Express API, plus a separate **Admin Panel** where you update
attendance, marks, timetable, and send notifications — changes show up for
students immediately.

## Project layout

```
student-portal/
├── api/
│   └── index.js          Vercel serverless entry point (wraps the Express app below)
├── backend/     Node.js + Express API
│   └── src/
│       ├── server.js          Express app — also runs standalone locally via `npm start`
│       ├── db/postgresDb.js   the active data layer (Postgres / Supabase)
│       ├── db/jsonDb.js       ⚠️ legacy, unused — kept for reference only
│       ├── db/seed.js         demo data (2 students, 12 subjects, grades, attendance log, etc.)
│       ├── middleware/auth.js JWT auth + role checks
│       ├── routes/            auth, attendance, marks, results, timetable, notifications, tiles, profile
│       └── utils/             attendance %, GPA/grade calculations
├── frontend/    Student-facing app (plain HTML/CSS/JS, no build step)
├── admin/       Admin panel (plain HTML/CSS/JS, no build step)
├── vercel.json  routes /api to the function, /admin and / to the right static files
└── package.json root-level, mainly so Vercel's installer sees the backend's deps
```

The data layer is Postgres (works with Supabase's free tier) via the `pg`
package. It stores each entity as a JSON row in one generic `records` table
rather than a fully normalized relational schema — that was a deliberate
tradeoff so the storage engine could be swapped (JSON-file → Postgres)
without rewriting every route's query logic. See the comment at the top of
`backend/src/db/postgresDb.js` for the reasoning, and the "Deploying live"
section below for why Postgres specifically (Vercel's serverless filesystem
is ephemeral, so a file-based DB doesn't survive there).

## Running it locally

```bash
cd backend
cp .env.example .env   # then paste your DATABASE_URL into it — see "Deploying live" below
npm install
npm run seed     # populates your Postgres database with demo data
npm start         # starts the server on http://localhost:4000
```

Then open:
- **Student app:** http://localhost:4000/
- **Admin panel:** http://localhost:4000/admin/

Both are served by the same backend locally, so one process is all you need.
(On Vercel, the frontend/admin are deployed as separate static sites and the
API as a serverless function — see below — but day-to-day local development
is just the one command above.)

## Demo logins

| Role    | Username / Roll No | Password   |
|---------|---------------------|------------|
| Student | `12216312`          | `student123` |
| Student | `12216313`          | `student123` |
| Admin   | `admin`              | `admin123` |

Change these in `backend/src/db/seed.js` (passwords are bcrypt-hashed) before
giving this to real users.

## The core feature: updating attendance from the backend

1. Log into the **Admin Panel** → **Attendance** tab.
2. Pick a student from the dropdown.
3. Edit **Attended / Delivered / Duty Leaves / Last Attended** for any
   subject and click **Save** — that row updates instantly and the
   percentage recalculates.
4. The student's app (Dashboard attendance tile badge, and the Attendance
   page itself) reflects the change the next time they load it — no caching,
   no delay.

There's also a **bulk "record today's class"** tool: pick a subject, tick
which students were present, and it increments `delivered` for everyone and
`attended` only for those marked present — useful for taking attendance for
an entire lecture in one action instead of editing every student one by one.

## What's wired up end-to-end (not just UI)

- **Auth** — JWT-based login for students and a separate admin login, with
  role-checked routes (`401` if not logged in, `403` if wrong role).
- **Attendance (aggregate)** — student view + full admin CRUD, including
  validation (attended can't exceed delivered) and live percentage
  computation.
- **Attendance Log (session-level)** — every individual class meeting
  (date, time slot, Present/Absent, faculty, faculty UID) — the detailed
  history view, separate from the aggregate %. Admin adds one entry per
  class; it automatically rolls into that subject's aggregate
  attended/delivered count too, so the two views never disagree.
- **Marks** — exam-level marks (Mid Term, Quiz, etc.) — student view + admin add/delete.
- **Results / GPA** — semester-wise final course grades on the O/A+/A/B+/B/C/D/F
  scale, with TGPA (per semester) and CGPA (overall) computed automatically
  from credits — admin just sets a grade per course per semester, the math
  is never manual or stored separately.
- **Timetable** — day-tabbed weekly schedule (Monday, Friday, etc. — only
  days with periods show as tabs), each period showing type
  (Lecture/Practical/Tutorial), room, group, and section, matching the
  original screenshots' format. Admin adds/removes periods per student.
- **Notifications ("My Messages")** — student inbox + admin send-to-one or
  broadcast-to-all, with an unread-count badge on the bell icon.
- **Dashboard tiles** — admin can toggle which tiles are visible to
  students; live badges (attendance %, unread messages, marks count, CGPA)
  are computed from real data, not hardcoded.

## The Results / Attendance Log / Timetable admin tabs

These three live in their own tabs in the admin sidebar:

- **Results / GPA** — pick a student, see all their semesters with computed
  TGPA + the overall CGPA pill at the top. Add a grade: semester number +
  subject + grade (O through F) + credits. Saving recalculates TGPA/CGPA
  immediately — there's nothing to "compute" by hand.
- **Attendance Log** — pick a student, see every class session they've had.
  Add one: subject + date + time + Present/Absent + faculty. This both adds
  the log row *and* bumps that subject's aggregate attended/delivered count
  in the same action, so you only enter data once.
- **Timetable** — now includes period type (Lecture/Practical/Tutorial),
  room, group number, and section when adding a period, matching the
  `Practical / G:0 / C:CSE435 / R:55-702 / S:ST001` format from the student
  app.

## Deploying live (Supabase + GitHub + Vercel)

The backend now uses Postgres instead of the JSON file, so it survives
Vercel's serverless filesystem (which resets constantly — a file-based DB
would lose every admin edit). Here's the full path from your computer to a
live URL.

### 1. Create a free Supabase Postgres database

1. Go to [supabase.com](https://supabase.com) → sign up → **New Project**.
2. Pick a name, set a database password (save it somewhere), pick a region close to you.
3. Once it's created, go to **Project Settings → Database → Connection string**.
4. For deploying to Vercel specifically, use the **"Connection pooling"**
   string (port `6543`, "Transaction" mode) rather than the direct one
   (port `5432`). Serverless functions open a fresh connection per request,
   and Supabase's free-tier direct connection limit runs out fast under
   that pattern — the pooler is built for exactly this. You can use the
   direct one for local development if you prefer; both work for running
   the seed script.
5. Replace `[YOUR-PASSWORD]` in whichever string you copy with the password you set in step 2.

### 2. Run the seed script against Supabase, from your computer

```bash
cd backend
cp .env.example .env
```
Open `.env` and paste your real Supabase connection string into `DATABASE_URL`.

```bash
npm install
npm run seed
```

You should see `Database seeded successfully.` — that means your Supabase
project now has all the tables and demo data. You can confirm in Supabase's
own dashboard under **Table Editor** — you'll see a `records` and
`sequences` table (the app stores each entity as JSON rows in one generic
table — see the comment at the top of `backend/src/db/postgresDb.js` if
you're curious why).

### 3. Push the project to GitHub

From the project root (`student-portal/`, the folder containing `api/`,
`backend/`, `frontend/`, `admin/`):

```bash
git init
git add .
git commit -m "Initial commit"
```

Create a new empty repo on [github.com/new](https://github.com/new) (don't
initialize it with a README), then:

```bash
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git branch -M main
git push -u origin main
```

Your `.env` file is excluded by `.gitignore` — your database password
never gets pushed. Good.

### 4. Connect the repo to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) → **Import** your GitHub repo.
2. Vercel will detect it as a generic Node project — leave the build settings
   on their defaults (the `vercel.json` in the repo handles the routing).
3. Before clicking Deploy, open **Environment Variables** and add:
   - `DATABASE_URL` → your Supabase connection string (same one from step 1)
   - `JWT_SECRET` → any long random string (this signs login tokens — don't reuse the demo value)
4. Click **Deploy**.

### 5. Try it

Once the deploy finishes, Vercel gives you a URL like
`https://your-project.vercel.app`. 

- Student app: `https://your-project.vercel.app/`
- Admin panel: `https://your-project.vercel.app/admin`

Same demo logins as before (student `12216312` / `student123`, admin
`admin` / `admin123`) — assuming you ran the seed script against the same
Supabase database Vercel is now pointed at.

### Updating the live site later

Any time you want to change something: edit the code locally, then
```bash
git add .
git commit -m "describe your change"
git push
```
Vercel automatically redeploys on every push to `main` — no manual redeploy step.

### If something doesn't work

- **500 errors on every API call** → almost always `DATABASE_URL` is missing
  or wrong in Vercel's Environment Variables. Check Vercel's dashboard →
  your project → **Settings → Environment Variables**, and check the
  **Deployments → [latest] → Functions** logs for the actual error.
- **Admin panel shows a blank page at `/admin`** → check that
  `vercel.json` was actually included in your push (`git status` should
  show it tracked, not ignored).
- **Login works locally but not on Vercel** → likely `JWT_SECRET` differs
  between your local `.env` and Vercel's environment variable, which is
  fine (they're independent), but double check it's actually set on Vercel.

## Extending it

- **Add a subject:** insert into the `subjects` table via `db.insert('subjects', {...})`
  in a small script (see `seed.js` for the pattern), or add an admin route if you'll do this often.
- **Add a student:** same pattern — see `seed.js` for the shape, hash the
  password with `bcrypt.hashSync(password, 8)`.
- **Move off the generic `records` table to a real relational schema:**
  only worth doing if this grows well past a few hundred students — replace
  `backend/src/db/postgresDb.js`'s queries with dedicated `CREATE TABLE`
  statements per entity (real columns, foreign keys, indexes). The function
  names routes call (`all`, `find`, `findOne`, `findById`, `insert`,
  `update`, `remove`, `setAll`) would stay the same, so route files
  shouldn't need to change — just the internals of that one file.
- **Features visible in your screenshots but not yet wired to data**
  (Exams, Events, Placement Drive/Scanner, RMS Request Status, Teacher on
  Leave, Fee Statement, Doctor Appointment, etc.) — these tiles exist and
  toggle on/off from the admin panel, but currently render a "coming soon"
  placeholder when tapped. Tell me which ones matter most and I'll wire
  them up the same way as Attendance/Marks/Results/Timetable.

## Known simplifications (worth knowing about before production use)

- The `records`-table approach (one JSONB column per entity, see above)
  trades some query performance and type safety for flexibility — fine at
  small-to-medium scale, but a growing app should eventually move to a
  proper relational schema.
- Profile photo upload isn't implemented; the avatar falls back to initials.
- There's no password-reset flow yet.
- `pg`'s connection pool opens fresh per serverless invocation in Vercel's
  environment, which is normal for serverless Postgres usage but means
  very high traffic would benefit from a connection pooler (Supabase
  offers one built in — look for "Connection pooling" / port 6543 in your
  Supabase project's database settings if you outgrow the direct connection).
