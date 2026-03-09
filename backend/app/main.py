from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Наші імпорти бази та роутерів
from app.database.database import engine
from app.database.models import Base
from app.routers import auth

# Цей контекстний менеджер виконається один раз при старті сервера
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Автоматично створюємо всі таблиці з models.py, якщо їх ще немає
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield # Сервер працює і приймає запити
    
    # Закриваємо з'єднання при вимкненні сервера
    await engine.dispose()

# Ініціалізуємо додаток
app = FastAPI(title="Projects Hub API", lifespan=lifespan)

# НАЛАШТУВАННЯ CORS (Охоронець)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:3000",
        "https://groupmanager-rho.vercel.app"
    ], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Підключаємо роутери
app.include_router(auth.router)

@app.get("/")
async def root():
    return {"message": "API працює! Підключення до бази налаштовано."}