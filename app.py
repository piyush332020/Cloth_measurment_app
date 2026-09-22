import base64
import os
from pathlib import Path
import cv2
import numpy as np
import requests
from flask import (Flask,render_template,request,jsonify,Response)
from dotenv import load_dotenv
import cloth
from services.product_service import search_products
import services.product_service as ps


# =========================================================
# PROJECT PATH
# =========================================================

BASE_DIR = Path(__file__).resolve().parent


# =========================================================
# LOAD ENVIRONMENT VARIABLES
# =========================================================

ENV_FILE = BASE_DIR / ".env"
load_dotenv(ENV_FILE)

print("ENV FILE:", ENV_FILE)
print("ENV EXISTS:", ENV_FILE.exists())
print("API key loaded:", bool(os.getenv("SEARCH_API_KEY")))


# =========================================================
# DEBUG - SHOW WHICH PRODUCT SERVICE IS USED
# =========================================================

print("PRODUCT SERVICE FILE:")
print(ps.__file__)


# =========================================================
# FLASK APP
# =========================================================

app = Flask(__name__)


# =========================================================
# BASE64 IMAGE -> OPENCV IMAGE
# =========================================================

def base64_to_cv2(base64_string):
    try:
        if "," in base64_string:
            base64_string = base64_string.split(",")[1]

        img_data = base64.b64decode(base64_string)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        return img
    except Exception as e:
        print("Error decoding image:", e)
        return None


# =========================================================
# HOME PAGE
# =========================================================

@app.route("/")
def index():
    return render_template("index.html")


# =========================================================
# MEASUREMENT API
# =========================================================

@app.route("/api/measure", methods=["POST"])
def api_measure():
    data = request.json

    if not data or "image" not in data:
        return jsonify({
            "success": False,
            "error": "No image data provided"
        }), 400

    image_base64 = data["image"]
    frame = base64_to_cv2(image_base64)

    if frame is None:
        return jsonify({
            "success": False,
            "error": "Invalid image format"
        }), 400

    frame = cv2.resize(frame, (320,240))

    try:
        result = cloth.measure_frame(frame)
        return jsonify(result)
    except Exception as e:
        print("Error during measurement:", e)
        return jsonify({
            "success": False,
            "error": str(e),
            "status": "Measurement failed",
            "ready": False
        }), 500


# =========================================================
# PRODUCT RECOMMENDATION API
# =========================================================

@app.route("/api/recommend", methods=["POST"])
def api_recommend():
    data = request.json

    if not data:
        return jsonify({
            "success": False,
            "error": "No data provided"
        }), 400

    category = data.get("category")
    size = data.get("size")
    gender = data.get("gender", "Unisex")
    keywords = data.get("keywords", "")

    if not category or not size:
        return jsonify({
            "success": False,
            "error": "Category and size are required"
        }), 400

    print("\n======================================")
    print("RECOMMENDATION REQUEST")
    print("Category:", category)
    print("Size:", size)
    print("Gender:", gender)
    print("======================================")

    try:
        products = search_products(category, size, gender, keywords)

        if products is None:
            products = []

        print("Products returned:", len(products))

        return jsonify({
            "success": True,
            "products": products
        })

    except Exception as e:
        print("Error fetching recommendations:", e)
        return jsonify({
            "success": False,
            "error": str(e),
            "products": []
        }), 500


# =========================================================
# IMAGE PROXY API
# =========================================================

@app.route("/api/image-proxy", methods=["GET"])
def image_proxy():
    image_url = request.args.get("url")

    if not image_url:
        return "Image URL missing", 400

    print("IMAGE PROXY REQUEST:", image_url)

    try:
        response = requests.get(
            image_url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
                "Referer": "https://www.google.com/"
            },
            timeout=15
        )

        print("Image proxy status:", response.status_code, "for", image_url)
        response.raise_for_status()

        content_type = response.headers.get("Content-Type") or "image/jpeg"

        return Response(
            response.content,
            status=200,
            content_type=content_type,
            headers={"Cache-Control": "public, max-age=86400"}
        )

    except requests.exceptions.Timeout:
        print("IMAGE PROXY TIMEOUT")
        return "Image request timed out", 504

    except requests.exceptions.RequestException as e:
        print("IMAGE PROXY ERROR:", e)
        return "Image unavailable", 404

    except Exception as e:
        print("IMAGE ERROR:", e)
        return "Image unavailable", 500


# =========================================================
# RUN APPLICATION
# =========================================================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))

    app.run(
        debug=False,
        host="0.0.0.0",
        port=port,
        threaded=True
    )