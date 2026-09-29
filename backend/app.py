import os
import json
import re
import math
from datetime import datetime

import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv

from google import genai
from google.genai import types


# =========================================================
# LOAD ENVIRONMENT VARIABLES
# =========================================================

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODELS = [
    model.strip()
    for model in os.getenv(
        "GEMINI_MODELS",
        "gemini-3.8-flash,gemini-3.8-flash-lite"
    ).split(",")
    if model.strip()
]
USDA_API_KEY = os.getenv("USDA_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "5000"))
FLASK_DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
CORS_ORIGINS = [
    origin.strip()
    for origin in cors_origins.split(",")
    if origin.strip()
]


# =========================================================
# FLASK SETUP
# =========================================================

app = Flask(__name__)
CORS(app, origins=CORS_ORIGINS)


# =========================================================
# DATABASE SETUP
# =========================================================

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, "meallens.db")

app.config["SQLALCHEMY_DATABASE_URI"] = (
    DATABASE_URL or "sqlite:///" + DATABASE_PATH
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

print("DATABASE:", DATABASE_PATH)


# =========================================================
# DATABASE MODELS
# =========================================================

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(100), nullable=False)

    email = db.Column(
        db.String(150),
        unique=True,
        nullable=False
    )

    password = db.Column(
        db.String(200),
        nullable=False
    )

    meals = db.relationship(
        "Meal",
        backref="user",
        lazy=True,
        cascade="all, delete-orphan"
    )


class Meal(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("user.id"),
        nullable=False
    )

    image_name = db.Column(
        db.String(255),
        nullable=True
    )

    total_calories = db.Column(
        db.Float,
        default=0
    )

    total_protein = db.Column(
        db.Float,
        default=0
    )

    total_carbs = db.Column(
        db.Float,
        default=0
    )

    total_fat = db.Column(
        db.Float,
        default=0
    )

    total_fiber = db.Column(
        db.Float,
        default=0
    )

    total_sugar = db.Column(
        db.Float,
        default=0
    )

    total_sodium = db.Column(
        db.Float,
        default=0
    )

    foods_json = db.Column(
        db.Text,
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )


# =========================================================
# CREATE DATABASE TABLES
# =========================================================

with app.app_context():
    db.create_all()

print("Database tables ready.")


# =========================================================
# AI CLIENTS
# =========================================================

gemini_client = None


if GEMINI_API_KEY:
    gemini_client = genai.Client(
        api_key=GEMINI_API_KEY
    )


def generate_gemini_content(contents, config=None):

    if not gemini_client:
        raise Exception(
            "Gemini API key is missing."
        )

    last_error = None

    for model in GEMINI_MODELS:
        for attempt in range(2):
            try:
                return gemini_client.models.generate_content(
                    model=model,
                    contents=contents,
                    config=config
                )
            except Exception as error:
                last_error = error
                error_text = str(error).upper()

                if not any(
                    marker in error_text
                    for marker in ("503", "429", "UNAVAILABLE", "RESOURCE_EXHAUSTED")
                ):
                    raise

                print(
                    f"Gemini model {model} unavailable "
                    f"(attempt {attempt + 1}/2); trying fallback."
                )

    raise Exception(
        "Gemini is temporarily unavailable. Please try again in a moment."
    ) from last_error


# =========================================================
# TEXT CLEANING
# =========================================================

def clean_text(text):
    if not text:
        return ""

    text = str(text).lower().strip()

    text = re.sub(
        r"[^a-z0-9\s]",
        " ",
        text
    )

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text


# =========================================================
# TOKENIZATION
# =========================================================

def tokenize(text):
    text = clean_text(text)

    if not text:
        return set()

    return set(text.split())


# =========================================================
# GEMINI FOOD DETECTION
# =========================================================

