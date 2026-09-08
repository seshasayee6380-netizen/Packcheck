# Final Passport QR Validation

## Changes
- Public passport verification now uses same-origin `/api/passports/{id}` first so localhost/LAN/Vite-proxy demos stay on the reachable frontend origin.
- For plain HTTP LAN demos, it falls back to `http(same-host):8000/api/passports/{id}` if the proxy fails.
- 10-second timeout and explicit verification error/retry state prevent infinite loading.
- Verification steps now advance only after a valid registry response; no premature “registry checked” state.
- Internal passport creation remains callable from `analyze-text` without FastAPI Request injection, while the HTTP route still receives `Request`.

## Validation
- Python syntax: PASS
- Prototype scoring tests: PASS
- OCR pipeline test: PASS
- PaddleOCR integration test: PASS
- ABBYY integration mock test: PASS
- v5 feature smoke test: PASS
- Passport API lookup: PASS (200), signature_valid=true
- Passport QR endpoint: PASS (200, image/png)
- Frontend source assertions for proxy/fallback/timeout/step sequencing: PASS

## Note
A full Vite production build was not run because frontend dependencies are not installed in this execution environment. The local Windows build remains the final environment-specific check.
