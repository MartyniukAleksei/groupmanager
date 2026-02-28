import enum
from datetime import datetime
from typing import List, Optional

from sqlalchemy import String, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

# Базовий клас для всіх моделей
class Base(DeclarativeBase):
    pass

# 1. Визначаємо ролі користувачів
class RoleEnum(str, enum.Enum):
    admin = "admin"       # Творець групи або головний админ
    starosta = "starosta" # Може керувати розкладом, підтверджувати запити
    editor = "editor"     # Наприклад, відповідальний за ДЗ (dz)
    user = "user"         # Звичайний учасник

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