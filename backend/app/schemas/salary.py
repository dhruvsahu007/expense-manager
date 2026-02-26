from __future__ import annotations

from datetime import date as Date, datetime
from typing import Optional
from pydantic import BaseModel


class SalaryCreditCreate(BaseModel):
    amount: float


class SalaryCreditResponse(BaseModel):
    id: int
    user_id: int
    amount: float
    credited_date: Date
    month: int
    year: int
    created_at: datetime

    class Config:
        from_attributes = True


class SalaryCheckResponse(BaseModel):
    is_salary_day: bool
    already_credited: bool
    salary_date: int  # user's configured salary day
    current_month: int
    current_year: int