def detect_foods_with_gemini(
    image_bytes,
    mime_type="image/jpeg"
):

    if not gemini_client:
        raise Exception(
            "Gemini API key is missing."
        )

    prompt = """
Analyze this food image carefully as a nutrition estimation assistant.

Identify every clearly visible food item.

For each food item:

1. Give the most specific realistic food name possible, including preparation
    only when it is visibly clear (for example, "raspberries, fresh" or
    "chocolate cake"). Never name a sauce, garnish, or ingredient that is not
    visibly present.
2. Estimate the edible portion in grams from the visible portion, not from a
    typical restaurant serving.
3. Do NOT calculate calories.
4. Do NOT calculate protein.
5. Do NOT calculate carbohydrates.
6. Do NOT calculate fat.
7. Do NOT invent nutrition values.

Return ONLY valid JSON.

Required format:

{
    "foods": [
        {
            "name": "food name",
            "portion_grams": 100
        }
    ]
}

Important:

- Use grams for portion_grams.
- Estimate the portion based on visible size.
- Do not confuse a garnish or sauce with a large food portion.
- Do not use calorie or macro knowledge to invent foods that are not visible.
- If the image is ambiguous, return the simplest likely food name and keep the
    portion conservative.
- Treat a named mixed dish as containing its visible components. For example,
    do not list "biryani rice" separately when it is part of "chicken biryani".
- List a component separately only when it is visibly a separate serving on
    the plate.
- If multiple foods are visible, list them separately.
- Do not include plates, spoons, glasses or containers.
- Do not include explanations outside JSON.
"""

    response = generate_gemini_content(
        contents=[
            types.Part.from_bytes(
                data=image_bytes,
                mime_type=mime_type
            ),
            prompt
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema={
                "type": "OBJECT",
                "properties": {
                    "foods": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "name": {"type": "STRING"},
                                "portion_grams": {"type": "NUMBER"}
                            },
                            "required": ["name", "portion_grams"]
                        }
                    }
                },
                "required": ["foods"]
            },
            temperature=0
        )
    )

    text = response.text.strip()

    # Remove markdown code fences if Gemini adds them
    text = re.sub(
        r"^```json\s*",
        "",
        text,
        flags=re.IGNORECASE
    )

    text = re.sub(
        r"^```\s*",
        "",
        text
    )

    text = re.sub(
        r"\s*```$",
        "",
        text
    )

    try:
        data = json.loads(text)
    except json.JSONDecodeError:

        # Try extracting JSON object
        match = re.search(
            r"\{.*\}",
            text,
            re.DOTALL
        )

        if not match:
            raise Exception(
                "Gemini returned invalid JSON."
            )

        data = json.loads(
            match.group(0)
        )

    foods = data.get("foods", [])

    if not isinstance(foods, list):
        raise Exception(
            "Gemini returned invalid food list."
        )

    cleaned_foods = []

    for food in foods:

        if not isinstance(food, dict):
            continue

        name = str(
            food.get("name", "")
        ).strip()

        portion = food.get(
            "portion_grams"
        )

        try:
            portion = float(portion)
        except (TypeError, ValueError):
            continue

        if not name or not math.isfinite(portion) or portion <= 0:
            continue

        # Prevent one hallucinated portion estimate from dominating totals.
        portion = min(max(portion, 5), 1000)

        cleaned_foods.append({
            "name": name,
            "portion_grams": portion
        })

    if not cleaned_foods:
        raise Exception(
            "No food items were detected."
        )

    return cleaned_foods


def consolidate_detected_foods(foods):

    ignored_words = {
        "fresh", "raw", "whole", "sliced", "chopped", "small", "large",
        "piece", "pieces", "serving", "leaves", "leaf"
    }

    preparation_words = {
        "sauce", "coulis", "syrup", "fried", "breaded", "candied",
        "sweetened", "frosted", "cream", "juice", "smoothie", "canned",
        "dried", "frozen", "candy", "dessert", "pastry", "pudding",
        "drink", "beverage", "cocktail"
    }

    groups = {}

    for food in foods:
        words = []

        for word in tokenize(food["name"]):
            if word in ignored_words:
                continue

            if word.endswith("ies") and len(word) > 4:
                word = word[:-3] + "y"
            elif word.endswith("s") and len(word) > 3:
                word = word[:-1]

            words.append(word)

        content_key = tuple(sorted(words))
        preparation_key = tuple(sorted(
            word for word in words if word in preparation_words
        ))
        group_key = (content_key, preparation_key)

        if group_key not in groups:
            groups[group_key] = {
                "name": food["name"],
                "portion_grams": food["portion_grams"]
            }
        else:
            groups[group_key]["portion_grams"] += food["portion_grams"]

    return list(groups.values())


# =========================================================
# USDA SEARCH
# =========================================================

USDA_URL = (
    "https://api.nal.usda.gov/fdc/v1/foods/search"
)
USDA_DETAIL_URL = (
    "https://api.nal.usda.gov/fdc/v1/food"
)


def search_usda(food_name, page_size=10):

    if not USDA_API_KEY:
        raise Exception(
            "USDA API key is missing."
        )

    params = {
        "api_key": USDA_API_KEY,
        "query": food_name,
        "pageSize": page_size,
        "dataType": (
            "Foundation,"
            "SR Legacy,"
            "Survey (FNDDS)"
        )
    }

    response = requests.get(USDA_URL, params=params, timeout=8)

    # USDA occasionally rejects a combined dataType filter for otherwise
    # valid searches. Retry the same query without that optional filter.
    if response.status_code == 400:
        params.pop("dataType", None)
        response = requests.get(USDA_URL, params=params, timeout=8)

    response.raise_for_status()

    data = response.json()

    return data.get(
        "foods",
        []
    )


def get_usda_food_details(food):

    fdc_id = food.get("fdcId")

    if not fdc_id or not USDA_API_KEY:
        return food

    try:
        response = requests.get(
            f"{USDA_DETAIL_URL}/{fdc_id}",
            params={"api_key": USDA_API_KEY},
            timeout=8
        )
        response.raise_for_status()
        details = response.json()
        details["_match_score"] = food.get("_match_score", 0)
        details["_text_match_score"] = food.get("_text_match_score", 0)
        return details
    except requests.RequestException as error:
        print("USDA detail lookup error:", error)
        return food


# =========================================================
# GENERATE GENERIC USDA SEARCH QUERIES
# =========================================================

