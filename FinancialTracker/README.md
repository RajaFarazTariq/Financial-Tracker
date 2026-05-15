# Financial Tracker — Backend

Django 5.2 REST API powering the [Next.js frontend](../frontend). JWT auth,
per-user data isolation, drf-spectacular for OpenAPI, optional Claude-powered
insights endpoint.

> For the full project overview (frontend + backend together), see
> [`../README.md`](../README.md). This file is backend-only.

---

## Apps

| App | Purpose |
|---|---|
| `accounts` | Models — `Account`, `Category`, `Transaction`, `Goal`, `Bill`, `Budget`. Also hosts the legacy Django-template views (unused by the frontend, kept for `/admin/`). |
| `api` | DRF layer — serializers, viewsets, JWT routes, dashboard aggregator, Claude insights. **This is what the frontend talks to.** |

---

## Models

```
User (Django built-in)
 ├── Account              name, kind, currency, balance
 │     └── Transaction    type, amount, category, date, recurring, notes
 ├── Category             name, kind (Income/Expense), color, icon
 ├── Goal                 title, target, current, due_date, completed
 ├── Bill                 title, amount, due_date, is_paid, category
 └── Budget               category (nullable for overall), amount → live spent computed
```

---

## Setup

```powershell
# Activate the venv at the project root
..\env\Scripts\Activate.ps1

# Install deps
pip install -r requirements.txt
# If pip.exe fails silently, use:  python -m pip install -r requirements.txt

# Configure env (one-time)
copy .env.example .env
# Then fill in DJANGO_SECRET_KEY, SMTP, ANTHROPIC_API_KEY (optional)
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Apply migrations
python manage.py migrate

# Run
python manage.py runserver
```

Server: `http://localhost:8000`
Swagger UI: `http://localhost:8000/api/docs/`
OpenAPI schema: `http://localhost:8000/api/schema/`
Django admin: `http://localhost:8000/admin/` (run `createsuperuser` first)

---

## REST endpoints

All under `/api/`. Default permission is `IsAuthenticated`. Per-resource list
endpoints support `?search=`, `?ordering=`, and `?page=N` (page size 25).

### Auth

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/auth/register/` | `username, email, password, password_confirm, first_name?, last_name?` | 201 user JSON |
| POST | `/auth/login/` | `username, password` | `{ access, refresh }` |
| POST | `/auth/refresh/` | `{ refresh }` | new JWT pair (rotation enabled, old refresh blacklisted) |
| POST | `/auth/verify/` | `{ token }` | 200 if valid |
| GET / PATCH | `/auth/me/` | (PATCH: `first_name, last_name, email`) | current user |
| POST | `/auth/password/` | `{ old_password, new_password }` | 200 on success, 400 with field errors |

### Resources (full ModelViewSet — list/create/retrieve/update/partial_update/destroy)

| Path | Filters | Search | Ordering |
|---|---|---|---|
| `/accounts/` | `kind`, `currency` | `name` | `created_at`, `balance`, `name` |
| `/categories/` | `kind` | `name` | — |
| `/transactions/` | `type`, `account`, `category`, `is_recurring` | `description`, `notes` | `date`, `amount`, `created_at` |
| `/goals/` | `completed` | `title` | `due_date`, `created_at`, `target_amount` |
| `/bills/` | `is_paid` | `title` | `due_date`, `amount` |
| `/budgets/` | — | — | `amount`, `created_at` |

### Aggregates

| Path | Method | Notes |
|---|---|---|
| `/dashboard/` | GET | Single payload: balances, month income/expense, net, health score, accounts, recent transactions, upcoming bills, active goals, 6-month trend, spending by category. |
| `/insights/` | POST | Calls Claude with the user's recent activity; returns structured summary + assessment + observations + recommendations. Falls back to a static response if `ANTHROPIC_API_KEY` is empty. |

---

## Environment variables

See [`.env.example`](.env.example) for the canonical list with comments. Required for
production: `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=False`, `DJANGO_ALLOWED_HOSTS`,
`DATABASE_URL`. Optional: `ANTHROPIC_API_KEY` for AI Insights, SMTP for email
verification.

When `DJANGO_DEBUG=False`, the following hardening flags automatically activate:
`SECURE_SSL_REDIRECT`, HSTS, secure cookies, `X-Frame-Options: DENY`,
proxy-aware HTTPS detection.

---

## Auth flow

1. `POST /auth/register/` creates the user (active by default in this setup)
2. `POST /auth/login/` returns `{ access, refresh }` — store both client-side
3. Send `Authorization: Bearer <access>` on every request
4. On 401, call `POST /auth/refresh/ { refresh }` — get a **new** pair
   (old refresh is blacklisted after rotation, so retain only the new one)
5. Repeat the failed request with the new access token

The frontend's axios interceptor handles this automatically including single-flight
deduplication of concurrent refreshes.

JWT lifetimes are configurable via `ACCESS_TOKEN_LIFETIME_MIN` (default 15) and
`REFRESH_TOKEN_LIFETIME_DAYS` (default 7).

---

## AI Insights internals

[`api/insights.py`](api/insights.py) does the following on each request:

1. Aggregates the user's last 60 days of activity into a compact JSON blob
   (month-to-date income/expense, top 10 categories, recent 25 transactions,
   active goals, upcoming bill count)
2. Sends to Claude with a **forced tool call** to `report_insights` — guarantees
   structured output, no JSON parsing fragility
3. The static system prompt uses `cache_control: ephemeral` — saves ~90% of
   system-prompt tokens on subsequent calls within a 5-minute window
4. Returns to the frontend: `summary` · `health_assessment` · `top_observations[]` ·
   `recommendations[{title, action}]` · plus `ai_powered` and `model` fields

If `ANTHROPIC_API_KEY` is empty, returns a `ai_powered: false` payload with
static observations derived from the same aggregates. The UI badges this as
"Static fallback" so it's visually obvious.

Switch models via `ANTHROPIC_MODEL` in `.env` — try `claude-sonnet-4-6` if you want
~10× cheaper insights at the cost of some depth.

---

## Useful commands

```powershell
# Generate a Django secret key
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# System check
python manage.py check

# Deploy check (run before going to production)
python manage.py check --deploy

# Make + apply migrations
python manage.py makemigrations
python manage.py migrate

# Open Django shell (with all models loaded)
python manage.py shell

# Run tests (currently empty — placeholder)
python manage.py test

# Create admin user
python manage.py createsuperuser

# Inspect routes
python manage.py show_urls   # requires django-extensions if you add it
```

---

## Adding a new resource

1. Add model to `accounts/models.py`
2. `python manage.py makemigrations accounts && python manage.py migrate`
3. Add serializer in `api/serializers.py`
4. Add viewset (subclass `OwnedQuerysetMixin` for per-user scoping) in `api/views.py`
5. Register router in `api/urls.py`
6. The frontend will need: `lib/types.ts` (type def) + `hooks/use-resources.ts` (queries + mutations) + a page under `(app)/`

The Budgets feature is the most recent end-to-end example to copy from.

---

## Security notes

- All resources enforce per-user isolation via `OwnedQuerysetMixin` + `IsOwner`
  permission. A user cannot read or modify another user's data even by guessing IDs.
- Password rules: Django's default validators (min 8 chars, not too similar to
  username, not common, not all numeric) plus the frontend Zod schema enforces
  uppercase + digit + special character.
- DRF throttling: 60/min for anonymous, 240/min per authenticated user.
- JWT refresh rotation prevents replay of stolen refresh tokens.
- `python manage.py check --deploy` will surface any production misconfigurations.
