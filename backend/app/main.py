from fastapi import FastAPI
from app.routers import example

app = FastAPI()

# Подключаем роутер (маршруты) из другого файла
app.include_router(example.router)

@app.get("/")
def read_root():
    return {"message": "Hello from Dockerized FastAPI!"}