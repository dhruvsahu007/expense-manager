from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.salary import SalaryCredit
from app.schemas.salary import SalaryCreditCreate, SalaryCreditResponse, SalaryCheckResponse

router = APIRouter(prefix="/salary", tags=["Salary"])


@router.get("/check", response_model=SalaryCheckResponse)
def check_salary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check if today is salary day and whether salary has already been credited this month."""
    today = date.today()

    already_credited = (
        db.query(SalaryCredit)
        .filter(
            and_(
                SalaryCredit.user_id == current_user.id,
                SalaryCredit.month == today.month,
                SalaryCredit.year == today.year,
            )
        )
        .first()
    ) is not None

    is_salary_day = today.day == current_user.salary_date

    return SalaryCheckResponse(
        is_salary_day=is_salary_day,
        already_credited=already_credited,
        salary_date=current_user.salary_date,
        current_month=today.month,
        current_year=today.year,
    )


@router.post("/credit", response_model=SalaryCreditResponse, status_code=status.HTTP_201_CREATED)
def credit_salary(
    data: SalaryCreditCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record the salary credit for the current month. Only one per month allowed."""
    today = date.today()

    # Check duplicate
    existing = (
        db.query(SalaryCredit)
        .filter(
            and_(
                SalaryCredit.user_id == current_user.id,
                SalaryCredit.month == today.month,
                SalaryCredit.year == today.year,
            )
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Salary already credited for this month",
        )

    salary = SalaryCredit(
        user_id=current_user.id,
        amount=data.amount,
        credited_date=today,
        month=today.month,
        year=today.year,
    )
    db.add(salary)
    db.commit()
    db.refresh(salary)
    return salary


@router.get("/current", response_model=Optional[SalaryCreditResponse])
def get_current_salary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current month's salary credit record, if any."""
    today = date.today()

    record = (
        db.query(SalaryCredit)
        .filter(
            and_(
                SalaryCredit.user_id == current_user.id,
                SalaryCredit.month == today.month,
                SalaryCredit.year == today.year,
            )
        )
        .first()
    )
    return record
