from __future__ import annotations

from datetime import date as Date, datetime
from typing import Optional, List
from pydantic import BaseModel


class ExpenseCreate(BaseModel):
    amount: float
    category: str
    expense_type: str = "personal"  # personal / shared
    date: Date
    description: Optional[str] = None


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    expense_type: Optional[str] = None
    date: Optional[Date] = None
    description: Optional[str] = None


class ExpenseResponse(BaseModel):
    id: int
    user_id: int
    amount: float
    category: str
    expense_type: str
    date: Date
    description: Optional[str]
    is_recurring: Optional[bool] = False
    recurring_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ExpenseFilter(BaseModel):
    category: Optional[str] = None
    expense_type: Optional[str] = None
    start_date: Optional[Date] = None
    end_date: Optional[Date] = None


# --- Recurring Expenses ---
class RecurringExpenseCreate(BaseModel):
    amount: float
    category: str
    description: Optional[str] = None
    frequency: str = "monthly"  # monthly / weekly / yearly
    day_of_month: int = 1
    day_of_week: Optional[int] = None  # 0=Monday ... 6=Sunday (for weekly)
    start_date: Optional[Date] = None
    end_date: Optional[Date] = None


class RecurringExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    frequency: Optional[str] = None
    day_of_month: Optional[int] = None
    day_of_week: Optional[int] = None
    start_date: Optional[Date] = None
    end_date: Optional[Date] = None


class RecurringExpenseResponse(BaseModel):
    id: int
    user_id: int
    amount: float
    category: str
    description: Optional[str]
    frequency: str
    day_of_month: int
    day_of_week: Optional[int] = None
    is_active: bool
    next_date: Optional[Date]
    start_date: Optional[Date] = None
    end_date: Optional[Date] = None
    created_at: datetime

    class Config:
        from_attributes = True
