import sys
from pathlib import Path

# Automatically add urban-environmental-digital-twin to sys.path for root-level execution
_PROJECT_DIR = Path(__file__).resolve().parent.parent / "urban-environmental-digital-twin"
if str(_PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(_PROJECT_DIR))

# Extend package path to include the actual backend package
_backend_path = _PROJECT_DIR / "backend"
if str(_backend_path) not in __path__:
    __path__.append(str(_backend_path))
