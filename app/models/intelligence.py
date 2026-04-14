"""
Intelligence models for follow-ups, deadlines, and tasks.
"""
from datetime import datetime

from sqlalchemy import String, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class FollowUp(Base):
    """
    FollowUp model for tracking action items from events.

    The `date` column stores the full scheduled datetime (not just a calendar
    date) so the calendar UI can render follow-ups at their extracted time.
    """

    __tablename__ = "follow_ups"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), index=True, nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, nullable=False)

    event: Mapped["Event"] = relationship(back_populates="follow_ups")

    def __repr__(self) -> str:
        return f"<FollowUp(id={self.id}, event_id={self.event_id})>"


class Deadline(Base):
    """
    Deadline model for tracking due dates from events.

    `due_date` is the primary datetime. `end_datetime` is an optional upper
    bound when the extractor infers a range (e.g. "before the meeting" →
    [start_of_day, meeting_time]). When None, the deadline renders as a
    point-in-time / all-day marker in the calendar UI.
    """

    __tablename__ = "deadlines"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), index=True, nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    due_date: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    end_datetime: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, nullable=False)

    event: Mapped["Event"] = relationship(back_populates="deadlines")
    tasks: Mapped[list["Task"]] = relationship(
        back_populates="deadline", lazy="selectin", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Deadline(id={self.id}, due_date={self.due_date}, event_id={self.event_id})>"


class Task(Base):
    """Task model for tracking completion of deadlines."""

    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    deadline_id: Mapped[int] = mapped_column(
        ForeignKey("deadlines.id", ondelete="CASCADE"), index=True, nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, nullable=False)

    deadline: Mapped["Deadline"] = relationship(back_populates="tasks")

    def __repr__(self) -> str:
        return f"<Task(id={self.id}, status='{self.status}', deadline_id={self.deadline_id})>"
