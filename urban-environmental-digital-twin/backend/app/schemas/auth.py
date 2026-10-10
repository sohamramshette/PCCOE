"""
Authentication Pydantic Schemas
===============================
Request and response validation models for user authentication, registration, and tokens.
"""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, Field


UserRoleType = Literal["CITIZEN", "AUTHORITY"]


class UserRegister(BaseModel):
    email: EmailStr = Field(..., description="User unique email address")
    password: str = Field(..., min_length=6, description="Password (min 6 characters)")
    full_name: str = Field(..., min_length=2, max_length=120, description="Full name of user")
    role: UserRoleType = Field(default="CITIZEN", description="User role: CITIZEN or AUTHORITY")
    organization: Optional[str] = Field(default=None, max_length=150, description="Optional organization or department")
    phone: Optional[str] = Field(default=None, max_length=30, description="Optional phone number")


class UserLogin(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User account password")


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    organization: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None
