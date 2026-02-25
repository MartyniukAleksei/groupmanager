import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Завантажуємо змінні з .env файлу
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL не знайдено у змінних середовища!")

# Створюємо асинхронний двигун. 
# echo=True корисно для розробки, щоб бачити SQL-запити в консолі. Для проду краще вимкнути.
engine = create_async_engine(DATABASE_URL, echo=True)

# Фабрика для створення асинхронних сесій
AsyncSessionLocal = async_sessionmaker(
    bind=engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

# Функція-залежність (Dependency) для FastAPI
# Вона буде видавати нову сесію для кожного API-запиту і закривати її після завершення
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session