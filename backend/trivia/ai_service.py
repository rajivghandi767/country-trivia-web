import os
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
import logging
import json
from functools import lru_cache
from trivia.models import Country
from django.core.cache import cache

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
try:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning(
            "GEMINI_API_KEY environment variable not set. AI features will be disabled.")
    genai.configure(api_key=api_key)
except Exception as e:
    logger.error(f"Failed to configure Gemini AI: {e}")

# --- Helper Function ---


@lru_cache(maxsize=1)
def get_all_capitals_map():
    """
    Creates a map of {capital_name: [country1, country2]}
    This is used to find shared capitals.
    It's cached in memory to avoid hitting the database on every request.
    """
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

# --- Feature 1: "Guess the Capital" Grader ---


def grade_capital_answer(country_name, correct_capitals_str, user_answer_str):
    """
    Uses AI to grade the user's answer for "Guess the Capital" mode,
    handling multiple capitals, misspellings, and shared capitals.
    """
    if not api_key:
        logger.error("GEMINI_API_KEY not set. Cannot grade answer.")
        is_correct = user_answer_str.lower() in correct_capitals_str.lower()
        capitals_list = correct_capitals_str.replace('|', ', ')
        capital_label = "capital is" if len(
            correct_capitals_str.split('|')) == 1 else "capitals are"
        return {
            "is_correct": is_correct,
            "points_awarded": 1 if is_correct else 0,
            "feedback_message": f"The correct {capital_label}: {capitals_list}."
        }

    generation_config = {
        "temperature": 0.0,
        "top_p": 1,
        "top_k": 1,
        "max_output_tokens": 2048,
        "response_mime_type": "application/json",
    }

    model = genai.GenerativeModel(
        model_name=ACTIVE_MODEL_NAME,
        generation_config=generation_config,
    )

    all_capitals_map = get_all_capitals_map()
    correct_capitals_list = [c.strip()
                             for c in correct_capitals_str.split('|')]
    capital_count = len(correct_capitals_list)

    shared_capitals_context = {}
    for capital in correct_capitals_list:
        capital_lower = capital.lower()
        if capital_lower in all_capitals_map:
            other_countries = [
                c for c in all_capitals_map[capital_lower] if c != country_name
            ]
            if other_countries:
                shared_capitals_context[capital] = other_countries

    # Prompt for grading Country Capital Answer
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
    1.  Parse the "User's Answer". It may contain multiple answers separated by commas, misspellings, or abbreviations.
    2.  Compare the parsed user answers to the "Full List of Correct Capital(s)". Be lenient with common misspellings (e.g., "Washinton" for "Washington", "Bloemfontien" for "Bloemfontein", "talin" for "Tallinn", "hararee" for "Harare").
    3.  Identify all correctly guessed capitals.
    4.  Identify all user guesses that are clearly incorrect.
    5.  Identify any correct capitals from the list that the user *missed*.
    6.  Create a "shared_capital_info" message *only* if a user's *correct guess* is also a capital of another country (using the provided Context).

    7.  **Create a final "feedback_message" to explain the result.**
        **Grammar Rules:** Use "capital is" if "Number of Correct Capitals" is 1. Use "capitals are" if "Number of Correct Capitals" is greater than 1.

        **Feedback Message Logic (CRITICAL):**
        - **If `all_capitals_guessed` is true (User is 100% correct, including misspellings):**
            - (1 capital): "Correct! The capital of {country_name} is {correct_capitals_list[0]}."
            - (>1 capital): "Correct! The {capital_count} capitals of {country_name} are: {", ".join(correct_capitals_list)}. You got them all!"
        - **If `is_correct` is true BUT `all_capitals_guessed` is false (User is partially correct):**
            - (Must be >1 capital): "Partially correct! You found [count] of the {capital_count} capitals: [list of correct guesses]. The capital cities of {country_name} are: {", ".join(correct_capitals_list)}." Join the list of correct guesses with commas except for the last two, which should be joined with " & ".
        - **If `is_correct` is false (User is 0% correct):**
            - (1 capital): "Incorrect. The capital of {country_name} is {correct_capitals_list[0]}."
            - (>1 capital): "Incorrect. {", ".join(correct_capitals_list)} are the [count] capitals of {country_name}." Join the list of capitals with commas except for the last two, which should be joined with " & ".
        """ + """
    **JSON Output Format:**
    {{
      "is_correct": true,
      "all_capitals_guessed": false,
      "correct_guesses": ["Pretoria"],
      "incorrect_guesses": ["Joburg"],
      "missed_capitals": ["Cape Town", "Bloemfontein"],
      "points_awarded": 1,
      "shared_capital_info": null,
      "feedback_message": "Partially correct! You found 1 of the 3 capitals: Pretoria. The full list is: Pretoria, Cape Town, Bloemfontein."
    }}

    **Grading Rules:**
    - "is_correct": true if *at least one* capital is guessed correctly.
    - "all_capitals_guessed": true only if *all* correct capitals are guessed and there are *no* incorrect guesses.
    - "points_awarded": The count of "correct_guesses". Add a +1 bonus point if "all_capitals_guessed" is true.
    - "shared_capital_info": Null if no shared capitals were guessed.

    **CRITICAL: Respond ONLY with the raw JSON object.**
    """

    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip().replace("```json", "").replace("```", "")
        result_json = json.loads(response_text)
        logger.info(
            f"AI capital grading complete for {country_name}. User: '{user_answer_str}'. Result: {result_json}")
        return result_json
    except Exception as e:
        logger.error(
            f"Error calling Gemini or parsing JSON for capital: {e}\nResponse: {response.text if 'response' in locals() else 'N/A'}")
        capitals_list_str = correct_capitals_str.replace('|', ', ')
        capital_label = "capital is" if capital_count == 1 else "capitals are"
        return {
            "is_correct": False,
            "all_capitals_guessed": False,
            "correct_guesses": [],
            "incorrect_guesses": [user_answer_str],
            "missed_capitals": correct_capitals_list,
            "points_awarded": 0,
            "shared_capital_info": None,
            "feedback_message": f"Sorry, an error occurred. The correct {capital_label}: {capitals_list_str}."
        }

# --- Feature 1 (Reverse): "Guess the Country" Grader ---


def grade_country_answer(correct_country_name, correct_capitals_str, user_answer_str):
    """
    Uses AI to grade the user's country answer, handling misspellings,
    abbreviations, common names, and multi-capital feedback.
    """
    if not api_key:
        logger.error("GEMINI_API_KEY not set. Cannot grade answer.")
        is_correct = user_answer_str.lower() == correct_country_name.lower()
        return {
            "is_correct": is_correct,
            "feedback_message": f"The correct answer is {correct_country_name}." if not is_correct else "Correct!"
        }

    generation_config = {
        "temperature": 0.0,
        "top_p": 1,
        "top_k": 1,
        "max_output_tokens": 1024,
        "response_mime_type": "application/json",
    }

    model = genai.GenerativeModel(
        model_name=ACTIVE_MODEL_NAME,
        generation_config=generation_config,
    )

    all_capitals_map = get_all_capitals_map()

    correct_capitals_list = [c.strip()
                             for c in correct_capitals_str.split('|')]
    capital_count = len(correct_capitals_list)
    capital_name_for_context = correct_capitals_list[0]

    # Prompt for grading Country Answer
    prompt = f"""
    You are an expert geography trivia judge. Your task is to evaluate a user's answer for a "guess the country" question.
    You must provide your response *only* in the specified JSON format.

    **Context:**
    - The Capital Shown to User: "{capital_name_for_context}"
    - The Correct Country: "{correct_country_name}"
    - Full List of Capitals for {correct_country_name}: {json.dumps(correct_capitals_list)}
    - Number of Capitals for {correct_country_name}: {capital_count}
    - User's Answer: "{user_answer_str}"
    - Context (All known capitals and their countries): {json.dumps(all_capitals_map, default=str, indent=2)}

    **Your Task:**
    1.  Determine if "User's Answer" is a correct match for "The Correct Country".
    2.  Be lenient with common misspellings (e.g., "Grmany" for "Germany").
    3.  Be lenient with common names/abbreviations. "USA", "United States", "America", and "U.S.A" are all correct for "United States". "UK" or "Great Britain" are correct for "United Kingdom". "Ivory Coast" is correct for "Côte d'Ivoire".

    4.  **Create a "feedback_message" based on the result:**
        - **If Incorrect:**
            - First, check if the "User's Answer" is *another* country that shares the *same capital* (using the "All known capitals" context).
            - If yes: "Correct! {capital_name_for_context} is the capital of {user_answer_str}. (It's also the capital of: {correct_country_name})."
            - If no: "Incorrect. {capital_name_for_context} is the capital of {correct_country_name}."
        - **If Correct (and 1 total capital):**
            - "Correct! {capital_name_for_context} is the capital of {correct_country_name}."
        - **If Correct (and >1 total capital):**
            - Identify the *other* capitals from the "Full List of Capitals".
            - Format: "Correct! {capital_name_for_context} is one of the {capital_count} capitals of {correct_country_name}. The other capital cities are: [list of other capitals]."
            - Example: "Correct! Pretoria is one of the three capitals of South Africa. The other capital cities are: Cape Town & Bloemfontein."

    **JSON Output Format:**
    {{
      "is_correct": true,
      "feedback_message": "Correct! Pretoria is one of the three capitals of South Africa. The other capital cities are: Cape Town & Bloemfontein."
    }}

    **CRITICAL: Respond ONLY with the raw JSON object.**
    """

    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip().replace("```json", "").replace("```", "")
        result_json = json.loads(response_text)

        if not result_json.get("is_correct"):
            capital_lower = capital_name_for_context.lower()
            user_country_lower = user_answer_str.strip().lower()

            if capital_lower in all_capitals_map:
                all_correct_countries = [c.lower()
                                         for c in all_capitals_map[capital_lower]]

                if user_country_lower in all_correct_countries:
                    logger.info(
                        f"AI missed shared capital. User guess '{user_answer_str}' is also correct for '{capital_name_for_context}'.")
                    result_json["is_correct"] = True
                    # This feedback overrides the AI's "Incorrect"
                    other_countries = [
                        c for c in all_capitals_map[capital_lower] if c.lower() != user_country_lower]
                    result_json[
                        "feedback_message"] = f"Correct! {capital_name_for_context} is the capital of {user_answer_str}. (It's also the capital of: {', '.join(other_countries)})"

        logger.info(
            f"AI country grading complete for {correct_country_name}. User: '{user_answer_str}'. Result: {result_json}")
        return result_json

    except Exception as e:
        logger.error(
            f"Error calling Gemini or parsing JSON for country: {e}\nResponse: {response.text if 'response' in locals() else 'N/A'}")
        return {
            "is_correct": False,
            "feedback_message": f"Sorry, an error occurred. The correct answer is: {correct_country_name}."
        }

# --- Feature 2: Fun Fact Generator ---


def get_fun_fact(country_name):
    """
    Generates a fun fact for a given country, related to user's interests.
    """
    if not api_key:
        return "AI features are currently disabled."

    generation_config = {
        "temperature": 0.7,
        "top_p": 1,
        "top_k": 1,
        "max_output_tokens": 200,
    }

    safety_settings = {
        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
    }

    model = genai.GenerativeModel(
        model_name=ACTIVE_MODEL_NAME,
        generation_config=generation_config,
        safety_settings=safety_settings
    )

    topics = "geography, travel, caribbean history, science, football (soccer), or Formula 1"

    prompt = f"""
    You are a trivia host. Give me one single, interesting "Did you know?" fun fact about {country_name}.
    The fact must be related to one of these topics: {topics}.
    The fact must be 1-2 sentences long.
    Start the fact with "Did you know"
    Respond with *only* the fact.
    """

    try:
        response = model.generate_content(prompt)
        fact = response.text.strip()
        logger.info(f"AI Fun Fact for {country_name}: {fact}")
        return fact
    except Exception as e:
        logger.error(f"Error getting fun fact for {country_name}: {e}")
        return f"Did you know {country_name} is a fascinating place to learn about!"

# --- Feature 3: Dynamic Quiz Generator ---


def generate_ai_quiz(topic, fresh=False):
    """
    Generates a new quiz (5 questions) based on a topic,
    including a fun fact for each answer.
    """
    if not api_key:
        return {"error": "AI features are currently disabled."}

    # --- CACHE LOGIC ---

    cache_key = f"ai_quiz_{topic.replace(' ', '_').lower()}"

    if fresh:
        cache.delete(cache_key)
        logger.info(f"CACHE BUST: 'fresh=true' requested for {topic}")

    cached_quiz = cache.get(cache_key)
    if cached_quiz:
        logger.info(f"CACHE HIT: Returning cached AI quiz for {topic}")
        return cached_quiz

    logger.info(f"CACHE MISS: Calling Gemini for AI quiz on {topic}")

    generation_config = {
        "temperature": 0.5,
        "response_mime_type": "application/json",
    }

    model = genai.GenerativeModel(
        model_name=ACTIVE_MODEL_NAME,
        generation_config=generation_config,
    )

    # Prompt for generating AI quiz
    prompt = f"""
    You are a trivia game API. Your task is to generate a list of 5 (five) multiple-choice trivia questions about {topic}.
    
    You must provide your response *only* in the specified JSON format: A single JSON list `[...]`.
    Each object in the list must have *exactly* these keys:
    - "id": A unique integer (e.g., 1, 2, 3...).
    - "question": The question string.
    - "options": A list of 4 (four) string options.
    - "correctAnswer": The string of the correct answer, which *must* match one of the options.
    - "funFact": A "Did you know" fun fact (1-2 sentences) related to the 'correctAnswer'.

    **Example JSON format:**
    [
      {{
        "id": 1,
        "question": "Which driver won the 2008 F1 World Championship?",
        "options": ["Fernando Alonso", "Lewis Hamilton", "Kimi Räikkönen", "Sebastian Vettel"],
        "correctAnswer": "Lewis Hamilton",
        "funFact": "Did you know? Lewis Hamilton won his first championship on the very last corner of the last lap of the season."
      }},
      {{
        "id": 2,
        "question": "Which team is based in Maranello, Italy?",
        "options": ["Mercedes", "Red Bull", "McLaren", "Ferrari"],
        "correctAnswer": "Ferrari",
        "funFact": "Did you know that Ferrari's headquarters in Maranello includes its own test track, the Pista di Fiorano."
      }}
    ]

    **CRITICAL: Respond ONLY with the raw JSON list. Do not add "```json" or any other text.**
    """

    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        quiz_data = json.loads(response_text)

        if not isinstance(quiz_data, list) or len(quiz_data) == 0:
            raise ValueError("AI did not return a list.")
        if not all("question" in q and "options" in q and "correctAnswer" in q and "funFact" in q for q in quiz_data):
            raise ValueError(
                "AI returned malformed question objects. Missing a key.")

        # Cache the quiz for 30 mins
        cache.set(cache_key, quiz_data, timeout=60*30)

        logger.info(f"AI Quiz generated for topic: {topic}")
        return quiz_data
    except Exception as e:
        logger.error(
            f"Error generating AI quiz for {topic}: {e}\nResponse: {response.text if 'response' in locals() else 'N/A'}")
        return {"error": f"Failed to generate AI quiz: {e}"}
