from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request

from django.conf import settings
from django.db import models

from .constants import DISCORD_TIMEOUT_SECONDS, MAX_ISSUE_NOTE_LENGTH

logger = logging.getLogger(__name__)


class Country(models.Model):
    name = models.CharField(max_length=100, unique=True)
    capital = models.CharField(max_length=100)
    continent = models.CharField(max_length=50)

    def __str__(self) -> str:
        return self.name


class CountryFunFact(models.Model):
    country = models.ForeignKey(
        Country, on_delete=models.CASCADE, related_name="fun_facts"
    )
    fact_text = models.TextField()
    is_ai_generated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.country.name}: {self.fact_text[:50]}..."


class QuizTopic(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self) -> str:
        return self.name


class QuizQuestion(models.Model):
    topic = models.ForeignKey(
        QuizTopic, on_delete=models.CASCADE, related_name="questions"
    )
    question_text = models.CharField(max_length=500)
    options = models.JSONField()
    correct_answer = models.CharField(max_length=200)
    fun_fact = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.question_text


class ReportedIssue(models.Model):
    class IssueType(models.TextChoices):
        FACT_ERROR = "fact_error", "Fact is wrong"
        TYPO = "typo", "Typo or Grammar"
        UI_BUG = "ui_bug", "UI/Visual Bug"
        OTHER = "other", "Other"

    ISSUE_TYPES = IssueType.choices

    question_id = models.IntegerField(null=True, blank=True)
    country_name = models.CharField(max_length=100, null=True, blank=True)
    issue_type = models.CharField(max_length=20, choices=IssueType.choices)
    user_note = models.TextField()
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return (
            f"{self.get_issue_type_display()} - {self.created_at.strftime('%m/%d/%Y')}"
        )

    def send_notifications(self) -> bool:
        """Send a Discord webhook notification for a user-submitted bug/fact report."""
        webhook_url = getattr(settings, "DISCORD_BUG_WEBHOOK_URL", None)
        if not webhook_url:
            return False

        context_parts: list[str] = []
        if self.country_name:
            context_parts.append(f"**Country:** {self.country_name}")
        if self.question_id is not None:
            context_parts.append(f"**Question ID:** {self.question_id}")

        safe_note = self.user_note[:MAX_ISSUE_NOTE_LENGTH]
        lines = [
            "🚨 **New Bug/Fact Report** 🚨",
            f"**Type:** {self.get_issue_type_display()}",
            f"**Details:** {safe_note}",
        ]
        if context_parts:
            lines.append(" | ".join(context_parts))

        payload = {
            "content": "\n".join(lines),
            "allowed_mentions": {"parse": []},
        }
        req = urllib.request.Request(
            url=str(webhook_url),
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "User-Agent": "CountryTriviaWeb/1.0",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=DISCORD_TIMEOUT_SECONDS):
                return True
        except (urllib.error.URLError, OSError) as exc:
            logger.error("Failed to send Discord bug report notification: %s", exc)
            return False

