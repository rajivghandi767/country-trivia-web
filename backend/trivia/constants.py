from __future__ import annotations

from typing import Final

# Grading & Gameplay Constants
FUZZY_MATCH_THRESHOLD: Final[int] = 85
QUIZ_QUESTION_COUNT: Final[int] = 10
SHUFFLE_COUNTRY_LIMIT: Final[int] = 20

# Background AI Generation Pool Limits & Batch Sizes
FACT_STOCK_LIMIT: Final[int] = 25
FACT_BATCH_SIZE: Final[int] = 25
QUIZ_STOCK_LIMIT: Final[int] = 500
QUIZ_BATCH_SIZE: Final[int] = 15

# Cache TTLs (in seconds) & Validation Limits
CAPITAL_MAP_CACHE_TTL: Final[int] = 86400  # 24 hours
MAX_ISSUE_NOTE_LENGTH: Final[int] = 1000

# Core AI Quiz Categories
CORE_QUIZ_TOPICS: Final[tuple[str, ...]] = (
    "Formula 1",
    "Caribbean History",
    "English Premier League",
)

# Canonical country aliases grouped by lowercase official database country name
COUNTRY_ALIASES_GROUPED: Final[dict[str, list[str]]] = {
    "united states": ["usa", "us", "america", "united states of america"],
    "united kingdom": ["uk", "great britain", "britain", "england"],
    "saint vincent and the grenadines": ["saint vincent", "st vincent", "svg"],
    "antigua and barbuda": ["antigua", "barbuda"],
    "the bahamas": ["bahamas"],
    "bosnia and herzegovina": ["bosnia", "herzegovina"],
    "democratic republic of the congo": [
        "drc",
        "dr congo",
        "congo-kinshasa",
        "congo kinshasa",
        "zaire",
    ],
    "republic of the congo": [
        "congo-brazzaville",
        "congo brazzaville",
        "congo republic",
        "congo",
    ],
    "dominican republic": ["dr"],
    "sao tome and principe": ["sao tome", "principe"],
    "trinidad and tobago": ["trinidad", "tobago", "t and t"],
    "united arab emirates": ["uae", "emirates"],
    "central african republic": ["car"],
    "the gambia": ["gambia"],
    "saint kitts and nevis": ["saint kitts", "st kitts", "nevis"],
    "cote d'ivoire": ["ivory coast", "cote divoire"],
    "north macedonia": ["macedonia"],
    "czechia": ["czech republic"],
    "eswatini": ["swaziland"],
    "east timor": ["timor-leste", "timor leste"],
    "cabo verde": ["cape verde"],
    "vatican city": ["holy see", "the vatican", "vatican"],
    "myanmar": ["burma"],
    "netherlands": ["holland", "the netherlands"],
    "philippines": ["the philippines"],
}

# Flattened O(1) lookup dictionary mapping alias -> canonical name
COMMON_COUNTRY_ALIASES: Final[dict[str, str]] = {
    alias: canonical_name
    for canonical_name, aliases in COUNTRY_ALIASES_GROUPED.items()
    for alias in aliases
}

