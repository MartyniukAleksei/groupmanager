import os
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

# Імпорти для Google Auth
from google.oauth2 import id_token
from google.auth.transport import requests

# Твої імпорти
from app.database.database import get_db
from app.database.models import User

router = APIRouter(prefix="/auth", tags=["Auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
JWT_SECRET = os.getenv("JWT_SECRET")

# Схема для прийняття токена від React
class GoogleAuthRequest(BaseModel):
    token: str

@router.post("/google")
async def google_auth(request: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    try:
        # 1. Перевіряємо токен через сервера Google
        id_info = id_token.verify_oauth2_token(
            request.token, 
            requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        email = id_info.get("email")
        name = id_info.get("name")
        picture = id_info.get("picture")

        if not email:
            raise HTTPException(status_code=400, detail="Токен не містить email")

        # 2. Шукаємо користувача в базі
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()

        # 3. Якщо новий — реєструємо
        if not user:
            user = User(
                email=email,
                name=name,
                # Якщо у твоїй моделі є поле для аватарки або google_id, додай їх сюди:
                # avatar_url=picture 
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

        # 4. Генеруємо наш JWT токен (на 7 днів)
        expiration = datetime.now(timezone.utc) + timedelta(days=7)
        payload = {
            "sub": str(user.id),
            "email": user.email,
            "exp": expiration
        }
        
        access_token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email
            }
        }

    except ValueError:
        raise HTTPException(status_code=401, detail="Недійсний токен Google")