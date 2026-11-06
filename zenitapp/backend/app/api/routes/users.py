from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.database import get_db
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserOut

router = APIRouter(prefix="/api/users", tags=["Usuarios"])


@router.get("", response_model=list[UserOut])
def list_users(
    role: Optional[UserRole] = None, db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    """Usado por el admin para, por ejemplo, listar empleados a la hora de asignarlos a un evento."""
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.order_by(User.full_name).all()


@router.post("/staff", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_staff_user(
    payload: UserCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    """Alta de empleados o nuevos admins desde el panel (no vía registro público)."""
    if payload.role == UserRole.CLIENTE:
        raise HTTPException(status_code=400, detail="Usá /api/auth/register para clientes")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Ese email ya está registrado")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
