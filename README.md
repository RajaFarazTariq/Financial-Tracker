# Financial Tracker

A personal-finance dashboard with **real-time bank sync** (Plaid), **bank email-alert
ingestion** (UBL/IMAP), AI-powered insights (Claude), and a **live, signal-driven
balance** — all in Pakistani Rupee (Rs.).

Hybrid stack: **Django REST API + Next.js frontend**, JWT auth. Django owns the
schema (no Prisma).

---

## Highlights

- **Real-time bank sync (Plaid)** — Link an institution, auto-import accounts &
  transactions via `/transactions/sync`, signature-verified webhook → Celery
  background sync, manual + scheduled fallback.
- **Bank email-alert ingestion** — Polls a mailbox over IMAP for transaction-alert
  emails (tuned for UBL), parses amount/direction/date/merchant, auto-categorizes,
  and creates transactions. Celery Beat near-real-time poll + manual scan.
- **Live balance** — Every transaction create/edit/delete adjusts the account
  balance instantly via Django signals (Plaid accounts excluded — their balance is
  authoritative from the bank).
- **Single currency: PKR** — Formatted as `Rs. 1,234` everywhere (cards, charts,
  tooltips, AI insights).
- **AI Insights** — Claude analyzes the last 60 days via forced tool use; graceful
  static fallback without an API key.
- Accounts, transactions, budgets, goals, bills, dashboard (trend chart, spending
  donut, financial-health gauge), JWT auth with rotating refresh.

---

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Django 5.2 · DRF · SimpleJWT · django-environ · drf-spectacular |
| Bank sync | plaid-python · PyJWT (webhook ES256 verify) · cryptography (token encryption) |
| Background | Celery · Redis (broker/result) · Celery Beat |
| Email ingest | stdlib `imaplib` + tolerant regex parser + rule-based categorizer |
| Database | SQLite locally · Postgres-ready via `DATABASE_URL` |
| AI | Anthropic SDK (Claude Opus 4.7 default, prompt caching) |
| Frontend | Next.js 15 (App Router, React 19) · TypeScript · Tailwind v4 |
| Data/State | TanStack Query 5 (auto-refetch) · Zustand · react-plaid-link |
| Charts/Forms | Recharts (lazy) · react-hook-form + Zod · sonner |

---

## Project layout

```
Financial Tracker/
├── FinancialTracker/                 # Django backend
│   ├── accounts/                     # Models, signals (live balance), mgmt commands
│   │   └── management/commands/      # sync_plaid, scan_email
│   ├── api/                          # DRF: views, serializers, urls
│   │   ├── plaid_client.py / plaid_sync.py / plaid_webhook.py
│   │   ├── email_ingest.py / bank_email_parser.py / email_categorize.py
│   │   ├── tasks.py                  # Celery tasks (sync + scan)
│   │   └── insights.py               # Claude insights
│   ├── FinancialTracker/             # settings, urls, celery app
│   └── .env.example                  # copy → .env
├── frontend/                         # Next.js frontend
│   └── src/{app,components,hooks,lib,stores}
└── README.md
```

> Not committed (see `.gitignore`): `.env`, `db.sqlite3`, `Superuser.txt`,
> `env/`, `node_modules/`, `frontend/.env.local`.

---

## Quick start

### Prerequisites
- Python 3.11+ (3.14 tested), Node.js 18.18+
- Redis (only needed for background/real-time sync — optional in dev, see below)

### 1. Backend (Django API)

```powershell
cd FinancialTracker
python -m venv ..\env ; ..\env\Scripts\Activate.ps1
python -m pip install -r requirements.txt
copy .env.example .env          # then fill in the values (see table below)
python manage.py migrate
python manage.py createsuperuser   # optional
python manage.py runserver 8000
```
API → `http://localhost:8000/api/` · Docs → `http://localhost:8000/api/docs/`

### 2. Frontend (Next.js)

```powershell
cd frontend
copy .env.local.example .env.local
npm install
npm run dev                     # NOT "npm run start" — that serves a stale build
```
App → `http://localhost:3000`

### 3. Background sync (Celery — for real-time/automatic imports)

Two extra terminals (Windows needs `--pool=solo`):

```powershell
celery -A FinancialTracker worker --pool=solo -l info
celery -A FinancialTracker beat -l info
```

Dev shortcut without Redis/workers: set `CELERY_TASK_ALWAYS_EAGER=true` in `.env`
and use the in-app **Sync** / **Scan** buttons (they run inline). The
`sync_plaid` / `scan_email` management commands are an OS-scheduler fallback.

### 4. Plaid webhooks (optional — true real-time)

