import os
import jwt
from fastapi import Header, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.database.models import User

JWT_SECRET = os.getenv("JWT_SECRET")


async def get_current_user(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        token = authorization.removeprefix("Bearer ")
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = await db.get(User, int(payload["sub"]))
        if not user:
            raise HTTPException(status_code=401, detail="Користувача не знайдено")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Недійсний токен")
