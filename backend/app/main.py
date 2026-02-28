from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.database.database import engine
from app.database.models import Base
from fastapi.middleware.cors import CORSMiddleware
# Цей контекстний менеджер виконається один раз при старті сервера
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Автоматично створюємо всі таблиці з models.py, якщо їх ще немає
    async with engine.begin() as conn:
        # УВАГА: Це підходить для розробки. 
        # На продакшені ми будемо використовувати Alembic для міграцій.
        await conn.run_sync(Base.metadata.create_all)
    
    yield # Сервер працює
    
    # Тут можна додати логіку при вимкненні сервера (наприклад, закрити з'єднання)
    await engine.dispose()
    
# Імпортуємо наш роутер
from app.routers import auth

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    
app = FastAPI(title="Projects Hub API", lifespan=lifespan)

# Дозволяємо React стукатися до нашого API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)    

# Ініціалізуємо FastAPI
app = FastAPI(title="Projects Hub API", lifespan=lifespan)
# Підключаємо роутер авторизації
app.include_router(auth.router)

@app.get("/")
async def root():
    return {"message": "API працює! Підключення до бази налаштовано."}
  