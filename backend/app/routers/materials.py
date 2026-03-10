from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database.database import get_db
from app.database.models import User, ScheduleEntry, MaterialFolder, MaterialLink, RoleEnum
from app.dependencies import get_current_user
from app.schemas import (
    MaterialsResponse, MaterialFolderOut, MaterialLinkOut,
    CreateFolderRequest, CreateLinkRequest
)
from app.routers.schedule import get_membership, require_admin

router = APIRouter(prefix="/groups", tags=["Materials"])


@router.get("/{group_id}/materials", response_model=MaterialsResponse)
async def get_materials(
    group_id: int,
    subject_name: str = "",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ug = await get_membership(group_id, current_user, db)
    is_admin = ug.role == RoleEnum.admin

    result = await db.execute(
        select(ScheduleEntry).where(ScheduleEntry.group_id == group_id)
    )
    entries = result.scalars().all()
    subjects_set = set()
    for entry in entries:
        for item in entry.items:
            if isinstance(item, dict) and item.get("name"):
                subjects_set.add(item["name"])
    subjects = sorted(subjects_set)

    folders = []
    if subject_name:
        result = await db.execute(
            select(MaterialFolder)
            .where(MaterialFolder.group_id == group_id, MaterialFolder.subject_name == subject_name)
            .options(selectinload(MaterialFolder.links))
        )
        folders = result.scalars().all()

    return MaterialsResponse(subjects=subjects, folders=folders, is_admin=is_admin)


@router.post("/{group_id}/materials/folders", response_model=MaterialFolderOut, status_code=201)
async def create_folder(
    group_id: int,
    body: CreateFolderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_admin(group_id, current_user, db)
    folder = MaterialFolder(
        group_id=group_id,
        subject_name=body.subject_name,
        name=body.name,
        created_by_id=current_user.id,
    )
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    # links will be empty list after refresh — load them
    await db.execute(select(MaterialFolder).where(MaterialFolder.id == folder.id).options(selectinload(MaterialFolder.links)))
    return folder


@router.delete("/{group_id}/materials/folders/{folder_id}", status_code=204)
async def delete_folder(
    group_id: int,
    folder_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_admin(group_id, current_user, db)
    result = await db.execute(
        select(MaterialFolder).where(MaterialFolder.id == folder_id)
    )
    folder = result.scalars().first()
    if not folder or folder.group_id != group_id:
        raise HTTPException(status_code=404, detail="Папку не знайдено")
    await db.delete(folder)
    await db.commit()


@router.post("/{group_id}/materials/folders/{folder_id}/links", response_model=MaterialLinkOut, status_code=201)
async def create_link(
    group_id: int,
    folder_id: int,
    body: CreateLinkRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_admin(group_id, current_user, db)
    result = await db.execute(
        select(MaterialFolder).where(MaterialFolder.id == folder_id)
    )
    folder = result.scalars().first()
    if not folder or folder.group_id != group_id:
        raise HTTPException(status_code=404, detail="Папку не знайдено")
    link = MaterialLink(
        folder_id=folder_id,
        title=body.title,
        url=body.url,
        created_by_id=current_user.id,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return link


@router.delete("/{group_id}/materials/folders/{folder_id}/links/{link_id}", status_code=204)
async def delete_link(
    group_id: int,
    folder_id: int,
    link_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_admin(group_id, current_user, db)
    result = await db.execute(
        select(MaterialLink)
        .where(MaterialLink.id == link_id, MaterialLink.folder_id == folder_id)
        .options(selectinload(MaterialLink.folder))
    )
    link = result.scalars().first()
    if not link or link.folder.group_id != group_id:
        raise HTTPException(status_code=404, detail="Посилання не знайдено")
    await db.delete(link)
    await db.commit()
