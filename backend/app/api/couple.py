from typing import List
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.couple import Couple, SharedExpense, SavingsGoal, SavingsContribution
from app.schemas.couple import (
    CoupleInvite,
    CoupleResponse,
    SharedExpenseCreate,
    SharedExpenseResponse,
    BalanceSummary,
    SavingsGoalCreate,
    SavingsGoalResponse,
    SavingsContributionCreate,
    SavingsContributionResponse,
)

router = APIRouter(prefix="/couple", tags=["Couple Mode"])


# ─── Helpers ──────────────────────────────────────────────────────────────────

def get_active_couple(user_id: int, db: Session) -> Couple:
    couple = (
        db.query(Couple)
        .filter(
            and_(
                Couple.status == "active",
                or_(Couple.user_1_id == user_id, Couple.user_2_id == user_id),
            )
        )
        .first()
    )
    if not couple:
        raise HTTPException(status_code=404, detail="No active couple found")
    return couple


def get_partner_id(couple: Couple, user_id: int) -> int:
    return couple.user_2_id if couple.user_1_id == user_id else couple.user_1_id


def calculate_split(amount: float, split_type: str, split_ratio: str, paid_by_is_user1: bool):
    """Return (user1_share, user2_share)."""
    parts = split_ratio.split(":")
    if split_type == "equal":
        half = amount / 2
        return half, half
    elif split_type == "percentage":
        p1 = float(parts[0]) / 100
        p2 = float(parts[1]) / 100
        return amount * p1, amount * p2
    elif split_type == "custom":
        return float(parts[0]), float(parts[1])
    else:
        half = amount / 2
        return half, half


# ─── Couple Management ────────────────────────────────────────────────────────

