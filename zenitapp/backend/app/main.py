from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, chat, contact, equipment, events, notifications, quotes, reviews, services, users, ws
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.user import User, UserRole


def _ensure_first_admin() -> None:
    db = SessionLocal()
    try:
        # Garantiza la cuenta configurada aun si ya existe otro administrador.
        # No modifica contraseñas ni roles de cuentas existentes en cada reinicio.
        if not db.query(User).filter(User.email == settings.FIRST_ADMIN_EMAIL).first():
            admin = User(
                email=settings.FIRST_ADMIN_EMAIL,
                full_name=settings.FIRST_ADMIN_NAME,
                hashed_password=hash_password(settings.FIRST_ADMIN_PASSWORD),
                role=UserRole.ADMIN,
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # create_all alcanza para el MVP con SQLite/Postgres simple; cuando el
    # esquema empiece a evolucionar en producción, migrar a Alembic.
    Base.metadata.create_all(bind=engine)
    _ensure_first_admin()
    yield


app = FastAPI(title="Eventos Zenit API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(services.router)
app.include_router(quotes.router)
app.include_router(events.router)
app.include_router(equipment.router)
app.include_router(reviews.router)
app.include_router(chat.router)
app.include_router(notifications.router)
app.include_router(contact.router)
app.include_router(ws.router)


@app.get("/api/health", tags=["Salud"])
def health_check():
    return {"status": "ok", "environment": settings.ENVIRONMENT}
