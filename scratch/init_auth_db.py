import os
import sys

# Ensure backend package can be imported
sys.path.insert(0, r"c:\Users\A1\Desktop\PCCOE-1\urban-environmental-digital-twin")

from backend.app.database.session import engine, SessionLocal
from backend.app.models.user import User
from backend.app.database.base import Base
from backend.app.services.security_service import hash_password

print("Connecting to database and creating tables...")
Base.metadata.create_all(bind=engine)

db = SessionLocal()
try:
    # 1. Citizen User
    citizen = db.query(User).filter(User.email == "citizen@pune-air.in").first()
    if not citizen:
        citizen = User(
            email="citizen@pune-air.in",
            hashed_password=hash_password("password123"),
            full_name="Rahul Sharma",
            role="CITIZEN",
            organization="Resident - Kothrud, Pune",
            is_active=True,
        )
        db.add(citizen)
        print("Created default citizen: citizen@pune-air.in")
    else:
        print("Citizen account already exists.")

    # 2. Authority User
    authority = db.query(User).filter(User.email == "officer@pcmc.gov.in").first()
    if not authority:
        authority = User(
            email="officer@pcmc.gov.in",
            hashed_password=hash_password("password123"),
            full_name="Dr. Sunita Kulkarni",
            role="AUTHORITY",
            organization="PCMC Environmental Protection Cell",
            is_active=True,
        )
        db.add(authority)
        print("Created default authority: officer@pcmc.gov.in")
    else:
        print("Authority account already exists.")

    db.commit()
    print("Successfully committed user seed accounts to database!")
finally:
    db.close()
