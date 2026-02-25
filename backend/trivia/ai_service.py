from trivia.models import QuizTopic, QuizQuestion, CountryFunFact, Country
from datetime import datetime
import os
import google.generativeai as genai
import logging
import json
import re
from functools import lru_cache
from django.core.cache import cache
from thefuzz import fuzz

logger = logging.getLogger(__name__)

# Determine environment
IS_PRODUCTION = os.getenv('DJANGO_ENV') == 'production'

PROD_MODEL = os.getenv('GEMINI_PROD_MODEL')
DEV_MODEL = os.getenv('GEMINI_DEV_MODEL')

if IS_PRODUCTION:
    ACTIVE_MODEL_NAME = PROD_MODEL
    logger.info("Running in PRODUCTION mode.")
else:
    ACTIVE_MODEL_NAME = DEV_MODEL
    logger.info("Running in DEVELOPMENT mode.")

logger.info(f"AI Service Initialized. Using model: {ACTIVE_MODEL_NAME}")

# Configure the Gemini API
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    logger.warning(
        "GEMINI_API_KEY environment variable not set. AI features will be disabled.")
else:
    try:
        genai.configure(api_key=api_key)
    except Exception as e:
        logger.error(f"Failed to configure Gemini AI: {e}")

# --- Shared Helpers & Normalization ---

# 1. Define aliases grouped by the official name (easier to read and maintain)
COUNTRY_ALIASES_GROUPED = {
    "united states": ["usa", "us", "america", "united states of america"],
    "united kingdom": ["uk", "great britain", "britain", "england"],
    "saint vincent and the grenadines": ["saint vincent", "st vincent", "svg"],
    "antigua and barbuda": ["antigua", "barbuda"],
    "the bahamas": ["bahamas"],
    "bosnia and herzegovina": ["bosnia", "herzegovina"],
    "democratic republic of the congo": ["drc", "dr congo", "congo-kinshasa"],
    "republic of the congo": ["congo-brazzaville", "congo republic"],
    "dominican republic": ["dr"],
    "sao tome and principe": ["sao tome", "principe"],
    "trinidad and tobago": ["trinidad", "tobago"],
    "united arab emirates": ["uae", "emirates"],
    "central african republic": ["car"],
    "the gambia": ["gambia"],
    "saint kitts and nevis": ["saint kitts", "st kitts", "nevis"],
    "cote d'ivoire": ["ivory coast"],
    "north macedonia": ["macedonia"],
}

# 2. Dynamically flatten it into a fast lookup dictionary: {"usa": "united states", ...}
COMMON_COUNTRY_ALIASES = {
    alias: canonical_name
    for canonical_name, aliases in COUNTRY_ALIASES_GROUPED.items()
    for alias in aliases
}


def _normalize_string(s: str) -> str:
    """Removes punctuation and expands common abbreviations."""
    s = s.strip().lower()
    # Remove common punctuation
    s = re.sub(r"[',.-]", "", s)
    # Expand "st" to "saint" (word boundary \b ensures we don't change words like "state")
    s = re.sub(r"\bst\b", "saint", s)
    s = s.replace(" & ", " and ")
    return s.strip()


@lru_cache(maxsize=1)
def get_all_capitals_map():
    """Creates a map of {capital_name: [country1, country2]} to find shared capitals."""
    capital_map = {}
    try:
        for country in Country.objects.all():
            capitals = country.capital.split('|')
            for capital in capitals:
                c_name = capital.strip().lower()
                if c_name not in capital_map:
                    capital_map[c_name] = []
                capital_map[c_name].append(country.name)
        return capital_map
    except Exception as e:
        logger.error(f"Error building capital map (is DB migrated?): {e}")
        return {}


def _get_fuzzy_fallback(user_answer: str, correct_options: list, default_failure_msg: str, default_success_msg: str = "Correct!") -> dict:
    """Heuristic grading using Levenshtein distance when AI is unreachable."""
    best_score = 0
    normalized_user = _normalize_string(user_answer)

    for option in correct_options:
        score = fuzz.token_sort_ratio(
            normalized_user, _normalize_string(option))
        best_score = max(best_score, score)

    is_correct = best_score >= 85

    return {
        "is_correct": is_correct,
        "points_awarded": 1 if is_correct else 0,
        "feedback_message": default_success_msg if is_correct else default_failure_msg,
        "grading_method": "fuzzy_fallback",
        "is_fallback": True
    }


