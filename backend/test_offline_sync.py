"""Offline sync endpoint smoke test. Uses a temporary DB and does not modify demo data."""
import sys, tempfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import main
from main import OfflineSyncRequest, offline_sync

with tempfile.TemporaryDirectory() as td:
    root = Path(td)
    main.DATA = root
    main.DB = root / 'packcheck.db'
    main.UPLOADS = root / 'uploads'; main.UPLOADS.mkdir()
    main.DEMO_DIR = root / 'demo'; main.DEMO_DIR.mkdir()
    main.REPORTS = root / 'reports'; main.REPORTS.mkdir()
    main.COMPLAINT_UPLOADS = root / 'complaints'; main.COMPLAINT_UPLOADS.mkdir()
    main.init_db()
    payload = OfflineSyncRequest(
        offline_id='OFF-TEST-001', category='food', image_coverage=96,
        readability_status='GOOD', readability_score=94, ocr_mean_confidence=92,
        ocr_text='Offline Test Rice\nMRP ₹120\nNet Quantity 1 kg',
        fields={'product_name':'Offline Test Rice','manufacturer':'Test Foods','net_quantity':'1 kg','mrp':'120'},
        confidences={'product_name':90,'manufacturer':88,'net_quantity':95,'mrp':97},
        evidence_notes=['offline evidence','rule snapshot PCR-2026-07']
    )
    first = offline_sync(payload)
    assert first['status'] == 'synced'
    second = offline_sync(payload)
    assert second['status'] == 'already_synced'
    assert first['scan_id'] == second['scan_id']
    print('OFFLINE SYNC: PASS')
