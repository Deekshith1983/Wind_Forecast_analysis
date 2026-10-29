"""
Phase 2.1 & 2.2 — Data Loader & Normalisation Tests

Validates file existence, schema enforcement, raw loading, timestamp
normalisation, numeric conversion, caching, and graceful error handling.
"""

import pandas as pd
import numpy as np
import pytest
from pathlib import Path

from app.services.data_loader import DataLoader, DataLoadError


def test_file_existence(loader):
    """CSV files exist at configured paths."""
    loader.validate_file_existence()
    assert loader.actuals_path.exists()
    assert loader.forecasts_path.exists()


def test_raw_actuals_shape(loader):
    """Raw actuals has 1,488 rows (31 days × 48 SPs)."""
    df = loader.load_raw_actuals(force_reload=True)
    assert isinstance(df, pd.DataFrame)
    assert len(df) == 1488
    assert {"startTime", "generation", "fuelType"}.issubset(df.columns)


def test_raw_forecasts_shape(loader):
    """Raw forecasts has 17,536 rows."""
    df = loader.load_raw_forecasts(force_reload=True)
    assert isinstance(df, pd.DataFrame)
    assert len(df) == 17536
    assert {"startTime", "publishTime", "generation"}.issubset(df.columns)


def test_caching_returns_defensive_copies(loader):
    """Cached reads return independent copies."""
    df1 = loader.load_raw_actuals()
    df2 = loader.load_raw_actuals()
    assert len(df1) == len(df2)
    assert id(df1) != id(df2)


def test_missing_file_raises_error(tmp_path):
    """Loading from non-existent path raises DataLoadError."""
    fake = tmp_path / "ghost.csv"
    bad_loader = DataLoader(actuals_path=fake)
    with pytest.raises(DataLoadError, match="not found"):
        bad_loader.load_raw_actuals()


def test_missing_columns_raises_error(tmp_path):
    """CSV with wrong schema raises DataLoadError."""
    bad = tmp_path / "bad.csv"
    pd.DataFrame({"col_x": [1]}).to_csv(bad, index=False)
    bad_loader = DataLoader(actuals_path=bad)
    with pytest.raises(DataLoadError, match="missing required columns"):
        bad_loader.load_raw_actuals()


def test_actuals_normalisation_timestamps(actuals_norm):
    """Actuals timestamps are UTC with zero NaTs."""
    assert "startTime_utc" in actuals_norm.columns
    assert str(actuals_norm["startTime_utc"].dt.tz) == "UTC"
    assert actuals_norm["startTime_utc"].isna().sum() == 0
    assert "startTime_raw" in actuals_norm.columns


def test_actuals_normalisation_numeric(actuals_norm):
    """Generation is float64, non-negative, zero NaN."""
    assert pd.api.types.is_float_dtype(actuals_norm["generation_mw"])
    assert (actuals_norm["generation_mw"] >= 0).all()
    assert actuals_norm["generation_mw"].isna().sum() == 0


def test_forecasts_normalisation_timestamps(forecasts_norm):
    """Forecasts have UTC startTime, publishTime, and lead_time_hours."""
    assert str(forecasts_norm["startTime_utc"].dt.tz) == "UTC"
    assert str(forecasts_norm["publishTime_utc"].dt.tz) == "UTC"
    assert forecasts_norm["startTime_utc"].isna().sum() == 0
    assert forecasts_norm["publishTime_utc"].isna().sum() == 0
    assert "lead_time_hours" in forecasts_norm.columns
    assert forecasts_norm["lead_time_hours"].max() <= 72.0


def test_normalisation_invalid_graceful():
    """Invalid strings become NaT/NaN rather than crashing."""
    loader = DataLoader()
    raw = pd.DataFrame({
        "startTime": ["2026-01-01T00:00:00Z", "BAD"],
        "publishTime": ["2026-01-01T00:00:00Z", "BAD"],
        "generation": ["1000", "NAN"],
        "fuelType": ["WIND", "WIND"],
    })
    norm = loader.normalize_actuals(raw)
    assert pd.notna(norm["startTime_utc"].iloc[0])
    assert pd.isna(norm["startTime_utc"].iloc[1])
    assert norm["generation_mw"].iloc[0] == 1000.0
    assert pd.isna(norm["generation_mw"].iloc[1])
