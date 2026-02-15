from fastapi import APIRouter
from app.schemas import Item

router = APIRouter()

# Имитация базы данных
fake_db = []

@router.post("/items/", response_model=Item)
def create_item(item: Item):
    return item

@router.get("/items/")
def read_items():
    return [{"id": 1, "name": "Test Item", "description": "This is a test"}]