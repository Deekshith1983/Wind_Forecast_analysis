"""
Phase 3.3 — Forecast Selector Tests

Validates the latest-eligible-vintage selection rule:
  publishTime ≤ startTime − cutoff
"""

import pandas as pd
import pytest

from app.services.forecast_selector import ForecastSelector


def test_selects_latest_eligible():
    """Among multiple eligible vintages, picks the latest publishTime."""
    df = pd.DataFrame({
        "startTime_utc": pd.to_datetime([
            "2026-01-15 14:00+00:00",
            "2026-01-15 14:00+00:00",
            "2026-01-15 14:00+00:00",
        ]),
        "publishTime_utc": pd.to_datetime([
            "2026-01-14 10:00+00:00",  # 28h lead — eligible at 24h
            "2026-01-14 13:00+00:00",  # 25h lead — eligible at 24h (latest)
            "2026-01-14 15:00+00:00",  # 23h lead — NOT eligible at 24h
        ]),
        "generation_mw": [5000.0, 6000.0, 7000.0],
        "lead_time_hours": [28.0, 25.0, 23.0],
    })

    result = ForecastSelector.select(df, cutoff_hours=24)
    assert len(result) == 1
    assert result.iloc[0]["forecast_mw"] == 6000.0


def test_no_eligible_returns_empty():
    """When no vintage meets the cutoff, return empty DataFrame."""
    df = pd.DataFrame({
        "startTime_utc": pd.to_datetime(["2026-01-01 02:00+00:00"]),
        "publishTime_utc": pd.to_datetime(["2026-01-01 00:00+00:00"]),
        "generation_mw": [3000.0],
        "lead_time_hours": [2.0],
    })

    result = ForecastSelector.select(df, cutoff_hours=24)
    assert len(result) == 0


def test_real_data_24h_cutoff(forecasts_norm):
    """At 24h cutoff, 717 delivery hours have an eligible forecast."""
    result = ForecastSelector.select(forecasts_norm, cutoff_hours=24)
    assert len(result) == 717
