import sys
from pathlib import Path

# Automatically add urban-environmental-digital-twin to sys.path
_PROJECT_DIR = Path(__file__).resolve().parent / "urban-environmental-digital-twin"
if str(_PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(_PROJECT_DIR))

from backend.app.main import app