def _generate_ai_json(prompt: str, temperature: float = 0.0, max_tokens: int = 4096):
    """Centralized helper to interact with Gemini API and return parsed JSON."""
    generation_config = {
        "temperature": temperature,
        "top_p": 1,
        "top_k": 1,
        "max_output_tokens": max_tokens,
        "response_mime_type": "application/json",
    }
    model = genai.GenerativeModel(
        model_name=ACTIVE_MODEL_NAME,
        generation_config=generation_config,
    )
    response = model.generate_content(prompt)
    response_text = response.text.strip().replace("```json", "").replace("```", "")
    return json.loads(response_text)

# --- Feature 1: "Guess the Capital" Grader ---


def grade_capital_answer(country_name, correct_capitals_str, user_answer_str):
    correct_capitals_list = [c.strip()
                             for c in correct_capitals_str.split('|')]

    # Normalize inputs to safely ignore punctuation and "St." abbreviations
    normalized_user = _normalize_string(user_answer_str)
    lower_correct_options = [_normalize_string(
        c) for c in correct_capitals_list]

    capital_count = len(correct_capitals_list)
    capitals_list_str = correct_capitals_str.replace('|', ' and ')

    if capital_count == 1:
        default_failure_msg = f"Incorrect 😔. The correct capital is {correct_capitals_list[0]}."
        default_success_msg = f"Correct! The capital of {country_name} is {correct_capitals_list[0]}."
    else:
        default_failure_msg = f"Incorrect 😔. The correct capitals are {capitals_list_str}."
        default_success_msg = f"Correct! The capitals of {country_name} are {capitals_list_str}."

    all_capitals_map = get_all_capitals_map()

    # TIER 1: Deterministic Check
    if normalized_user in lower_correct_options:
        actual_capital_cased = correct_capitals_list[lower_correct_options.index(
            normalized_user)]
        shared_with = [c for c in all_capitals_map.get(
            actual_capital_cased.lower(), []) if c != country_name]

        msg = default_success_msg
        if shared_with:
            msg += f" (It's also the capital of {', '.join(shared_with)})"

        return {
            "is_correct": True,
            "all_capitals_guessed": capital_count == 1,
            "correct_guesses": [user_answer_str],
            "incorrect_guesses": [],
            "missed_capitals": [c for c in correct_capitals_list if _normalize_string(c) != normalized_user],
            "points_awarded": 1,
            "shared_capital_info": shared_with if shared_with else None,
            "feedback_message": msg,
            "grading_method": "deterministic"
        }

    # TIER 2: Fuzzy Match
    best_score = 0
    best_match_idx = -1
    for i, opt in enumerate(lower_correct_options):
        score = fuzz.token_sort_ratio(normalized_user, opt)
        if score > best_score:
            best_score = score
            best_match_idx = i

    if best_score >= 85:
        actual_capital_cased = correct_capitals_list[best_match_idx]
        shared_with = [c for c in all_capitals_map.get(
            actual_capital_cased.lower(), []) if c != country_name]

        msg = default_success_msg
        if shared_with:
            msg += f" (It's also the capital of {', '.join(shared_with)})"

        return {
            "is_correct": True,
            "all_capitals_guessed": capital_count == 1,
            "correct_guesses": [user_answer_str],
            "incorrect_guesses": [],
            "missed_capitals": [c for c in correct_capitals_list if fuzz.token_sort_ratio(normalized_user, _normalize_string(c)) < 85],
            "points_awarded": 1,
            "shared_capital_info": shared_with if shared_with else None,
            "feedback_message": msg,
            "grading_method": "fuzzy"
        }

    # TIER 3: AI Grading & Fact Harvesting
    if not api_key:
        logger.warning("GEMINI_API_KEY not set. Returning hard fallback.")
        return {"is_correct": False, "points_awarded": 0, "feedback_message": default_failure_msg, "grading_method": "hard_fallback"}

    shared_capitals_context = {
        cap: [c for c in all_capitals_map.get(
            cap.lower(), []) if c != country_name]
        for cap in correct_capitals_list if cap.lower() in all_capitals_map
    }
    shared_capitals_context = {k: v for k,
                               v in shared_capitals_context.items() if v}

    prompt = f"""
    You are an expert geography trivia judge. Your task is to evaluate a user's answer for a capital city question.
    You must provide your response *only* in the specified JSON format.

    **Context:**
    - The Country: "{country_name}"
    - The Full List of Correct Capital(s): {json.dumps(correct_capitals_list)}
    - Number of Correct Capitals: {capital_count}
    - User's Answer: "{user_answer_str}"
    - Context (Other countries with the same capital names): {json.dumps(shared_capitals_context)}

    **Your Task:**
    1. Parse the "User's Answer".
    2. Compare the parsed user answers to the "Full List of Correct Capital(s)". Be lenient with common misspellings.
    3. Identify correctly guessed capitals, incorrect guesses, and missed correct capitals.
    4. Create a "shared_capital_info" message *only* if a user's *correct guess* is also a capital of another country.
    5. Create a final "feedback_message":
        - If `all_capitals_guessed` is true: "Correct! The capital of {country_name} is {correct_capitals_list[0]}." or "Correct! The {capital_count} capitals of {country_name} are {", ".join(correct_capitals_list)}. You got them all!"
        - If `is_correct` is true BUT partially correct: "Partially correct! You found [count] of the {capital_count} capitals: [list]. The capital cities of {country_name} are {", ".join(correct_capitals_list)}."
        - If `is_correct` is false: "Incorrect 😔. The correct capital is {correct_capitals_list[0]}." or "Incorrect 😔. The correct capitals are {", ".join(correct_capitals_list)}."
    6. Provide exactly 3 ADDITIONAL unique facts about {country_name}.
       - Fact 1: Historical milestone.
       - Fact 2: Geographic anomaly or feature.
       - Fact 3: Cultural or general trivia.
       (Knowledge cutoff is January 2025)

    **JSON Output Format:**
    {{
      "is_correct": true,
      "all_capitals_guessed": false,
      "correct_guesses": ["Pretoria"],
      "incorrect_guesses": ["Joburg"],
      "missed_capitals": ["Cape Town", "Bloemfontein"],
      "points_awarded": 1,
      "shared_capital_info": null,
      "feedback_message": "Partially correct! You found 1 of the 3 capitals: Pretoria. The full list is Pretoria, Cape Town, Bloemfontein.",
      "extra_facts": ["Historical fact here", "Geographic fact here", "Cultural fact here"]
    }}
    **CRITICAL: Respond ONLY with the raw JSON object.**
    """

    try:
        # Bumped temperature slightly to 0.5 to ensure varied extra facts
        result_json = _generate_ai_json(prompt, temperature=0.5)
        result_json["grading_method"] = "ai"
        logger.info(
            f"AI capital grading complete for {country_name}. User: '{user_answer_str}'.")
        return result_json
    except Exception as e:
        logger.error(f"Error calling Gemini or parsing JSON for capital: {e}")
        return {"is_correct": False, "points_awarded": 0, "feedback_message": default_failure_msg, "grading_method": "hard_fallback"}