def generate_usda_queries(food_name):

    original = food_name.strip()
    normalized = clean_text(original)

    tokens = normalized.split()
    queries = []

    if original:
        queries.append(original)

    # Remove visual-description words that usually hurt USDA search.
    removable_words = {
        "fresh", "raw", "whole", "sliced", "chopped", "small", "large",
        "piece", "pieces", "serving", "homemade", "homemade-style",
        "flourless", "masala", "butter", "stuffed", "homestyle",
        "garnish", "garnished", "decoration", "decorative"
    }

    core_tokens = [
        token for token in tokens
        if token not in removable_words
    ]

    if core_tokens:
        queries.append(" ".join(core_tokens))

    # Useful preparation-specific alternatives.
    synonym_queries = {
        "flourless chocolate cake": [
            "chocolate cake",
            "chocolate cake prepared from recipe"
        ],
        "butter naan": ["naan"],
        "masala dosa": ["dosa"],
        "raspberry sauce": [
            "raspberry sauce",
            "raspberry syrup",
            "raspberries sauce",
            "fruit sauce raspberry"
        ],
        "raspberry coulis": [
            "raspberry sauce",
            "raspberry syrup",
            "raspberries sauce"
        ],
        "raspberry syrup": [
            "raspberry sauce",
            "fruit syrup raspberry"
        ],
        "mint garnish": [
            "mint fresh",
            "spearmint fresh",
            "mint leaves fresh"
        ],
        "fresh mint garnish": [
            "mint fresh",
            "spearmint fresh",
            "mint leaves fresh"
        ]
    }

    queries.extend(
        synonym_queries.get(normalized, [])
    )

    # Generic fallback for any "... garnish" label.
    if "garnish" in tokens:
        garnish_core = [
            token for token in tokens
            if token != "garnish"
        ]
        if garnish_core:
            queries.append(" ".join(garnish_core))
            queries.append(" ".join(garnish_core) + " fresh")

    # Remove duplicates while preserving order.
    final_queries = []

    for query in queries:
        query = query.strip()

        if query and query not in final_queries:
            final_queries.append(query)

    return final_queries


def generate_food_search_name(food_name):

    if not gemini_client:
        return food_name

    prompt = f"""
Convert this detected food name into one concise, generic English food name
that is most likely to exist in USDA FoodData Central.

Detected food:
{food_name}

Rules:
- Preserve the actual food identity.
- Preserve important preparation words such as sauce, syrup, cake, fried,
  dried, canned, sweetened, etc.
- Remove visual-only words such as garnish, decoration, small, large, piece,
  fresh when they are not needed for USDA search.
- Do not replace a prepared food with its main ingredient.
- Do not calculate nutrition.
- Do not invent ingredients.
- Return ONLY the food name.
"""

    try:
        response = generate_gemini_content(
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0)
        )

        normalized = clean_text(response.text)

        return normalized or food_name

    except Exception as error:
        print("Food search normalization error:", error)
        return food_name


# =========================================================
# USDA NUTRIENT EXTRACTION
# =========================================================

def get_nutrient(food, nutrient_names):

    nutrients = food.get(
        "foodNutrients",
        []
    )

    target_numbers = {
        str(target).lower()
        for target in nutrient_names
        if str(target).isdigit()
    }

    target_names = {
        str(target).strip().lower()
        for target in nutrient_names
        if not str(target).isdigit()
    }

    matches = []
    name_matches = []

    for nutrient in nutrients:
        nested_nutrient = nutrient.get("nutrient", {})
        name = str(
            nutrient.get("nutrientName")
            or nested_nutrient.get("name", "")
        ).strip().lower()
        number = str(
            nutrient.get("nutrientNumber")
            or nested_nutrient.get("number")
            or nutrient.get("nutrientId", "")
        ).strip().lower()

        if number in target_numbers:
            matches.append(nutrient)
        elif name in target_names:
            name_matches.append(nutrient)

    # Prefer USDA nutrient numbers. Names are retained only for older or
    # reduced USDA payloads that omit nutrientNumber.
    matches = matches or name_matches

    for nutrient in matches:
        nested_nutrient = nutrient.get("nutrient", {})

        try:
            value = float(
                nutrient.get("value", nutrient.get("amount", 0))
                or 0
            )
        except (TypeError, ValueError):
            continue

        unit = str(
            nutrient.get("unitName")
            or nested_nutrient.get("unitName", "")
        ).strip().lower()

        # USDA energy may be reported as kJ; the UI and database use kcal.
        if "1008" in target_numbers and unit in {"kj", "kilojoule", "kilojoules"}:
            value /= 4.184

        return value

    return 0.0


# =========================================================
# EXTRACT USDA NUTRITION
# =========================================================

def extract_nutrition(food):

    calories = get_nutrient(
        food,
        [
            "energy",
            "1008"
        ]
    )

    protein = get_nutrient(
        food,
        [
            "protein",
            "203"
        ]
    )

    carbs = get_nutrient(
        food,
        [
            "carbohydrate",
            "carbohydrate, by difference",
            "205",
            "1005"
        ]
    )

    fat = get_nutrient(
        food,
        [
            "total lipid",
            "fat",
            "204"
        ]
    )

    fiber = get_nutrient(
        food,
        [
            "fiber",
            "fiber, total dietary",
            "291",
            "1079"
        ]
    )

    sugar = get_nutrient(
        food,
        [
            "sugars",
            "269"
        ]
    )

    sodium = get_nutrient(
        food,
        [
            "sodium",
            "307"
        ]
    )

    return {
        "calories": calories,
        "protein": protein,
        "carbs": carbs,
        "fat": fat,
        "fiber": fiber,
        "sugar": sugar,
        "sodium": sodium
    }


