"""Smoke tests for PackCheck v5 consumer features. Run with: python test_v5_features.py"""
import subprocess, sys, time
import requests
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PORT = 8015
proc = subprocess.Popen([sys.executable, '-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', str(PORT)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
base = f'http://127.0.0.1:{PORT}'
try:
    for _ in range(40):
        try:
            if requests.get(base + '/api/health', timeout=1).ok:
                break
        except Exception:
            time.sleep(.15)
    else:
        raise RuntimeError('API did not start')

    scan = requests.post(base + '/api/analyze-text', json={'scenario':'compliant','text':'','mode':'demo-text'}, timeout=10).json()
    assert scan['status'] == 'GREEN'
    assert scan['passport']['signature_valid'] is True

    fraud = requests.post(base + '/api/fraud/check', json={
        'mrp':100,'selling_price':125,'quantity':800,'unit':'g',
        'compare_price':110,'compare_quantity':1000,'compare_unit':'g',
        'listing_price':125,'listing_quantity':800,'listing_unit':'g'
    }, timeout=10).json()
    assert fraud['potential_overcharge'] is True
    assert round(fraud['printed_unit_price'], 2) == 125
    assert round(fraud['comparison']['delta_percent'], 1) == 13.6

    files = [('files', ('invoice.txt', b'Invoice', 'text/plain'))]
    complaint = requests.post(base + '/api/complaints', data={
        'scan_id':scan['id'],'product_name':'ABC Basmati Rice','shop_or_website':'Demo Mart',
        'location':'Chennai','incident_at':'2026-08-26T17:00','description':'Demo complaint'
    }, files=files, timeout=10).json()
    assert complaint['reference_no'].startswith('PC-')
    assert len(complaint['attached_files']) == 1
    assert requests.get(base + '/api/complaints/' + complaint['reference_no'], timeout=10).status_code == 200

    issue = requests.post(base + '/api/analyze-text', json={'scenario':'issue','text':'','mode':'demo-text'}, timeout=10).json()
    assert requests.post(base + f'/api/passports/from-scan/{issue["id"]}', timeout=10).status_code == 400

    print('PackCheck v5 feature smoke test: PASS')
finally:
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()
