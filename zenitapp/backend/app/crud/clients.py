from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.chat import Conversation
from app.models.user import User, UserRole
from app.schemas.user import UserCreate


def create_client(db: Session, payload: UserCreate) -> User:
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
        role=UserRole.CLIENTE,
    )
    try:
        db.add(user)
        db.flush()
        db.add(Conversation(client_id=user.id))
        db.commit()
    except IntegrityError:
        db.rollback()
        if db.query(User).filter(User.email == payload.email).first():
            raise HTTPException(status_code=400, detail="Ese email ya está registrado")
        raise
    db.refresh(user)
    return user
