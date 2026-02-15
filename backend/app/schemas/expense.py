from datetime import date, datetime
from typing import Optional
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
    created_at: datetime

    class Config:
        from_attributes = True


class ExpenseFilter(BaseModel):
    category: Optional[str] = None
    expense_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
