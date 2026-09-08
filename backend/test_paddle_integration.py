from pathlib import Path
import sys, types, json

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

# Import project after injecting a lightweight PaddleOCR stub.
stub = types.ModuleType("paddleocr")
class FakeResult:
    def __init__(self):
        self.json = json.dumps({"res": {"rec_texts": ["MRP Rs. 120", "NET QTY 1 kg", "ABC Foods Pvt Ltd"], "rec_scores": [0.99, 0.98, 0.97]}})
class FakeOCR:
    def __init__(self, **kwargs):
        assert kwargs.get("engine") == "paddle"
        assert kwargs.get("lang") == "en"
        assert kwargs.get("use_textline_orientation") is True
    def predict(self, path):
        return [FakeResult()]
stub.PaddleOCR = FakeOCR
sys.modules["paddleocr"] = stub

import main
main.PADDLE_AVAILABLE = True
main.PaddleOCR = FakeOCR
main._PADDLE_ENGINE = None
main._PADDLE_INIT_ERROR = None

text, conf = main._paddle_ocr_text(Path("dummy.png"))
assert "MRP Rs. 120" in text
assert "NET QTY 1 kg" in text
assert conf >= 97

print("PaddleOCR integration test: PASS")
print(text)
print(f"Mean confidence: {conf}%")
