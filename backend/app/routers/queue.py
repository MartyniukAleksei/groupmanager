from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.database.database import get_db
from app.database.models import User, ScheduleEntry, QueueEntry, RoleEnum
from app.dependencies import get_current_user
from app.routers.schedule import get_membership, require_admin
from app.schemas import QueueStateResponse, QueueEntryOut, JoinQueueRequest, ClearQueueRequest

router = APIRouter(prefix="/groups", tags=["Queue"])


@router.get("/{group_id}/queue", response_model=QueueStateResponse)
async def get_queue(
    group_id: int,
    subject_name: str = "",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ug = await get_membership(group_id, current_user, db)
    is_admin = ug.role == RoleEnum.admin

    # Get subjects from schedule entries
    result = await db.execute(
        select(ScheduleEntry).where(ScheduleEntry.group_id == group_id)
    )
    entries = result.scalars().all()
    subject_set = set()
    for entry in entries:
        for item in (entry.items or []):
            if isinstance(item, dict) and item.get("name"):
                subject_set.add(item["name"])
    subjects = sorted(subject_set)

    full: list[QueueEntryOut] = []
    group1: list[QueueEntryOut] = []
    group2: list[QueueEntryOut] = []
    my_queues: list[str] = []

    if subject_name:
        from app.database.models import User as UserModel
        result = await db.execute(
            select(QueueEntry, UserModel)
            .join(UserModel, QueueEntry.user_id == UserModel.id)
            .where(QueueEntry.group_id == group_id, QueueEntry.subject_name == subject_name)
            .order_by(QueueEntry.joined_at)
        )
        rows = result.all()
        for entry, user in rows:
            out = QueueEntryOut(user_id=user.id, name=user.name)
            if entry.queue_type == "full":
                full.append(out)
            elif entry.queue_type == "group1":
                group1.append(out)
            elif entry.queue_type == "group2":
                group2.append(out)
            if entry.user_id == current_user.id:
                my_queues.append(entry.queue_type)

    return QueueStateResponse(
        subjects=subjects,
        is_admin=is_admin,
        full=full,
        group1=group1,
        group2=group2,
        my_queues=my_queues,
    )


@router.post("/{group_id}/queue/join", status_code=204)
async def join_queue(
    group_id: int,
    body: JoinQueueRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership(group_id, current_user, db)

    existing = await db.execute(
        select(QueueEntry).where(
            QueueEntry.group_id == group_id,
            QueueEntry.subject_name == body.subject_name,
            QueueEntry.queue_type == body.queue_type,
            QueueEntry.user_id == current_user.id,
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="Вже в черзі")

    entry = QueueEntry(
        group_id=group_id,
        subject_name=body.subject_name,
        queue_type=body.queue_type,
        user_id=current_user.id,
    )
    db.add(entry)
    await db.commit()


@router.post("/{group_id}/queue/leave", status_code=204)
async def leave_queue(
    group_id: int,
    body: JoinQueueRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership(group_id, current_user, db)

    await db.execute(
        delete(QueueEntry).where(
            QueueEntry.group_id == group_id,
            QueueEntry.subject_name == body.subject_name,
            QueueEntry.queue_type == body.queue_type,
            QueueEntry.user_id == current_user.id,
        )
    )
    await db.commit()


@router.post("/{group_id}/queue/clear", status_code=204)
async def clear_queue(
    group_id: int,
    body: ClearQueueRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_admin(group_id, current_user, db)

    await db.execute(
        delete(QueueEntry).where(
            QueueEntry.group_id == group_id,
            QueueEntry.subject_name == body.subject_name,
            QueueEntry.queue_type == body.queue_type,
        )
    )
    await db.commit()
