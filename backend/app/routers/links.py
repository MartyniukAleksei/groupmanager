from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.database import get_db
from app.database.models import User, UsefulLink, RoleEnum
from app.dependencies import get_current_user
from app.schemas import UsefulLinkCreate, UsefulLinkOut
from app.routers.schedule import get_membership, require_admin

router = APIRouter(prefix="/groups", tags=["Links"])


@router.get("/{group_id}/links", response_model=list[UsefulLinkOut])
async def get_links(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership(group_id, current_user, db)
    result = await db.execute(
        select(UsefulLink).where(UsefulLink.group_id == group_id).order_by(UsefulLink.id)
    )
    return result.scalars().all()


@router.post("/{group_id}/links", response_model=UsefulLinkOut, status_code=201)
async def create_link(
    group_id: int,
    body: UsefulLinkCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_admin(group_id, current_user, db)
    link = UsefulLink(
        group_id=group_id,
        title=body.title,
        url=body.url,
        emoji=body.emoji,
        created_by_id=current_user.id,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return link


@router.delete("/{group_id}/links/{link_id}", status_code=204)
async def delete_link(
    group_id: int,
    link_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_admin(group_id, current_user, db)
    result = await db.execute(
        select(UsefulLink).where(UsefulLink.id == link_id)
    )
    link = result.scalars().first()
    if not link or link.group_id != group_id:
        raise HTTPException(status_code=404, detail="Посилання не знайдено")
    await db.delete(link)
    await db.commit()
