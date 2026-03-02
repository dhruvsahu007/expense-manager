"""Convert is_read and is_completed from Integer to Boolean

Revision ID: 002_is_read_is_completed_to_boolean
Revises: 001_add_user_categories
Create Date: 2026-03-03 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision: str = "002_is_read_is_completed_to_boolean"
down_revision: Union[str, None] = "001_add_user_categories"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # notifications.is_read: Integer -> Boolean
    op.alter_column(
        "notifications",
        "is_read",
        existing_type=sa.Integer(),
        type_=sa.Boolean(),
        existing_nullable=True,
        postgresql_using="is_read::boolean",
    )

    # savings_goals.is_completed: Integer -> Boolean
    op.alter_column(
        "savings_goals",
        "is_completed",
        existing_type=sa.Integer(),
        type_=sa.Boolean(),
        existing_nullable=True,
        postgresql_using="is_completed::boolean",
    )


def downgrade() -> None:
    # Revert savings_goals.is_completed back to Integer
    op.alter_column(
        "savings_goals",
        "is_completed",
        existing_type=sa.Boolean(),
        type_=sa.Integer(),
        existing_nullable=True,
        postgresql_using="is_completed::integer",
    )

    # Revert notifications.is_read back to Integer
    op.alter_column(
        "notifications",
        "is_read",
        existing_type=sa.Boolean(),
        type_=sa.Integer(),
        existing_nullable=True,
        postgresql_using="is_read::integer",
    )
