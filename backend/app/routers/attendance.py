from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.database.database import get_db
from app.database.models import User, UserGroup, ScheduleEntry, GroupWeekSettings, AttendanceSession, AttendanceVote
from app.dependencies import get_current_user
from app.schemas import AttendanceDayResponse, AttendanceSessionOut, AttendanceVoterOut, CastVoteRequest

router = APIRouter(prefix="/groups", tags=["Attendance"])

DAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']


def compute_week_for_date(settings: GroupWeekSettings, target_date: date) -> int:
    set_at = settings.week_set_at.date()
    days_elapsed = (target_date - set_at).days
    weeks_elapsed = days_elapsed // 7
    return ((settings.current_week - 1 + weeks_elapsed) % 2) + 1


async def get_membership(group_id: int, user: User, db: AsyncSession) -> UserGroup:
    result = await db.execute(
        select(UserGroup).where(UserGroup.group_id == group_id, UserGroup.user_id == user.id)
    )
    ug = result.scalars().first()
    if not ug:
        raise HTTPException(status_code=403, detail="Не є учасником групи")
    return ug


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


def build_session_out(session: AttendanceSession, votes: list[AttendanceVote], users_map: dict, current_user_id: int) -> AttendanceSessionOut:
    online, offline, absent = [], [], []
    user_vote = None
    for vote in votes:
        if vote.session_id != session.id:
            continue
        u = users_map.get(vote.user_id)
        if not u:
            continue
        voter = AttendanceVoterOut(id=u.id, name=u.name)
        if vote.vote_type == 'online':
            online.append(voter)
        elif vote.vote_type == 'offline':
            offline.append(voter)
        elif vote.vote_type == 'absent':
            absent.append(voter)
        if vote.user_id == current_user_id:
            user_vote = vote.vote_type
    return AttendanceSessionOut(
        id=session.id,
        subject_name=session.subject_name,
        items=session.items,
        time=session.time,
        date=session.date.isoformat(),
        user_vote=user_vote,
        online=online,
        offline=offline,
        absent=absent,
    )


@router.get("/{group_id}/attendance", response_model=AttendanceDayResponse)
async def get_attendance(
    group_id: int,
    date_str: str = Query(..., alias="date"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership(group_id, current_user, db)

    try:
        target_date = date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Невірний формат дати. Використовуйте YYYY-MM-DD")

    can_vote = target_date <= date.today()
    day_name = DAY_NAMES[target_date.weekday()]

    settings = await get_or_create_week_settings(group_id, db)
    week_num = compute_week_for_date(settings, target_date)

    # Get schedule entries for this day and week
    result = await db.execute(
        select(ScheduleEntry).where(
            ScheduleEntry.group_id == group_id,
            ScheduleEntry.day == day_name,
            ScheduleEntry.week.in_(['both', str(week_num)])
        )
    )
    entries = result.scalars().all()

    # Auto-create sessions only for today and past dates
    sessions = []
    if can_vote:
        for entry in entries:
            subject_name = entry.items[0]['name'] if entry.items else ''
            # Try to find existing session
            res = await db.execute(
                select(AttendanceSession).where(
                    AttendanceSession.group_id == group_id,
                    AttendanceSession.date == target_date,
                    AttendanceSession.schedule_entry_id == entry.id,
                )
            )
            session = res.scalars().first()
            if not session:
                session = AttendanceSession(
                    group_id=group_id,
                    schedule_entry_id=entry.id,
                    subject_name=subject_name,
                    items=entry.items,
                    time=entry.time,
                    date=target_date,
                )
                db.add(session)
                await db.flush()
            sessions.append(session)
        await db.commit()
    else:
        # For future dates, just show what schedule says (no sessions created)
        for entry in entries:
            subject_name = entry.items[0]['name'] if entry.items else ''
            res = await db.execute(
                select(AttendanceSession).where(
                    AttendanceSession.group_id == group_id,
                    AttendanceSession.date == target_date,
                    AttendanceSession.schedule_entry_id == entry.id,
                )
            )
            session = res.scalars().first()
            if session:
                sessions.append(session)
            else:
                # Return a fake session-like object for display (no votes possible)
                sessions.append(AttendanceSession(
                    id=-entry.id,
                    group_id=group_id,
                    schedule_entry_id=entry.id,
                    subject_name=subject_name,
                    items=entry.items,
                    time=entry.time,
                    date=target_date,
                ))

    if not sessions:
        return AttendanceDayResponse(sessions=[], can_vote=can_vote)

    # Get votes for all real sessions (id > 0)
    real_session_ids = [s.id for s in sessions if s.id and s.id > 0]
    votes = []
    if real_session_ids:
        votes_res = await db.execute(
            select(AttendanceVote).where(AttendanceVote.session_id.in_(real_session_ids))
        )
        votes = votes_res.scalars().all()

    # Get users for all votes
    user_ids = list({v.user_id for v in votes})
    users_map = {}
    if user_ids:
        users_res = await db.execute(select(User).where(User.id.in_(user_ids)))
        for u in users_res.scalars().all():
            users_map[u.id] = u

    session_outs = [
        build_session_out(s, votes, users_map, current_user.id)
        for s in sessions
    ]

    return AttendanceDayResponse(sessions=session_outs, can_vote=can_vote)


@router.post("/{group_id}/attendance/{session_id}/vote", response_model=AttendanceSessionOut)
async def cast_vote(
    group_id: int,
    session_id: int,
    body: CastVoteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_membership(group_id, current_user, db)

    res = await db.execute(
        select(AttendanceSession).where(
            AttendanceSession.id == session_id,
            AttendanceSession.group_id == group_id,
        )
    )
    session = res.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Сесію не знайдено")

    if session.date > date.today():
        raise HTTPException(status_code=403, detail="Не можна голосувати за майбутні заняття")

    if body.vote_type is None:
        # Delete vote if exists
        res = await db.execute(
            select(AttendanceVote).where(
                AttendanceVote.session_id == session_id,
                AttendanceVote.user_id == current_user.id,
            )
        )
        existing = res.scalars().first()
        if existing:
            await db.delete(existing)
            await db.commit()
    else:
        if body.vote_type not in ('online', 'offline', 'absent'):
            raise HTTPException(status_code=400, detail="Невірний тип голосу")
        # Upsert
        stmt = pg_insert(AttendanceVote).values(
            session_id=session_id,
            user_id=current_user.id,
            vote_type=body.vote_type,
            voted_at=datetime.now(timezone.utc),
        ).on_conflict_do_update(
            index_elements=['session_id', 'user_id'],
            set_={'vote_type': body.vote_type, 'voted_at': datetime.now(timezone.utc)},
        )
        await db.execute(stmt)
        await db.commit()

    # Reload and return updated session
    votes_res = await db.execute(
        select(AttendanceVote).where(AttendanceVote.session_id == session_id)
    )
    votes = votes_res.scalars().all()

    user_ids = list({v.user_id for v in votes})
    users_map = {}
    if user_ids:
        users_res = await db.execute(select(User).where(User.id.in_(user_ids)))
        for u in users_res.scalars().all():
            users_map[u.id] = u

    return build_session_out(session, votes, users_map, current_user.id)
