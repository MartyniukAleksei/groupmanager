from fastapi import FastAPI

# Создаем экземпляр приложения
app = FastAPI()

# Самый простой GET-запрос (эндпоинт)
@app.get("/")
def read_root():
    return {"message": "Hello, World! Backend is working!"}

# Эндпоинт с параметром (пример)
@app.get("/items/{item_id}")
def read_item(item_id: int):
    return {"item_id": item_id, "name": "Test Item"}