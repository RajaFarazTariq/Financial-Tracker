# Financial Tracker

A premium personal-finance dashboard with multi-account ledgering, budget tracking,
goal management, recurring bills, and Claude-powered spending insights.

Hybrid stack — Django REST API + Next.js frontend. JWT auth, no Prisma (Django owns
the schema).

---

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Django 5.2 · DRF 3.15 · SimpleJWT · django-environ · drf-spectacular |
| Database | SQLite locally · Postgres-ready via `DATABASE_URL` |
| Auth | JWT (rotating refresh, blacklist after rotation) |
| AI | Anthropic SDK (Claude Opus 4.7 by default, prompt caching enabled) |
| Frontend framework | Next.js 15 (App Router, React 19) · TypeScript |
| Styling | Tailwind v4 · shadcn-style primitives · custom HSL token system (light/dark) |
| State | Zustand (auth + sidebar) with persist · TanStack Query 5 |
| Charts | Recharts (code-split, lazy-loaded) |
| Animations | Framer Motion |
| Forms | react-hook-form + Zod |
| Notifications | sonner |

---

## Project layout

```
Financial Tracker/
├── FinancialTracker/             # Django backend
│   ├── accounts/                 # Models: Account, Category, Transaction, Goal, Bill, Budget
│   ├── api/                      # DRF — serializers, viewsets, JWT, dashboard, insights
│   ├── FinancialTracker/         # Settings, urls, wsgi
│   ├── requirements.txt
│   ├── .env.example              # Copy → .env, fill in secrets
│   └── db.sqlite3                # Local dev DB
│
├── frontend/                     # Next.js frontend
│   ├── src/app/
│   │   ├── (auth)/               # sign-in, sign-up
│   │   ├── (app)/                # auth-guarded app shell
│   │   │   ├── dashboard/
│   │   │   ├── accounts/  transactions/  income/  expenses/
│   │   │   ├── budgets/  goals/  bills/
│   │   │   ├── insights/  settings/
│   │   │   ├── layout.tsx        # Sidebar + topbar + AuthGuard
│   │   │   └── loading.tsx       # Route-transition skeleton
│   │   └── page.tsx              # Landing
│   ├── src/components/
│   │   ├── ui/                   # shadcn-style primitives
│   │   ├── layout/               # Sidebar, Topbar
│   │   ├── dashboard/            # StatCard, TrendChart, SpendingPie, HealthCard, lists
│   │   └── transactions/         # TransactionDialog, TransactionsView (shared)
│   ├── src/lib/                  # api client, types, utils
│   ├── src/stores/               # Zustand: auth, sidebar
│   ├── src/hooks/                # use-auth, use-resources
│   └── .env.local.example
│
└── README.md                     # This file
```

---

## Features

### Accounts & money flow
- Multi-account ledger: cash, checking, savings, credit, investment
- Per-account currency (USD, EUR, GBP, JPY, INR, PKR, AUD, CAD)
- Transactions: income / expense, optional category, notes, editable date, recurring flag
- Filterable transactions table with search, type, account filters + pagination
- Dedicated `/income` and `/expenses` views (pre-filtered)

### Planning
- **Budgets** — monthly caps per category (or an overall cap). Live computation of
  spent / remaining / progress / over-budget from this month's expenses.
- **Goals** — savings targets with target dates, animated progress bars with milestone
  dots, status chips (Starting / Building / On track / Almost there / Completed).
- **Upcoming Bills** — urgency badges (Overdue / Urgent / Soon / OK), mark-paid toggle,
  Upcoming / Paid / All tabs.

### Dashboard
- 4 themed stat cards (blue / green / red / purple)
- Income vs. Expenses area chart with smooth curves, gradient fills, custom tooltip
  showing Income / Expenses / Net per month, hover indicators
- **Financial Health** — animated SVG radial progress with color-coded status badge
  (Excellent / Good / Fair / Needs attention)
- **Spending breakdown** — modern donut with hover scaling, radial gradient fills,
  per-category mini-progress bars in the legend
- Sectioned cards: Upcoming Bills, Active Goals, Recent Transactions

### AI Insights (`/insights`)
- One-click "Generate insights" calls Claude with the user's last 60 days of activity
- Returns structured JSON via forced tool use (`report_insights`):
  summary · health assessment · 3–5 observations · 2–4 recommendations
