from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.database.database import get_db
from app.database.models import User, UserGroup, DeadlineItem, RoleEnum
from app.dependencies import get_current_user
from app.routers.schedule import get_membership, require_admin
from app.schemas import (
    DeadlineItemCreate, DeadlineItemUpdate, DeadlineItemOut, DeadlinesResponse
)

router = APIRouter(prefix="/groups", tags=["Deadlines"])


@router.get("/{group_id}/deadlines", response_model=DeadlinesResponse)
async def get_deadlines(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ug = await get_membership(group_id, current_user, db)
    today = date.today()
    grace_cutoff = today - timedelta(days=2)

    # Fetch deadline rows for this group
    result = await db.execute(
        select(DeadlineItem).where(DeadlineItem.group_id == group_id)
    )
    rows = result.scalars().all()

    # Fetch authors in one query
    author_ids = {r.created_by_id for r in rows if r.created_by_id}
    authors: dict[int, User] = {}
    if author_ids:
        res = await db.execute(select(User).where(User.id.in_(author_ids)))
        for u in res.scalars().all():
            authors[u.id] = u

    items: list[DeadlineItemOut] = []
    for row in rows:
        # Skip items past the 2-day grace period
        if row.deadline_date < grace_cutoff:
            continue
        status = row.status
        if row.deadline_date < today:
            status = "expired"
        author = authors.get(row.created_by_id) if row.created_by_id else None
        items.append(DeadlineItemOut(
            id=row.id,
            title=row.title,
            status=status,
            deadline_date=row.deadline_date.isoformat(),
            author_name=author.name if author else None,
            author_avatar=author.avatar_url if author else None,
        ))

    # Synthetic birthday cards: members with birthday in next 3 days
    members_res = await db.execute(
        select(UserGroup).where(UserGroup.group_id == group_id)
    )
    member_ugs = members_res.scalars().all()
    member_user_ids = [m.user_id for m in member_ugs]

    if member_user_ids:
        users_res = await db.execute(
            select(User).where(User.id.in_(member_user_ids), User.birthday.isnot(None))
        )
        for member in users_res.scalars().all():
            bday = member.birthday
            # Compute this-year birthday
            try:
                bday_this_year = bday.replace(year=today.year)
            except ValueError:
                # Feb 29 in non-leap year → skip
                continue
            # If already passed, check next year
            if bday_this_year < today:
                try:
                    bday_this_year = bday.replace(year=today.year + 1)
                except ValueError:
                    continue
            # Show if within 3 days
            if today <= bday_this_year <= today + timedelta(days=3):
                items.append(DeadlineItemOut(
                    id=None,
                    title=f"День народження — {member.name}",
                    status="birthday",
                    deadline_date=bday_this_year.isoformat(),
                    author_name=member.name,
                    author_avatar=member.avatar_url,
                ))

    items.sort(key=lambda x: x.deadline_date)
    return DeadlinesResponse(items=items, is_admin=(ug.role == RoleEnum.admin))


@router.post("/{group_id}/deadlines", response_model=DeadlineItemOut, status_code=201)
async def create_deadline(
    group_id: int,
    body: DeadlineItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_admin(group_id, current_user, db)
    if body.status not in ("urgent", "planned", "reminder"):
        raise HTTPException(status_code=422, detail="Невірний статус")
    try:
        dl_date = date.fromisoformat(body.deadline_date)
    except ValueError:
        raise HTTPException(status_code=422, detail="Невірна дата")

    item = DeadlineItem(
        group_id=group_id,
        title=body.title,
        status=body.status,
        deadline_date=dl_date,
        created_by_id=current_user.id,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    today = date.today()
    status = item.status if item.deadline_date >= today else "expired"
    return DeadlineItemOut(
        id=item.id,
        title=item.title,
        status=status,
        deadline_date=item.deadline_date.isoformat(),
        author_name=current_user.name,
        author_avatar=current_user.avatar_url,
    )


@router.patch("/{group_id}/deadlines/{item_id}", response_model=DeadlineItemOut)
async def update_deadline(
    group_id: int,
    item_id: int,
    body: DeadlineItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_admin(group_id, current_user, db)
    result = await db.execute(
        select(DeadlineItem).where(DeadlineItem.id == item_id, DeadlineItem.group_id == group_id)
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Не знайдено")

    if body.title is not None:
        item.title = body.title
    if body.status is not None:
        if body.status not in ("urgent", "planned", "reminder"):
            raise HTTPException(status_code=422, detail="Невірний статус")
        item.status = body.status
    if body.deadline_date is not None:
        try:
            item.deadline_date = date.fromisoformat(body.deadline_date)
        except ValueError:
            raise HTTPException(status_code=422, detail="Невірна дата")

    await db.commit()
    await db.refresh(item)

    author = None
    if item.created_by_id:
        res = await db.execute(select(User).where(User.id == item.created_by_id))
        author = res.scalars().first()

    today = date.today()
    status = item.status if item.deadline_date >= today else "expired"
    return DeadlineItemOut(
        id=item.id,
        title=item.title,
        status=status,
        deadline_date=item.deadline_date.isoformat(),
        author_name=author.name if author else None,
        author_avatar=author.avatar_url if author else None,
    )


@router.delete("/{group_id}/deadlines/{item_id}", status_code=204)
async def delete_deadline(
    group_id: int,
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_admin(group_id, current_user, db)
    result = await db.execute(
        select(DeadlineItem).where(DeadlineItem.id == item_id, DeadlineItem.group_id == group_id)
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Не знайдено")
    await db.delete(item)
    await db.commit()
