from dotenv import load_dotenv
load_dotenv()  # Ця команда змусить Python прочитати твій локальний .env файл

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Наші імпорти бази та роутерів
from app.database.database import engine
from app.database.models import Base
from app.routers import auth, groups, schedule, attendance, homework, materials, queue

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
app.include_router(groups.router)
app.include_router(schedule.router)
app.include_router(attendance.router)
app.include_router(homework.router)
app.include_router(materials.router)
app.include_router(queue.router)

@app.get("/")
async def root():
    return {"message": "API працює! Підключення до бази налаштовано."}