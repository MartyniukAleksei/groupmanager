from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database.database import get_db
from app.database.models import User, UserGroup, RoleEnum
from app.schemas import MemberOut, UpdateRoleRequest
from app.dependencies import get_current_user

router = APIRouter(tags=["Members"])

ROLE_ORDER = {RoleEnum.admin: 0, RoleEnum.user: 1}


async def get_membership(db: AsyncSession, user_id: int, group_id: int) -> UserGroup:
    result = await db.execute(
        select(UserGroup).where(UserGroup.user_id == user_id, UserGroup.group_id == group_id)
    )
    membership = result.scalars().first()
    if not membership:
        raise HTTPException(status_code=403, detail="Ви не є членом цієї групи")
    return membership


@router.get("/groups/{group_id}/members", response_model=list[MemberOut])
async def list_members(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership(db, current_user.id, group_id)

    stmt = select(UserGroup, User).join(User).where(UserGroup.group_id == group_id)
    rows = (await db.execute(stmt)).all()

    members = [
        MemberOut(
            user_id=user.id,
            name=user.name,
            email=user.email,
            avatar_url=user.avatar_url,
            telegram=user.telegram,
            birthday=user.birthday.isoformat() if user.birthday else None,
            role=ug.role.value,
            joined_at=ug.joined_at.isoformat(),
        )
        for ug, user in rows
    ]

    members.sort(key=lambda m: (ROLE_ORDER.get(RoleEnum(m.role), 99), m.name.lower()))
    return members


@router.patch("/groups/{group_id}/members/{user_id}/role", response_model=MemberOut)
async def update_member_role(
    group_id: int,
    user_id: int,
    body: UpdateRoleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    my_membership = await get_membership(db, current_user.id, group_id)
    if my_membership.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Тільки адміни можуть змінювати ролі")

    try:
        new_role = RoleEnum(body.role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Невалідна роль: {body.role}")

    target = await get_membership(db, user_id, group_id)

    # Prevent last admin from demoting themselves
    if target.role == RoleEnum.admin and new_role != RoleEnum.admin:
        result = await db.execute(
            select(UserGroup).where(
                UserGroup.group_id == group_id, UserGroup.role == RoleEnum.admin
            )
        )
        admin_count = len(result.scalars().all())
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Не можна понизити єдиного адміна")

    target.role = new_role
    await db.commit()
    await db.refresh(target)

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()

    return MemberOut(
        user_id=user.id,
        name=user.name,
        email=user.email,
        avatar_url=user.avatar_url,
        telegram=user.telegram,
        birthday=user.birthday.isoformat() if user.birthday else None,
        role=target.role.value,
        joined_at=target.joined_at.isoformat(),
    )


@router.delete("/groups/{group_id}/members/{user_id}", status_code=204)
async def remove_member(
    group_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    my_membership = await get_membership(db, current_user.id, group_id)
    if my_membership.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Тільки адміни можуть видаляти учасників")

    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Не можна видалити самого себе")

    target = await get_membership(db, user_id, group_id)
    await db.delete(target)
    await db.commit()
