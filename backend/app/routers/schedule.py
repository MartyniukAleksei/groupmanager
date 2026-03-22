import asyncio
import logging
from datetime import datetime, timedelta, timezone

import requests as http_requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.database.database import get_db
from app.database.models import User, UserGroup, ScheduleEntry, GroupWeekSettings, RoleEnum
from app.dependencies import get_current_user
from app.schemas import (
    ScheduleEntryCreate, ScheduleEntryUpdate, ScheduleEntryOut,
    ScheduleResponse, SetWeekRequest, ImportKpiRequest,
)

logger = logging.getLogger(__name__)

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


KPI_DAY_MAP = {
    "Пн": "monday", "Вв": "tuesday", "Ср": "wednesday",
    "Чт": "thursday", "Пт": "friday", "Сб": "saturday",
}

KPI_TAG_MAP = {"lec": "lecture", "prac": "practice", "lab": "lab"}


def _parse_kpi_week(week_data: list) -> dict:
    """Parse one week from KPI API into {(day, time): [items]}."""
    slots: dict[tuple[str, str], list[dict]] = {}
    for day_obj in week_data:
        day = KPI_DAY_MAP.get(day_obj.get("day", ""))
        if not day:
            continue
        for pair in day_obj.get("pairs", []):
            raw_time = pair.get("time", "")
            time = raw_time[:5] if len(raw_time) >= 5 else raw_time
            tag = pair.get("tag", "")
            item = {
                "type": KPI_TAG_MAP.get(tag, "lecture"),
                "name": pair.get("name", ""),
                "teacher": (pair.get("lecturer") or {}).get("name", ""),
                "room": (pair.get("location") or {}).get("title", ""),
                "link": "",
            }
            key = (day, time)
            slots.setdefault(key, []).append(item)
    return slots


def _items_equal(items_a: list[dict], items_b: list[dict]) -> bool:
    """Compare two item lists regardless of order."""
    def sort_key(it):
        return (it["name"], it["teacher"], it["type"], it["room"])
    return sorted(items_a, key=sort_key) == sorted(items_b, key=sort_key)


def _build_entries(week1_slots: dict, week2_slots: dict) -> list[dict]:
    """Build schedule entries merging both weeks."""
    entries = []
    all_keys = set(week1_slots.keys()) | set(week2_slots.keys())

    for key in all_keys:
        day, time = key
        w1 = week1_slots.get(key)
        w2 = week2_slots.get(key)

        if w1 and w2 and _items_equal(w1, w2):
            items = w1
            week = "both"
        else:
            if w1:
                entries.append({
                    "day": day, "time": time, "week": "1",
                    "class_format": "groups" if len(w1) > 1 else "standard",
                    "items": w1,
                })
            if w2:
                entries.append({
                    "day": day, "time": time, "week": "2",
                    "class_format": "groups" if len(w2) > 1 else "standard",
                    "items": w2,
                })
            continue

        entries.append({
            "day": day, "time": time, "week": week,
            "class_format": "groups" if len(items) > 1 else "standard",
            "items": items,
        })

    return entries


@router.post("/{group_id}/schedule/import-kpi", response_model=ScheduleResponse)
async def import_kpi_schedule(
    group_id: int,
    body: ImportKpiRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_admin(group_id, current_user, db)

    kpi_url = f"https://api.campus.kpi.ua/schedule/lessons?groupId={body.kpi_group_id}"
    try:
        resp = await asyncio.to_thread(
            http_requests.get, kpi_url, timeout=10,
            headers={"User-Agent": "Mozilla/5.0"},
        )
        resp.raise_for_status()
        kpi_data = resp.json()
    except Exception as exc:
        logger.exception("KPI API fetch failed: %s", exc)
        raise HTTPException(status_code=400, detail=f"Не вдалося отримати розклад з КПІ: {exc}")

    week1_raw = kpi_data.get("scheduleFirstWeek") or []
    week2_raw = kpi_data.get("scheduleSecondWeek") or []

    if not week1_raw and not week2_raw:
        raise HTTPException(status_code=400, detail="Розклад для цієї групи порожній або не знайдений")

    week1_slots = _parse_kpi_week(week1_raw)
    week2_slots = _parse_kpi_week(week2_raw)
    new_entries = _build_entries(week1_slots, week2_slots)

    # Delete existing schedule entries
    await db.execute(
        delete(ScheduleEntry).where(ScheduleEntry.group_id == group_id)
    )

    # Create new entries
    for entry_data in new_entries:
        entry = ScheduleEntry(
            group_id=group_id,
            day=entry_data["day"],
            time=entry_data["time"],
            week=entry_data["week"],
            is_one_time=False,
            class_format=entry_data["class_format"],
            items=entry_data["items"],
        )
        db.add(entry)

    await db.commit()

    # Return schedule in standard format
    settings = await get_or_create_week_settings(group_id, db)
    current_week = compute_current_week(settings)
    result = await db.execute(
        select(ScheduleEntry).where(ScheduleEntry.group_id == group_id)
    )
    entries = result.scalars().all()
    return ScheduleResponse(entries=entries, current_week=current_week)