# --- Feature 1 (Reverse): "Guess the Country" Grader ---


def grade_country_answer(correct_country_name, correct_capitals_str, user_answer_str):
    normalized_user = _normalize_string(user_answer_str)

    # Check if the user used a known alias (e.g., mapped "antigua" to "antigua and barbuda")
    normalized_user = COMMON_COUNTRY_ALIASES.get(
        normalized_user, normalized_user)

    correct_capitals_list = [c.strip()
                             for c in correct_capitals_str.split('|')]
    capital_count = len(correct_capitals_list)
    capital_name_for_context = correct_capitals_list[0]

    default_failure_msg = f"Incorrect 😔. The correct answer is {correct_country_name}."

    if capital_count == 1:
        default_success_msg = f"Correct! {capital_name_for_context} is the capital of {correct_country_name}."
    else:
        default_success_msg = f"Correct! {capital_name_for_context} is one of the capitals of {correct_country_name}."

    all_capitals_map = get_all_capitals_map()

    # Get ALL valid countries for this capital
    valid_countries_for_capital = [correct_country_name]
    capital_lower = capital_name_for_context.lower()
    if capital_lower in all_capitals_map:
        valid_countries_for_capital = all_capitals_map[capital_lower]

    lower_valid_countries = [_normalize_string(
        c) for c in valid_countries_for_capital]

    def get_shared_success_msg(matched_country_lower):
        # Find the properly cased name from our valid list
        matched_cased = next((c for c in valid_countries_for_capital if _normalize_string(
            c) == matched_country_lower), user_answer_str.title())
        other_countries = [c for c in valid_countries_for_capital if _normalize_string(
            c) != matched_country_lower]

        if matched_country_lower == _normalize_string(correct_country_name):
            msg = default_success_msg
            if other_countries:
                msg += f" (It's also the capital of {', '.join(other_countries)})"
            return msg
        else:
            return f"Correct! {capital_name_for_context} is the capital of {matched_cased}. (It's also the capital of {', '.join(other_countries)})"

    # TIER 1: Deterministic Check
    if normalized_user in lower_valid_countries:
        return {
            "is_correct": True,
            "feedback_message": get_shared_success_msg(normalized_user),
            "grading_method": "deterministic"
        }

    # TIER 2: Fuzzy Match
    best_score = 0
    best_match_country = None
    for valid_country in lower_valid_countries:
        score = fuzz.token_sort_ratio(normalized_user, valid_country)
        if score > best_score:
            best_score = score
            best_match_country = valid_country

    if best_score >= 85 and best_match_country:
        return {
            "is_correct": True,
            "feedback_message": get_shared_success_msg(best_match_country),
            "grading_method": "fuzzy"
        }

    # TIER 3: AI Grading & Fact Harvesting
    if not api_key:
        logger.warning("GEMINI_API_KEY not set. Returning hard fallback.")
        return {"is_correct": False, "feedback_message": default_failure_msg, "grading_method": "hard_fallback"}

    prompt = f"""
    You are an expert geography trivia judge. Your task is to evaluate a user's answer for a "guess the country" question.
    You must provide your response *only* in the specified JSON format.

    **Context:**
    - The Capital Shown to User: "{capital_name_for_context}"
    - The Correct Country: "{correct_country_name}"
    - Full List of Capitals for {correct_country_name}: {json.dumps(correct_capitals_list)}
    - Number of Capitals for {correct_country_name}: {capital_count}
    - User's Answer: "{user_answer_str}"
    - Context (All valid countries that have {capital_name_for_context} as a capital): {json.dumps(valid_countries_for_capital)}

    **Your Task:**
    1. Determine if "User's Answer" is a correct match for "The Correct Country" OR any other country in the Context that shares this capital.
    2. Be lenient with common misspellings (e.g., "Grmany" for "Germany") and abbreviations ("USA").
    3. Create a "feedback_message":
        - If Incorrect: Check if "User's Answer" is *another* country sharing the *same capital*. If yes: "Correct! {capital_name_for_context} is the capital of {user_answer_str}. (It's also the capital of: {correct_country_name})." If no: "Incorrect 😔. The correct answer is {correct_country_name}."
        - If Correct (1 capital): "Correct! {capital_name_for_context} is the capital of {correct_country_name}."
        - If Correct (>1 capital): "Correct! {capital_name_for_context} is one of the {capital_count} capitals of {correct_country_name}. The other capital cities are [list]."
    4. Provide exactly 3 ADDITIONAL unique facts about {correct_country_name}.
       - Fact 1: Historical milestone.
       - Fact 2: Geographic anomaly or feature.
       - Fact 3: Cultural or general trivia.
       (Knowledge cutoff is January 2025)

    **JSON Output Format:**
    {{
      "is_correct": true,
      "feedback_message": "Correct! Pretoria is one of the three capitals of South Africa. The other capital cities are Cape Town & Bloemfontein.",
      "extra_facts": ["Historical fact here", "Geographic fact here", "Cultural fact here"]
    }}
    **CRITICAL: Respond ONLY with the raw JSON object.**
    """
    try:
        result_json = _generate_ai_json(
            prompt, temperature=0.5, max_tokens=1024)
        result_json["grading_method"] = "ai"
        logger.info(
            f"AI country grading complete for {correct_country_name}. User: '{user_answer_str}'.")
        return result_json
    except Exception as e:
        logger.error(f"Error calling Gemini or parsing JSON for country: {e}")
        return {"is_correct": False, "feedback_message": default_failure_msg, "grading_method": "hard_fallback"}

