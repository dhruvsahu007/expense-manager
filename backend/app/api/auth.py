from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.deps import get_current_user
from app.core.config import get_settings
from app.models.user import User
from app.models.expense import Expense, RecurringExpense
from app.models.budget import Budget, Notification
from app.models.couple import Couple, SharedExpense, Settlement, SavingsGoal, SavingsContribution
from app.schemas.user import UserCreate, UserLogin, UserUpdate, UserResponse, Token

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        monthly_income=user_data.monthly_income or 0.0,
        salary_date=user_data.salary_date or 1,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate and get JWT token."""
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(access_token=access_token)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return current_user


@router.put("/me", response_model=UserResponse)
def update_me(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update current user profile."""
    if user_data.name is not None:
        current_user.name = user_data.name
    if user_data.monthly_income is not None:
        current_user.monthly_income = user_data.monthly_income
    if user_data.salary_date is not None:
        current_user.salary_date = user_data.salary_date
    if user_data.monthly_budget is not None:
        current_user.monthly_budget = user_data.monthly_budget

    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Permanently delete user account and all associated data (GDPR)."""
    user_id = current_user.id

    # Delete notifications
    db.query(Notification).filter(Notification.user_id == user_id).delete()

    # Delete budgets
    db.query(Budget).filter(Budget.user_id == user_id).delete()

    # Delete expenses & recurring expenses
    db.query(Expense).filter(Expense.user_id == user_id).delete()
    db.query(RecurringExpense).filter(RecurringExpense.user_id == user_id).delete()

    # Delete couple-related data
    couples = db.query(Couple).filter(
        or_(Couple.user_1_id == user_id, Couple.user_2_id == user_id)
    ).all()

    for couple in couples:
        # Delete savings contributions for this couple's goals
        goals = db.query(SavingsGoal).filter(SavingsGoal.couple_id == couple.id).all()
        for goal in goals:
            db.query(SavingsContribution).filter(SavingsContribution.goal_id == goal.id).delete()
        db.query(SavingsGoal).filter(SavingsGoal.couple_id == couple.id).delete()

        # Delete settlements
        db.query(Settlement).filter(Settlement.couple_id == couple.id).delete()

        # Delete shared expenses
        db.query(SharedExpense).filter(SharedExpense.couple_id == couple.id).delete()

        # Delete the couple record
        db.delete(couple)

    # Delete the user
    db.delete(current_user)
    db.commit()
