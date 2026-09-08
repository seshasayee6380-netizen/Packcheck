# OCR v18 Upgrade

PackCheck uses PaddleOCR as the primary engine when installed, with Tesseract multi-pass fallback/cross-check. v18 adds legal-field consensus across independent OCR passes, package-focused ROI detection, clean reconstructed OCR for the UI, and stronger normalization for MRP, quantity, dates, batch, manufacturer, consumer care, and FSSAI fields.

The UI intentionally shows a structured OCR transcript instead of duplicated raw OCR tokens, because raw multi-pass OCR can contain repeated or unrelated tokens from composite photos.
