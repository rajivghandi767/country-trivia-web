from __future__ import annotations

from typing import Any

from rest_framework import serializers

from .constants import MAX_ISSUE_NOTE_LENGTH
from .models import Country, ReportedIssue


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ["id", "name", "capital", "continent"]

    def to_representation(self, instance: Country) -> dict[str, Any]:
        """
        Masks the target answer field during active gameplay when `mode` is provided
        in the serializer context, preventing answer-key leaks in browser network traffic
        and normalizing multi-capital display strings on the backend.
        """
        data: dict[str, Any] = super().to_representation(instance)
        game_mode = self.context.get("game_mode")
        if game_mode == "capital":
            data["capital"] = ""
        elif game_mode == "country":
            data["name"] = ""
            data["capital"] = instance.capital.split("|")[0]
        return data


class ReportedIssueSerializer(serializers.ModelSerializer):
    user_note = serializers.CharField(max_length=MAX_ISSUE_NOTE_LENGTH)

    class Meta:
        model = ReportedIssue
        fields = [
            "id",
            "question_id",
            "country_name",
            "issue_type",
            "user_note",
            "resolved",
            "created_at",
        ]
        read_only_fields = ["id", "resolved", "created_at"]