# =========================================================
# USDA DATA QUALITY
# =========================================================

def data_quality_score(food):

    data_type = str(
        food.get(
            "dataType",
            ""
        )
    ).lower()

    score = 0

    if "foundation" in data_type:
        score += 30

    elif "sr legacy" in data_type:
        score += 25

    elif "survey" in data_type:
        score += 20

    else:
        score += 5

    nutrition = extract_nutrition(
        food
    )

    non_zero = sum(
        1
        for value in nutrition.values()
        if value > 0
    )

    score += non_zero * 2

    return score


# =========================================================
# TEXT MATCHING
# =========================================================

def text_match_score(
    detected_name,
    candidate_name
):

    detected = clean_text(
        detected_name
    )

    candidate = clean_text(
        candidate_name
    )

    ignored_tokens = {
        "fresh", "raw", "whole", "sliced", "chopped", "small", "large",
        "piece", "pieces", "serving", "style", "type", "food"
    }

    def content_tokens(value):
        normalized = set()

        for token in tokenize(value):
            if token in ignored_tokens:
                continue

            if token.endswith("ies") and len(token) > 4:
                token = token[:-3] + "y"
            elif token.endswith("s") and len(token) > 3:
                token = token[:-1]

            normalized.add(token)

        return normalized

    detected_tokens = content_tokens(detected)
    candidate_tokens = content_tokens(candidate)

    if not detected_tokens:
        return 0

    score = 0

    common_tokens = detected_tokens & candidate_tokens

    # Shared descriptors such as "fresh" are not food identity. Reject a
    # candidate with no content-word relationship before quality scoring can
    # make it look attractive.
    substring_matches = {
        detected_token
        for detected_token in detected_tokens
        if any(
            detected_token in candidate_token
            or candidate_token in detected_token
            for candidate_token in candidate_tokens
        )
    }
    common_tokens |= substring_matches

    if not common_tokens:
        return 0

    coverage = (
        len(common_tokens)
        / len(detected_tokens)
    )

    score += coverage * 60

    if detected == candidate:
        score += 30

    elif detected in candidate:
        score += 20

    elif candidate in detected:
        score += 15

    missing_words = detected_tokens - candidate_tokens
    extra_words = candidate_tokens - detected_tokens

    score -= len(missing_words) * 8
    score -= len(extra_words) * 5

    # A candidate with a different preparation is usually a worse match than
    # a plain food record with slightly different wording.
    preparation_terms = {
        "cake", "pie", "tart", "cookie", "sauce", "coulis", "syrup",
        "fried", "breaded", "candied", "sweetened", "frosted", "cream",
        "juice", "smoothie", "canned", "dried", "frozen", "candy",
        "candies", "dessert", "pastry", "pudding", "ice", "julep",
        "drink", "beverage", "cocktail", "chocolate"
    }
    unexpected_preparation = (candidate_tokens & preparation_terms) - (
        detected_tokens & preparation_terms
    )
    score -= len(unexpected_preparation) * 25

    return max(
        0,
        score
    )


# =========================================================
# NUTRITION CONSISTENCY
# =========================================================

def nutrition_consistency_score(
    nutrition
):

    protein = nutrition[
        "protein"
    ]

    carbs = nutrition[
        "carbs"
    ]

    fat = nutrition[
        "fat"
    ]

    reported_calories = nutrition[
        "calories"
    ]

    estimated_calories = (
        protein * 4
        + carbs * 4
        + fat * 9
    )

    if (
        reported_calories <= 0
        or estimated_calories <= 0
    ):
        return 0

    difference = abs(
        reported_calories
        - estimated_calories
    )

    percentage = (
        difference
        / reported_calories
    )

    if percentage <= 0.10:
        return 15

    if percentage <= 0.20:
        return 10

    if percentage <= 0.35:
        return 5

    return 0


# =========================================================
# SCORE USDA CANDIDATE
# =========================================================

def score_usda_candidate(
    detected_name,
    food
):

    candidate_name = food.get(
        "description",
        ""
    )

    nutrition = extract_nutrition(
        food
    )

    text_score = text_match_score(
        detected_name,
        candidate_name
    )

    quality_score = data_quality_score(
        food
    )

    nutrition_score = (
        nutrition_consistency_score(
            nutrition
        )
    )

    total_score = (
        text_score
        + quality_score
        + nutrition_score
    )

    return total_score


# =========================================================
# GET USDA CANDIDATES
# =========================================================

