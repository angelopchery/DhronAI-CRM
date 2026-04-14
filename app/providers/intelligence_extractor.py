"""
Intelligence extraction: pulls follow-ups and deadlines out of a transcript.

Date parsing uses `dateparser` first (handles "tomorrow at 3:30", "next
friday", "15 jan", "in 2 weeks" out of the box) with the original regex
keyword paths as a fallback. Extraction is anchored on `event_datetime`
so relative phrases resolve against the meeting itself, not the moment
the transcript finished processing.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import datetime, time, timedelta
from typing import List, Optional, Tuple

try:
    import dateparser
except ImportError:  # pragma: no cover
    dateparser = None

logger = logging.getLogger(__name__)


DEFAULT_FOLLOWUP_TIME = time(9, 0)  # 09:00 local when only a date is parsed
DEFAULT_DEADLINE_TIME = time(17, 0)  # 17:00 local for naked deadline dates


@dataclass
class ExtractedFollowUp:
    description: str
    date: Optional[datetime] = None


@dataclass
class ExtractedDeadline:
    description: str
    due_date: datetime
    end_datetime: Optional[datetime] = None  # set for "before X" ranges


class IntelligenceExtractor:
    """Extract follow-ups and deadlines from transcript text."""

    FOLLOW_UP_KEYWORDS = [
        "follow up", "follow-up", "followup", "check back", "get back to",
        "reach out", "contact", "discuss", "schedule", "set up", "arrange",
        "plan", "review", "meeting", "call",
    ]

    DEADLINE_KEYWORDS = [
        "deadline", "due date", "submit by", "complete by", "finish by",
        "target date", "delivery date", "expected by", "needed by",
        "required by", "before", "by the end of", "no later than",
    ]

    # Patterns preserved as a dateparser fallback for tricky phrasings.
    DATE_PATTERNS = [
        r"(?:by|on|before|after)?\s*(?:the\s+)?(\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)",
        r"(?:by|on|before|after)?\s*(?:the\s+)?((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?)",
        r"(?:by|on|before|after)?\s+(tomorrow|today|next\s+(?:week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday))",
        r"in\s+(\d+)\s+(day|days|week|weeks|month|months)",
        r"(?:by|on|before)?\s+(?:the\s+)?end\s+of\s+(this\s+)?(week|month|quarter|year)",
        r"(?:by|on|before|after)?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})",
    ]

    def __init__(self):
        self.date_regexes = [re.compile(p, re.IGNORECASE) for p in self.DATE_PATTERNS]
        if dateparser is None:
            logger.warning("dateparser not installed — falling back to regex-only date parsing")

    # ------------------------------------------------------------------ public

    def extract_from_transcript(
        self,
        transcript: str,
        event_datetime: Optional[datetime] = None,
    ) -> Tuple[List[ExtractedFollowUp], List[ExtractedDeadline]]:
        """
        Returns (follow_ups, deadlines) extracted from `transcript`.

        `event_datetime` is the meeting's own scheduled time; it anchors
        relative dates ("tomorrow") and grounds "before the meeting" ranges.
        """
        logger.info(f"Intelligence extraction running (transcript_len={len(transcript)}, anchor={event_datetime})")
        follow_ups = self._extract_follow_ups(transcript, event_datetime)
        deadlines = self._extract_deadlines(transcript, event_datetime)
        logger.info(f"Intelligence extracted: {len(follow_ups)} follow-ups, {len(deadlines)} deadlines")
        return follow_ups, deadlines

    # ------------------------------------------------------------------ follow-ups

    def _extract_follow_ups(
        self, transcript: str, event_datetime: Optional[datetime]
    ) -> List[ExtractedFollowUp]:
        out: List[ExtractedFollowUp] = []
        for sentence in self._split_into_sentences(transcript):
            if not self._contains_keywords(sentence, self.FOLLOW_UP_KEYWORDS):
                continue
            description = self._clean_description(sentence)
            if not description:
                continue
            parsed = self._parse_datetime(sentence, event_datetime)
            # Follow-ups MUST carry a datetime; default to 09:00 on the parsed
            # date when only a calendar date was recognised.
            if parsed and parsed.time() == time(0, 0):
                parsed = datetime.combine(parsed.date(), DEFAULT_FOLLOWUP_TIME)
            out.append(ExtractedFollowUp(description=description, date=parsed))
            logger.info(f"follow-up  | '{description[:80]}' | date={parsed}")
        return self._deduplicate_follow_ups(out)

    # ------------------------------------------------------------------ deadlines

    def _extract_deadlines(
        self, transcript: str, event_datetime: Optional[datetime]
    ) -> List[ExtractedDeadline]:
        out: List[ExtractedDeadline] = []
        for sentence in self._split_into_sentences(transcript):
            if not self._contains_keywords(sentence, self.DEADLINE_KEYWORDS):
                continue
            description = self._clean_description(sentence)
            if not description:
                continue

            # Contextual: "before the meeting" + known event datetime = range.
            context_range = self._contextual_range(sentence, event_datetime)
            if context_range:
                start, end = context_range
                logger.info(
                    f"deadline   | '{description[:80]}' | range={start} → {end} (contextual: before the meeting)"
                )
                out.append(ExtractedDeadline(description=description, due_date=start, end_datetime=end))
                continue

            parsed = self._parse_datetime(sentence, event_datetime)
            if not parsed:
                logger.info(f"deadline   | '{description[:80]}' | SKIPPED (no date parsed)")
                continue
            if parsed.time() == time(0, 0):
                parsed = datetime.combine(parsed.date(), DEFAULT_DEADLINE_TIME)
            logger.info(f"deadline   | '{description[:80]}' | due={parsed}")
            out.append(ExtractedDeadline(description=description, due_date=parsed))
        return self._deduplicate_deadlines(out)

    # ------------------------------------------------------------------ context

    def _contextual_range(
        self, sentence: str, event_datetime: Optional[datetime]
    ) -> Optional[Tuple[datetime, datetime]]:
        """
        Handle "before the meeting" and its variants. Returns (start, end)
        where end is the meeting datetime and start is the prior midnight.
        """
        if not event_datetime:
            return None
        lowered = sentence.lower()
        triggers = ("before the meeting", "before our meeting", "before the call", "prior to the meeting")
        if not any(t in lowered for t in triggers):
            return None
        end = event_datetime
        start = datetime.combine(end.date(), time(0, 0))
        if start >= end:  # meeting is at exactly midnight — nudge the start back one day
            start = start - timedelta(days=1)
        return start, end

    # ------------------------------------------------------------------ parsing

    def _parse_datetime(
        self, text: str, event_datetime: Optional[datetime]
    ) -> Optional[datetime]:
        """dateparser first, regex fallback second."""
        if dateparser is not None:
            relative_base = event_datetime or datetime.utcnow()
            try:
                parsed = dateparser.parse(
                    text,
                    settings={
                        "PREFER_DATES_FROM": "future",
                        "RELATIVE_BASE": relative_base,
                        "RETURN_AS_TIMEZONE_AWARE": False,
                    },
                )
            except Exception as e:
                logger.debug(f"dateparser failed on {text!r}: {e}")
                parsed = None
            if parsed:
                logger.info(f"Parsed '{text[:80]}' → {parsed}")
                return parsed

        fallback = self._regex_date_fallback(text, event_datetime)
        if fallback:
            logger.info(f"Regex-fallback parsed '{text[:80]}' → {fallback}")
        else:
            logger.debug(f"No date parsed from: {text[:80]}")
        return fallback

    def _regex_date_fallback(
        self, text: str, event_datetime: Optional[datetime]
    ) -> Optional[datetime]:
        now = event_datetime or datetime.utcnow()
        lowered = text.lower()

        if "today" in lowered:
            return now.replace(hour=17, minute=0, second=0, microsecond=0)
        if "tomorrow" in lowered:
            return (now + timedelta(days=1)).replace(hour=17, minute=0, second=0, microsecond=0)
        if "next week" in lowered:
            return (now + timedelta(weeks=1)).replace(hour=17, minute=0, second=0, microsecond=0)
        if "next month" in lowered:
            nm = now.replace(day=1) + timedelta(days=32)
            return nm.replace(day=1, hour=17, minute=0, second=0, microsecond=0)
        if "end of week" in lowered:
            days_until_friday = (4 - now.weekday()) % 7
            return (now + timedelta(days=days_until_friday)).replace(hour=17, minute=0, second=0, microsecond=0)
        if "end of month" in lowered:
            jump = now.replace(day=28) + timedelta(days=4)
            return jump.replace(day=1, hour=17, minute=0, second=0, microsecond=0) - timedelta(days=1)

        m = re.search(r"in\s+(\d+)\s+(day|days|week|weeks|month|months)", lowered)
        if m:
            amount = int(m.group(1))
            unit = m.group(2)
            if "day" in unit:
                return now + timedelta(days=amount)
            if "week" in unit:
                return now + timedelta(weeks=amount)
            if "month" in unit:
                return now + timedelta(days=amount * 30)

        for rx in self.date_regexes:
            m = rx.search(text)
            if not m:
                continue
            date_str = m.group(1) if m.groups() else m.group(0)
            try:
                from dateutil import parser as du_parser
                return du_parser.parse(date_str, fuzzy=True, default=now)
            except Exception:
                if re.match(r"\d{1,2}[-/]\d{1,2}[-/]\d{2,4}", date_str):
                    parts = re.split(r"[-/]", date_str)
                    try:
                        day = int(parts[0])
                        month = int(parts[1])
                        year = int(parts[2]) if len(parts[2]) == 4 else 2000 + int(parts[2])
                        return datetime(year, month, day, 17, 0, 0)
                    except (ValueError, IndexError):
                        continue
        return None

    # ------------------------------------------------------------------ helpers

    def _split_into_sentences(self, text: str) -> List[str]:
        return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]

    def _contains_keywords(self, text: str, keywords: List[str]) -> bool:
        lowered = text.lower()
        return any(k.lower() in lowered for k in keywords)

    def _clean_description(self, text: str) -> str:
        text = re.sub(r"\b(um|uh|like|you know)\b", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s+", " ", text).strip()
        if not text:
            return text
        text = text[0].upper() + text[1:]
        if text[-1] not in ".!?":
            text += "."
        return text

    def _deduplicate_follow_ups(self, items: List[ExtractedFollowUp]) -> List[ExtractedFollowUp]:
        seen, out = set(), []
        for it in items:
            key = it.description.lower().strip()
            if key not in seen:
                seen.add(key)
                out.append(it)
        return out

    def _deduplicate_deadlines(self, items: List[ExtractedDeadline]) -> List[ExtractedDeadline]:
        seen, out = set(), []
        for it in items:
            key = it.description.lower().strip()
            if key not in seen:
                seen.add(key)
                out.append(it)
        return out
