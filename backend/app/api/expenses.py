from typing import List, Optional
from datetime import date, timedelta
import csv
import io

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.expense import Expense, RecurringExpense
from app.schemas.expense import (
    ExpenseCreate, ExpenseUpdate, ExpenseResponse,
    RecurringExpenseCreate, RecurringExpenseResponse,
)

router = APIRouter(prefix="/expenses", tags=["Expenses"])

DEFAULT_CATEGORIES = [
    "Food",
    "Rent",
    "Utilities",
    "Travel",
    "Shopping",
    "Subscriptions",
    "EMI",
    "Entertainment",
    "Health",
    "Other",
]


@router.get("/categories", response_model=List[str])
def get_categories():
    """Get default expense categories."""
    return DEFAULT_CATEGORIES


@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    expense_data: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log a new personal expense."""
    expense = Expense(
        user_id=current_user.id,
        amount=expense_data.amount,
        category=expense_data.category,
        expense_type=expense_data.expense_type,
        date=expense_data.date,
        description=expense_data.description,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.get("/", response_model=List[ExpenseResponse])
def list_expenses(
    category: Optional[str] = Query(None),
    expense_type: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List expenses with optional filters."""
    query = db.query(Expense).filter(Expense.user_id == current_user.id)

    if category:
        query = query.filter(Expense.category == category)
    if expense_type:
        query = query.filter(Expense.expense_type == expense_type)
    if start_date:
        query = query.filter(Expense.date >= start_date)
    if end_date:
        query = query.filter(Expense.date <= end_date)
    if search:
        query = query.filter(
            or_(
                Expense.description.ilike(f"%{search}%"),
                Expense.category.ilike(f"%{search}%"),
            )
        )
    if min_amount is not None:
        query = query.filter(Expense.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(Expense.amount <= max_amount)

    return query.order_by(Expense.date.desc()).offset(skip).limit(limit).all()


@router.get("/export")
def export_expenses(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export expenses as CSV."""
    query = db.query(Expense).filter(Expense.user_id == current_user.id)
    if start_date:
        query = query.filter(Expense.date >= start_date)
    if end_date:
        query = query.filter(Expense.date <= end_date)

    expenses = query.order_by(Expense.date.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Category", "Amount", "Type", "Description"])
    for exp in expenses:
        writer.writerow([
            exp.date.isoformat(),
            exp.category,
            exp.amount,
            exp.expense_type,
            exp.description or "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=expenses.csv"},
    )


@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single expense."""
    expense = (
        db.query(Expense)
        .filter(and_(Expense.id == expense_id, Expense.user_id == current_user.id))
        .first()
    )
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: int,
    expense_data: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an expense."""
    expense = (
        db.query(Expense)
        .filter(and_(Expense.id == expense_id, Expense.user_id == current_user.id))
        .first()
    )
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    if expense_data.amount is not None:
        expense.amount = expense_data.amount
    if expense_data.category is not None:
        expense.category = expense_data.category
    if expense_data.expense_type is not None:
        expense.expense_type = expense_data.expense_type
    if expense_data.date is not None:
        expense.date = expense_data.date
    if expense_data.description is not None:
        expense.description = expense_data.description

    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an expense."""
    expense = (
        db.query(Expense)
        .filter(and_(Expense.id == expense_id, Expense.user_id == current_user.id))
        .first()
    )
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    db.delete(expense)
    db.commit()


# ─── Recurring Expenses ──────────────────────────────────────────────────────

@router.post("/recurring", response_model=RecurringExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_recurring_expense(
    data: RecurringExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a recurring expense template."""
    today = date.today()
    if data.frequency == "monthly":
        day = min(data.day_of_month, 28)
        next_d = date(today.year, today.month, day)
        if next_d <= today:
            m = today.month + 1
            y = today.year
            if m > 12:
                m = 1
                y += 1
            next_d = date(y, m, day)
    elif data.frequency == "weekly":
        next_d = today + timedelta(days=(7 - today.weekday()) % 7 or 7)
    else:
        next_d = date(today.year + 1, today.month, today.day)

    rec = RecurringExpense(
        user_id=current_user.id,
        amount=data.amount,
        category=data.category,
        description=data.description,
        frequency=data.frequency,
        day_of_month=data.day_of_month,
        next_date=next_d,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


@router.get("/recurring/list", response_model=List[RecurringExpenseResponse])
def list_recurring_expenses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all recurring expense templates."""
    return (
        db.query(RecurringExpense)
        .filter(RecurringExpense.user_id == current_user.id)
        .order_by(RecurringExpense.created_at.desc())
        .all()
    )


@router.delete("/recurring/{recurring_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recurring_expense(
    recurring_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a recurring expense template."""
    rec = (
        db.query(RecurringExpense)
        .filter(and_(RecurringExpense.id == recurring_id, RecurringExpense.user_id == current_user.id))
        .first()
    )
    if not rec:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
    db.delete(rec)
    db.commit()


@router.post("/recurring/{recurring_id}/toggle", response_model=RecurringExpenseResponse)
def toggle_recurring_expense(
    recurring_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle a recurring expense active/inactive."""
    rec = (
        db.query(RecurringExpense)
        .filter(and_(RecurringExpense.id == recurring_id, RecurringExpense.user_id == current_user.id))
        .first()
    )
    if not rec:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
    rec.is_active = not rec.is_active
    db.commit()
    db.refresh(rec)
    return rec
