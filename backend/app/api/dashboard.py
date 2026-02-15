from typing import List
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_, or_

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.expense import Expense
from app.models.couple import Couple, SharedExpense, SavingsGoal, Settlement
from app.models.budget import Budget, Notification
from app.schemas.dashboard import (
    IndividualDashboard,
    CoupleDashboard,
    CategoryBreakdown,
    MonthlyTrend,
    BudgetOverview,
    NotificationResponse,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/individual", response_model=IndividualDashboard)
def individual_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get individual analytics dashboard."""
    today = date.today()

    # Current month expenses
    month_expenses = (
        db.query(func.coalesce(func.sum(Expense.amount), 0))
        .filter(
            and_(
                Expense.user_id == current_user.id,
                extract("month", Expense.date) == today.month,
                extract("year", Expense.date) == today.year,
            )
        )
        .scalar()
    )

    # Previous month expenses
    prev_month = today.month - 1
    prev_year = today.year
    if prev_month <= 0:
        prev_month = 12
        prev_year -= 1

    prev_month_expenses = (
        db.query(func.coalesce(func.sum(Expense.amount), 0))
        .filter(
            and_(
                Expense.user_id == current_user.id,
                extract("month", Expense.date) == prev_month,
                extract("year", Expense.date) == prev_year,
            )
        )
        .scalar()
    )

    mom_change = 0.0
    if prev_month_expenses > 0:
        mom_change = ((month_expenses - prev_month_expenses) / prev_month_expenses) * 100

    total_income = current_user.monthly_income
    savings_amount = total_income - month_expenses
    savings_rate = (savings_amount / total_income * 100) if total_income > 0 else 0

    # Days elapsed this month
    days_elapsed = today.day
    burn_rate = month_expenses / days_elapsed if days_elapsed > 0 else 0

    # Category breakdown for current month
    category_data = (
        db.query(Expense.category, func.sum(Expense.amount).label("total"))
        .filter(
            and_(
                Expense.user_id == current_user.id,
                extract("month", Expense.date) == today.month,
                extract("year", Expense.date) == today.year,
            )
        )
        .group_by(Expense.category)
        .all()
    )

    category_breakdown = []
    for cat, total in category_data:
        pct = (total / month_expenses * 100) if month_expenses > 0 else 0
        category_breakdown.append(
            CategoryBreakdown(category=cat, total=round(total, 2), percentage=round(pct, 1))
        )

    # Monthly trend (last 6 months)
    monthly_trend = []
    for i in range(5, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1

        total = (
            db.query(func.coalesce(func.sum(Expense.amount), 0))
            .filter(
                and_(
                    Expense.user_id == current_user.id,
                    extract("month", Expense.date) == m,
                    extract("year", Expense.date) == y,
                )
            )
            .scalar()
        )
        month_label = date(y, m, 1).strftime("%b %Y")
        monthly_trend.append(MonthlyTrend(month=month_label, total=round(total, 2)))

    # Budget overview
    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()
    budget_overview = []
    for b in budgets:
        cat_spend = (
            db.query(func.coalesce(func.sum(Expense.amount), 0))
            .filter(
                and_(
                    Expense.user_id == current_user.id,
                    Expense.category == b.category,
                    extract("month", Expense.date) == today.month,
                    extract("year", Expense.date) == today.year,
                )
            )
            .scalar()
        )
        pct = (cat_spend / b.monthly_limit * 100) if b.monthly_limit > 0 else 0
        status_str = "ok"
        if pct >= 100:
            status_str = "over"
        elif pct >= 80:
            status_str = "warning"
        budget_overview.append(BudgetOverview(
            category=b.category,
            monthly_limit=b.monthly_limit,
            current_spend=round(cat_spend, 2),
            percent_used=round(pct, 1),
            status=status_str,
        ))

    # Generate nudges
    _check_and_generate_nudges(current_user, month_expenses, db)

    return IndividualDashboard(
        total_income=total_income,
        total_expenses=round(month_expenses, 2),
        savings_amount=round(savings_amount, 2),
        savings_rate=round(savings_rate, 1),
        burn_rate=round(burn_rate, 2),
        category_breakdown=category_breakdown,
        monthly_trend=monthly_trend,
        budget_overview=budget_overview,
        previous_month_expenses=round(prev_month_expenses, 2),
        month_over_month_change=round(mom_change, 1),
    )


@router.get("/couple", response_model=CoupleDashboard)
def couple_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get couple analytics dashboard."""
    couple = (
        db.query(Couple)
        .filter(
            and_(
                Couple.status == "active",
                or_(Couple.user_1_id == current_user.id, Couple.user_2_id == current_user.id),
            )
        )
        .first()
    )
    if not couple:
        raise HTTPException(status_code=404, detail="No active couple found")

    today = date.today()

    # This month's shared expenses
    expenses = (
        db.query(SharedExpense)
        .filter(
            and_(
                SharedExpense.couple_id == couple.id,
                extract("month", SharedExpense.date) == today.month,
                extract("year", SharedExpense.date) == today.year,
            )
        )
        .all()
    )

    shared_total = sum(e.amount for e in expenses)
    u1_paid = sum(e.amount for e in expenses if e.paid_by_user_id == couple.user_1_id)
    u2_paid = sum(e.amount for e in expenses if e.paid_by_user_id == couple.user_2_id)

    # Net balance calculation
    net = u1_paid - u2_paid  # positive = user1 paid more

    # Settlement totals
    settlements = db.query(Settlement).filter(Settlement.couple_id == couple.id).all()
    settlements_total = sum(s.amount for s in settlements)
    settlement_adjustment = 0.0
    for s in settlements:
        if s.paid_by_user_id == couple.user_1_id:
            settlement_adjustment -= s.amount
        else:
            settlement_adjustment += s.amount
    net_after = net + settlement_adjustment

    # Category breakdown
    cat_totals = {}
    for e in expenses:
        cat_totals[e.category] = cat_totals.get(e.category, 0) + e.amount

    cat_breakdown = []
    for cat, total in cat_totals.items():
        pct = (total / shared_total * 100) if shared_total > 0 else 0
        cat_breakdown.append(CategoryBreakdown(category=cat, total=round(total, 2), percentage=round(pct, 1)))

    # Goal progress
    goals = db.query(SavingsGoal).filter(SavingsGoal.couple_id == couple.id).all()
    goal_progress = []
    for g in goals:
        pct = (g.current_amount / g.target_amount * 100) if g.target_amount > 0 else 0
        goal_progress.append({
            "id": g.id,
            "title": g.title,
            "target": g.target_amount,
            "current": g.current_amount,
            "percent": round(pct, 1),
        })

    user1 = db.query(User).filter(User.id == couple.user_1_id).first()
    user2 = db.query(User).filter(User.id == couple.user_2_id).first()

    return CoupleDashboard(
        shared_expenses_total=round(shared_total, 2),
        user_1_paid=round(u1_paid, 2),
        user_2_paid=round(u2_paid, 2),
        net_balance=round(net, 2),
        category_breakdown=cat_breakdown,
        goal_progress=goal_progress,
        user_1_name=user1.name if user1 else None,
        user_2_name=user2.name if user2 else None,
        settlements_total=round(settlements_total, 2),
        net_after_settlements=round(net_after, 2),
    )


# ─── Notifications ───────────────────────────────────────────────────────────

@router.get("/notifications", response_model=List[NotificationResponse])
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all notifications for the user."""
    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )


@router.post("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a notification as read."""
    notification = (
        db.query(Notification)
        .filter(
            and_(
                Notification.id == notification_id,
                Notification.user_id == current_user.id,
            )
        )
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = 1
    db.commit()
    return {"status": "ok"}


@router.post("/notifications/mark-all-read")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read."""
    db.query(Notification).filter(
        and_(
            Notification.user_id == current_user.id,
            Notification.is_read == 0,
        )
    ).update({Notification.is_read: 1})
    db.commit()
    return {"status": "ok"}


@router.get("/notifications/unread-count")
def unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get unread notification count."""
    count = (
        db.query(func.count(Notification.id))
        .filter(
            and_(
                Notification.user_id == current_user.id,
                Notification.is_read == 0,
            )
        )
        .scalar()
    )
    return {"unread_count": count}


# ─── Nudge Generator ─────────────────────────────────────────────────────────

def _check_and_generate_nudges(user: User, month_expenses: float, db: Session):
    """Generate in-app nudges based on spending patterns."""
    today = date.today()

    # 1. Overall budget warning (80% of monthly budget)
    if user.monthly_budget > 0 and month_expenses >= user.monthly_budget * 0.8:
        _create_notification_if_new(
            db,
            user.id,
            "Budget Alert ⚠️",
            f"You've spent ₹{month_expenses:,.0f} of your ₹{user.monthly_budget:,.0f} monthly budget ({month_expenses/user.monthly_budget*100:.0f}%).",
            "budget_warning",
            today,
        )

    # 2. Savings below target
    if user.monthly_income > 0:
        savings_rate = (user.monthly_income - month_expenses) / user.monthly_income * 100
        if savings_rate < 20 and today.day >= 15:
            _create_notification_if_new(
                db,
                user.id,
                "Savings Alert 💰",
                f"Your savings rate is only {savings_rate:.0f}% this month. Consider reducing discretionary spending.",
                "savings_alert",
                today,
            )

    # 3. Per-category budget warnings
    budgets = db.query(Budget).filter(Budget.user_id == user.id).all()
    for budget in budgets:
        cat_spend = (
            db.query(func.coalesce(func.sum(Expense.amount), 0))
            .filter(
                and_(
                    Expense.user_id == user.id,
                    Expense.category == budget.category,
                    extract("month", Expense.date) == today.month,
                    extract("year", Expense.date) == today.year,
                )
            )
            .scalar()
        )
        if cat_spend >= budget.monthly_limit * 0.8:
            _create_notification_if_new(
                db,
                user.id,
                f"{budget.category} Budget Warning ⚠️",
                f"You've spent ₹{cat_spend:,.0f} of ₹{budget.monthly_limit:,.0f} for {budget.category}.",
                "budget_warning",
                today,
            )


def _create_notification_if_new(
    db: Session, user_id: int, title: str, message: str, ntype: str, today: date
):
    """Create notification only if one doesn't already exist today for same type+title."""
    from datetime import datetime, timezone

    existing = (
        db.query(Notification)
        .filter(
            and_(
                Notification.user_id == user_id,
                Notification.title == title,
                Notification.notification_type == ntype,
                func.date(Notification.created_at) == today,
            )
        )
        .first()
    )
    if not existing:
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=ntype,
        )
        db.add(notif)
        db.commit()
