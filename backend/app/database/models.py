import enum
from datetime import datetime
from datetime import date as date_type
from typing import List, Optional

from sqlalchemy import String, ForeignKey, DateTime, Enum as SQLEnum, Boolean, JSON, Integer, Date, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

# Базовий клас для всіх моделей
class Base(DeclarativeBase):
    pass

# 1. Визначаємо ролі користувачів
class RoleEnum(str, enum.Enum):
    admin = "admin"  # Творець групи або головний адмін
    user = "user"    # Звичайний учасник

# 2. Асоціативна таблиця (Зв'язок Багато-до-Багатьох)
# Ми використовуємо повноцінну модель замість простої Table, 
# тому що нам потрібно зберігати додаткові дані (роль та дату вступу).
class UserGroup(Base):
    __tablename__ = "user_groups"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True)
    
    # Яку роль має конкретний юзер у цій конкретній групі
    role: Mapped[RoleEnum] = mapped_column(SQLEnum(RoleEnum), default=RoleEnum.user)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Зв'язки для зручної навігації через ORM
    user: Mapped["User"] = relationship(back_populates="group_associations")
    group: Mapped["Group"] = relationship(back_populates="user_associations")

# 3. Модель Користувача
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    google_id: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True) # ID від Google
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    avatar_url: Mapped[Optional[str]] = mapped_column(String)
    bio: Mapped[Optional[str]] = mapped_column(String) # Короткий опис "про себе"
    telegram: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    birthday: Mapped[Optional[date_type]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Зв'язок з групами. cascade="all, delete-orphan" означає, 
    # що якщо видалити юзера, його записи в user_groups теж видаляться.
    group_associations: Mapped[List["UserGroup"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

# 4. Модель Групи
class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String)
    join_code: Mapped[str] = mapped_column(String, unique=True, index=True) # Унікальний код (напр. "A7X9-B2")
    description: Mapped[Optional[str]] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Зв'язок з користувачами
    user_associations: Mapped[List["UserGroup"]] = relationship(
        back_populates="group", cascade="all, delete-orphan"
    )


class ScheduleEntry(Base):
    __tablename__ = "schedule_entries"
    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), index=True)
    day: Mapped[str] = mapped_column(String)
    time: Mapped[str] = mapped_column(String)
    week: Mapped[str] = mapped_column(String)          # 'both' | '1' | '2'
    is_one_time: Mapped[bool] = mapped_column(Boolean, default=False)
    class_format: Mapped[str] = mapped_column(String, default="standard")
    items: Mapped[list] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class GroupWeekSettings(Base):
    __tablename__ = "group_week_settings"
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True)
    current_week: Mapped[int] = mapped_column(Integer, default=1)
    week_set_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"
    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), index=True)
    schedule_entry_id: Mapped[Optional[int]] = mapped_column(ForeignKey("schedule_entries.id", ondelete="SET NULL"), nullable=True)
    subject_name: Mapped[str] = mapped_column(String)
    items: Mapped[list] = mapped_column(JSON)
    time: Mapped[str] = mapped_column(String)
    date: Mapped[date_type] = mapped_column(Date, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("group_id", "date", "time", "schedule_entry_id"),)


class AttendanceVote(Base):
    __tablename__ = "attendance_votes"
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("attendance_sessions.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    vote_type: Mapped[str] = mapped_column(String)
    voted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("session_id", "user_id"),)


class HomeworkEntry(Base):
    __tablename__ = "homework_entries"
    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), index=True)
    schedule_entry_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("schedule_entries.id", ondelete="SET NULL"), nullable=True, index=True
    )
    subject_name: Mapped[str] = mapped_column(String)
    day: Mapped[str] = mapped_column(String)
    week_start: Mapped[date_type] = mapped_column(Date, index=True)
    text: Mapped[str] = mapped_column(String, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    __table_args__ = (UniqueConstraint("group_id", "week_start", "day", "subject_name"),)


class MaterialFolder(Base):
    __tablename__ = "material_folders"
    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), index=True)
    subject_name: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    created_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    links: Mapped[List["MaterialLink"]] = relationship(
        back_populates="folder", cascade="all, delete-orphan", order_by="MaterialLink.id"
    )


class MaterialLink(Base):
    __tablename__ = "material_links"
    id: Mapped[int] = mapped_column(primary_key=True)
    folder_id: Mapped[int] = mapped_column(ForeignKey("material_folders.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String)
    url: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    created_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    folder: Mapped["MaterialFolder"] = relationship(back_populates="links")


class QueueEntry(Base):
    __tablename__ = "queue_entries"
    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), index=True)
    subject_name: Mapped[str] = mapped_column(String)
    queue_type: Mapped[str] = mapped_column(String)  # 'full' | 'group1' | 'group2'
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("group_id", "subject_name", "queue_type", "user_id"),)


class UsefulLink(Base):
    __tablename__ = "useful_links"
    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(100))
    url: Mapped[str] = mapped_column(String(500))
    emoji: Mapped[str] = mapped_column(String(10))
    created_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class TopicProject(Base):
    __tablename__ = "topic_projects"
    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), index=True)
    subject_name: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    created_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    entries: Mapped[List["TopicEntry"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )


class TopicEntry(Base):
    __tablename__ = "topic_entries"
    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("topic_projects.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    topic_text: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    project: Mapped["TopicProject"] = relationship(back_populates="entries")
    __table_args__ = (UniqueConstraint("group_id", "project_id", "user_id"),)


class DeadlineItem(Base):
    __tablename__ = "deadline_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(20))   # 'urgent' | 'planned' | 'reminder'
    deadline_date: Mapped[date_type] = mapped_column(Date)
    created_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class BoardItem(Base):
    __tablename__ = "board_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), index=True)
    item_type: Mapped[str] = mapped_column(String(20))   # 'note' | 'photo' | 'pin' | 'draw'
    content: Mapped[Optional[str]] = mapped_column(String)
    color: Mapped[Optional[str]] = mapped_column(String(20))
    pos_x: Mapped[float] = mapped_column(default=100.0)
    pos_y: Mapped[float] = mapped_column(default=100.0)
    z_index: Mapped[int] = mapped_column(Integer, default=1)
    rotation: Mapped[float] = mapped_column(default=0.0)
    created_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)