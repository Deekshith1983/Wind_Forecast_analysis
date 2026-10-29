"""
Phase 3.4 — Metrics Tests

Validates accuracy metric calculations against known values.
"""

import numpy as np
import pytest

from app.services.metrics import MetricsCalculator


def test_perfect_forecast():
    """Zero error across all metrics."""
    actual = [100, 200, 300]
    forecast = [100, 200, 300]
    m = MetricsCalculator.compute(actual, forecast)
    assert m["mae"] == 0.0
    assert m["rmse"] == 0.0
    assert m["bias"] == 0.0


def test_known_error():
    """Hand-calculated example: forecast systematically +100 MW."""
    actual = [1000, 2000, 3000]
    forecast = [1100, 2100, 3100]
    m = MetricsCalculator.compute(actual, forecast)
    assert m["mae"] == pytest.approx(100.0, abs=0.01)
    assert m["bias"] == pytest.approx(100.0, abs=0.01)
    assert m["rmse"] == pytest.approx(100.0, abs=0.01)


def test_signed_bias_convention():
    """Positive bias = over-forecast (Forecast > Actual)."""
    actual = [1000]
    forecast = [1500]
    m = MetricsCalculator.compute(actual, forecast)
    assert m["bias"] > 0  # Over-forecast


def test_empty_input():
    """Empty arrays return None metrics."""
    m = MetricsCalculator.compute([], [])
    assert m["n"] == 0
    assert m["mae"] is None


def test_smape_calculation():
    """sMAPE is computed correctly."""
    actual = [100, 200]
    forecast = [120, 180]
    m = MetricsCalculator.compute(actual, forecast)
    assert m["smape"] is not None
    assert 0 < m["smape"] < 100
