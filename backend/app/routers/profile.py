from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.database.models import User
from app.schemas import UserProfileOut, UserProfileUpdate
from app.dependencies import get_current_user

router = APIRouter(prefix="/users", tags=["Profile"])


@router.get("/me", response_model=UserProfileOut)
async def get_profile(current_user: User = Depends(get_current_user)):
    return UserProfileOut(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        avatar_url=current_user.avatar_url,
        telegram=current_user.telegram,
        birthday=current_user.birthday.isoformat() if current_user.birthday else None,
    )


@router.patch("/me", response_model=UserProfileOut)
async def update_profile(
    data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.name is not None:
        current_user.name = data.name

    if data.telegram is not None:
        tg = data.telegram.strip()
        if tg and (not tg.startswith("@") or len(tg) < 2 or len(tg) > 50):
            raise HTTPException(status_code=400, detail="Telegram має починатись з @ і бути 2–50 символів")
        current_user.telegram = tg or None

    if data.birthday is not None:
        try:
            current_user.birthday = date.fromisoformat(data.birthday)
        except ValueError:
            raise HTTPException(status_code=400, detail="Невірний формат дати (очікується YYYY-MM-DD)")

    await db.commit()
    await db.refresh(current_user)

    return UserProfileOut(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        avatar_url=current_user.avatar_url,
        telegram=current_user.telegram,
        birthday=current_user.birthday.isoformat() if current_user.birthday else None,
    )
