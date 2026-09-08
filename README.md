# PackCheck AI — SIH 2026 Fully Working Prototype

## What this is

PackCheck AI is an AI-assisted Legal Metrology packaged-commodity inspection prototype for SIH. It converts package imagery into structured declarations, applies a versioned prototype rule engine, explains potential findings, supports human verification, stores inspection history, and exports reports.

## Working features

- Inspector and Consumer modes
- Dashboard with real stored scan KPIs
- Product image upload and local image quality/readability screening
- Browser OCR using Tesseract.js for normal image uploads, with a server-side Tesseract fallback
- Deterministic demo scenarios that do not depend on external AI services
- Declaration extraction for product name, MRP, net quantity, manufacturer/packer/importer, address, packing/manufacture date, best-before/use-by, batch number, consumer-care phone/email, country of origin, unit sale price and other detected declarations
- DETECTED / NOT_DETECTED / NEEDS_MANUAL_VERIFICATION states
- Applicability-aware prototype rules for food and imported products
- Versioned rule library
- Screening score + status
- Explainable findings with evidence, severity, confidence and recommendation
- Human correction + re-check
- Scan history + delete
- Analytics
- PDF report
- Editable CSV report
- Fallback only when browser OCR genuinely fails; no hardcoded text is used for normal uploads

## Fastest Windows setup

### Option A — one click

Double-click:

`SETUP_AND_RUN.bat`

It opens two terminals, installs the Python/Node dependencies, starts FastAPI and starts Vite.

### Option B — manual

Backend terminal:

```bat
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

Frontend terminal:

```bat
cd frontend
npm install
npm run dev
```

Open:

`http://localhost:5173/`

API docs:

`http://127.0.0.1:8000/docs`

## Real OCR pipeline

Normal uploads use **Tesseract.js 7** in the browser. Tesseract.js runs the Tesseract OCR engine in WebAssembly, so the label image is processed locally in the browser and the OCR output is sent automatically to the FastAPI compliance engine. The first OCR run may download/cache the English language model.

If browser OCR genuinely fails, the app attempts a real server-side `pytesseract` fallback. If both paths fail, the UI reports that text could not be confidently detected and asks for a clearer image/manual verification. It never substitutes hardcoded package text for a normal upload.


## Normal upload flow

```text
IMAGE UPLOAD
→ IMAGE PREPROCESSING
→ TESSERACT.JS OCR
→ EXTRACTED TEXT
→ FIELD EXTRACTION
→ COMPLIANCE RULE CHECK
→ VIOLATION DETECTION
→ COMPLIANCE SCORE
→ EXPLAINABLE RESULT + REPORT
```

During OCR the UI shows: **Uploading... → Processing image... → Reading package... → Extracting fields... → Checking compliance...**.

## SIH demo sequence

1. Dashboard
2. Scan Product
3. Click **Needs review**
4. Click **Analyze selected demo**
5. Show **78/100 — NEEDS REVIEW**
6. Open a finding and explain the rule/evidence/recommendation
7. Edit a declaration
8. Re-run screening
9. Export PDF
10. Show history and analytics

Also test **Multiple issues** to show the red scenario.

## Important legal/product boundary

This is an AI-assisted screening prototype, not a legal certification system. “Not detected” is not automatically treated as legal absence. The prototype rule set must be verified against the latest official regulations before production use.

## Consumer vs Inspector modes

Consumer Mode is intentionally simplified: Home + Check Product only, with plain-language screening results, read-only detected text/fields, and no rule IDs, enforcement analytics, manual OCR correction, inspection history, or report controls.

Inspector Mode remains the full enforcement workspace with scan history, rules, analytics, reports, evidence, manual verification, and re-check functionality.


## SIH v2.1 upgrade notes

The prototype now demonstrates the full judging narrative:

1. **Regulatory document intelligence** — regulation metadata is separated from UI logic.
2. **Version + effective date** — the demo uses the official Department of Consumer Affairs Legal Metrology source and includes the 01 July 2026 country-of-origin e-commerce amendment plus the already-published 01 July 2027 follow-up.
3. **Regulatory Applicability Engine** — rules are evaluated against product/category/origin conditions before compliance scoring.
4. **Multi-Surface Package Inspection** — front, back, side, barcode/GTIN and seal evidence are represented as separate inspection surfaces.
5. **Evidence Chain** — observation → extraction → applicability → regulation → decision → inspector action.
6. **Offline-First Inspection** — offline queue state persists in browser local storage and can be synchronized in the demo flow.
7. **Audit trail** — inspection identifiers and evidence-chain metadata are surfaced for traceability.

### Official regulatory source
Department of Consumer Affairs: https://consumeraffairs.gov.in/pages/legal-metrology-act

### Important demo disclaimer
This is a hackathon prototype, not legal advice or a production legal-certification engine. Regulatory text must be ingested, validated and reviewed before deployment.

## v5 consumer features

### One-click complaint filing
Consumers can submit product photos, invoice/bill evidence, shop or website details, location, date/time and a description. If the complaint is opened from an inspection result, PackCheck automatically attaches the detected finding. A reference number is issued for status tracking. Complaints are explicitly treated as preliminary reports pending inspector verification.

### MRP & Quantity Anomaly Detector
Normalizes package quantities and calculates price per kg/litre/metre/unit. It compares printed MRP, selling price, comparison products and e-commerce listing values and flags potential overcharging or mismatches for verification.

### Verified Product Passport
GREEN screening records can issue a registry-backed product passport. The passport payload is signed with HMAC, and the QR links to the registry record. The prototype describes this as tamper-evident/integrity-checkable, not as a guarantee against QR copying. Production deployment should bind the passport to a stronger product identity.