- Prompt caching enabled on the static system prompt
- Graceful fallback when `ANTHROPIC_API_KEY` is empty

### Settings
- Profile edit (first name, last name, email)
- Password change with Django password validators
- Theme picker (Light / Dark / System)

### Auth
- JWT (access 15 min · refresh 7 days, rotating)
- Auto-refresh interceptor with single-flight protection
- Auth-guarded route group with Zustand-persisted tokens
- localStorage hydration handled correctly (no flash-of-signed-out)

### Sidebar
- Featured Dashboard card (gradient-blue, always-on highlight)
- Expandable parent groups (Money flow, Planning) with accordion behavior
- Distinct color themes: parent groups use primary (blue/indigo), sub-items use
  accent (purple)
- Pinned ↔ collapsed-rail modes (click logo to toggle, persists across reloads)
- Hover-prefetch on every Link — pre-warms route chunks for instant navigation

---

## Setup

### Prerequisites

- **Python 3.11+** (3.14 tested) for the backend
- **Node.js 18.18+** for the frontend (check with `node --version`)
- A clone of this repo with the existing `env/` virtualenv intact, OR a fresh
  venv you'll create yourself

### 1. Backend — Django API

```powershell
cd "FinancialTracker"

# Activate the venv (already present in env/)
..\env\Scripts\Activate.ps1

# Install/update Python deps
pip install -r requirements.txt

# Configure environment (one-time)
copy .env.example .env
# Open .env and fill in:
#   - DJANGO_SECRET_KEY  (generate via the snippet below)
#   - EMAIL_HOST_USER + EMAIL_HOST_PASSWORD if you want signup verification
#   - ANTHROPIC_API_KEY  (optional — enables live AI Insights)
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Apply migrations
python manage.py migrate

# Optional: create a Django admin superuser
python manage.py createsuperuser

# Run
python manage.py runserver
```

API: `http://localhost:8000/api/` · Interactive docs: `http://localhost:8000/api/docs/`

### 2. Frontend — Next.js

```powershell
cd "frontend"

# Configure environment
copy .env.local.example .env.local
# Default NEXT_PUBLIC_API_URL=http://localhost:8000 is correct if Django runs on :8000

# Install deps (~400 MB, 1–3 min first time)
npm install

# Dev with hot reload
npm run dev
```

App: `http://localhost:3000`

### 3. Production build (recommended for performance testing)

```powershell
cd "frontend"
npm run build
npm run start
```

In production mode, every Link prefetches automatically and chunks are pre-built —
navigation is near-instant. Dev mode compiles routes on-demand which can take 2–5 s
on first visit to a route.

---

## API quick reference

All endpoints under `/api/`. Auth via `Authorization: Bearer <access_token>`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register/` | Create a user |
| POST | `/auth/login/` | Obtain JWT pair (access + refresh) |
| POST | `/auth/refresh/` | Rotate JWT pair |
| POST | `/auth/verify/` | Verify access token |
| GET / PATCH | `/auth/me/` | Current user profile |
| POST | `/auth/password/` | Change password (`old_password`, `new_password`) |
| GET | `/dashboard/` | Aggregated dashboard payload |
| POST | `/insights/` | Claude-powered insights for the current user |
| CRUD | `/accounts/` | Bank/cash/credit/investment accounts |
| CRUD | `/categories/` | Income/expense categories |
| CRUD | `/transactions/` | Transactions (filters: `type`, `account`, `category`, `is_recurring`, `search`) |
| CRUD | `/goals/` | Savings goals |
| CRUD | `/bills/` | Recurring bills |
| CRUD | `/budgets/` | Monthly per-category (or overall) spending caps |

Pagination: `?page=N` (page size 25). Ordering: `?ordering=-date`. Search: `?search=...`.
Full OpenAPI schema at `/api/schema/`, Swagger UI at `/api/docs/`.

---

## Environment variables

### Backend (`FinancialTracker/.env`)

| Variable | Default | Notes |
|---|---|---|
| `DJANGO_SECRET_KEY` | dev fallback | **Required for prod** — generate via `get_random_secret_key()` |
| `DJANGO_DEBUG` | `False` | Set `True` for local dev |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated origins |
| `CSRF_TRUSTED_ORIGINS` | `http://localhost:3000` | Comma-separated origins |
| `DATABASE_URL` | empty → SQLite | Set to `postgres://user:pw@host:5432/db` for Postgres |
| `EMAIL_HOST` | `smtp.gmail.com` | |
| `EMAIL_HOST_USER` | empty | SMTP login |
| `EMAIL_HOST_PASSWORD` | empty | **App password, not your real password** |
| `FRONTEND_URL` | `http://localhost:3000` | Used in verification email links |
| `ACCESS_TOKEN_LIFETIME_MIN` | `15` | JWT access lifetime |
| `REFRESH_TOKEN_LIFETIME_DAYS` | `7` | JWT refresh lifetime |
| `ANTHROPIC_API_KEY` | empty | If empty, `/api/insights/` returns a static fallback |
| `ANTHROPIC_MODEL` | `claude-opus-4-7` | Try `claude-sonnet-4-6` for ~10× cheaper insights |

