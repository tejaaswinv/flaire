"""
demo.py — CLI demo that generates a test image and runs the full pipeline.

Usage:
  python demo.py                          # uses Amoxicillin by default
  python demo.py --med "Ibuprofen"        # custom medication name
  python demo.py --med "Metformin" --noise
  python demo.py --med "Lipitor" --offline
"""

import argparse
import json
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

DEMO_IMAGE_PATH = "demo_label.png"


def generate_label_image(med_name: str, add_noise: bool = False) -> str:
    width, height = 420, 220
    img = Image.new("RGB", (width, height), color=(245, 243, 238))
    draw = ImageDraw.Draw(img)
    draw.rectangle([(6, 6), (width - 6, height - 6)], outline=(60, 60, 80), width=3)

    font_large = font_med = font_small = None
    font_paths = [
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibrib.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/crosextra/Carlito-Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for fp in font_paths:
        try:
            font_large = ImageFont.truetype(fp, 36)
            font_med   = ImageFont.truetype(fp, 20)
            font_small = ImageFont.truetype(fp, 14)
            break
        except Exception:
            pass
    if font_large is None:
        font_large = font_med = font_small = ImageFont.load_default()

    draw.rectangle([(6, 6), (width - 6, 55)], fill=(30, 50, 120))
    draw.text((20, 14), "Rx  PHARMACY LABEL", font=font_med, fill=(255, 255, 255))
    draw.text((20, 70), med_name, font=font_large, fill=(15, 15, 60))
    draw.text((20, 118), "Dosage: 500 mg  |  Qty: 30 Tablets", font=font_small, fill=(60, 60, 60))
    draw.text((20, 140), "Take 1 tablet by mouth twice daily with food.", font=font_small, fill=(60, 60, 60))
    draw.text((20, 162), "Refills: 2  |  NDC: 00093-3160-05", font=font_small, fill=(80, 80, 80))
    draw.text((20, 184), "Dr. J. Smith  |  Exp: 04/2026", font=font_small, fill=(80, 80, 80))

    if add_noise:
        pixels = img.load()
        for _ in range(800):
            x = random.randint(0, width - 1)
            y = random.randint(0, height - 1)
            v = random.randint(160, 200)
            pixels[x, y] = (v, v, v)

    img.save(DEMO_IMAGE_PATH)
    return DEMO_IMAGE_PATH


def main():
    parser = argparse.ArgumentParser(
        description="Demo: generate a label image then run the OCR medication pipeline"
    )
    parser.add_argument("--med",     default="Amoxicillin", help="Medication name to put on the label")
    parser.add_argument("--noise",   action="store_true",   help="Add speckle noise to simulate a worn label")
    parser.add_argument("--top",     type=int, default=3,   help="Number of top matches to return (default: 3)")
    parser.add_argument("--offline", action="store_true",   help="Skip OpenFDA online verification")
    args = parser.parse_args()

    print(f"\n{'='*54}")
    print("  OCR Medication Inference — Demo")
    print(f"{'='*54}")
    print(f"  Generating label image for: {args.med}")
    img_path = generate_label_image(args.med, add_noise=args.noise)
    print(f"  Saved to:                   {img_path}")
    print(f"  Noise:                      {'on' if args.noise else 'off'}")
    print(f"  Online verification:        {'disabled' if args.offline else 'enabled (OpenFDA)'}")
    print(f"{'='*54}\n")

    try:
        from ocr_med import run_pipeline
    except ImportError as e:
        print(f"[ERROR] Could not import ocr_med.py — make sure it is in the same folder.\n  {e}")
        sys.exit(1)

    result = run_pipeline(img_path, top_n=args.top, offline=args.offline)

    print("── OCR output ──────────────────────────────────────")
    print(result["ocr_raw"] or "(empty)")
    print("\n── Candidate tokens ────────────────────────────────")
    print(", ".join(result["candidate_tokens"]) or "(none)")
    print("\n── Top medication matches ──────────────────────────")
    for i, m in enumerate(result["top_matches"], 1):
        tag = ""
        if i == 1 and result["online_verification"].get("verified"):
            tag = "  ✓ verified online"
        print(f"  {i}. {m['name']:22s}  generic: {m['generic']:28s}  score: {m['score']:.4f}{tag}")

    if result["online_verification"]:
        v = result["online_verification"]
        print("\n── Online verification (OpenFDA) ───────────────────")
        if v.get("verified"):
            print(f"  Brand:        {v.get('brand_name')}")
            print(f"  Generic:      {v.get('generic_name')}")
            print(f"  Manufacturer: {v.get('manufacturer')}")
            print(f"  Route:        {v.get('route')}")
        else:
            print(f"  Not verified — {v.get('reason', 'unknown reason')}")

    print(f"\n── Full JSON result ────────────────────────────────")
    print(json.dumps(result, indent=2))
    print(f"\n  Processing time: {result['processing_time_s']}s")
    print(f"{'='*54}\n")


if __name__ == "__main__":
    main()
