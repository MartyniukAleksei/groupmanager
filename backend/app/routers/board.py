from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.database.database import get_db
from app.database.models import User, BoardItem, RoleEnum
from app.dependencies import get_current_user
from app.routers.schedule import get_membership, require_admin
from app.schemas import BoardItemCreate, BoardItemUpdatePosition, BoardItemOut, BoardStateResponse

router = APIRouter(prefix="/groups", tags=["Board"])


def _item_out(item: BoardItem, author: User | None) -> BoardItemOut:
    return BoardItemOut(
        id=item.id,
        item_type=item.item_type,
        content=item.content,
        color=item.color,
        pos_x=item.pos_x,
        pos_y=item.pos_y,
        z_index=item.z_index,
        rotation=item.rotation,
        author_id=item.created_by_id,
        author_name=author.name if author else None,
        author_avatar=author.avatar_url if author else None,
    )


@router.get("/{group_id}/board", response_model=BoardStateResponse)
async def get_board(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ug = await get_membership(group_id, current_user, db)
    result = await db.execute(
        select(BoardItem).where(BoardItem.group_id == group_id)
    )
    rows = result.scalars().all()

    author_ids = {r.created_by_id for r in rows if r.created_by_id}
    authors: dict[int, User] = {}
    if author_ids:
        res = await db.execute(select(User).where(User.id.in_(author_ids)))
        for u in res.scalars().all():
            authors[u.id] = u

    items = [_item_out(row, authors.get(row.created_by_id)) for row in rows]
    return BoardStateResponse(items=items, is_admin=(ug.role == RoleEnum.admin))


@router.post("/{group_id}/board", response_model=BoardItemOut, status_code=201)
async def create_board_item(
    group_id: int,
    body: BoardItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership(group_id, current_user, db)
    item = BoardItem(
        group_id=group_id,
        item_type=body.item_type,
        content=body.content,
        color=body.color,
        pos_x=body.pos_x,
        pos_y=body.pos_y,
        z_index=body.z_index,
        rotation=body.rotation,
        created_by_id=current_user.id,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return _item_out(item, current_user)


@router.patch("/{group_id}/board/{item_id}/position", response_model=BoardItemOut)
async def move_board_item(
    group_id: int,
    item_id: int,
    body: BoardItemUpdatePosition,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership(group_id, current_user, db)
    result = await db.execute(
        select(BoardItem).where(BoardItem.id == item_id, BoardItem.group_id == group_id)
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Не знайдено")

    item.pos_x = body.pos_x
    item.pos_y = body.pos_y
    if body.z_index is not None:
        item.z_index = body.z_index
    await db.commit()
    await db.refresh(item)

    author = None
    if item.created_by_id:
        res = await db.execute(select(User).where(User.id == item.created_by_id))
        author = res.scalars().first()
    return _item_out(item, author)


@router.delete("/{group_id}/board/{item_id}", status_code=204)
async def delete_board_item(
    group_id: int,
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ug = await get_membership(group_id, current_user, db)
    result = await db.execute(
        select(BoardItem).where(BoardItem.id == item_id, BoardItem.group_id == group_id)
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Не знайдено")
    if item.created_by_id != current_user.id and ug.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Недостатньо прав")
    await db.delete(item)
    await db.commit()


@router.delete("/{group_id}/board", status_code=200)
async def clear_board(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await require_admin(group_id, current_user, db)
    await db.execute(delete(BoardItem).where(BoardItem.group_id == group_id))
    await db.commit()
    return {"ok": True}