def get_usda_candidates(
    food_name
):

    queries = generate_usda_queries(
        food_name
    )

    candidates = {}

    for query in queries:

        try:
            results = search_usda(
                query,
                page_size=10
            )

        except Exception as error:

            print(
                "USDA search error:",
                error
            )

            continue

        for food in results:

            fdc_id = food.get(
                "fdcId"
            )

            if not fdc_id:
                continue

            if fdc_id not in candidates:

                score = score_usda_candidate(
                    food_name,
                    food
                )

                text_score = text_match_score(
                    food_name,
                    food.get("description", "")
                )

                if text_score < 25:
                    continue

                food["_text_match_score"] = text_score
                food["_match_score"] = score

                candidates[fdc_id] = food

    sorted_candidates = sorted(
        candidates.values(),
        key=lambda x: x.get(
            "_match_score",
            0
        ),
        reverse=True
    )

    print(
        "\nUSDA candidates for:",
        food_name
    )

    for candidate in sorted_candidates[:10]:

        print(
            candidate.get(
                "description",
                ""
            ),
            "| score:",
            round(
                candidate.get(
                    "_match_score",
                    0
                ),
                2
            )
        )

    return sorted_candidates[:8]


# =========================================================
# AI USDA SEMANTIC VERIFIER
# =========================================================

def verify_usda_match_with_gemini(
    food_name,
    candidates
):

    if not gemini_client or not candidates:
        return -1

    candidate_text = []

    for index, candidate in enumerate(
        candidates
    ):

        candidate_text.append(
            f"""
CANDIDATE {index}

Description:
{candidate.get("description", "")}

Data type:
{candidate.get("dataType", "")}

Food category:
{candidate.get("foodCategory", "")}
"""
        )

    candidates_text = "\n".join(
        candidate_text
    )

    prompt = f"""
You are a food identification and USDA matching expert.

The detected food from an image is:

"{food_name}"

We searched the USDA FoodData Central database
and found these candidates.

Choose the single USDA candidate that best represents
the visible food. This choice will be used to obtain
nutrition values for the detected portion.

Do not calculate nutrition.

Do not invent a food.

Pay attention to:
- food identity
- preparation style
- major ingredients
- dish type
- whether the candidate actually represents
  the detected food
- obvious mismatches

Candidates:

{candidates_text}

Return ONLY valid JSON in this exact format:

{{"candidate_index": 0}}

Use {{"candidate_index": -1}} only if none of the candidates
represents the detected food. Never select a sauce, garnish,
drink, dessert, or prepared dish when the detected item is a
plain ingredient, and never select a plain ingredient when the
detected item is a prepared dish.
"""

    try:
        # Routed through the shared fallback helper (retries across
        # GEMINI_MODELS on 503/429/UNAVAILABLE/RESOURCE_EXHAUSTED) instead
        # of calling gemini_client directly against a single hardcoded model.
        response = generate_gemini_content(
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0
            )
        )

        answer = response.text.strip()
        answer = re.sub(r"^```json\s*", "", answer, flags=re.IGNORECASE)
        answer = re.sub(r"\s*```$", "", answer)

        data = json.loads(answer)
        selected_index = int(data.get("candidate_index", -1))

        if selected_index < 0 or selected_index >= len(candidates):
            return -1

        print(
            "Gemini selected candidate:",
            selected_index
        )

        return selected_index

    except Exception as error:

        print("Gemini USDA verification error:", error)

        # The candidates are already sorted by generic identity score. This
        # preserves useful nutrition when the verifier is temporarily down.
        return -1


# =========================================================
# SCALE NUTRITION BY PORTION
# =========================================================

def scale_nutrition(
    nutrition,
    portion_grams
):

    multiplier = (
        portion_grams / 100.0
    )

    return {
        "calories": nutrition[
            "calories"
        ] * multiplier,

        "protein": nutrition[
            "protein"
        ] * multiplier,

        "carbs": nutrition[
            "carbs"
        ] * multiplier,

        "fat": nutrition[
            "fat"
        ] * multiplier,

        "fiber": nutrition[
            "fiber"
        ] * multiplier,

        "sugar": nutrition[
            "sugar"
        ] * multiplier,

        "sodium": nutrition[
            "sodium"
        ] * multiplier
    }


# =========================================================
# ROUND NUTRITION
# =========================================================

def round_nutrition(
    nutrition
):

    return {
        "calories": round(
            nutrition["calories"],
            1
        ),

        "protein": round(
            nutrition["protein"],
            1
        ),

        "carbs": round(
            nutrition["carbs"],
            1
        ),

        "fat": round(
            nutrition["fat"],
            1
        ),

        "fiber": round(
            nutrition["fiber"],
            1
        ),

        "sugar": round(
            nutrition["sugar"],
            1
        ),

        "sodium": round(
            nutrition["sodium"],
            1
        )
    }


def unavailable_nutrition():

    return {
        "calories": None,
        "protein": None,
        "carbs": None,
        "fat": None,
        "fiber": None,
        "sugar": None,
        "sodium": None
    }


def has_usable_nutrition(nutrition):

    # A single non-zero field is not enough. MealLens must have the
    # core nutrition values before it can claim that a food was analyzed.
    required_keys = (
        "calories",
        "protein",
        "carbs",
        "fat"
    )

    return all(
        isinstance(nutrition.get(key), (int, float))
        and math.isfinite(nutrition.get(key))
        and nutrition.get(key) >= 0
        for key in required_keys
    ) and nutrition.get("calories", 0) > 0


# =========================================================
# SELECT COMPLETE USDA RECORD
# =========================================================

