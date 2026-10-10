"""
Authentication & User Management Endpoints
==========================================
Handles registration, login, token verification, and user profile management.
"""

import logging
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.user import User
from backend.app.schemas.auth import UserRegister, UserLogin, UserOut, Token
from backend.app.services.security_service import hash_password, verify_password, create_access_token
from backend.app.api.deps import get_current_user

logger = logging.getLogger("digital_twin_auth")
router = APIRouter(prefix="/auth", tags=["Authentication & Access Control"])


@router.post(
    "/register",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new citizen or authority user",
)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    """Creates a new user account with hashed password and generates an initial JWT session token."""
    # Check if email is already taken
    existing_user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please log in instead.",
        )

    # Hash the password securely with bcrypt
    hashed_pwd = hash_password(user_in.password)

    new_user = User(
        email=user_in.email.lower(),
        hashed_password=hashed_pwd,
        full_name=user_in.full_name.strip(),
        role=user_in.role,
        organization=user_in.organization.strip() if user_in.organization else None,
        phone=user_in.phone.strip() if user_in.phone else None,
        is_active=True,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info("Created user account %s (%s, role=%s)", new_user.email, new_user.full_name, new_user.role)

    # Generate JWT access token
    token_claims = {
        "sub": str(new_user.id),
        "email": new_user.email,
        "role": new_user.role,
        "name": new_user.full_name,
    }
    access_token = create_access_token(token_claims)

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserOut.model_validate(new_user),
    )


@router.post(
    "/login",
    response_model=Token,
    summary="Authenticate with email and password",
)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticates credentials against stored bcrypt hash and returns a signed JWT token."""
    user = db.query(User).filter(User.email == credentials.email.lower()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password combination.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password combination.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact support.",
        )

    token_claims = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "name": user.full_name,
    }
    access_token = create_access_token(token_claims)

    logger.info("User %s logged in successfully (role=%s)", user.email, user.role)

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


class QuickLoginRequest(BaseModel):
    role: Literal["CITIZEN", "AUTHORITY"]


@router.post(
    "/quick-login",
    response_model=Token,
    summary="Quick-switch login for evaluations (Citizen or Authority)",
)
def quick_login(req: QuickLoginRequest, db: Session = Depends(get_db)):
    """Generates an instant authenticated session for presentation evaluators without typing credentials."""
    target_email = "citizen@pune-air.in" if req.role == "CITIZEN" else "officer@pcmc.gov.in"
    target_name = "Rahul Sharma (Citizen)" if req.role == "CITIZEN" else "Dr. Sunita Kulkarni (Env Officer)"
    target_org = "Pune Resident - Kothrud" if req.role == "CITIZEN" else "PCMC Environmental Protection Cell"

    # Find or seed the evaluator account
    user = db.query(User).filter(User.email == target_email).first()
    if not user:
        user = User(
            email=target_email,
            hashed_password=hash_password("password123"),
            full_name=target_name,
            role=req.role,
            organization=target_org,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token_claims = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "name": user.full_name,
    }
    access_token = create_access_token(token_claims)

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserOut,
    summary="Get currently authenticated user profile",
)
def get_profile(current_user: User = Depends(get_current_user)):
    """Returns the verified profile and role of the requesting user."""
    return UserOut.model_validate(current_user)
