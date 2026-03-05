"""Reports API – monthly breakdown, spending trends, budget variance."""

from __future__ import annotations

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, extract, func, or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.budget import Budget
from app.models.expense import Expense
from app.models.couple import Couple, SharedExpense
from app.models.user import User
from app.api.couple import calculate_split

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
    # Precisely calculate the start month by subtracting months
    start_year = today.year
    start_month_num = today.month - (months - 1)
    while start_month_num <= 0:
        start_month_num += 12
        start_year -= 1
    start_month = date(start_year, start_month_num, 1)

    # ── Helper: get couple & compute user's share ────────────────────
    couple = (
        db.query(Couple)
        .filter(
            and_(
                Couple.status == "active",
                or_(Couple.user_1_id == current_user.id, Couple.user_2_id == current_user.id),
            )
        )
        .first()
    )
    is_user1 = couple and couple.user_1_id == current_user.id

    def _user_share(exp: SharedExpense) -> float:
        u1_share, u2_share = calculate_split(
            exp.amount, exp.split_type, exp.split_ratio,
            exp.paid_by_user_id == couple.user_1_id if couple else True,
        )
        return u1_share if is_user1 else u2_share

    # Fetch all personal expenses in window
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

    # Fetch all shared expenses in window (user's share)
    shared_expenses: list[SharedExpense] = []
    if couple:
        shared_expenses = (
            db.query(SharedExpense)
            .filter(
                and_(
                    SharedExpense.couple_id == couple.id,
                    SharedExpense.date >= start_month,
                )
            )
            .order_by(SharedExpense.date)
            .all()
        )

    # ── Bucket by month ──────────────────────────────────────────────
    # Use a simple dict of {month_key: {category: amount}}
    month_cat_totals: dict[str, dict[str, float]] = {}

    for e in expenses:
        key = e.date.strftime("%Y-%m")
        month_cat_totals.setdefault(key, {})
        month_cat_totals[key][e.category] = month_cat_totals[key].get(e.category, 0) + e.amount

    for e in shared_expenses:
        key = e.date.strftime("%Y-%m")
        share = _user_share(e)
        month_cat_totals.setdefault(key, {})
        month_cat_totals[key][e.category] = month_cat_totals[key].get(e.category, 0) + share

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
        cat_totals = month_cat_totals.get(month_key, {})
        total = sum(cat_totals.values())

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
    current_cat_totals = month_cat_totals.get(current_month_key, {})

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
