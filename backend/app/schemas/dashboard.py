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
    status: Optional[str] = None  # "ok", "warning", "over"
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


class BudgetOverview(BaseModel):
    category: str
    monthly_limit: float
    current_spend: float
    percent_used: float
    status: str  # "ok", "warning", "over"


class IndividualDashboard(BaseModel):
    total_income: float
    total_expenses: float
    savings_amount: float
    savings_rate: float  # percentage
    burn_rate: float  # daily average
    category_breakdown: List[CategoryBreakdown]
    monthly_trend: List[MonthlyTrend]
    budget_overview: List[BudgetOverview] = []
    previous_month_expenses: float = 0.0
    month_over_month_change: float = 0.0  # percentage change


class CoupleDashboard(BaseModel):
    shared_expenses_total: float
    user_1_paid: float
    user_2_paid: float
    net_balance: float
    category_breakdown: List[CategoryBreakdown]
    goal_progress: List[dict]
    user_1_name: Optional[str] = None
    user_2_name: Optional[str] = None
    settlements_total: float = 0.0
    net_after_settlements: float = 0.0


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
