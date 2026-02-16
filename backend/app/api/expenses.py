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
    RecurringExpenseCreate, RecurringExpenseUpdate, RecurringExpenseResponse,
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


def _compute_next_date(frequency: str, day_of_month: int = 1, day_of_week: int | None = None, after: date | None = None) -> date:
    """Compute the next occurrence date for a recurring expense."""
    ref = after or date.today()
    if frequency == "weekly":
        dow = day_of_week if day_of_week is not None else 0
        days_ahead = (dow - ref.weekday()) % 7
        if days_ahead == 0 and after:
            days_ahead = 7
        return ref + timedelta(days=days_ahead or 7)
    elif frequency == "yearly":
        try:
            next_d = date(ref.year, ref.month, ref.day).replace(year=ref.year + 1)
        except ValueError:
            next_d = date(ref.year + 1, ref.month, 28)
        return next_d
    else:  # monthly
        day = min(day_of_month, 28)
        try:
            next_d = date(ref.year, ref.month, day)
        except ValueError:
            next_d = date(ref.year, ref.month, 28)
        if next_d <= ref:
            m = ref.month + 1
            y = ref.year
            if m > 12:
                m = 1
                y += 1
            next_d = date(y, m, day)
        return next_d


@router.post("/recurring", response_model=RecurringExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_recurring_expense(
    data: RecurringExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a recurring expense template."""
    next_d = _compute_next_date(data.frequency, data.day_of_month, data.day_of_week)

    rec = RecurringExpense(
        user_id=current_user.id,
        amount=data.amount,
        category=data.category,
        description=data.description,
        frequency=data.frequency,
        day_of_month=data.day_of_month,
        day_of_week=data.day_of_week,
        next_date=next_d,
        start_date=data.start_date or date.today(),
        end_date=data.end_date,
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


@router.put("/recurring/{recurring_id}", response_model=RecurringExpenseResponse)
def update_recurring_expense(
    recurring_id: int,
    data: RecurringExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a recurring expense template."""
    rec = (
        db.query(RecurringExpense)
        .filter(and_(RecurringExpense.id == recurring_id, RecurringExpense.user_id == current_user.id))
        .first()
    )
    if not rec:
        raise HTTPException(status_code=404, detail="Recurring expense not found")

    if data.amount is not None:
        rec.amount = data.amount
    if data.category is not None:
        rec.category = data.category
    if data.description is not None:
        rec.description = data.description
    if data.day_of_month is not None:
        rec.day_of_month = data.day_of_month
    if data.day_of_week is not None:
        rec.day_of_week = data.day_of_week
    if data.start_date is not None:
        rec.start_date = data.start_date
    if data.end_date is not None:
        rec.end_date = data.end_date
    if data.frequency is not None:
        rec.frequency = data.frequency

    # Recompute next date
    rec.next_date = _compute_next_date(rec.frequency, rec.day_of_month, rec.day_of_week)
    db.commit()
    db.refresh(rec)
    return rec


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
    if rec.is_active:
        rec.next_date = _compute_next_date(rec.frequency, rec.day_of_month, rec.day_of_week)
    db.commit()
    db.refresh(rec)
    return rec


@router.post("/recurring/process")
def process_recurring_expenses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Process (auto-create) all due recurring expenses for the current user."""
    today = date.today()
    recs = (
        db.query(RecurringExpense)
        .filter(
            and_(
                RecurringExpense.user_id == current_user.id,
                RecurringExpense.is_active == True,
                RecurringExpense.next_date <= today,
            )
        )
        .all()
    )

    created = 0
    for rec in recs:
        # Check end_date
        if rec.end_date and today > rec.end_date:
            rec.is_active = False
            db.commit()
            continue

        # Create expense for the due date
        expense = Expense(
            user_id=current_user.id,
            amount=rec.amount,
            category=rec.category,
            expense_type="personal",
            date=rec.next_date,
            description=rec.description or f"Recurring: {rec.category}",
            is_recurring=True,
            recurring_id=rec.id,
        )
        db.add(expense)

        # Advance next_date
        rec.next_date = _compute_next_date(rec.frequency, rec.day_of_month, rec.day_of_week, after=rec.next_date)
        db.commit()
        created += 1

    return {"processed": created, "message": f"{created} recurring expenses created"}
