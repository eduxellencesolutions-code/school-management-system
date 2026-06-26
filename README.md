# Eduxellence Results

Smart Academic Assessment & Result Management Platform for schools and educators.

Built on: **Next.js 14 · Supabase · Vercel · Hugging Face**  
Cost to launch: **₦0** (all free tiers)

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/eduxellence-results.git
cd eduxellence-results
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your Supabase credentials:
- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase Dashboard → Settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — same page
- `SUPABASE_SERVICE_ROLE_KEY` — same page (keep secret, server-only)

### 3. Set up the database

In your Supabase Dashboard → SQL Editor, run:

```
supabase/migrations/001_initial_schema.sql
```

This creates all tables, RLS policies, triggers, views, and indexes.

### 4. Set up Supabase Storage

In Supabase Dashboard → Storage, create two private buckets:
- `org-assets` — for logos and signatures
- `report-exports` — for generated report files

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploying to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → Import Project → select your repo
3. Add environment variables (same as `.env.local`)
4. Deploy

Vercel will auto-deploy on every push to `main`.

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, signup, forgot-password
│   │   ├── login/
│   │   ├── signup/
│   │   └── forgot-password/
│   ├── (dashboard)/     # Protected app pages
│   │   ├── dashboard/   # Overview
│   │   ├── classes/     # Class management
│   │   ├── students/    # Student roster
│   │   ├── scores/      # Score entry (core feature)
│   │   ├── reports/     # Report generation
│   │   └── settings/    # Account & billing
│   └── page.tsx         # Public landing page
├── components/
│   ├── layout/          # Sidebar, header
│   ├── scores/          # ScoreGrid (auto-save engine)
│   └── reports/         # ReportGenerator (Excel export)
├── lib/
│   ├── supabase/        # client.ts, server.ts, middleware.ts
│   └── utils.ts         # Helpers, calculations, formatting
├── types/
│   └── index.ts         # All TypeScript types + plan limits
└── styles/
    └── globals.css      # Tailwind + component classes
supabase/
└── migrations/
    └── 001_initial_schema.sql   # Full DB schema
```

---

## Subscription Plans

| Plan            | Price         | Students | Classes    | Branding |
|-----------------|---------------|----------|------------|----------|
| Free            | ₦0 forever    | 30       | 1          | ❌       |
| Teacher         | ₦1,000/term   | Unlimited| Unlimited  | ❌       |
| Small School    | ₦10,000/year  | 300      | Unlimited  | ✅       |
| Standard School | ₦20,000/year  | 1,000    | Unlimited  | ✅       |
| Premium School  | ₦50,000/year  | Unlimited| Unlimited  | ✅       |

---

## Tech Stack

| Layer      | Technology          | Hosting         | Free Limit             |
|------------|---------------------|-----------------|------------------------|
| Frontend   | Next.js 14          | Vercel          | 100 GB bandwidth/mo    |
| Database   | Supabase PostgreSQL | Supabase        | 500 MB                 |
| Auth       | Supabase Auth       | Supabase        | Unlimited users        |
| Storage    | Supabase Storage    | Supabase        | 1 GB                   |
| Realtime   | Supabase Realtime   | Supabase        | 100 concurrent         |
| AI         | Hugging Face API    | Hugging Face    | Rate-limited, free     |
| CI/CD      | GitHub Actions      | GitHub          | 2,000 min/mo           |

---

## Key Features

- ⚡ **Keystroke auto-save** — scores saved 600ms after typing, no save button
- 🧮 **Auto calculations** — totals, averages, percentages, grades via DB triggers
- 📊 **Excel broadsheet** — one-click class result export
- 📄 **PDF report cards** — branded for school/org accounts
- 📥 **CSV import** — bulk enrol students from spreadsheet
- 🤖 **AI remarks** — Hugging Face powered, cached to save rate limits
- 🔒 **Row Level Security** — data fully isolated per organization

---

## License

MIT — build on it, extend it, make it yours.
