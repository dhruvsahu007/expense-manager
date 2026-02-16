from __future__ import annotations

from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel


class ExpenseCreate(BaseModel):
    amount: float
    category: str
    expense_type: str = "personal"  # personal / shared
    date: date
    description: Optional[str] = None


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    expense_type: Optional[str] = None
    date: Optional[date] = None
    description: Optional[str] = None


class ExpenseResponse(BaseModel):
    id: int
    user_id: int
    amount: float
    category: str
    expense_type: str
    date: date
    description: Optional[str]
    is_recurring: Optional[bool] = False
    recurring_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ExpenseFilter(BaseModel):
    category: Optional[str] = None
    expense_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


# --- Recurring Expenses ---
class RecurringExpenseCreate(BaseModel):
    amount: float
    category: str
    description: Optional[str] = None
    frequency: str = "monthly"  # monthly / weekly / yearly
    day_of_month: int = 1


class RecurringExpenseResponse(BaseModel):
    id: int
    user_id: int
    amount: float
    category: str
    description: Optional[str]
    frequency: str
    day_of_month: int
    is_active: bool
    next_date: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True
