from __future__ import annotations

import json
import logging
import signal
import threading
import urllib.error
import urllib.request
from datetime import date, datetime, time as dt_time, timedelta, timezone, tzinfo
from typing import Any, Callable, Sequence
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError

from trivia.constants import DISCORD_TIMEOUT_SECONDS

logger = logging.getLogger(__name__)

DISCORD_SUCCESS_COLOR = 3066993
DISCORD_FAIL_COLOR = 15158332
TARGET_HOUR = 2
TARGET_MINUTE = 30
MAX_SLEEP_SLICE_SECONDS = 3600.0
MIN_RUN_GAP = timedelta(minutes=1)
PIPELINE_STEPS: tuple[str, ...] = ("generate_fun_facts", "generate_quiz_questions")


def _nth_sunday(year: int, month: int, nth: int) -> date:
    first = date(year, month, 1)
    days_to_sunday = (6 - first.weekday()) % 7
    return first + timedelta(days=days_to_sunday + (nth - 1) * 7)


class _USEasternTZ(tzinfo):
    """Pure-stdlib US Eastern fallback if container OS tzdata is unavailable."""

    _ZERO = timedelta(0)
    _STD = timedelta(hours=-5)
    _DST_DELTA = timedelta(hours=1)

    def _dst_bounds(self, year: int) -> tuple[datetime, datetime]:
        start = datetime.combine(_nth_sunday(year, 3, 2), dt_time(2, 0))
        end = datetime.combine(_nth_sunday(year, 11, 1), dt_time(1, 0))
        return start, end

    def dst(self, dt: datetime | None) -> timedelta:
        if dt is None:
            return self._ZERO
        naive = dt.replace(tzinfo=None)
        start, end = self._dst_bounds(naive.year)
        if start <= naive < end:
            return self._DST_DELTA
        if end <= naive < end + self._DST_DELTA and dt.fold == 0:
            return self._DST_DELTA
        return self._ZERO

    def utcoffset(self, dt: datetime | None) -> timedelta:
        return self._STD + self.dst(dt)

    def tzname(self, dt: datetime | None) -> str:
        return "EDT" if self.dst(dt) != self._ZERO else "EST"


def get_eastern_tz() -> tzinfo:
    """Return `America/New_York` ZoneInfo, falling back to US Eastern DST rules."""
    try:
        return ZoneInfo("America/New_York")
    except ZoneInfoNotFoundError:
        return _USEasternTZ()


def format_eastern(dt: datetime) -> str:
    tz = get_eastern_tz()
    local_dt = dt.astimezone(tz)
    return local_dt.strftime("%a, %d %b %Y at %H:%M:%S %Z")


def format_duration(seconds: int) -> str:
    clamped = max(0, seconds)
    if clamped >= 60:
        return f"{clamped // 60}m {clamped % 60:02d}s"
    return f"{clamped}s"


def compute_next_run(
    now_utc: datetime,
    target_hour: int = TARGET_HOUR,
    target_minute: int = TARGET_MINUTE,
    allowed_weekdays: frozenset[int] | None = None,
) -> datetime:
    """Compute the next scheduled UTC execution instant at HH:MM America/New_York."""
    tz = get_eastern_tz()
    now_et = now_utc.astimezone(tz)
    base_date = now_et.date()

    for offset in range(8):
        cand_date = base_date + timedelta(days=offset)
        if allowed_weekdays is not None and cand_date.weekday() not in allowed_weekdays:
            continue
        cand_local = datetime(
            cand_date.year,
            cand_date.month,
            cand_date.day,
            target_hour,
            target_minute,
            0,
            tzinfo=tz,
        )
        cand_utc = cand_local.astimezone(timezone.utc)
        # Re-project to handle nonexistent spring-forward wall times identically to ZoneInfo
        if allowed_weekdays is not None and cand_utc.astimezone(tz).weekday() not in allowed_weekdays:
            continue
        if cand_utc > now_utc:
            return cand_utc

    raise RuntimeError("Failed to compute next scheduled run within 7 days.")


