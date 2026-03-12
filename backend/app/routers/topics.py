from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.database.database import get_db
from app.database.models import User, ScheduleEntry, TopicProject, TopicEntry
from app.dependencies import get_current_user
from app.schemas import TopicProjectCreate, TopicProjectOut, TopicEntryCreate, TopicEntryOut, TopicUserOut
from app.routers.schedule import get_membership, require_admin

router = APIRouter(prefix="/groups", tags=["Topics"])


@router.get("/{group_id}/topics/subjects")
async def get_subjects(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership(group_id, current_user, db)
    result = await db.execute(
        select(ScheduleEntry).where(ScheduleEntry.group_id == group_id)
    )
    entries = result.scalars().all()
    subjects = set()
    for entry in entries:
        for item in entry.items:
            name = item.get("name", "").strip()
            if name:
                subjects.add(name)
    return sorted(subjects)


@router.get("/{group_id}/topics/projects", response_model=list[TopicProjectOut])
async def get_projects(
    group_id: int,
    subject_name: str = "",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership(group_id, current_user, db)
    query = select(TopicProject).where(TopicProject.group_id == group_id)
    if subject_name:
        query = query.where(TopicProject.subject_name == subject_name)
    result = await db.execute(query.order_by(TopicProject.created_at))
    return result.scalars().all()


@router.post("/{group_id}/topics/projects", response_model=TopicProjectOut)
async def create_project(
    group_id: int,
    body: TopicProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_admin(group_id, current_user, db)
    project = TopicProject(
        group_id=group_id,
        subject_name=body.subject_name,
        name=body.name,
        created_by_id=current_user.id,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{group_id}/topics/projects/{project_id}")
async def delete_project(
    group_id: int,
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_admin(group_id, current_user, db)
    result = await db.execute(
        select(TopicProject).where(TopicProject.id == project_id, TopicProject.group_id == group_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не знайдено")
    await db.delete(project)
    await db.commit()
    return {"ok": True}


@router.delete("/{group_id}/topics/projects/{project_id}/entries")
async def clear_project_entries(
    group_id: int,
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_admin(group_id, current_user, db)
    result = await db.execute(
        select(TopicProject).where(TopicProject.id == project_id, TopicProject.group_id == group_id)
    )
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Проект не знайдено")
    await db.execute(
        delete(TopicEntry).where(TopicEntry.project_id == project_id, TopicEntry.group_id == group_id)
    )
    await db.commit()
    return {"ok": True}


@router.get("/{group_id}/topics/entries", response_model=list[TopicEntryOut])
async def get_entries(
    group_id: int,
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership(group_id, current_user, db)
    result = await db.execute(
        select(TopicEntry, User)
        .join(User, TopicEntry.user_id == User.id)
        .where(TopicEntry.project_id == project_id, TopicEntry.group_id == group_id)
        .order_by(TopicEntry.created_at)
    )
    rows = result.all()
    out = []
    for entry, user in rows:
        out.append(TopicEntryOut(
            id=entry.id,
            project_id=entry.project_id,
            topic_text=entry.topic_text,
            created_at=entry.created_at,
            user=TopicUserOut(id=user.id, name=user.name, avatar_url=user.avatar_url),
        ))
    return out


@router.post("/{group_id}/topics/entries", response_model=TopicEntryOut)
async def create_entry(
    group_id: int,
    body: TopicEntryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership(group_id, current_user, db)
    # Перевірка чи проект існує та належить групі
    proj_result = await db.execute(
        select(TopicProject).where(TopicProject.id == body.project_id, TopicProject.group_id == group_id)
    )
    if not proj_result.scalars().first():
        raise HTTPException(status_code=404, detail="Проект не знайдено")
    # Перевірка унікальності
    existing = await db.execute(
        select(TopicEntry).where(
            TopicEntry.project_id == body.project_id,
            TopicEntry.group_id == group_id,
            TopicEntry.user_id == current_user.id,
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="Ви вже забронювали тему для цього проекту")
    entry = TopicEntry(
        group_id=group_id,
        project_id=body.project_id,
        user_id=current_user.id,
        topic_text=body.topic_text,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return TopicEntryOut(
        id=entry.id,
        project_id=entry.project_id,
        topic_text=entry.topic_text,
        created_at=entry.created_at,
        user=TopicUserOut(id=current_user.id, name=current_user.name, avatar_url=current_user.avatar_url),
    )


@router.delete("/{group_id}/topics/entries/{entry_id}")
async def delete_entry(
    group_id: int,
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ug = await get_membership(group_id, current_user, db)
    result = await db.execute(
        select(TopicEntry).where(TopicEntry.id == entry_id, TopicEntry.group_id == group_id)
    )
    entry = result.scalars().first()
    if not entry:
        raise HTTPException(status_code=404, detail="Запис не знайдено")
    from app.database.models import RoleEnum
    if entry.user_id != current_user.id and ug.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Недостатньо прав")
    await db.delete(entry)
    await db.commit()
    return {"ok": True}
