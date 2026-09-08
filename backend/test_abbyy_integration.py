from pathlib import Path
import importlib.util

MAIN = Path(__file__).resolve().parent / "main.py"
spec = importlib.util.spec_from_file_location("packcheck_main", MAIN)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class FakeResponse:
    def __init__(self, status_code, text):
        self.status_code = status_code
        self.text = text

class FakeRequests:
    def __init__(self):
        self.calls = []
        self.step = 0
    def post(self, url, params=None, data=None, auth=None, headers=None, timeout=None):
        self.calls.append(("POST", url, params, auth))
        return FakeResponse(200, '<response><task id="abc-123" status="InProgress" /></response>')
    def get(self, url, params=None, auth=None, headers=None, timeout=None):
        self.calls.append(("GET", url, params, auth))
        if str(url).endswith("getTaskStatus"):
            self.step += 1
            return FakeResponse(200, '<response><task id="abc-123" status="Completed" resultUrl="https://example.invalid/result.txt" /></response>')
        return FakeResponse(200, 'MRP Rs. 20\nNET QTY 40 g\nManufactured by PepsiCo India Holdings Pvt. Ltd')

mod.ABBYY_APPID = "test-app"
mod.ABBYY_PWD = "test-password"
mod.ABBYY_SERVER_URL = "https://cloud-eu.ocrsdk.com"
mod.ABBYY_LANGUAGE = "English"
mod.ABBYY_ENABLED = True
mod.REQUESTS_AVAILABLE = True
fake = FakeRequests()
mod.requests = fake

path = Path(mod.BASE) / "data" / "demo" / "compliant.png"
text = mod._abbyy_ocr_text(path)
assert text and "MRP Rs. 20" in text[0]
assert any(call[0] == "POST" and call[1].endswith("/processImage") for call in fake.calls)
assert any(call[0] == "GET" and call[1].endswith("/getTaskStatus") for call in fake.calls)
print("ABBYY integration mock test: PASS")
