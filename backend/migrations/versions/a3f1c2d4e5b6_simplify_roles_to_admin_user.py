"""Simplify roles to admin and user only

Revision ID: a3f1c2d4e5b6
Revises: e1a038167e11
Create Date: 2026-03-11 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "a3f1c2d4e5b6"
down_revision: Union[str, None] = "e1a038167e11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Convert starosta/editor → user before changing the enum type
    op.execute("UPDATE user_groups SET role = 'user' WHERE role IN ('starosta', 'editor')")

    # PostgreSQL: rename old enum, create new one, update column, drop old enum
    op.execute("ALTER TYPE roleenum RENAME TO roleenum_old")
    op.execute("CREATE TYPE roleenum AS ENUM ('admin', 'user')")
    op.execute(
        "ALTER TABLE user_groups "
        "ALTER COLUMN role TYPE roleenum USING role::text::roleenum"
    )
    op.execute("DROP TYPE roleenum_old")


def downgrade() -> None:
    op.execute("ALTER TYPE roleenum RENAME TO roleenum_old")
    op.execute("CREATE TYPE roleenum AS ENUM ('admin', 'starosta', 'editor', 'user')")
    op.execute(
        "ALTER TABLE user_groups "
        "ALTER COLUMN role TYPE roleenum USING role::text::roleenum"
    )
    op.execute("DROP TYPE roleenum_old")
