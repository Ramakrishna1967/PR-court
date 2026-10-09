"""
In-memory event bus for SSE streaming.

Each trial has:
 - A persistent ordered list of events (for replay / Last-Event-ID)
 - A set of asyncio.Queue instances – one per connected SSE subscriber

Events are also persisted to the DB by the trial runner; this module only
handles in-process fan-out.
"""
from __future__ import annotations

import asyncio
import logging
from collections import defaultdict
from datetime import datetime
from typing import AsyncIterator
from uuid import UUID

from app.schemas import AgentTeam, EventType, TrialEvent

logger = logging.getLogger(__name__)

# trial_id -> ordered list of all events ever emitted
_event_store: dict[str, list[TrialEvent]] = defaultdict(list)

# trial_id -> set of subscriber queues
_subscribers: dict[str, set[asyncio.Queue]] = defaultdict(set)


def _store_key(trial_id: UUID | str) -> str:
    return str(trial_id)


async def publish(
    trial_id: UUID | str,
    event_type: EventType,
    payload: dict,
    agent: str = "",
    team: AgentTeam | None = None,
) -> TrialEvent:
    """Append event to store and fan-out to all live subscribers."""
    key = _store_key(trial_id)
    seq = len(_event_store[key])
    event = TrialEvent(
        seq=seq,
        type=event_type,
        agent=agent,
        team=team,
        payload=payload,
        ts=datetime.utcnow(),
    )
    _event_store[key].append(event)

    dead = set()
    for q in _subscribers[key]:
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:
            dead.add(q)
    for q in dead:
        _subscribers[key].discard(q)

    return event


async def subscribe(
    trial_id: UUID | str,
    last_event_id: int | None = None,
) -> AsyncIterator[TrialEvent]:
    """
    Async generator that:
    1. Replays all events after last_event_id
    2. Yields live events as they arrive
    3. Stops when TRIAL_FINISHED or ERROR is published
    """
    key = _store_key(trial_id)
    q: asyncio.Queue[TrialEvent | None] = asyncio.Queue(maxsize=256)
    _subscribers[key].add(q)

    try:
        # Replay historical events
        start = (last_event_id + 1) if last_event_id is not None else 0
        for event in _event_store[key][start:]:
            yield event
            if event.type in (EventType.TRIAL_FINISHED, EventType.ERROR):
                return

        # Stream live events
        while True:
            try:
                event = await asyncio.wait_for(q.get(), timeout=30.0)
            except asyncio.TimeoutError:
                # Send a keep-alive comment (handled by caller)
                yield None  # type: ignore[misc]
                continue

            if event is None:
                break
            yield event
            if event.type in (EventType.TRIAL_FINISHED, EventType.ERROR):
                break
    finally:
        _subscribers[key].discard(q)


def get_events(trial_id: UUID | str) -> list[TrialEvent]:
    """Return all stored events for a trial (for DB persistence check)."""
    return _event_store[_store_key(trial_id)]


def clear_trial(trial_id: UUID | str) -> None:
    """Release memory after trial is fully done and persisted."""
    key = _store_key(trial_id)
    _event_store.pop(key, None)
    for q in _subscribers.get(key, set()):
        q.put_nowait(None)  # type: ignore[arg-type]
    _subscribers.pop(key, None)