# --- Feature 2: Fun Fact Generator ---


def get_fun_fact(country_name):
    """Fetches a random fun fact from the database."""
    try:
        # Fetch the country
        country = Country.objects.get(name=country_name)

        # order_by('?') is Django's way of selecting a random row
        random_fact = country.fun_facts.order_by('?').first()

        if random_fact:
            return random_fact.fact_text  # Updated to match your model definition

        # Fallback if the database has no facts for this country yet
        return f"Did you know {country_name} is a fascinating place to learn about!"

    except Country.DoesNotExist:
        logger.error(f"Fun fact requested for unknown country: {country_name}")
        return "Did you know the world has over 190 countries?"

# --- Feature 3: Dynamic Quiz Generator ---


def generate_ai_quiz(topic_name, fresh=False):
    """Fetches 10 random pre-generated quiz questions from the database."""
    try:
        # Fetch the topic (case-insensitive match)
        topic = QuizTopic.objects.get(name__iexact=topic_name)

        # Pull 10 random questions for this topic
        questions = topic.questions.order_by('?')[:10]

        if questions.count() < 10:
            return {"error": "We are still building the question pool for this topic. Check back later!"}

        # Format them to match the exact JSON structure your React frontend expects
        quiz_data = []
        for q in questions:
            quiz_data.append({
                "id": q.id,
                "question": q.question_text,
                "options": q.options,
                "correctAnswer": q.correct_answer,
                "funFact": q.fun_fact
            })

        return quiz_data

    except QuizTopic.DoesNotExist:
        return {"error": f"Topic '{topic_name}' not found."}
