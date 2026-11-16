from __future__ import annotations

import json
import urllib.error
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from trivia.management.commands.run_scheduler import (
    _USEasternTZ,
    compute_next_run,
    execute_pipeline_once,
    post_discord_alert,
)
from trivia.models import Country


class DataCommandTests(TestCase):
    def setUp(self) -> None:
        self.country = Country.objects.create(
            name="Dominica", capital="Roseau", continent="North America"
        )

    @patch("trivia.management.commands.generate_fun_facts._generate_ai_json")
    def test_generate_fun_facts_raises_command_error_on_failure(
        self, mock_gen: MagicMock
    ) -> None:
        mock_gen.side_effect = RuntimeError("Gemini quota exhausted")
        with self.assertRaises(CommandError):
            call_command("generate_fun_facts")

    @patch("trivia.management.commands.generate_quiz_questions._generate_ai_json")
    def test_generate_quiz_questions_raises_command_error_on_topic_failure(
        self, mock_gen: MagicMock
    ) -> None:
        mock_gen.side_effect = [RuntimeError("topic 1 error"), [], []]
        with self.assertRaises(CommandError) as ctx:
            call_command("generate_quiz_questions")
        self.assertIn("Formula 1", str(ctx.exception))


class SchedulerTests(TestCase):
    def test_compute_next_run_before_and_after_0230_est(self) -> None:
        # 2026-11-16 01:00 EST == 06:00 UTC
        before_utc = datetime(2026, 11, 16, 6, 0, tzinfo=timezone.utc)
        self.assertEqual(
            compute_next_run(before_utc),
            datetime(2026, 11, 16, 7, 30, tzinfo=timezone.utc),
        )

        # 2026-11-16 02:35 EST == 07:35 UTC -> next day 02:30 EST
        after_utc = datetime(2026, 11, 16, 7, 35, tzinfo=timezone.utc)
        self.assertEqual(
            compute_next_run(after_utc),
            datetime(2026, 11, 17, 7, 30, tzinfo=timezone.utc),
        )

    def test_compute_next_run_respects_edt_offset(self) -> None:
        # 2026-07-01 01:00 EDT == 05:00 UTC -> 02:30 EDT == 06:30 UTC
        edt_utc = datetime(2026, 7, 1, 5, 0, tzinfo=timezone.utc)
        self.assertEqual(
            compute_next_run(edt_utc),
            datetime(2026, 7, 1, 6, 30, tzinfo=timezone.utc),
        )

    def test_us_eastern_fallback_handles_dst_transitions(self) -> None:
        tz = _USEasternTZ()
        winter = datetime(2026, 1, 15, 12, 0, tzinfo=timezone.utc).astimezone(tz)
        summer = datetime(2026, 7, 15, 12, 0, tzinfo=timezone.utc).astimezone(tz)
        self.assertEqual(winter.tzname(), "EST")
        self.assertEqual(summer.tzname(), "EDT")

    @patch("trivia.management.commands.run_scheduler.urllib.request.urlopen")
    def test_execute_pipeline_once_posts_success_embed(
        self, mock_urlopen: MagicMock
    ) -> None:
        mock_response = MagicMock()
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response
        calls: list[str] = []

        times = iter(
            [
                datetime(2026, 11, 16, 7, 30, 1, tzinfo=timezone.utc),
                datetime(2026, 11, 16, 7, 31, 6, tzinfo=timezone.utc),
            ]
        )
        execute_pipeline_once(
            scheduled_utc=datetime(2026, 11, 16, 7, 30, 0, tzinfo=timezone.utc),
            runner=lambda name: calls.append(name),
            now_fn=lambda: next(times),
            webhook_url="https://discord.example.com/datapipes",
        )

        self.assertEqual(calls, ["generate_fun_facts", "generate_quiz_questions"])
        req = mock_urlopen.call_args.args[0]
        payload = json.loads(req.data.decode("utf-8"))
        embed = payload["embeds"][0]
        self.assertEqual(embed["title"], "✅ AI Data Generation Complete")
        self.assertEqual(embed["color"], 3066993)
        self.assertIn("1m 05s", embed["description"])

    @patch("trivia.management.commands.run_scheduler.urllib.request.urlopen")
    def test_execute_pipeline_once_posts_failure_embed_and_reraises(
        self, mock_urlopen: MagicMock
    ) -> None:
        mock_response = MagicMock()
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        def failing_runner(name: str) -> None:
            if name == "generate_quiz_questions":
                raise CommandError("API timeout")

        times = iter(
            [
                datetime(2026, 11, 16, 7, 30, 0, tzinfo=timezone.utc),
                datetime(2026, 11, 16, 7, 30, 12, tzinfo=timezone.utc),
            ]
        )
        with self.assertRaises(CommandError):
            execute_pipeline_once(
                scheduled_utc=datetime(2026, 11, 16, 7, 30, 0, tzinfo=timezone.utc),
                runner=failing_runner,
                now_fn=lambda: next(times),
                webhook_url="https://discord.example.com/datapipes",
            )

        req = mock_urlopen.call_args.args[0]
        payload = json.loads(req.data.decode("utf-8"))
        embed = payload["embeds"][0]
        self.assertEqual(embed["title"], "🚨 AI Data Generation Alert")
        self.assertEqual(embed["color"], 15158332)
        self.assertIn("generate_quiz_questions", embed["description"])
        self.assertIn("API timeout", embed["description"])

    @patch("trivia.management.commands.run_scheduler.urllib.request.urlopen")
    def test_post_discord_alert_swallows_network_error(
        self, mock_urlopen: MagicMock
    ) -> None:
        mock_urlopen.side_effect = urllib.error.URLError("down")
        ok = post_discord_alert(
            "https://discord.example.com/datapipes",
            title="test",
            description="desc",
            color=123,
            timestamp_iso="2026-11-16T07:30:00Z",
        )
        self.assertFalse(ok)
