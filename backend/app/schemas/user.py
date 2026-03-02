from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    monthly_income: Optional[float] = 0.0
    salary_date: Optional[int] = Field(default=1, ge=1, le=31)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    monthly_income: Optional[float] = None
    salary_date: Optional[int] = Field(default=None, ge=1, le=31)
    monthly_budget: Optional[float] = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    monthly_income: float
    salary_date: int
    monthly_budget: float
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None
