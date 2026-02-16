from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date, Text, Boolean

from app.core.database import Base


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    category = Column(String(50), nullable=False)
    expense_type = Column(String(20), nullable=False, default="personal")  # personal / shared
    date = Column(Date, nullable=False)
    description = Column(Text, nullable=True)
    is_recurring = Column(Boolean, default=False)
    recurring_id = Column(Integer, ForeignKey("recurring_expenses.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class RecurringExpense(Base):
    __tablename__ = "recurring_expenses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    category = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    frequency = Column(String(20), nullable=False, default="monthly")  # monthly / weekly / yearly
    day_of_month = Column(Integer, default=1)  # 1-31 for monthly
    day_of_week = Column(Integer, nullable=True)  # 0=Monday ... 6=Sunday (for weekly)
    is_active = Column(Boolean, default=True)
    next_date = Column(Date, nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
