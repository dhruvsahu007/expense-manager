from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


# --- Couple ---
class CoupleInvite(BaseModel):
    partner_email: str


class CoupleResponse(BaseModel):
    id: int
    user_1_id: int
    user_2_id: int
    status: str
    created_at: datetime
    partner_name: Optional[str] = None
    partner_email: Optional[str] = None
    role: Optional[str] = None  # "inviter" or "invitee"

    class Config:
        from_attributes = True


# --- Shared Expense ---
class SharedExpenseCreate(BaseModel):
    amount: float
    category: str
    description: Optional[str] = None
    split_type: str = "equal"  # equal / percentage / custom
    split_ratio: str = "50:50"
    date: date


class SharedExpenseResponse(BaseModel):
    id: int
    couple_id: int
    paid_by_user_id: int
    paid_by_name: Optional[str] = None
    amount: float
    category: str
    description: Optional[str]
    split_type: str
    split_ratio: str
    date: date
    created_at: datetime

    class Config:
        from_attributes = True


class BalanceSummary(BaseModel):
    total_shared: float
    user_1_paid: float
    user_2_paid: float
    user_1_owes: float
    user_2_owes: float
    net_balance: float
    settlements_total: float = 0.0
    net_after_settlements: float = 0.0
    user_1_name: Optional[str] = None
    user_2_name: Optional[str] = None


# --- Settlement ---
class SettlementCreate(BaseModel):
    amount: float
    note: Optional[str] = None


class SettlementResponse(BaseModel):
    id: int
    couple_id: int
    paid_by_user_id: int
    paid_to_user_id: int
    paid_by_name: Optional[str] = None
    paid_to_name: Optional[str] = None
    amount: float
    note: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# --- Savings Goal ---
class SavingsGoalCreate(BaseModel):
    title: str
    target_amount: float
    deadline: Optional[date] = None


class SavingsGoalResponse(BaseModel):
    id: int
    couple_id: int
    title: str
    target_amount: float
    current_amount: float
    deadline: Optional[date]
    is_completed: int
    percent_complete: Optional[float] = None
    monthly_contribution_needed: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SavingsContributionCreate(BaseModel):
    amount: float


class SavingsContributionResponse(BaseModel):
    id: int
    goal_id: int
    user_id: int
    user_name: Optional[str] = None
    amount: float
    created_at: datetime

    class Config:
        from_attributes = True
