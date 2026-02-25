from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Тут ми можемо додати логіку при старті (наприклад, підключення до Redis), 
    # але створення таблиць тепер повністю на Alembic!
    yield 

app = FastAPI(title="Projects Hub API", lifespan=lifespan)

@app.get("/")
async def root():
    return {"message": "API працює! База даних керується через Alembic."}