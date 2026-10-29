"""
Phase 2.1 & 2.2 — Dataset Ingestion and Type Normalisation

Loads Elexon FUELHH actuals and WINDFOR forecast CSVs from local disk,
validates required columns, normalises timestamps to timezone-aware UTC,
converts numeric fields, and maintains an in-memory cache to prevent
redundant I/O across service layers.

Design decisions (informed by EDA):
- Original source values are preserved as *_raw columns for audit trail.
- Timestamps use pd.to_datetime(utc=True, errors="coerce") so invalid
  strings become NaT rather than silently producing wrong dates.
- Generation values use pd.to_numeric(errors="coerce") — no silent zeros.
- Forecast lead-time is computed as (startTime − publishTime) in hours.
"""

from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

from app.config import settings


class DataLoadError(Exception):
    """Raised when data loading fails due to missing files or corrupted schemas."""
    pass


class DataLoader:
    """
    Ingests and normalises Elexon FUELHH actuals and WINDFOR forecasts.
    Singleton-style cache prevents redundant disk reads.
    """

    def __init__(
        self,
        actuals_path: Optional[Path] = None,
        forecasts_path: Optional[Path] = None,
    ):
        self.actuals_path = actuals_path or settings.actuals_path
        self.forecasts_path = forecasts_path or settings.forecasts_path

        self._cached_actuals_raw: Optional[pd.DataFrame] = None
        self._cached_forecasts_raw: Optional[pd.DataFrame] = None
        self._cached_actuals_norm: Optional[pd.DataFrame] = None
        self._cached_forecasts_norm: Optional[pd.DataFrame] = None

    # ── File validation ───────────────────────────────────────────────

    def validate_file_existence(self) -> None:
        """Raises DataLoadError if configured CSV files do not exist."""
        if not self.actuals_path.exists():
            raise DataLoadError(
                f"Actuals dataset file not found at: {self.actuals_path}"
            )
        if not self.forecasts_path.exists():
            raise DataLoadError(
                f"Forecasts dataset file not found at: {self.forecasts_path}"
            )

    # ── Raw loading ───────────────────────────────────────────────────

    def load_raw_actuals(self, force_reload: bool = False) -> pd.DataFrame:
        """Loads raw FUELHH CSV without type coercion."""
        if self._cached_actuals_raw is not None and not force_reload:
            return self._cached_actuals_raw.copy()

        self.validate_file_existence()
        df = pd.read_csv(self.actuals_path)

        missing = settings.REQUIRED_ACTUALS_COLUMNS - set(df.columns)
        if missing:
            raise DataLoadError(
                f"Actuals CSV missing required columns: {sorted(missing)}"
            )

        self._cached_actuals_raw = df
        return df.copy()

    def load_raw_forecasts(self, force_reload: bool = False) -> pd.DataFrame:
        """Loads raw WINDFOR CSV without type coercion."""
        if self._cached_forecasts_raw is not None and not force_reload:
            return self._cached_forecasts_raw.copy()

        self.validate_file_existence()
        df = pd.read_csv(self.forecasts_path)

        missing = settings.REQUIRED_FORECASTS_COLUMNS - set(df.columns)
        if missing:
            raise DataLoadError(
                f"Forecasts CSV missing required columns: {sorted(missing)}"
            )

        self._cached_forecasts_raw = df
        return df.copy()

    # ── Normalisation (Phase 2.2) ─────────────────────────────────────

    def normalize_actuals(self, df_raw: pd.DataFrame) -> pd.DataFrame:
        """
        Normalises actuals:
        - Preserves original source columns (*_raw) for auditing.
        - Parses startTime / publishTime to timezone-aware UTC.
        - Converts generation to float64, settlementPeriod to nullable Int64.
        """
        df = df_raw.copy()

        # Preserve raw source values
        df["startTime_raw"] = df["startTime"].astype(str)
        if "publishTime" in df.columns:
            df["publishTime_raw"] = df["publishTime"].astype(str)
            df["publishTime_utc"] = pd.to_datetime(
                df["publishTime"], utc=True, errors="coerce"
            )
        else:
            df["publishTime_raw"] = None
            df["publishTime_utc"] = pd.NaT

        df["startTime_utc"] = pd.to_datetime(
            df["startTime"], utc=True, errors="coerce"
        )

        df["generation_mw"] = pd.to_numeric(
            df["generation"], errors="coerce"
        ).astype(float)

        if "settlementPeriod" in df.columns:
            df["settlementPeriod"] = pd.to_numeric(
                df["settlementPeriod"], errors="coerce"
            ).astype("Int64")

        return df

    def normalize_forecasts(self, df_raw: pd.DataFrame) -> pd.DataFrame:
        """
        Normalises forecasts:
        - Preserves original source columns (*_raw) for auditing.
        - Parses startTime / publishTime to timezone-aware UTC.
        - Converts generation to float64.
        - Calculates forecast lead time (horizon) in hours.
        """
        df = df_raw.copy()

        df["startTime_raw"] = df["startTime"].astype(str)
        df["publishTime_raw"] = df["publishTime"].astype(str)

        df["startTime_utc"] = pd.to_datetime(
            df["startTime"], utc=True, errors="coerce"
        )
        df["publishTime_utc"] = pd.to_datetime(
            df["publishTime"], utc=True, errors="coerce"
        )

        df["generation_mw"] = pd.to_numeric(
            df["generation"], errors="coerce"
        ).astype(float)

        df["lead_time_hours"] = (
            (df["startTime_utc"] - df["publishTime_utc"]).dt.total_seconds()
            / 3600.0
        )

        return df

    # ── Cached normalised access ──────────────────────────────────────

    def get_normalized_actuals(self, force_reload: bool = False) -> pd.DataFrame:
        """Returns normalised actuals DataFrame (cached)."""
        if self._cached_actuals_norm is not None and not force_reload:
            return self._cached_actuals_norm.copy()

        raw = self.load_raw_actuals(force_reload=force_reload)
        norm = self.normalize_actuals(raw)
        self._cached_actuals_norm = norm
        return norm.copy()

    def get_normalized_forecasts(self, force_reload: bool = False) -> pd.DataFrame:
        """Returns normalised forecasts DataFrame (cached)."""
        if self._cached_forecasts_norm is not None and not force_reload:
            return self._cached_forecasts_norm.copy()

        raw = self.load_raw_forecasts(force_reload=force_reload)
        norm = self.normalize_forecasts(raw)
        self._cached_forecasts_norm = norm
        return norm.copy()

    def clear_cache(self) -> None:
        """Clears all in-memory caches."""
        self._cached_actuals_raw = None
        self._cached_forecasts_raw = None
        self._cached_actuals_norm = None
        self._cached_forecasts_norm = None


# Global singleton
data_loader = DataLoader()