def select_complete_candidate(
    candidates,
    selected_index
):

    selected_food = candidates[selected_index]
    selected_nutrition = extract_nutrition(selected_food)

    has_macros = any(
        selected_nutrition[key] > 0
        for key in ("protein", "carbs", "fat")
    )

    # USDA can return duplicate records with missing energy or fiber fields.
    # Never scale a contradictory record such as carbs > 0 with 0 kcal.
    if not (selected_nutrition["calories"] <= 0 and has_macros):
        return selected_index

    valid_candidates = []

    for index, candidate in enumerate(candidates):
        nutrition = extract_nutrition(candidate)

        if nutrition["calories"] > 0:
            valid_candidates.append((index, candidate))

    if not valid_candidates:
        return selected_index

    replacement_index, replacement = max(
        valid_candidates,
        key=lambda item: item[1].get("_match_score", 0)
    )

    print(
        "Replaced incomplete USDA record:",
        selected_food.get("description", ""),
        "with:",
        replacement.get("description", "")
    )

    return replacement_index


# =========================================================
# ANALYZE ONE FOOD
# =========================================================

def analyze_single_food(
    food_name,
    portion_grams
):

    print(
        "\\nAnalyzing food:",
        food_name
    )

    print(
        "Estimated portion:",
        portion_grams,
        "g"
    )

    # ---------------------------------------------------------
    # STEP A: NORMALIZE THE VISION RESULT FOR USDA SEARCH
    # ---------------------------------------------------------

    search_name = generate_food_search_name(food_name)

    print(
        "USDA search name:",
        search_name
    )

    # Search using the normalized name first, then the original
    # vision result. This gives the USDA search several chances to
    # find a valid record instead of immediately returning N/A.
    search_names = []

    for name in (search_name, food_name):
        name = str(name).strip()

        if name and name not in search_names:
            search_names.append(name)

    candidates = []

    for name in search_names:

        current_candidates = get_usda_candidates(name)

        if current_candidates:
            candidates.extend(current_candidates)

    # Remove duplicate USDA records while preserving the best score.
    unique_candidates = {}

    for candidate in candidates:

        fdc_id = candidate.get("fdcId")

        if not fdc_id:
            continue

        existing = unique_candidates.get(fdc_id)

        if (
            existing is None
            or candidate.get("_match_score", 0)
            > existing.get("_match_score", 0)
        ):
            unique_candidates[fdc_id] = candidate

    candidates = sorted(
        unique_candidates.values(),
        key=lambda item: item.get("_match_score", 0),
        reverse=True
    )[:12]

    if not candidates:

        raise Exception(
            f"Could not find a reliable USDA nutrition match for "
            f"'{food_name}'. The meal was not saved."
        )

    # ---------------------------------------------------------
    # STEP B: SEMANTIC VALIDATION
    # ---------------------------------------------------------

    verified_index = verify_usda_match_with_gemini(
        food_name,
        candidates
    )

    # If Gemini explicitly says none of the candidates represents
    # the food, do not silently accept a random USDA record.
    if verified_index < 0:

        best_text_score = candidates[0].get(
            "_text_match_score",
            0
        )

        # A strong deterministic text match is acceptable when the
        # semantic verifier is temporarily unavailable.
        if best_text_score >= 50:
            selected_index = 0
        else:
            raise Exception(
                f"USDA could not reliably verify '{food_name}'. "
                f"The meal was not saved."
            )

    else:
        selected_index = verified_index

    selected_index = select_complete_candidate(
        candidates,
        selected_index
    )

    selected_food = candidates[selected_index]

    # ---------------------------------------------------------
    # STEP C: REJECT WEAK MATCHES
    # ---------------------------------------------------------

    text_score = selected_food.get(
        "_text_match_score",
        0
    )

    if text_score < 40:

        raise Exception(
            f"USDA match for '{food_name}' was too weak "
            f"(score {round(text_score)}). The meal was not saved."
        )

    selected_food = get_usda_food_details(
        selected_food
    )

    base_nutrition = extract_nutrition(
        selected_food
    )

    # ---------------------------------------------------------
    # STEP D: FIND ANOTHER USDA RECORD IF NEEDED
    # ---------------------------------------------------------

    if not has_usable_nutrition(base_nutrition):

        for candidate in candidates:

            if candidate.get("fdcId") == selected_food.get("fdcId"):
                continue

            if candidate.get("_text_match_score", 0) < 40:
                continue

            alternative = get_usda_food_details(
                candidate
            )

            alternative_nutrition = extract_nutrition(
                alternative
            )

            if has_usable_nutrition(alternative_nutrition):

                selected_food = alternative
                base_nutrition = alternative_nutrition

                print(
                    "Recovered using alternate USDA record:",
                    selected_food.get("description", "")
                )

                break

    if not has_usable_nutrition(base_nutrition):

        raise Exception(
            f"USDA found records for '{food_name}', but none contained "
            f"complete usable nutrition data. The meal was not saved."
        )

    # ---------------------------------------------------------
    # STEP E: SCALE TO THE DETECTED PORTION
    # ---------------------------------------------------------

    scaled = scale_nutrition(
        base_nutrition,
        portion_grams
    )

    # ---------------------------------------------------------
    # STEP F: FINAL NUTRITION SANITY CHECK
    # ---------------------------------------------------------

    consistency = nutrition_consistency_score(
        scaled
    )

    if consistency == 0:

        print(
            "Warning: USDA nutrition has a weak calorie/macro consistency "
            "for:",
            food_name
        )

        # Do not invent replacement nutrition. Reject the record
        # rather than presenting suspicious numbers as fact.
        raise Exception(
            f"Nutrition validation failed for '{food_name}'. "
            f"The meal was not saved."
        )

    score = selected_food.get(
        "_match_score",
        0
    )

    confidence = min(
        100,
        max(
            0,
            round(score)
        )
    )

    result = {
        "name": food_name,

        "portion_grams": portion_grams,

        "matched_usda_food":
            selected_food.get(
                "description",
                ""
            ),

        "usda_fdc_id":
            selected_food.get(
                "fdcId"
            ),

        "match_status": "matched",

        "confidence": confidence,

        "nutrition":
            round_nutrition(
                scaled
            )
    }

    print(
        "Selected USDA food:",
        result["matched_usda_food"]
    )

    print(
        "Nutrition:",
        result["nutrition"]
    )

    return result