### Demo path
1. Run a GREEN compliant demo.
2. Open Product Passport and create/verify the signed QR record.
3. Open MRP & Quantity Fraud and try ₹100/800 g vs ₹110/1 kg.
4. Open Complaint Center from a finding and submit a preliminary report with an invoice.
5. Track the returned `PC-...` reference number.

## Phone / QR Passport Demo

The Digital Product Passport QR now opens a human-friendly verification page at `/passport/<passport_id>` instead of exposing raw API JSON.

For phone scanning during a local demo:

1. Start PackCheck with `SETUP_AND_RUN.bat` so FastAPI binds to `0.0.0.0:8000` and Vite binds to `0.0.0.0:5173`.
2. Connect the phone to the **same Wi-Fi network** as the demo PC.
3. On the PC run `ipconfig` and note the active IPv4 address, for example `192.168.1.24`.
4. On the phone open `http://192.168.1.24:5173/` once to verify the network path.
5. Create a product passport. Its QR will automatically encode `http://192.168.1.24:5173/passport/<passport_id>` (the server detects the LAN address when the request comes from localhost).
6. Scan the QR with the phone camera. Safari opens the polished passport verification page and fetches the signed registry record from port 8000.

For a deployed demo, set `PACKCHECK_PUBLIC_BASE_URL` to the public HTTPS origin before creating the QR, for example `https://demo.example.gov.in`.


## Mobile QR demo

1. Connect the phone and PC to the same Wi-Fi network.
2. Start the backend with `START_BACKEND.bat` (it binds to `0.0.0.0:8000`).
3. Start the frontend with `START_FRONTEND.bat` (Vite binds to `0.0.0.0:5173`).
4. On the PC, open the PackCheck page using the PC LAN IP, e.g. `http://192.168.1.24:5173`.
5. Create a VERIFIED Product Passport. The QR resolves to the LAN address, not `localhost`.
6. Scan the QR with the phone camera. The phone opens the mobile passport page and verifies the signed registry record.

If the QR scans but the page does not load, allow Node/Python through Windows Defender Firewall on Private networks and confirm the phone and PC are on the same Wi-Fi.


## Final validation
The latest build includes live, inspection-generated Evidence Chain events, SHA-256 compliance fingerprints, consistent regulatory snapshot metadata, and a real human-verification audit event. See `FINAL_VALIDATION_REPORT.md` for the test matrix.

## Local startup troubleshooting

If the dashboard shows **Backend offline** or **Failed to fetch**, the frontend is running but FastAPI is not reachable on port 8000. Start `START_BACKEND.bat` and keep that terminal open. The backend launcher no longer makes PaddleOCR installation a startup blocker; it starts with Tesseract fallback when PaddleOCR is not installed.

Run `INSTALL_PADDLE_OCR.bat` once when you want the PaddleOCR engine enabled. Then restart the backend.

For phone testing, keep the PC and phone on the same Wi-Fi and open `http://PC-LAN-IP:5173/` on the phone. Windows Firewall must allow Python/Node on the Private network.

## Integrated OCR Fix Reference

This v21 bundle includes the supplied `main_improved.py`, `OCR_FIX_REPORT.md`, `QUICK_START.md`, `IMPLEMENTATION_SUMMARY.txt`, and `requirements-enhanced.txt` from the external OCR-fix package.

The active PackCheck backend remains `backend/main.py` so the complete SIH feature set is preserved. The supplied `main_improved.py` is also copied to `backend/main_improved_reference.py` for traceability.

For the active PaddleOCR 3.x stack, use `backend/requirements-paddleocr.txt` rather than the older 2.7 pin in `requirements-enhanced.txt`.


## OCR Providers
ABBYY Cloud OCR SDK is supported as the primary OCR provider when configured via `ABBYY_APPID`, `ABBYY_PWD`, and `ABBYY_SERVER_URL`; otherwise PaddleOCR/Tesseract are used. See `ABBYY_SETUP.md`.


## Guided high-quality camera capture

The Scan Product screen now supports a guided rear-camera workflow in addition to normal image upload. It requests a high-resolution environment-facing camera stream, checks live brightness/detail conditions, shows a package guide frame, and captures a high-quality JPEG before the existing multi-pass OCR pipeline. On mobile, the normal image picker also requests the environment camera where the browser supports `capture="environment"`.

The 360° inspection surface cards are actionable: Front label, Back label, Side panel, Barcode / GTIN and optional Seal / physical pack can each open the guided camera. Captured surfaces are labelled in the inspection UI, while the existing OCR/compliance engine remains unchanged.

Camera access in a browser generally requires a secure context (HTTPS) or localhost. If a LAN demo is served over plain HTTP, use the mobile camera/upload control or serve the demo over HTTPS.


## Offline Inspection

PackCheck stores complete offline inspection records and cached rule snapshots on the device, then synchronizes them through `/api/offline/sync` when connectivity returns. See `OFFLINE_VALIDATION.md`.

## Complaint workflow update
- **Consumer Mode:** Complaint Center is the submission channel. A complaint can carry the current inspection ID, detected findings, consumer description, and uploaded photos/bills/invoices. When a complaint is linked to a scan, the scan's package image is automatically preserved as inspection evidence.
- **Inspector Mode:** Complaint Center is now a read-only investigation inbox. Inspectors can see all submitted consumer complaints, reference numbers, status, product/shop/location details, detected findings, consumer descriptions, attached evidence, and the linked PackCheck inspection.
- Complaint evidence is served locally at `/complaint-files/...` for inspection review.
- A complaint remains a preliminary report and does not itself establish legal guilt or automatically trigger enforcement.
