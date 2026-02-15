from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


# --- Budget ---
class BudgetCreate(BaseModel):
    category: str
    monthly_limit: float


class BudgetUpdate(BaseModel):
    monthly_limit: Optional[float] = None


class BudgetResponse(BaseModel):
    id: int
    user_id: int
    category: str
    monthly_limit: float
    current_spend: Optional[float] = None
    remaining: Optional[float] = None
    percent_used: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Dashboard ---
class CategoryBreakdown(BaseModel):
    category: str
    total: float
    percentage: float


class MonthlyTrend(BaseModel):
    month: str
    total: float


class IndividualDashboard(BaseModel):
    total_income: float
    total_expenses: float
    savings_amount: float
    savings_rate: float  # percentage
    burn_rate: float  # daily average
    category_breakdown: List[CategoryBreakdown]
    monthly_trend: List[MonthlyTrend]


class CoupleDashboard(BaseModel):
    shared_expenses_total: float
    user_1_paid: float
    user_2_paid: float
    net_balance: float
    category_breakdown: List[CategoryBreakdown]
    goal_progress: List[dict]


# --- Notification ---
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    notification_type: str
    is_read: int
    created_at: datetime

    class Config:
        from_attributes = True
