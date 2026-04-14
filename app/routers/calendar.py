"""
Calendar view router — unified feed for the frontend calendar UI.

Emits {id, title, start, end, type} items covering three sources:
  - events      (meetings/calls from the events table)
  - followup    (FollowUp rows with a scheduled datetime)
  - deadline    (Deadline rows; may carry an end_datetime range)

Supports drag/drop editing via PUT /api/calendar/event/{id} which routes
the update to the correct backing model based on the payload `type`.
"""
import logging
from datetime import datetime, timedelta
from typing import Annotated, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.routers.auth import get_current_user
from app.schemas.user import UserResponse
from app.models.event import Event
from app.models.intelligence import FollowUp, Deadline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/calendar", tags=["calendar"])

CalendarItemType = Literal["event", "followup", "deadline"]


class CalendarItem(BaseModel):
    id: str  # e.g. "event-3", "followup-7", "deadline-12"
    title: str
    start: datetime
    end: datetime
    type: CalendarItemType
    all_day: bool = False
    event_id: Optional[int] = None  # link back to the parent Event for navigation


class CalendarUpdateRequest(BaseModel):
    type: CalendarItemType
    start: datetime
    end: Optional[datetime] = None


@router.get("/events", response_model=list[CalendarItem])
async def list_calendar_items(
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Return the merged calendar feed."""
    items: list[CalendarItem] = []

    events = (await db.execute(select(Event))).scalars().all()
    for ev in events:
        start = ev.datetime
        items.append(
            CalendarItem(
                id=f"event-{ev.id}",
                title=ev.title,
                start=start,
                end=start + timedelta(hours=1),
                type="event",
                event_id=ev.id,
            )
        )

    follow_ups = (await db.execute(select(FollowUp).where(FollowUp.date.is_not(None)))).scalars().all()
    for fu in follow_ups:
        start = fu.date  # stored with time component (default 09:00)
        items.append(
            CalendarItem(
                id=f"followup-{fu.id}",
                title=f"Follow-up: {fu.description[:80]}",
                start=start,
                end=start + timedelta(minutes=30),
                type="followup",
                event_id=fu.event_id,
            )
        )

    deadlines = (await db.execute(select(Deadline))).scalars().all()
    for dl in deadlines:
        start = dl.due_date
        if dl.end_datetime and dl.end_datetime > start:
            items.append(
                CalendarItem(
                    id=f"deadline-{dl.id}",
                    title=f"Deadline: {dl.description[:80]}",
                    start=start,
                    end=dl.end_datetime,
                    type="deadline",
                    event_id=dl.event_id,
                )
            )
        else:
            # All-day marker — give it end = start + 1h so the calendar still renders a tile
            items.append(
                CalendarItem(
                    id=f"deadline-{dl.id}",
                    title=f"Deadline: {dl.description[:80]}",
                    start=start,
                    end=start + timedelta(hours=1),
                    type="deadline",
                    all_day=True,
                    event_id=dl.event_id,
                )
            )

    return items


def _split_calendar_id(calendar_id: str) -> tuple[str, int]:
    try:
        kind, raw_id = calendar_id.rsplit("-", 1)
        return kind, int(raw_id)
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid calendar id: {calendar_id!r}",
        )


@router.put("/event/{calendar_id}", response_model=CalendarItem)
async def update_calendar_item(
    calendar_id: str,
    payload: CalendarUpdateRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Apply a drag/drop or resize: update the backing row, return the new item."""
    kind, row_id = _split_calendar_id(calendar_id)
    if kind != payload.type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Calendar id kind '{kind}' does not match payload.type '{payload.type}'",
        )

    if payload.type == "event":
        ev = await db.get(Event, row_id)
        if not ev:
            raise HTTPException(status_code=404, detail="Event not found")
        ev.datetime = payload.start
        await db.commit()
        await db.refresh(ev)
        end = payload.end or (payload.start + timedelta(hours=1))
        logger.info(f"Calendar update: event {row_id} → {payload.start} / {end}")
        return CalendarItem(
            id=f"event-{ev.id}", title=ev.title, start=ev.datetime, end=end,
            type="event", event_id=ev.id,
        )

    if payload.type == "followup":
        fu = await db.get(FollowUp, row_id)
        if not fu:
            raise HTTPException(status_code=404, detail="Follow-up not found")
        fu.date = payload.start
        await db.commit()
        await db.refresh(fu)
        end = payload.end or (payload.start + timedelta(minutes=30))
        logger.info(f"Calendar update: follow-up {row_id} → {payload.start} / {end}")
        return CalendarItem(
            id=f"followup-{fu.id}", title=f"Follow-up: {fu.description[:80]}",
            start=fu.date, end=end, type="followup", event_id=fu.event_id,
        )

    if payload.type == "deadline":
        dl = await db.get(Deadline, row_id)
        if not dl:
            raise HTTPException(status_code=404, detail="Deadline not found")
        dl.due_date = payload.start
        if payload.end and payload.end > payload.start:
            dl.end_datetime = payload.end
        else:
            dl.end_datetime = None
        await db.commit()
        await db.refresh(dl)
        end = dl.end_datetime or (dl.due_date + timedelta(hours=1))
        logger.info(f"Calendar update: deadline {row_id} → {dl.due_date} / {end}")
        return CalendarItem(
            id=f"deadline-{dl.id}", title=f"Deadline: {dl.description[:80]}",
            start=dl.due_date, end=end, type="deadline",
            all_day=dl.end_datetime is None, event_id=dl.event_id,
        )

    raise HTTPException(status_code=400, detail=f"Unsupported type: {payload.type}")
