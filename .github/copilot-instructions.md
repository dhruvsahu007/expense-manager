# Copilot Instructions — SplitMint

## Architecture Overview

SplitMint is a monorepo expense tracker for Indian professionals and couples. Three-tier: **Next.js 14 frontend** → **FastAPI backend** → **PostgreSQL 15**. In production, Nginx reverse-proxies `/api/` to the backend and `/` to the frontend (see `nginx/default.conf`). All API routes are prefixed with `/api` at the router level (`main.py` registers routers with `prefix="/api"`).

## Backend (FastAPI + SQLAlchemy)

- **Entry point**: `backend/app/main.py` — registers all routers, CORS, and conditionally creates tables in debug mode.
- **Config**: `core/config.py` — `pydantic_settings.BaseSettings` loaded from `.env`, cached via `@lru_cache`. Access with `get_settings()`.
- **Database**: `core/database.py` — synchronous SQLAlchemy with `DeclarativeBase`. Session via `get_db()` generator dependency.
- **Auth flow**: JWT (python-jose) + bcrypt. `core/security.py` handles hashing/tokens. `core/deps.py` provides `get_current_user` dependency — inject as `current_user: User = Depends(get_current_user)` in every protected route.
- **Models** (`models/`): Plain SQLAlchemy `Column()` style (not mapped_column). All models inherit `Base`. Timestamps use `datetime.now(timezone.utc)` lambdas. Key models: `User`, `Expense`, `RecurringExpense`, `UserCategory`, `Budget`, `Notification`, `Couple`, `SharedExpense`, `Settlement`, `SavingsGoal`, `JointAccount`, `SalaryCredit`.
- **Schemas** (`schemas/`): Pydantic v2 models with `from_attributes = True` in `Config` class. Follow the `Create` / `Update` (optional fields) / `Response` naming pattern (e.g., `ExpenseCreate`, `ExpenseUpdate`, `ExpenseResponse`).
- **API modules** (`api/`): Each module creates its own `APIRouter` with a `prefix` and `tags`. Patterns:
  - `auth.py` — `/api/auth/{signup,login,me}` (public signup/login, protected me)
  - `expenses.py` — `/api/expenses/` — includes categories, recurring expenses, CSV export
  - `couple.py` — `/api/couple/` — partner invite/accept, shared expenses, settlements, joint account, savings goals
  - `budgets.py` — `/api/budgets/` — per-category monthly budget limits
  - `dashboard.py` — `/api/dashboard/individual` and `/api/dashboard/couple` — aggregated analytics
  - `reports.py` — `/api/reports` — monthly/yearly financial reports
  - `salary.py` — `/api/salary/` — salary credit tracking
- **Migrations**: Alembic in `backend/alembic/`. Run `alembic upgrade head` after model changes. Migration files in `alembic/versions/` use sequential numbering (`001_`, `002_`, ...).

## Frontend (Next.js 14 App Router)

- **All pages are client components** (`'use client'`). No SSR/RSC data fetching — all data loads via the API client.
- **API client**: `src/lib/api.ts` — singleton `ApiClient` class exported as `api`. Stores JWT in `localStorage`, attaches `Bearer` token automatically. All methods return typed promises using inline `import('@/types')`.
- **Auth**: `src/contexts/AuthContext.tsx` — `useAuth()` hook provides `{ user, login, signup, logout, refreshUser, loading }`. Wrap pages with `<AppLayout>` (from `src/components/AppLayout.tsx`) which handles auth redirect and provides the nav shell.
- **Theme**: `src/contexts/ThemeContext.tsx` — `useTheme()` hook, dark mode via Tailwind `class` strategy, persisted in `localStorage`.
- **Styling**: Tailwind CSS with custom `mint` color palette (green tones). Dark mode classes throughout (`dark:bg-slate-900`). Mobile-first responsive design with bottom nav bar on mobile, sidebar on desktop.
- **Page pattern**: Each page in `src/app/{feature}/page.tsx` is a self-contained client component that manages its own state with `useState`, fetches data via `api.*()` calls in `useEffect`, and shows `react-hot-toast` notifications.
- **Utilities**: `src/lib/utils.ts` — `formatCurrency()` (INR ₹ via `en-IN`), `formatDate()`, category icon/color lookups. `src/lib/icons.tsx` — re-exports from `lucide-react`.
- **Types**: `src/types/index.ts` — TypeScript interfaces mirroring backend Pydantic schemas. Must stay in sync with `backend/app/schemas/`.

## Key Conventions

- **Currency**: Always INR (₹). Use `formatCurrency()` on the frontend; amounts are `Float` in the DB.
- **Dates**: Backend uses `date` (not datetime) for expense dates. Frontend sends ISO strings (`YYYY-MM-DD`).
- **Categories**: 10 hardcoded defaults in `expenses.py` (`DEFAULT_CATEGORIES`) + user-created custom categories. Both backend and frontend maintain parallel category icon/color mappings.
- **Couple mode**: Two users linked via `Couple` model (invite → accept flow). Shared expenses support split types: `equal`, `percentage`, `custom` with `split_ratio` strings like `"50:50"`.
- **No ORM relationships**: Models use `ForeignKey` columns but don't define SQLAlchemy `relationship()`. Joins are done manually in queries.

## Dev Workflow

```bash
# Full stack (Docker)
docker-compose up --build

# Backend only
cd backend && uvicorn app.main:app --reload  # requires local PostgreSQL

# Frontend only
cd frontend && npm run dev

# Database migrations
cd backend && alembic upgrade head
cd backend && alembic revision --autogenerate -m "description"
```

- API docs at `http://localhost:8000/docs` (Swagger) or `/redoc`
- Production domain: `polarsquares.com` (SSL via Let's Encrypt, see `docker-compose.prod.yml`)
