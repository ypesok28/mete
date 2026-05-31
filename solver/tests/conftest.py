"""Make the solver package importable as `solver` / `contracts` from the tests.

The package root is `src/solver/` (contracts.py + solver/ live here). pytest is run
from that directory (`pytest tests/ -v` per 05 §S5), so add it to sys.path so the
tests can `from solver import solve` and `import contracts` with no install step.
"""
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parent.parent  # src/solver/
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))