### Frontend (`frontend/.env.local`)

| Variable | Default | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend origin |
| `NEXT_PUBLIC_APP_NAME` | `Financial Tracker` | Optional brand override |

---

## Performance notes

- **Lazy-loaded Recharts** — `TrendChart` and `SpendingPie` are imported via
  `next/dynamic` with SSR off + Skeleton fallback. Recharts (~80 KB gzipped) doesn't
  ship in the initial bundle.
- **Memoized sidebar** — `FeaturedCard`, `LinkCard`, `GroupCard`, `CollapsedIcon` are
  all `React.memo`-wrapped. Stable `useCallback` handlers prevent unnecessary
  re-renders when toggling groups or hovering.
- **CSS-only hover lift** — `StatCard` uses `hover:-translate-y-1` instead of Framer
  Motion `whileHover` — runs on the compositor, zero React work.
- **Hover prefetch** — every sidebar Link warms its destination chunk via
  `router.prefetch()` on mouse enter / focus.
- **Memoized dashboard widgets** — `HealthCard`, `BillsList`, `GoalsList`,
  `TransactionsList`, `StatCard` all memoized.
- **Tight transitions** — replaced `transition-all` with specific properties
  (`transition-[background-color,border-color,color,box-shadow]`) on hot paths.

---

## Common issues

**Production build fails with "Could not find a production build"**
Run `npm run build` before `npm run start`.

**`pip` command silently fails on Windows**
Use `python -m pip install ...` instead of `pip ...`. Some shell configurations
don't expose the venv's `pip.exe` correctly even when activated.

**Sidebar groups feel laggy on first click**
That's Next.js dev-mode compiling the destination route. The hover-prefetch fix
warms the chunk before you click. For real performance testing, run
`npm run build && npm run start`.

**CORS error in the browser console**
Confirm `CORS_ALLOWED_ORIGINS` in `FinancialTracker/.env` includes the exact origin
(scheme + host + port) your frontend runs at, then restart Django.

**AI Insights returns "Static fallback" badge**
Either `ANTHROPIC_API_KEY` is empty in `.env`, or Django wasn't restarted after you
added the key. Stop Django and `python manage.py runserver` again.

**Tokens missing on hard refresh, redirected to /sign-in**
The Zustand auth store rehydrates from localStorage on mount. If tokens have
expired (>7 days), this is expected behavior.

---

## Security checklist before deploying

- [ ] Rotate any credentials that were ever committed to git history
- [ ] Set `DJANGO_DEBUG=False` and a strong `DJANGO_SECRET_KEY`
- [ ] Fill `DJANGO_ALLOWED_HOSTS` with your real domain
- [ ] Switch `DATABASE_URL` to managed Postgres
- [ ] Set up HTTPS — `SECURE_SSL_REDIRECT` and `HSTS` headers activate automatically
      when `DEBUG=False`
- [ ] Run `python manage.py check --deploy`
- [ ] Configure SMTP with a dedicated app password
- [ ] Restrict `CORS_ALLOWED_ORIGINS` to your production frontend domain only
- [ ] If using AI Insights in production, rate-limit the endpoint
      (DRF's `UserRateThrottle` is already enabled at 240/min — consider stricter)

---

## License

Personal project. Use however you like.