# =========================================================
# TOTAL NUTRITION
# =========================================================

def calculate_total_nutrition(
    results
):

    total = {
        "calories": 0.0,
        "protein": 0.0,
        "carbs": 0.0,
        "fat": 0.0,
        "fiber": 0.0,
        "sugar": 0.0,
        "sodium": 0.0
    }

    for result in results:

        nutrition = result.get(
            "nutrition",
            {}
        )

        for key in total:

            value = nutrition.get(key)

            if isinstance(value, (int, float)) and math.isfinite(value):
                total[key] += value

    return round_nutrition(
        total
    )


# =========================================================
# REGISTER
# =========================================================

@app.route(
    "/register",
    methods=["POST"]
)
@app.route(
    "/auth/register",
    methods=["POST"]
)
def register():

    data = request.get_json()

    if not data:
        return jsonify({
            "message": "No data received."
        }), 400

    name = data.get(
        "name",
        ""
    ).strip()

    email = data.get(
        "email",
        ""
    ).strip().lower()

    password = data.get(
        "password",
        ""
    )

    if not name or not email or not password:

        return jsonify({
            "message":
                "Name, email and password are required."
        }), 400

    existing_user = User.query.filter_by(
        email=email
    ).first()

    if existing_user:

        return jsonify({
            "message":
                "Email already registered."
        }), 409

    user = User(
        name=name,
        email=email,
        password=password
    )

    db.session.add(user)
    db.session.commit()

    print(
        "User registered:",
        user.id,
        email
    )

    return jsonify({
        "message":
            "Registration successful.",
        "user_id":
            user.id,
        "name":
            user.name,
        "email":
            user.email
    }), 201


# =========================================================
# LOGIN
# =========================================================

@app.route(
    "/login",
    methods=["POST"]
)
@app.route(
    "/auth/login",
    methods=["POST"]
)
def login():

    data = request.get_json()

    if not data:
        return jsonify({
            "message": "No data received."
        }), 400

    email = data.get(
        "email",
        ""
    ).strip().lower()

    password = data.get(
        "password",
        ""
    )

    user = User.query.filter_by(
        email=email
    ).first()

    if not user:

        return jsonify({
            "message":
                "Invalid email or password."
        }), 401

    if user.password != password:

        return jsonify({
            "message":
                "Invalid email or password."
        }), 401

    print(
        "User logged in:",
        user.id,
        email
    )

    return jsonify({
        "message":
            "Login successful.",
        "user_id":
            user.id,
        "name":
            user.name,
        "email":
            user.email
    })


# =========================================================
# ANALYZE MEAL
# =========================================================