@router.post("/invite", response_model=CoupleResponse, status_code=status.HTTP_201_CREATED)
def invite_partner(
    invite: CoupleInvite,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Invite a partner by email to form a couple."""
    # Check not already in a couple
    existing = (
        db.query(Couple)
        .filter(
            and_(
                Couple.status.in_(["pending", "active"]),
                or_(
                    Couple.user_1_id == current_user.id,
                    Couple.user_2_id == current_user.id,
                ),
            )
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="You are already in a couple or have a pending invite")

    partner = db.query(User).filter(User.email == invite.partner_email).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found. They must sign up first.")
    if partner.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot invite yourself")

    couple = Couple(
        user_1_id=current_user.id,
        user_2_id=partner.id,
        status="pending",
    )
    db.add(couple)
    db.commit()
    db.refresh(couple)

    return CoupleResponse(
        id=couple.id,
        user_1_id=couple.user_1_id,
        user_2_id=couple.user_2_id,
        status=couple.status,
        created_at=couple.created_at,
        partner_name=partner.name,
        partner_email=partner.email,
    )


@router.post("/accept/{couple_id}", response_model=CoupleResponse)
def accept_invite(
    couple_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Accept a pending couple invite."""
    couple = (
        db.query(Couple)
        .filter(
            and_(
                Couple.id == couple_id,
                Couple.user_2_id == current_user.id,
                Couple.status == "pending",
            )
        )
        .first()
    )
    if not couple:
        raise HTTPException(status_code=404, detail="Pending invite not found")

    couple.status = "active"
    db.commit()
    db.refresh(couple)

    partner = db.query(User).filter(User.id == couple.user_1_id).first()
    return CoupleResponse(
        id=couple.id,
        user_1_id=couple.user_1_id,
        user_2_id=couple.user_2_id,
        status=couple.status,
        created_at=couple.created_at,
        partner_name=partner.name if partner else None,
        partner_email=partner.email if partner else None,
    )


@router.post("/decline/{couple_id}")
def decline_invite(
    couple_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Decline a pending couple invite."""
    couple = (
        db.query(Couple)
        .filter(
            and_(
                Couple.id == couple_id,
                Couple.user_2_id == current_user.id,
                Couple.status == "pending",
            )
        )
        .first()
    )
    if not couple:
        raise HTTPException(status_code=404, detail="Pending invite not found")

    couple.status = "declined"
    db.commit()
    return {"detail": "Invite declined"}


@router.get("/status", response_model=CoupleResponse)
def couple_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current couple status."""
    couple = (
        db.query(Couple)
        .filter(
            and_(
                Couple.status.in_(["pending", "active"]),
                or_(
                    Couple.user_1_id == current_user.id,
                    Couple.user_2_id == current_user.id,
                ),
            )
        )
        .first()
    )
    if not couple:
        raise HTTPException(status_code=404, detail="No couple found")

    partner_id = get_partner_id(couple, current_user.id)
    partner = db.query(User).filter(User.id == partner_id).first()

    role = "inviter" if couple.user_1_id == current_user.id else "invitee"

    return CoupleResponse(
        id=couple.id,
        user_1_id=couple.user_1_id,
        user_2_id=couple.user_2_id,
        status=couple.status,
        created_at=couple.created_at,
        partner_name=partner.name if partner else None,
        partner_email=partner.email if partner else None,
        role=role,
    )


@router.get("/pending-invites", response_model=List[CoupleResponse])
def pending_invites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get pending invites for the current user."""
    invites = (
        db.query(Couple)
        .filter(
            and_(
                Couple.user_2_id == current_user.id,
                Couple.status == "pending",
            )
        )
        .all()
    )
    result = []
    for inv in invites:
        partner = db.query(User).filter(User.id == inv.user_1_id).first()
        result.append(
            CoupleResponse(
                id=inv.id,
                user_1_id=inv.user_1_id,
                user_2_id=inv.user_2_id,
                status=inv.status,
                created_at=inv.created_at,
                partner_name=partner.name if partner else None,
                partner_email=partner.email if partner else None,
            )
        )
    return result


# ─── Shared Expenses ─────────────────────────────────────────────────────────

@router.post("/expenses", response_model=SharedExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_shared_expense(
    expense_data: SharedExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log a shared expense."""
    couple = get_active_couple(current_user.id, db)

    shared = SharedExpense(
        couple_id=couple.id,
        paid_by_user_id=current_user.id,
        amount=expense_data.amount,
        category=expense_data.category,
        description=expense_data.description,
        split_type=expense_data.split_type,
        split_ratio=expense_data.split_ratio,
        date=expense_data.date,
    )
    db.add(shared)
    db.commit()
    db.refresh(shared)

    return SharedExpenseResponse(
        id=shared.id,
        couple_id=shared.couple_id,
        paid_by_user_id=shared.paid_by_user_id,
        paid_by_name=current_user.name,
        amount=shared.amount,
        category=shared.category,
        description=shared.description,
        split_type=shared.split_type,
        split_ratio=shared.split_ratio,
        date=shared.date,
        created_at=shared.created_at,
    )


@router.get("/expenses", response_model=List[SharedExpenseResponse])
def list_shared_expenses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all shared expenses for the couple."""
    couple = get_active_couple(current_user.id, db)
    expenses = (
        db.query(SharedExpense)
        .filter(SharedExpense.couple_id == couple.id)
        .order_by(SharedExpense.date.desc())
        .all()
    )

    result = []
    for exp in expenses:
        payer = db.query(User).filter(User.id == exp.paid_by_user_id).first()
        result.append(
            SharedExpenseResponse(
                id=exp.id,
                couple_id=exp.couple_id,
                paid_by_user_id=exp.paid_by_user_id,
                paid_by_name=payer.name if payer else None,
                amount=exp.amount,
                category=exp.category,
                description=exp.description,
                split_type=exp.split_type,
                split_ratio=exp.split_ratio,
                date=exp.date,
                created_at=exp.created_at,
            )
        )
    return result


@router.delete("/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shared_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a shared expense (only by the person who created it or either partner)."""
    couple = get_active_couple(current_user.id, db)
    expense = (
        db.query(SharedExpense)
        .filter(
            and_(
                SharedExpense.id == expense_id,
                SharedExpense.couple_id == couple.id,
            )
        )
        .first()
    )
    if not expense:
        raise HTTPException(status_code=404, detail="Shared expense not found")

    db.delete(expense)
    db.commit()


@router.get("/balance", response_model=BalanceSummary)
def get_balance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get balance summary between couple partners."""
    couple = get_active_couple(current_user.id, db)
    expenses = db.query(SharedExpense).filter(SharedExpense.couple_id == couple.id).all()

    user1_paid = 0.0
    user2_paid = 0.0
    user1_owes_total = 0.0
    user2_owes_total = 0.0

    for exp in expenses:
        is_user1_payer = exp.paid_by_user_id == couple.user_1_id
        u1_share, u2_share = calculate_split(
            exp.amount, exp.split_type, exp.split_ratio, is_user1_payer
        )

        if is_user1_payer:
            user1_paid += exp.amount
            # user2 owes their share to user1
            user2_owes_total += u2_share
        else:
            user2_paid += exp.amount
            # user1 owes their share to user2
            user1_owes_total += u1_share

    net = user1_owes_total - user2_owes_total  # positive means user1 owes user2

    return BalanceSummary(
        total_shared=user1_paid + user2_paid,
        user_1_paid=user1_paid,
        user_2_paid=user2_paid,
        user_1_owes=user1_owes_total,
        user_2_owes=user2_owes_total,
        net_balance=net,
    )


# ─── Savings Goals ───────────────────────────────────────────────────────────

@router.post("/goals", response_model=SavingsGoalResponse, status_code=status.HTTP_201_CREATED)
def create_savings_goal(
    goal_data: SavingsGoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a joint savings goal."""
    couple = get_active_couple(current_user.id, db)

    goal = SavingsGoal(
        couple_id=couple.id,
        title=goal_data.title,
        target_amount=goal_data.target_amount,
        deadline=goal_data.deadline,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    return _enrich_goal(goal)


@router.get("/goals", response_model=List[SavingsGoalResponse])
def list_savings_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all savings goals for the couple."""
    couple = get_active_couple(current_user.id, db)
    goals = db.query(SavingsGoal).filter(SavingsGoal.couple_id == couple.id).all()
    return [_enrich_goal(g) for g in goals]


@router.post("/goals/{goal_id}/contribute", response_model=SavingsContributionResponse)
def contribute_to_goal(
    goal_id: int,
    contribution: SavingsContributionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Contribute to a savings goal."""
    couple = get_active_couple(current_user.id, db)
    goal = (
        db.query(SavingsGoal)
        .filter(and_(SavingsGoal.id == goal_id, SavingsGoal.couple_id == couple.id))
        .first()
    )
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    contrib = SavingsContribution(
        goal_id=goal.id,
        user_id=current_user.id,
        amount=contribution.amount,
    )
    db.add(contrib)

    goal.current_amount += contribution.amount
    if goal.current_amount >= goal.target_amount:
        goal.is_completed = 1

    db.commit()
    db.refresh(contrib)

    return SavingsContributionResponse(
        id=contrib.id,
        goal_id=contrib.goal_id,
        user_id=contrib.user_id,
        user_name=current_user.name,
        amount=contrib.amount,
        created_at=contrib.created_at,
    )


@router.get("/goals/{goal_id}/contributions", response_model=List[SavingsContributionResponse])
def list_contributions(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List contributions for a savings goal."""
    couple = get_active_couple(current_user.id, db)
    goal = (
        db.query(SavingsGoal)
        .filter(and_(SavingsGoal.id == goal_id, SavingsGoal.couple_id == couple.id))
        .first()
    )
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    contribs = (
        db.query(SavingsContribution)
        .filter(SavingsContribution.goal_id == goal_id)
        .order_by(SavingsContribution.created_at.desc())
        .all()
    )

    result = []
    for c in contribs:
        user = db.query(User).filter(User.id == c.user_id).first()
        result.append(
            SavingsContributionResponse(
                id=c.id,
                goal_id=c.goal_id,
                user_id=c.user_id,
                user_name=user.name if user else None,
                amount=c.amount,
                created_at=c.created_at,
            )
        )
    return result


def _enrich_goal(goal: SavingsGoal) -> SavingsGoalResponse:
    percent = (goal.current_amount / goal.target_amount * 100) if goal.target_amount > 0 else 0
    monthly_needed = None
    if goal.deadline:
        today = date.today()
        months_left = (goal.deadline.year - today.year) * 12 + (goal.deadline.month - today.month)
        if months_left > 0:
            remaining = goal.target_amount - goal.current_amount
            monthly_needed = remaining / months_left if remaining > 0 else 0

    return SavingsGoalResponse(
        id=goal.id,
        couple_id=goal.couple_id,
        title=goal.title,
        target_amount=goal.target_amount,
        current_amount=goal.current_amount,
        deadline=goal.deadline,
        is_completed=goal.is_completed,
        percent_complete=round(percent, 1),
        monthly_contribution_needed=round(monthly_needed, 2) if monthly_needed is not None else None,
        created_at=goal.created_at,
    )
