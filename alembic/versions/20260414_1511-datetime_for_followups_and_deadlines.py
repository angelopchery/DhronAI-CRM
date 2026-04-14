"""promote follow_ups.date and deadlines.due_date to DateTime

Revision ID: datetime_followup_deadline
Revises: add_transcription_status
Create Date: 2026-04-14 15:11:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "datetime_followup_deadline"
down_revision = "add_transcription_status"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # follow_ups.date: DATE -> TIMESTAMP (keep existing midnight values)
    op.alter_column(
        "follow_ups",
        "date",
        existing_type=sa.Date(),
        type_=sa.DateTime(),
        postgresql_using="date::timestamp",
        existing_nullable=True,
    )
    # deadlines.due_date: DATE -> TIMESTAMP (existing values become midnight)
    op.alter_column(
        "deadlines",
        "due_date",
        existing_type=sa.Date(),
        type_=sa.DateTime(),
        postgresql_using="due_date::timestamp",
        existing_nullable=False,
    )
    # deadlines also gets an optional end_datetime for contextual ranges
    # (e.g., "before the meeting" → [start, end]).
    op.add_column(
        "deadlines",
        sa.Column("end_datetime", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("deadlines", "end_datetime")
    op.alter_column(
        "deadlines",
        "due_date",
        existing_type=sa.DateTime(),
        type_=sa.Date(),
        postgresql_using="due_date::date",
        existing_nullable=False,
    )
    op.alter_column(
        "follow_ups",
        "date",
        existing_type=sa.DateTime(),
        type_=sa.Date(),
        postgresql_using="date::date",
        existing_nullable=True,
    )
