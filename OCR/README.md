# OCR Medication Recognizer

Extracts medication names from images using OCR, fuzzy-matches them against a local dataset,
verifies the best match online via the NIH RxNorm API, and returns a structured JSON result.

---

## Files

```
med_ocr/
├── ocr_med.py          ← core library (pipeline)
├── demo.py             ← CLI demo entry point
├── medications.csv     ← sample dataset (50 common medications)
├── requirements.txt    ← Python dependencies
└── README.md           ← this file
```

---

## System Requirements

- Python 3.10+
- **Tesseract OCR engine** installed on your system (separate from the Python package)

### Install Tesseract

**Ubuntu / Debian / WSL:**
```bash
sudo apt update && sudo apt install -y tesseract-ocr
```

**macOS (Homebrew):**
```bash
brew install tesseract
```

**Windows:**
Download installer from: https://github.com/UB-Mannheim/tesseract/wiki
Then add Tesseract to your PATH, or set in ocr_med.py:
```python
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
```

Verify installation:
```bash
tesseract --version
```

---

## Python Setup

```bash
# 1. Create and activate a virtual environment (recommended)
python -m venv venv
source venv/bin/activate        # Linux/macOS
venv\Scripts\activate           # Windows

# 2. Install Python dependencies
pip install -r requirements.txt
```

---

## Running the Demo

### Quick start (auto-generates a test image)
```bash
python demo.py
```
This creates a `test_med.png` image with the text "Amoxicillin", runs OCR on it, matches
against the dataset, verifies online, and prints the full JSON result.

### Run with a custom medication name (generates image)
```bash
python demo.py --text "Paracetamol"
python demo.py --text "Ibuprofen 400mg"
```

### Run on your own image
```bash
python demo.py --image /path/to/your/medication_photo.jpg
```

### Save output to a JSON file
```bash
python demo.py --text "Metformin" --output-json result.json
```

### Skip online verification (offline mode)
```bash
python demo.py --text "Atorvastatin" --no-verify
```

---

## Using the Core Module (ocr_med.py)

```python
from ocr_med import run_pipeline

result = run_pipeline("path/to/image.jpg", verify=True)

print(result["ocr_raw_text"])          # raw OCR output
print(result["top_matches"])           # list of top 3 medication dicts
print(result["online_verification"])   # RxNorm API result
```

### Output structure

```json
{
  "image_path": "test_med.png",
  "ocr_raw_text": "Amoxicillin\n500mg Tablets\nTake 1 tablet twice daily",
  "ocr_cleaned": "amoxicillin 500mg tablets take 1 tablet twice daily",
  "top_matches": [
    {
      "name": "Amoxicillin",
      "generic_name": "amoxicillin trihydrate",
      "category": "Antibiotic",
      "strength": "250mg / 500mg",
      "match_score": 1.0
    },
    {
      "name": "Clarithromycin",
      "generic_name": "clarithromycin",
      "category": "Macrolide Antibiotic",
      "strength": "250mg / 500mg",
      "match_score": 0.5714
    },
    {
      "name": "Erythromycin",
      "generic_name": "erythromycin",
      "category": "Macrolide Antibiotic",
      "strength": "250mg / 500mg",
      "match_score": 0.5333
    }
  ],
  "online_verification": {
    "verified": true,
    "rxcui": "723",
    "rx_name": "Amoxicillin",
    "score": "100",
    "suggestions": ["Amoxicillin", "Amoxicillin Oral Powder", "Amoxicillin Capsule"]
  }
}
```

---

## Online Verification

Uses the **NIH RxNorm REST API** — free, no API key required.
Endpoint: `https://rxnav.nlm.nih.gov/REST/approximateTerm.json`

If you're offline or want to skip it:
```bash
python demo.py --no-verify
```

---

## Extending the Dataset

The `medications.csv` has columns: `name, generic_name, category, strength`

Add rows freely:
```csv
Metoprolol,metoprolol tartrate,Beta Blocker,25mg / 50mg / 100mg
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `tesseract is not installed` | Install Tesseract engine (see above) |
| Poor OCR accuracy | Use clear, high-contrast images. Crop tightly around the text. |
| `No text detected` | Try a higher-resolution image |
| Online verification fails | Check internet connection or use `--no-verify` |
| `ModuleNotFoundError` | Activate your venv and re-run `pip install -r requirements.txt` |
