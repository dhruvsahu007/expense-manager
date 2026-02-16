"""Reports API – monthly breakdown, spending trends, budget variance."""

from __future__ import annotations

from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, extract, func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.budget import Budget
from app.models.expense import Expense
from app.models.user import User

router = APIRouter(prefix="/reports", tags=["Reports"])


# ───────────── Response models (inline to keep it simple) ─────────────
from pydantic import BaseModel


class CategoryAmount(BaseModel):
    category: str
    total: float
    percentage: float


class MonthlyBreakdown(BaseModel):
    month: str          # e.g. "2025-01"
    total: float
    categories: List[CategoryAmount]


class TrendPoint(BaseModel):
    month: str
    total: float


class BudgetVarianceItem(BaseModel):
    category: str
    budget: float
    actual: float
    variance: float     # budget - actual  (positive = under budget)
    percent_used: float


class ReportsResponse(BaseModel):
    monthly_breakdown: List[MonthlyBreakdown]
    spending_trends: List[TrendPoint]
    budget_variance: List[BudgetVarianceItem]


# ───────────── Endpoint ───────────────────────────────────────────────

@router.get("", response_model=ReportsResponse)
def get_reports(
    months: int = Query(12, ge=1, le=24, description="Number of months to look back"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return monthly breakdown, spending trends, and budget variance."""

    today = date.today()
    start_month = date(today.year, today.month, 1) - timedelta(days=(months - 1) * 30)
    start_month = date(start_month.year, start_month.month, 1)

    # Fetch all expenses in window
    expenses = (
        db.query(Expense)
        .filter(
            and_(
                Expense.user_id == current_user.id,
                Expense.date >= start_month,
            )
        )
        .order_by(Expense.date)
        .all()
    )

    # ── Bucket by month ──────────────────────────────────────────────
    month_buckets: dict[str, list[Expense]] = {}
    for e in expenses:
        key = e.date.strftime("%Y-%m")
        month_buckets.setdefault(key, []).append(e)

    # Monthly breakdown + spending trends
    monthly_breakdown: list[MonthlyBreakdown] = []
    spending_trends: list[TrendPoint] = []

    # Build list of all months in range (even empty ones)
    cur = date(start_month.year, start_month.month, 1)
    end = date(today.year, today.month, 1)
    all_months: list[str] = []
    while cur <= end:
        all_months.append(cur.strftime("%Y-%m"))
        m = cur.month + 1
        y = cur.year
        if m > 12:
            m = 1
            y += 1
        cur = date(y, m, 1)

    for month_key in all_months:
        bucket = month_buckets.get(month_key, [])
        total = sum(e.amount for e in bucket)

        # Category breakdown for this month
        cat_totals: dict[str, float] = {}
        for e in bucket:
            cat_totals[e.category] = cat_totals.get(e.category, 0) + e.amount

        cats = [
            CategoryAmount(
                category=cat,
                total=round(amt, 2),
                percentage=round(amt / total * 100, 2) if total > 0 else 0,
            )
            for cat, amt in sorted(cat_totals.items(), key=lambda x: -x[1])
        ]

        monthly_breakdown.append(MonthlyBreakdown(month=month_key, total=round(total, 2), categories=cats))
        spending_trends.append(TrendPoint(month=month_key, total=round(total, 2)))

    # ── Budget variance (current month) ──────────────────────────────
    budgets = (
        db.query(Budget)
        .filter(Budget.user_id == current_user.id)
        .all()
    )

    current_month_key = today.strftime("%Y-%m")
    current_bucket = month_buckets.get(current_month_key, [])
    current_cat_totals: dict[str, float] = {}
    for e in current_bucket:
        current_cat_totals[e.category] = current_cat_totals.get(e.category, 0) + e.amount

    budget_variance: list[BudgetVarianceItem] = []
    for b in budgets:
        actual = round(current_cat_totals.get(b.category, 0), 2)
        variance = round(b.monthly_limit - actual, 2)
        pct = round(actual / b.monthly_limit * 100, 2) if b.monthly_limit > 0 else 0
        budget_variance.append(
            BudgetVarianceItem(
                category=b.category,
                budget=b.monthly_limit,
                actual=actual,
                variance=variance,
                percent_used=pct,
            )
        )

    budget_variance.sort(key=lambda x: -x.percent_used)

    return ReportsResponse(
        monthly_breakdown=monthly_breakdown,
        spending_trends=spending_trends,
        budget_variance=budget_variance,
    )
