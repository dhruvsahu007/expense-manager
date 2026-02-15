from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import engine, Base
from app.api import auth, expenses, couple, budgets, dashboard

# Import all models so they register with Base
from app.models import user, expense, couple as couple_models, budget  # noqa

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    description="Expense tracking & budgeting for professionals and couples",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
        "https://polarsquares.com",
        "https://www.polarsquares.com",
        "http://polarsquares.com",
        "http://www.polarsquares.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables (dev only — use Alembic in production)
Base.metadata.create_all(bind=engine)

# Register routers
app.include_router(auth.router, prefix="/api")
app.include_router(expenses.router, prefix="/api")
app.include_router(couple.router, prefix="/api")
app.include_router(budgets.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
