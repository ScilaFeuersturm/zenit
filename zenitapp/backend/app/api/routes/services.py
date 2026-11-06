from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.core.database import get_db
from app.models.service import Service, ServiceCategory
from app.models.user import User
from app.schemas.service import ServiceCreate, ServiceOut, ServiceUpdate

router = APIRouter(prefix="/api/services", tags=["Servicios / Inventario"])


@router.get("", response_model=list[ServiceOut])
def list_services(
    category: Optional[ServiceCategory] = None,
    only_active: bool = True,
    db: Session = Depends(get_db),
):
    query = db.query(Service)
    if category:
        query = query.filter(Service.category == category)
    if only_active:
        query = query.filter(Service.is_active.is_(True))
    return query.order_by(Service.category, Service.name).all()


@router.get("/{service_id}", response_model=ServiceOut)
def get_service(service_id: int, db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return service


@router.post("", response_model=ServiceOut, status_code=201)
def create_service(
    payload: ServiceCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    service = Service(**payload.model_dump())
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.patch("/{service_id}", response_model=ServiceOut)
def update_service(
    service_id: int,
    payload: ServiceUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(service, field, value)

    db.commit()
    db.refresh(service)
    return service


@router.delete("/{service_id}", status_code=204)
def deactivate_service(
    service_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    """Baja lógica: se desactiva en vez de borrarse para no romper el historial de eventos pasados."""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    service.is_active = False
    db.commit()
