from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.database import get_db
from app.database.models import User, UserGroup, ScheduleEntry, GroupWeekSettings, RoleEnum
from app.dependencies import get_current_user
from app.schemas import ScheduleEntryCreate, ScheduleEntryUpdate, ScheduleEntryOut, ScheduleResponse, SetWeekRequest

router = APIRouter(prefix="/groups", tags=["Schedule"])


def compute_current_week(settings: GroupWeekSettings) -> int:
    today = datetime.now(timezone.utc).date()
    set_at = settings.week_set_at.replace(tzinfo=timezone.utc).date()
    # Align both dates to their Monday so the week type flips every Monday
    today_monday = today - timedelta(days=today.weekday())
    set_at_monday = set_at - timedelta(days=set_at.weekday())
    weeks_elapsed = (today_monday - set_at_monday).days // 7
    return ((settings.current_week - 1 + weeks_elapsed) % 2) + 1


async def get_membership(group_id: int, user: User, db: AsyncSession) -> UserGroup:
    result = await db.execute(
        select(UserGroup).where(UserGroup.group_id == group_id, UserGroup.user_id == user.id)
    )
    ug = result.scalars().first()
    if not ug:
        raise HTTPException(status_code=403, detail="Не є учасником групи")
    return ug


async def require_admin(group_id: int, user: User, db: AsyncSession):
    ug = await get_membership(group_id, user, db)
    if ug.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Тільки адміністратор")


async def get_or_create_week_settings(group_id: int, db: AsyncSession) -> GroupWeekSettings:
    result = await db.execute(
        select(GroupWeekSettings).where(GroupWeekSettings.group_id == group_id)
    )
    settings = result.scalars().first()
    if not settings:
        settings = GroupWeekSettings(group_id=group_id, current_week=1, week_set_at=datetime.now(timezone.utc))
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


@router.get("/{group_id}/schedule", response_model=ScheduleResponse)
async def get_schedule(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership(group_id, current_user, db)
    settings = await get_or_create_week_settings(group_id, db)
    current_week = compute_current_week(settings)

    result = await db.execute(
        select(ScheduleEntry).where(ScheduleEntry.group_id == group_id)
    )
    entries = result.scalars().all()
    return ScheduleResponse(entries=entries, current_week=current_week)


@router.post("/{group_id}/schedule", response_model=ScheduleEntryOut, status_code=201)
async def create_schedule_entry(
    group_id: int,
    body: ScheduleEntryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_admin(group_id, current_user, db)

    is_one_time = body.is_one_time
    week = body.week
    if body.week == "once":
        settings = await get_or_create_week_settings(group_id, db)
        week = str(compute_current_week(settings))
        is_one_time = True

    entry = ScheduleEntry(
        group_id=group_id,
        day=body.day,
        time=body.time,
        week=week,
        is_one_time=is_one_time,
        class_format=body.class_format,
        items=[item.model_dump() for item in body.items],
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.put("/{group_id}/schedule/{entry_id}", response_model=ScheduleEntryOut)
async def update_schedule_entry(
    group_id: int,
    entry_id: int,
    body: ScheduleEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_admin(group_id, current_user, db)

    result = await db.execute(
        select(ScheduleEntry).where(ScheduleEntry.id == entry_id, ScheduleEntry.group_id == group_id)
    )
    entry = result.scalars().first()
    if not entry:
        raise HTTPException(status_code=404, detail="Запис не знайдено")

    if body.day is not None:
        entry.day = body.day
    if body.time is not None:
        entry.time = body.time
    if body.week is not None:
        entry.week = body.week
    if body.is_one_time is not None:
        entry.is_one_time = body.is_one_time
    if body.class_format is not None:
        entry.class_format = body.class_format
    if body.items is not None:
        entry.items = [item.model_dump() for item in body.items]

    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/{group_id}/schedule/{entry_id}", status_code=204)
async def delete_schedule_entry(
    group_id: int,
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_admin(group_id, current_user, db)

    result = await db.execute(
        select(ScheduleEntry).where(ScheduleEntry.id == entry_id, ScheduleEntry.group_id == group_id)
    )
    entry = result.scalars().first()
    if not entry:
        raise HTTPException(status_code=404, detail="Запис не знайдено")

    await db.delete(entry)
    await db.commit()


@router.put("/{group_id}/week")
async def set_current_week(
    group_id: int,
    body: SetWeekRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_admin(group_id, current_user, db)
    if body.current_week not in (1, 2):
        raise HTTPException(status_code=400, detail="current_week має бути 1 або 2")

    settings = await get_or_create_week_settings(group_id, db)
    settings.current_week = body.current_week
    settings.week_set_at = datetime.now(timezone.utc)
    await db.commit()
    return {"current_week": body.current_week}
