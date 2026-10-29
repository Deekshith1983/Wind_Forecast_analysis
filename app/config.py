"""
Unified configuration for the UK Wind Generation Forecast Analytics pipeline.

Merges Phase 2 (data foundation) and Phase 3 (evaluation engine) settings
into a single authoritative configuration source.

Key decisions documented here:
- Evaluation period: January 2026 delivery hours (UTC)
- Default purchase lead-time cutoff: 24 hours
- Comparison cutoffs: [48, 24, 12, 6, 1] hours
- Signed error convention: Forecast − Actual (positive = over-forecast)
- Interval alignment: arithmetic mean of two 30-min settlement periods per hour
"""

from pathlib import Path
from datetime import datetime, timezone
import os

from pydantic import BaseModel


class Settings(BaseModel):
    """Centralised application settings — no environment lookups beyond filenames."""

    # ── Project metadata ──────────────────────────────────────────────
    PROJECT_NAME: str = "UK Wind Generation Forecast Analytics"
    VERSION: str = "2.0.0"
    API_PREFIX: str = "/api"

    # ── File system paths ─────────────────────────────────────────────
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    OUTPUT_DIR: Path = BASE_DIR / "outputs"

    ACTUALS_FILENAME: str = os.getenv("ACTUALS_FILENAME", "fuelhh_january_2026.csv")
    FORECASTS_FILENAME: str = os.getenv("FORECASTS_FILENAME", "windfor_january_2026.csv")

    @property
    def actuals_path(self) -> Path:
        return self.DATA_DIR / self.ACTUALS_FILENAME

    @property
    def forecasts_path(self) -> Path:
        return self.DATA_DIR / self.FORECASTS_FILENAME

    # ── Evaluation window (Phase 3) ──────────────────────────────────
    EVAL_START: str = "2026-01-01T00:00:00+00:00"
    EVAL_END: str = "2026-02-01T00:00:00+00:00"        # exclusive

    # ── Purchase lead-time cutoffs ───────────────────────────────────
    DEFAULT_CUTOFF_HOURS: int = 24
    COMPARISON_CUTOFFS: list[int] = [48, 24, 12, 6, 1]

    # ── Required CSV columns ─────────────────────────────────────────
    REQUIRED_ACTUALS_COLUMNS: set[str] = {"startTime", "generation", "fuelType"}
    REQUIRED_FORECASTS_COLUMNS: set[str] = {"startTime", "publishTime", "generation"}

    # ── CORS origins for React development and deployments ──────────
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ]

    model_config = {"arbitrary_types_allowed": True}


settings = Settings()
