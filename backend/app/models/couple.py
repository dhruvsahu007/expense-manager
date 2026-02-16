from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date, Text, Boolean

from app.core.database import Base


class Couple(Base):
    __tablename__ = "couples"

    id = Column(Integer, primary_key=True, index=True)
    user_1_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_2_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default="pending")  # pending / active / dissolved
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SharedExpense(Base):
    __tablename__ = "shared_expenses"

    id = Column(Integer, primary_key=True, index=True)
    couple_id = Column(Integer, ForeignKey("couples.id"), nullable=False, index=True)
    paid_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    split_type = Column(String(20), nullable=False, default="equal")  # equal / percentage / custom
    split_ratio = Column(String(20), nullable=False, default="50:50")  # e.g. "50:50", "60:40", "3000:7000"
    date = Column(Date, nullable=False)
    paid_from_joint = Column(Boolean, default=False)  # True = deducted from joint account
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Settlement(Base):
    __tablename__ = "settlements"

    id = Column(Integer, primary_key=True, index=True)
    couple_id = Column(Integer, ForeignKey("couples.id"), nullable=False, index=True)
    paid_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    paid_to_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SavingsGoal(Base):
    __tablename__ = "savings_goals"

    id = Column(Integer, primary_key=True, index=True)
    couple_id = Column(Integer, ForeignKey("couples.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0.0)
    deadline = Column(Date, nullable=True)
    is_completed = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SavingsContribution(Base):
    __tablename__ = "savings_contributions"

    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("savings_goals.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ─── Joint Account ───────────────────────────────────────────────────────────

class JointAccount(Base):
    __tablename__ = "joint_accounts"

    id = Column(Integer, primary_key=True, index=True)
    couple_id = Column(Integer, ForeignKey("couples.id"), nullable=False, unique=True, index=True)
    account_name = Column(String(100), default="Joint Account")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class JointAccountContribution(Base):
    __tablename__ = "joint_account_contributions"

    id = Column(Integer, primary_key=True, index=True)
    joint_account_id = Column(Integer, ForeignKey("joint_accounts.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    contribution_type = Column(String(30), nullable=False, default="salary")  # salary / bonus / savings / other / withdrawal
    note = Column(Text, nullable=True)
    date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class JointAccountTransaction(Base):
    __tablename__ = "joint_account_transactions"

    id = Column(Integer, primary_key=True, index=True)
    joint_account_id = Column(Integer, ForeignKey("joint_accounts.id"), nullable=False, index=True)
    shared_expense_id = Column(Integer, ForeignKey("shared_expenses.id"), nullable=True, index=True)
    amount = Column(Float, nullable=False)  # positive = debit (expense), negative = credit (refund)
    description = Column(Text, nullable=True)
    date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
