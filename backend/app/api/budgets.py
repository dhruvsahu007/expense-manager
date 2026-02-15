from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, extract
from datetime import date, datetime, timezone

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.expense import Expense
from app.models.budget import Budget
from app.schemas.dashboard import BudgetCreate, BudgetUpdate, BudgetResponse

router = APIRouter(prefix="/budgets", tags=["Budgets"])


@router.post("/", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def create_budget(
    budget_data: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Set a monthly budget for a category."""
    existing = (
        db.query(Budget)
        .filter(
            and_(
                Budget.user_id == current_user.id,
                Budget.category == budget_data.category,
            )
        )
        .first()
    )
    if existing:
        existing.monthly_limit = budget_data.monthly_limit
        db.commit()
        db.refresh(existing)
        return _enrich_budget(existing, current_user.id, db)

    budget = Budget(
        user_id=current_user.id,
        category=budget_data.category,
        monthly_limit=budget_data.monthly_limit,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return _enrich_budget(budget, current_user.id, db)


@router.get("/", response_model=List[BudgetResponse])
def list_budgets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all budgets with current spend info."""
    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()
    return [_enrich_budget(b, current_user.id, db) for b in budgets]


@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    budget_data: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a budget limit."""
    budget = (
        db.query(Budget)
        .filter(and_(Budget.id == budget_id, Budget.user_id == current_user.id))
        .first()
    )
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    if budget_data.monthly_limit is not None:
        budget.monthly_limit = budget_data.monthly_limit

    db.commit()
    db.refresh(budget)
    return _enrich_budget(budget, current_user.id, db)


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a budget."""
    budget = (
        db.query(Budget)
        .filter(and_(Budget.id == budget_id, Budget.user_id == current_user.id))
        .first()
    )
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    db.delete(budget)
    db.commit()


def _enrich_budget(budget: Budget, user_id: int, db: Session) -> BudgetResponse:
    today = date.today()
    current_spend = (
        db.query(func.coalesce(func.sum(Expense.amount), 0))
        .filter(
            and_(
                Expense.user_id == user_id,
                Expense.category == budget.category,
                extract("month", Expense.date) == today.month,
                extract("year", Expense.date) == today.year,
            )
        )
        .scalar()
    )
    remaining = budget.monthly_limit - current_spend
    percent_used = (current_spend / budget.monthly_limit * 100) if budget.monthly_limit > 0 else 0

    return BudgetResponse(
        id=budget.id,
        user_id=budget.user_id,
        category=budget.category,
        monthly_limit=budget.monthly_limit,
        current_spend=round(current_spend, 2),
        remaining=round(remaining, 2),
        percent_used=round(percent_used, 1),
        created_at=budget.created_at,
    )
