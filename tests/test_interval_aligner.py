"""
Phase 3.2 — Interval Aligner Tests

Validates half-hourly → hourly mean alignment logic.
"""

import pandas as pd
import numpy as np
import pytest

from app.services.interval_aligner import IntervalAligner


def test_basic_alignment():
    """Two half-hours average to one hourly value."""
    df = pd.DataFrame({
        "startTime_utc": pd.to_datetime([
            "2026-01-15 14:00+00:00",
            "2026-01-15 14:30+00:00",
        ]),
        "generation_mw": [8200.0, 8600.0],
    })
    result = IntervalAligner.align(df)
    assert len(result) == 1
    assert result.iloc[0]["actual_mw"] == pytest.approx(8400.0)
    assert result.iloc[0]["half_hour_records"] == 2
    assert result.iloc[0]["is_complete"] == True


def test_incomplete_hour():
    """Single half-hour is flagged as incomplete."""
    df = pd.DataFrame({
        "startTime_utc": pd.to_datetime(["2026-01-15 14:00+00:00"]),
        "generation_mw": [8200.0],
    })
    result = IntervalAligner.align(df)
    assert len(result) == 1
    assert result.iloc[0]["is_complete"] == False
    assert result.iloc[0]["half_hour_records"] == 1


def test_full_january_alignment(actuals_norm):
    """All 744 January hours align with 2 records each."""
    result = IntervalAligner.align(actuals_norm)
    assert len(result) == 744
    assert (result["half_hour_records"] == 2).all()
    assert result["is_complete"].all()