def post_discord_alert(
    webhook_url: str | None,
    *,
    title: str,
    description: str,
    color: int,
    timestamp_iso: str,
) -> bool:
    """Post an embed payload to the #data-pipeline Discord webhook."""
    if not webhook_url:
        logger.info("DISCORD_DATAPIPES_WEBHOOK_URL is not configured; skipping Discord embed.")
        return False

    payload = {
        "embeds": [
            {
                "title": title,
                "description": description,
                "color": color,
                "timestamp": timestamp_iso,
            }
        ]
    }
    req = urllib.request.Request(
        url=str(webhook_url),
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "User-Agent": "CountryTriviaScheduler/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=DISCORD_TIMEOUT_SECONDS):
            return True
    except (urllib.error.URLError, OSError) as exc:
        logger.warning("Failed to post #data-pipeline Discord notification: %s", exc)
        return False


def execute_pipeline_once(
    *,
    scheduled_utc: datetime | None = None,
    runner: Callable[..., Any] = call_command,
    steps: Sequence[str] = PIPELINE_STEPS,
    now_fn: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
    webhook_url: str | None = None,
) -> None:
    """Execute all trivia AI data generation steps once and notify Discord on result."""
    started_utc = now_fn()
    sched_utc = scheduled_utc or started_utc
    started_iso = started_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
    scheduled_et = format_eastern(sched_utc)
    started_et = format_eastern(started_utc)
    queue_sec = max(0, int((started_utc - sched_utc).total_seconds()))
    queue_label = format_duration(queue_sec)
    target_webhook = (
        webhook_url
        if webhook_url is not None
        else getattr(settings, "DISCORD_DATAPIPES_WEBHOOK_URL", None)
    )

    current_step = ""
    try:
        for step_name in steps:
            current_step = step_name
            logger.info("Running trivia data pipeline step: %s", step_name)
            runner(step_name)
    except Exception as exc:
        failed_utc = now_fn()
        duration_str = format_duration(int((failed_utc - started_utc).total_seconds()))
        failed_et = format_eastern(failed_utc)
        err_summary = str(exc).strip()[:300] or exc.__class__.__name__
        logger.exception("Trivia data pipeline failed at step '%s': %s", current_step, exc)

        desc = (
            ":x: **Country Trivia Web App — AI Data Pipeline Failed**\n"
            f"**:warning: Failed Step:** `{current_step}`\n"
            f"```text\n{err_summary}\n```\n"
            f":clock3: **Scheduled:** {scheduled_et}\n"
            f":rocket: **Started:** {started_et} (+{queue_label} drift)\n"
            f":checkered_flag: **Failed:** {failed_et} ({duration_str})"
        )
        post_discord_alert(
            target_webhook,
            title="🚨 AI Data Generation Alert",
            description=desc,
            color=DISCORD_FAIL_COLOR,
            timestamp_iso=started_iso,
        )
        raise CommandError(f"Step '{current_step}' failed: {exc}") from exc

    finished_utc = now_fn()
    duration_str = format_duration(int((finished_utc - started_utc).total_seconds()))
    finished_et = format_eastern(finished_utc)
    desc = (
        ":brain: **Country Trivia Web App — Trivia Data Updated**\n"
        "Successfully generated new AI fun facts and quiz questions for the database pools.\n\n"
        f":clock3: **Scheduled:** {scheduled_et}\n"
        f":rocket: **Started:** {started_et} (+{queue_label} drift)\n"
        f":checkered_flag: **Finished:** {finished_et} ({duration_str})"
    )
    post_discord_alert(
        target_webhook,
        title="✅ AI Data Generation Complete",
        description=desc,
        color=DISCORD_SUCCESS_COLOR,
        timestamp_iso=started_iso,
    )


class Command(BaseCommand):
    help = "Runs the in-app scheduler for daily 02:30 AM America/New_York AI data generation."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument(
            "--once",
            action="store_true",
            help="Run the data pipeline immediately once and exit.",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        if options.get("once"):
            execute_pipeline_once()
            return

        stop_event = threading.Event()
        self._register_signals(stop_event)

        self.stdout.write(
            "⏰ Country Trivia in-app scheduler started (daily at 02:30 AM America/New_York)."
        )
        last_run_utc: datetime | None = None

        while not stop_event.is_set():
            now_utc = datetime.now(timezone.utc)
            anchor = now_utc if last_run_utc is None else max(now_utc, last_run_utc + MIN_RUN_GAP)
            next_run = compute_next_run(anchor)
            self.stdout.write(f"🗓️ Next scheduled run: {format_eastern(next_run)}")

            while not stop_event.is_set():
                remaining = (next_run - datetime.now(timezone.utc)).total_seconds()
                if remaining <= 0:
                    break
                stop_event.wait(timeout=min(remaining, MAX_SLEEP_SLICE_SECONDS))

            if stop_event.is_set():
                break

            try:
                execute_pipeline_once(scheduled_utc=next_run)
            except CommandError:
                pass  # Already logged and reported to Discord #data-pipeline
            finally:
                last_run_utc = max(next_run, datetime.now(timezone.utc))

        self.stdout.write("🛑 Country Trivia in-app scheduler stopped cleanly.")

    @staticmethod
    def _register_signals(stop_event: threading.Event) -> None:
        if threading.current_thread() is not threading.main_thread():
            return

        def _handle_stop(signum: int, _frame: Any) -> None:
            logger.info("Received signal %s; shutting down scheduler...", signum)
            stop_event.set()

        signal.signal(signal.SIGTERM, _handle_stop)
        signal.signal(signal.SIGINT, _handle_stop)
