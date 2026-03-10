import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database.database import get_db
from app.database.models import User, Group, UserGroup, RoleEnum
from app.dependencies import get_current_user
from app.schemas import GroupCreate, JoinGroupRequest, GroupOut, GroupWithRoleOut

router = APIRouter(prefix="/groups", tags=["Groups"])


@router.post("", response_model=GroupOut, status_code=201)
async def create_group(
    body: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    join_code = secrets.token_hex(4).upper()
    group = Group(name=body.name, description=body.description, join_code=join_code)
    db.add(group)
    await db.flush()  # get group.id before committing

    membership = UserGroup(user_id=current_user.id, group_id=group.id, role=RoleEnum.admin)
    db.add(membership)
    await db.commit()
    await db.refresh(group)
    return group


@router.get("/me", response_model=list[GroupWithRoleOut])
async def get_my_groups(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(UserGroup, Group)
        .join(Group, UserGroup.group_id == Group.id)
        .where(UserGroup.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    rows = result.all()

    groups = []
    for ug, group in rows:
        count_stmt = select(func.count()).where(UserGroup.group_id == group.id)
        count_result = await db.execute(count_stmt)
        member_count = count_result.scalar()
        groups.append(GroupWithRoleOut(
            id=group.id,
            name=group.name,
            join_code=group.join_code,
            description=group.description,
            created_at=group.created_at,
            role=ug.role.value,
            member_count=member_count,
        ))
    return groups


@router.get("/join/{join_code}", response_model=GroupOut)
async def preview_group(
    join_code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Group).where(Group.join_code == join_code))
    group = result.scalars().first()
    if not group:
        raise HTTPException(status_code=404, detail="Групу не знайдено")
    return group


@router.post("/join", response_model=GroupOut)
async def join_group(
    body: JoinGroupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Group).where(Group.join_code == body.join_code))
    group = result.scalars().first()
    if not group:
        raise HTTPException(status_code=404, detail="Групу не знайдено")

    existing = await db.execute(
        select(UserGroup).where(
            UserGroup.user_id == current_user.id,
            UserGroup.group_id == group.id,
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="Ви вже є учасником цієї групи")

    membership = UserGroup(user_id=current_user.id, group_id=group.id, role=RoleEnum.user)
    db.add(membership)
    await db.commit()
    await db.refresh(group)
    return group
