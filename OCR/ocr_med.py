"""
ocr_med.py — OCR-based medication name inference and verification.
Usage: python ocr_med.py --image path/to/image.jpg [--top 3] [--offline]
"""

import argparse
import json
import re
import sys
import time
from pathlib import Path
from difflib import SequenceMatcher

import pytesseract
from PIL import Image, ImageFilter, ImageEnhance
import requests

# ── local dataset ────────────────────────────────────────────────────────────
DATASET_PATH = Path(__file__).parent / "medications.json"


def load_dataset() -> list[dict]:
    if not DATASET_PATH.exists():
        print(f"[WARN] Dataset not found at {DATASET_PATH}. Using empty list.")
        return []
    with open(DATASET_PATH) as f:
        return json.load(f)


# ── image preprocessing ──────────────────────────────────────────────────────
def preprocess_image(path: str) -> Image.Image:
    """Sharpen + increase contrast to improve OCR accuracy."""
    img = Image.open(path).convert("L")          # grayscale
    img = img.filter(ImageFilter.SHARPEN)
    img = ImageEnhance.Contrast(img).enhance(2.0)
    # scale up small images — Tesseract performs better on larger inputs
    w, h = img.size
    if w < 600:
        scale = 600 / w
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    return img


# ── OCR ──────────────────────────────────────────────────────────────────────
def run_ocr(image_path: str) -> str:
    """Run Tesseract OCR and return raw text."""
    img = preprocess_image(image_path)
    config = "--oem 3 --psm 3"          # LSTM engine, fully automatic page segmentation
    text = pytesseract.image_to_string(img, config=config, lang="eng")
    return text.strip()


# ── text cleaning ─────────────────────────────────────────────────────────────
def clean_ocr_text(raw: str) -> str:
    """Remove noise characters and normalise whitespace."""
    # strip non-alphanumeric except spaces and hyphens
    cleaned = re.sub(r"[^a-zA-Z0-9\s\-]", " ", raw)
    cleaned = re.sub(r"\s+", " ", cleaned).strip().lower()
    return cleaned


def extract_candidate_tokens(text: str) -> list[str]:
    """Return individual word tokens longer than 3 chars as candidates."""
    words = text.split()
    return [w for w in words if len(w) >= 4]


# ── fuzzy matching ────────────────────────────────────────────────────────────
def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def match_against_dataset(
    candidates: list[str], dataset: list[dict], top_n: int = 3
) -> list[dict]:
    """
    Score every candidate token against every medication name.
    Returns top_n matches with scores.
    """
    scores: dict[str, float] = {}

    for med in dataset:
        name = med["name"].lower()
        generic = med.get("generic", "").lower()
        best = 0.0
        for token in candidates:
            s1 = similarity(token, name)
            s2 = similarity(token, generic) if generic else 0.0
            best = max(best, s1, s2)
        scores[med["name"]] = best

    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    results = []
    seen = set()
    for name, score in ranked:
        if name in seen:
            continue
        seen.add(name)
        med = next(m for m in dataset if m["name"] == name)
        results.append(
            {
                "name": med["name"],
                "generic": med.get("generic", ""),
                "category": med.get("category", ""),
                "score": round(score, 4),
            }
        )
        if len(results) == top_n:
            break
    return results


# ── online verification via OpenFDA ─────────────────────────────────────────
OPENFDA_URL = "https://api.fda.gov/drug/label.json"


def verify_online(med_name: str, timeout: int = 6) -> dict:
    """Query OpenFDA to confirm the medication exists and fetch basic info."""
    try:
        params = {"search": f'openfda.brand_name:"{med_name}"', "limit": 1}
        r = requests.get(OPENFDA_URL, params=params, timeout=timeout)
        if r.status_code == 200:
            data = r.json()
            results = data.get("results", [])
            if results:
                openfda = results[0].get("openfda", {})
                return {
                    "verified": True,
                    "source": "OpenFDA",
                    "brand_name": openfda.get("brand_name", [med_name])[0],
                    "generic_name": openfda.get("generic_name", [""])[0],
                    "manufacturer": openfda.get("manufacturer_name", ["unknown"])[0],
                    "route": openfda.get("route", ["unknown"])[0],
                }
        # 404 means not found in FDA DB — not an error per se
        return {"verified": False, "source": "OpenFDA", "reason": f"HTTP {r.status_code}"}
    except requests.exceptions.RequestException as e:
        return {"verified": False, "source": "OpenFDA", "reason": str(e)}


# ── main pipeline ─────────────────────────────────────────────────────────────
def run_pipeline(
    image_path: str,
    top_n: int = 3,
    offline: bool = False,
) -> dict:
    t0 = time.time()

    # 1. OCR
    raw_text = run_ocr(image_path)
    cleaned = clean_ocr_text(raw_text)
    candidates = extract_candidate_tokens(cleaned)

    # 2. Local dataset match
    dataset = load_dataset()
    matches = match_against_dataset(candidates, dataset, top_n=top_n)

    # 3. Online verification for top match
    online_info = {}
    if matches and not offline:
        top_name = matches[0]["name"]
        online_info = verify_online(top_name)

    elapsed = round(time.time() - t0, 3)

    return {
        "image": image_path,
        "ocr_raw": raw_text,
        "ocr_cleaned": cleaned,
        "candidate_tokens": candidates,
        "top_matches": matches,
        "online_verification": online_info,
        "processing_time_s": elapsed,
    }


# ── CLI ───────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="OCR-based medication name inference"
    )
    parser.add_argument("--image", required=True, help="Path to input image")
    parser.add_argument("--top", type=int, default=3, help="Number of top matches (default 3)")
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Skip online OpenFDA verification",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        default=True,
        help="Pretty-print JSON output",
    )
    args = parser.parse_args()

    if not Path(args.image).exists():
        print(f"[ERROR] Image not found: {args.image}", file=sys.stderr)
        sys.exit(1)

    print(f"[INFO] Processing: {args.image}", file=sys.stderr)
    result = run_pipeline(args.image, top_n=args.top, offline=args.offline)

    indent = 2 if args.pretty else None
    print(json.dumps(result, indent=indent))


if __name__ == "__main__":
    main()
