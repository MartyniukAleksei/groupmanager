from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.database.database import get_db
from app.database.models import User, ScheduleEntry, HomeworkEntry, RoleEnum
from app.dependencies import get_current_user
from app.schemas import HomeworkWeekResponse, HomeworkSubjectOut, HomeworkSaveRequest
from app.routers.schedule import get_membership, require_admin, get_or_create_week_settings, compute_current_week

router = APIRouter(prefix="/groups", tags=["Homework"])


def compute_week_for_date(settings, target_date: date) -> int:
    set_at_date = settings.week_set_at.replace(tzinfo=timezone.utc).date()
    set_at_monday = set_at_date - timedelta(days=set_at_date.weekday())
    target_monday = target_date - timedelta(days=target_date.weekday())
    weeks_elapsed = (target_monday - set_at_monday).days // 7
    return ((settings.current_week - 1 + weeks_elapsed) % 2) + 1


@router.get("/{group_id}/homework", response_model=HomeworkWeekResponse)
async def get_homework(
    group_id: int,
    week_start: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ug = await get_membership(group_id, current_user, db)
    is_admin = ug.role == RoleEnum.admin

    try:
        monday_date = date.fromisoformat(week_start)
    except ValueError:
        raise HTTPException(status_code=400, detail="Невірний формат week_start, очікується YYYY-MM-DD")

    settings = await get_or_create_week_settings(group_id, db)
    week_type = compute_week_for_date(settings, monday_date)

    result = await db.execute(
        select(ScheduleEntry).where(
            ScheduleEntry.group_id == group_id,
            ScheduleEntry.week.in_(["both", str(week_type)]),
        )
    )
    schedule_entries = result.scalars().all()

    seen = set()
    subjects = []
    for se in schedule_entries:
        for item in se.items:
            name = item.get("name", "")
            key = (se.day, name)
            if key not in seen:
                seen.add(key)
                subjects.append({"day": se.day, "subject_name": name, "schedule_entry_id": se.id})

    result2 = await db.execute(
        select(HomeworkEntry).where(
            HomeworkEntry.group_id == group_id,
            HomeworkEntry.week_start == monday_date,
        )
    )
    hw_rows = result2.scalars().all()
    hw_map = {(h.day, h.subject_name): h.text for h in hw_rows}

    entries = [
        HomeworkSubjectOut(
            schedule_entry_id=s["schedule_entry_id"],
            subject_name=s["subject_name"],
            day=s["day"],
            text=hw_map.get((s["day"], s["subject_name"]), ""),
        )
        for s in subjects
    ]

    return HomeworkWeekResponse(
        week_start=week_start,
        week_type=week_type,
        is_admin=is_admin,
        entries=entries,
    )


@router.put("/{group_id}/homework")
async def save_homework(
    group_id: int,
    body: HomeworkSaveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_admin(group_id, current_user, db)

    try:
        monday_date = date.fromisoformat(body.week_start)
    except ValueError:
        raise HTTPException(status_code=400, detail="Невірний формат week_start")

    if body.text == "":
        await db.execute(
            delete(HomeworkEntry).where(
                HomeworkEntry.group_id == group_id,
                HomeworkEntry.week_start == monday_date,
                HomeworkEntry.day == body.day,
                HomeworkEntry.subject_name == body.subject_name,
            )
        )
        await db.commit()
        return {"ok": True}

    stmt = pg_insert(HomeworkEntry).values(
        group_id=group_id,
        schedule_entry_id=body.schedule_entry_id,
        subject_name=body.subject_name,
        day=body.day,
        week_start=monday_date,
        text=body.text,
        updated_at=datetime.now(timezone.utc),
        updated_by_id=current_user.id,
    ).on_conflict_do_update(
        index_elements=["group_id", "week_start", "day", "subject_name"],
        set_={
            "text": body.text,
            "updated_at": datetime.now(timezone.utc),
            "updated_by_id": current_user.id,
            "schedule_entry_id": body.schedule_entry_id,
        },
    )
    await db.execute(stmt)
    await db.commit()
    return {"ok": True}
