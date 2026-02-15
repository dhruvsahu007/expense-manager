# SplitMint 💰

A mobile-first expense and budgeting system for young salaried professionals and live-in couples in India.

## Features

- 📊 **Individual Expense Tracking** — Log daily expenses with categories
- 👫 **Couple Mode** — Split shared expenses (50/50, percentage, custom)
- 🎯 **Joint Savings Goals** — Track combined contributions toward goals
- 📈 **Analytics Dashboard** — Burn rate, savings rate, category breakdowns
- 🔔 **Smart Nudges** — Budget warnings and spending alerts
- 💰 **INR-first** — Built for the Indian context

## Tech Stack

| Layer    | Technology              |
| -------- | ----------------------- |
| Frontend | Next.js, Tailwind CSS, Recharts |
| Backend  | FastAPI, SQLAlchemy, Pydantic |
| Database | PostgreSQL              |
| Auth     | JWT + bcrypt            |

## Project Structure

```
├── backend/          # FastAPI backend
│   ├── app/
│   │   ├── api/      # Route handlers
│   │   ├── core/     # Config, security, deps
│   │   ├── models/   # SQLAlchemy models
│   │   ├── schemas/  # Pydantic schemas
│   │   └── main.py   # App entry point
│   ├── alembic/      # DB migrations
│   └── requirements.txt
├── frontend/         # Next.js frontend
│   ├── src/
│   │   ├── app/      # App router pages
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── lib/      # API client, utils
│   │   └── types/
│   └── package.json
└── docker-compose.yml
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Edit with your DB credentials
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local  # Edit API URL
npm run dev
```

### Docker (Full Stack)

```bash
docker-compose up --build
```

## API Docs

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## License

MIT