@app.route(
    "/meals/analyze",
    methods=["POST"]
)
def analyze_meal():

    if "image" not in request.files:

        return jsonify({
            "message":
                "No image received."
        }), 400

    image = request.files[
        "image"
    ]

    user_id = request.form.get(
        "user_id"
    )

    if not user_id:

        return jsonify({
            "message":
                "User ID is required."
        }), 400

    try:
        user_id = int(user_id)

    except ValueError:

        return jsonify({
            "message":
                "Invalid user ID."
        }), 400

    user = db.session.get(
        User,
        user_id
    )

    if not user:

        return jsonify({
            "message":
                "User not found."
        }), 404

    try:

        image_bytes = image.read()

        # ---------------------------------------------
        # STEP 1: GEMINI VISION
        # ---------------------------------------------

        allowed_mime_types = {
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/heic",
            "image/heif",
        }

        mime_type = image.mimetype or "image/jpeg"

        if mime_type not in allowed_mime_types:
            return jsonify({
                "message": "Unsupported image type. Please upload JPG, PNG, or WebP."
            }), 400

        detected_foods = detect_foods_with_gemini(
            image_bytes,
            mime_type
        )

        print(
            "\nGemini detected:",
            detected_foods
        )

        detected_foods = consolidate_detected_foods(
            detected_foods
        )

        print(
            "Consolidated foods:",
            detected_foods
        )

        # ---------------------------------------------
        # STEP 2: USDA + Gemini semantic matching
        # ---------------------------------------------

        nutrition_results = []

        for food in detected_foods:

            result = analyze_single_food(
                food["name"],
                food["portion_grams"]
            )

            nutrition_results.append(
                result
            )

        # ---------------------------------------------
        # STEP 3: VALIDATE COMPLETE ANALYSIS
        # ---------------------------------------------

        failed_foods = [
            result
            for result in nutrition_results
            if result.get("match_status") != "matched"
            or not has_usable_nutrition(result.get("nutrition", {}))
        ]

        if failed_foods:
            failed_names = ", ".join(
                result.get("name", "unknown food")
                for result in failed_foods
            )

            raise Exception(
                f"Nutrition analysis is incomplete for: {failed_names}. "
                f"The meal was not saved."
            )

        # ---------------------------------------------
        # STEP 4: TOTALS
        # ---------------------------------------------

        total_nutrition = (
            calculate_total_nutrition(
                nutrition_results
            )
        )

        # ---------------------------------------------
        # STEP 4: SAVE TO DATABASE
        # ---------------------------------------------

        meal = Meal(
            user_id=user.id,

            image_name=image.filename,

            total_calories=
                total_nutrition[
                    "calories"
                ],

            total_protein=
                total_nutrition[
                    "protein"
                ],

            total_carbs=
                total_nutrition[
                    "carbs"
                ],

            total_fat=
                total_nutrition[
                    "fat"
                ],

            total_fiber=
                total_nutrition[
                    "fiber"
                ],

            total_sugar=
                total_nutrition[
                    "sugar"
                ],

            total_sodium=
                total_nutrition[
                    "sodium"
                ],

            foods_json=json.dumps(
                nutrition_results
            )
        )

        db.session.add(
            meal
        )

        db.session.commit()

        print(
            "\nMeal saved successfully."
        )

        print(
            "Meal ID:",
            meal.id
        )

        return jsonify({

            "message":
                "Meal analyzed and saved.",

            "saved":
                True,

            "meal_id":
                meal.id,

            "total_nutrition":
                total_nutrition,

            "nutrition_results":
                nutrition_results
        })

    except Exception as error:

        db.session.rollback()

        print(
            "\nMEAL ANALYSIS ERROR:"
        )

        print(error)

        return jsonify({
            "message":
                "Meal analysis failed.",
            "error":
                str(error)
        }), 500


# =========================================================
# GET MEAL HISTORY
# =========================================================

@app.route(
    "/meals/<int:user_id>",
    methods=["GET"]
)
def get_history(user_id):

    user = db.session.get(
        User,
        user_id
    )

    if not user:

        return jsonify({
            "message":
                "User not found."
        }), 404

    meals = Meal.query.filter_by(
        user_id=user_id
    ).order_by(
        Meal.created_at.desc()
    ).all()

    history = []

    for meal in meals:

        try:
            foods = json.loads(
                meal.foods_json
            )

        except:
            foods = []

        history.append({

            "id":
                meal.id,

            "image_name":
                meal.image_name,

            "created_at":
                meal.created_at.isoformat()
                if meal.created_at
                else None,

            "total_nutrition": {

                "calories":
                    round(
                        meal.total_calories,
                        1
                    ),

                "protein":
                    round(
                        meal.total_protein,
                        1
                    ),

                "carbs":
                    round(
                        meal.total_carbs,
                        1
                    ),

                "fat":
                    round(
                        meal.total_fat,
                        1
                    ),

                "fiber":
                    round(
                        meal.total_fiber,
                        1
                    ),

                "sugar":
                    round(
                        meal.total_sugar,
                        1
                    ),

                "sodium":
                    round(
                        meal.total_sodium,
                        1
                    )
            },

            "foods":
                foods
        })

    return jsonify({
        "history":
            history
    })


# =========================================================
# DELETE MEAL
# =========================================================

@app.route(
    "/meals/<int:user_id>/<int:meal_id>",
    methods=["DELETE"]
)
def delete_meal(
    user_id,
    meal_id
):

    meal = Meal.query.filter_by(
        id=meal_id,
        user_id=user_id
    ).first()

    if not meal:

        return jsonify({
            "message":
                "Meal not found."
        }), 404

    db.session.delete(
        meal
    )

    db.session.commit()

    return jsonify({
        "message":
            "Meal deleted successfully."
    })


# =========================================================
# HOME / HEALTH CHECK
# =========================================================

@app.route(
    "/",
    methods=["GET"]
)
def home():

    return jsonify({

        "message":
            "MealLens backend is running.",

        "gemini":
            bool(GEMINI_API_KEY),

        "usda":
            bool(USDA_API_KEY)
    })


# =========================================================
# RUN SERVER
# =========================================================

if __name__ == "__main__":

    print("\n======================================")
    print("MealLens Backend")
    print("======================================")

    print(
        "Gemini:",
        "READY"
        if GEMINI_API_KEY
        else "MISSING"
    )

    print(
        "USDA:",
        "READY"
        if USDA_API_KEY
        else "MISSING"
    )

    print(
        "Database:",
        DATABASE_PATH
    )

    print("======================================\n")

    app.run(
        host=HOST,
        port=PORT,
        debug=FLASK_DEBUG
    )