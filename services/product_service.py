import json
import os
import requests
from urllib.parse import quote
from pathlib import Path
from dotenv import load_dotenv


# Load .env from project root
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

load_dotenv(ENV_FILE)

print("PRODUCT SERVICE ENV:", ENV_FILE)
print("PRODUCT SERVICE API KEY LOADED:", bool(os.getenv("SEARCH_API_KEY")))
# =========================================================
# LOAD CATEGORY MAPPINGS
# =========================================================

def load_categories():
    try:
        base_dir = os.path.dirname(
            os.path.dirname(
                os.path.abspath(__file__)
            )
        )
        categories_path = os.path.join(
            base_dir,
            "data",
            "categories.json"
        )
        with open(categories_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading categories: {e}")
        return {}


CATEGORIES = load_categories()


# =========================================================
# HELPER: EXTRACT IMAGE URL
# =========================================================

def extract_thumbnail_url(item):
    """
    Safely extracts the best available thumbnail URL from a SerpApi item,
    checking single fields, plural arrays, and nested structures.
    """
    if not isinstance(item, dict):
        return ""

    # Direct string thumbnail fields
    direct_fields = [
        "serpapi_thumbnail",
        "thumbnail",
        "image",
        "serpapi_image"
    ]
    for key in direct_fields:
        val = item.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()

    # Plural array thumbnail fields
    array_fields = [
        "serpapi_thumbnails",
        "thumbnails",
        "images",
        "product_photos"
    ]
    for key in array_fields:
        arr = item.get(key)
        if isinstance(arr, list) and len(arr) > 0:
            first = arr[0]
            if isinstance(first, str) and first.strip():
                return first.strip()
            elif isinstance(first, dict):
                sub_url = (
                    first.get("link")
                    or first.get("thumbnail")
                    or first.get("serpapi_thumbnail")
                )
                if isinstance(sub_url, str) and sub_url.strip():
                    return sub_url.strip()

    return ""


# =========================================================
# SEARCH PRODUCTS
# =========================================================

def search_products(
    category,
    size,
    gender,
    keywords=""
):
    api_key = os.getenv("SEARCH_API_KEY")

    if not api_key:
        print("SEARCH_API_KEY not found")
        return []

    category_keywords = CATEGORIES.get(
        category,
        [category.lower()]
    )
    main_keyword = category_keywords[0]

    search_query = f"{gender} {main_keyword} Size {size}"
    if keywords:
        search_query += f" {keywords}"

    print("\n====================================")
    print("REAL SERPAPI PRODUCT SEARCH")
    print("Query:", search_query)
    print("====================================")

    params = {
        "engine": "google_shopping",
        "q": search_query,
        "location": "India",
        "gl": "in",
        "hl": "en",
        "api_key": api_key
    }

    try:
        response = requests.get(
            "https://serpapi.com/search",
            params=params,
            timeout=(10, 60)
        )
        print("HTTP Status:", response.status_code)
        response.raise_for_status()

        data = response.json()

        if "error" in data:
            print("SerpApi Error:", data["error"])
            return []

        shopping_results = data.get("shopping_results", [])
        print("Shopping results:", len(shopping_results))

        products = []

        for item in shopping_results[:8]:
            original_image = extract_thumbnail_url(item)

            if original_image:
                image_url = f"/api/image-proxy?url={quote(original_image, safe='')}"
            else:
                image_url = ""

            product_link = (
                item.get("product_link")
                or item.get("link")
                or ""
            )

            product = {
                "title": item.get("title", "Unknown Product"),
                "image": image_url,
                "price": item.get("price", "Price unavailable"),
                "website": item.get("source", "Unknown"),
                "url": product_link,
                "size": size,
                "category": category
            }

            products.append(product)

            print("------------------------------------")
            print("TITLE:", product["title"])
            print("WEBSITE:", product["website"])
            print("PRICE:", product["price"])
            print("IMAGE:", product["image"])
            print("LINK:", product["url"])

        print("====================================")
        print("Products sent to frontend:", len(products))
        print("====================================\n")

        return products

    except requests.exceptions.Timeout:
        print("SerpApi request timed out")
        return []

    except requests.exceptions.RequestException as e:
        print("SerpApi request failed:", e)
        return []

    except Exception as e:
        print("Product search failed:", e)
        return []