Plaid posts webhooks to a public HTTPS URL. In dev, tunnel with ngrok and set
`PLAID_WEBHOOK_URL`:

```powershell
ngrok http --url=<your-static-domain> 8000
# .env: PLAID_WEBHOOK_URL=https://<your-domain>/api/plaid/webhook/
```

**Running everything = 3–4 terminals:** Django `:8000` · `npm run dev` ·
Celery worker (+ beat) · optional ngrok.

---

## Bank connections

- **Plaid** — get Sandbox keys at <https://dashboard.plaid.com/developers/keys>,
  set `PLAID_CLIENT_ID` / `PLAID_SECRET`. In the app: **Accounts → Connect bank**.
  Sandbox test login: `user_good` / `pass_good`. (Plaid does **not** support
  Pakistani banks — use it for US/UK/EU or Sandbox.)
- **UBL email alerts** — enable UBL transaction email alerts, generate a Gmail
  **App Password**, then **Accounts → Connect email alerts**. Alerts from
  `admin.ebanking@ubl.com.pk` are parsed and imported automatically.

---

## API quick reference

All under `/api/`. Auth: `Authorization: Bearer <access_token>`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register/` `/auth/login/` `/auth/refresh/` | Auth + JWT |
| GET/PATCH | `/auth/me/` · POST `/auth/password/` | Profile / password |
| GET | `/dashboard/` · POST `/insights/` | Aggregates · Claude insights |
| CRUD | `/accounts/` `/transactions/` `/categories/` | Core ledger |
| CRUD | `/budgets/` `/goals/` `/bills/` | Planning |
| POST | `/plaid/link-token/` `/plaid/exchange/` | Plaid Link flow |
| GET/DELETE/POST | `/plaid/items/` · `/plaid/items/{id}/sync/` | Linked banks |
| POST | `/plaid/webhook/` | Plaid webhook (verified, no auth) |
| CRUD | `/email/inboxes/` · `/email/inboxes/{id}/scan/` `/test/` | Email-alert inboxes |

Pagination `?page=N` (25) · ordering `?ordering=-date` · search `?search=`.
OpenAPI: `/api/schema/`, Swagger: `/api/docs/`.

---

## Environment variables (`FinancialTracker/.env`)

| Variable | Default | Notes |
|---|---|---|
| `DJANGO_SECRET_KEY` | dev fallback | **Set in prod**; also keys token encryption fallback |
| `DJANGO_DEBUG` | `False` | `True` for local dev |
| `DJANGO_ALLOWED_HOSTS` / `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` | localhost | Comma-separated |
| `DATABASE_URL` | SQLite | `postgres://…` for Postgres |
| `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` | empty | SMTP (Gmail App Password) |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | empty / `claude-opus-4-7` | Empty → static insights |
| `PLAID_CLIENT_ID` / `PLAID_SECRET` | empty | From Plaid dashboard |
| `PLAID_ENV` | `sandbox` | `sandbox` \| `production` |
| `PLAID_COUNTRY_CODES` | `US` | Comma-separated ISO codes |
| `PLAID_WEBHOOK_URL` | empty | Public HTTPS `/api/plaid/webhook/` |
| `PLAID_TOKEN_KEY` | derived from SECRET_KEY | **Set a dedicated key in prod** |
| `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` | redis://localhost:6379 | |
| `CELERY_TASK_ALWAYS_EAGER` | `False` | `true` → run tasks inline (no Redis) |
| `EMAIL_INGEST_POLL_SECONDS` | `60` | Celery Beat scan interval |

Frontend (`frontend/.env.local`): `NEXT_PUBLIC_API_URL=http://localhost:8000`.

---

## Notes

- **Currency** is globally PKR (`Rs.`). `formatCurrency` ignores its currency arg by
  design — the app is single-currency.
- **Live balance**: `accounts/signals.py` maintains `Account.balance` from
  transaction deltas. Plaid-linked accounts are intentionally excluded.
- The UBL email parser is tolerant/best-effort; low-confidence parses are saved
  flagged (`pending=True`) for review rather than dropped.

## Security checklist (before deploying)

- [ ] Never commit `.env`, `db.sqlite3`, or credentials (already in `.gitignore`)
- [ ] Rotate any secret exposed during setup (Plaid secret, Gmail App Password, API keys)
- [ ] `DJANGO_DEBUG=False`, strong `DJANGO_SECRET_KEY`, dedicated `PLAID_TOKEN_KEY`
- [ ] Real `DJANGO_ALLOWED_HOSTS`, restricted `CORS_ALLOWED_ORIGINS`, managed Postgres
- [ ] `python manage.py check --deploy`

## License

Personal project — use however you like.
