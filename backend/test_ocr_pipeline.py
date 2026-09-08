from pathlib import Path
import sys

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import main

IMAGE = BASE / 'demo_images' / 'review.png'

text, meta, _ = main.ocr_image(IMAGE)
fields = main.extract_fields(text)

assert text.strip(), 'OCR returned empty text'
assert fields['product_name'] == 'Sunrise Biscuits', fields
assert fields['manufacturer'] == 'Sunrise Foods Pvt Ltd', fields
assert fields['net_quantity'] == '200 g', fields
assert fields['mrp'] == '80', fields
assert fields['packed_date'] == '08/2026', fields
assert fields['country_of_origin'] == 'India', fields

print('OCR pipeline test: PASS')
print(f'Mean OCR confidence: {meta.get("__mean__", 0)}%')
print('\nExtracted Text:\n')
print(text)
print('\nExtracted Fields:\n')
for k, v in fields.items():
    if v:
        print(f'- {k}: {v}')
