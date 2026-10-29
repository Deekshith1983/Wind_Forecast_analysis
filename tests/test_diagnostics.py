"""
Phase 2.4 — Diagnostics Tests

Validates temporal coverage, interval cadence, and alignment feasibility
against EDA-verified numbers.
"""

from app.services.data_loader import DataLoader
from app.services.diagnostics import IntervalDiagnostics


def test_coverage(loader):
    """Temporal coverage matches EDA: 1,488 unique actuals, 744 unique forecast hours."""
    d = IntervalDiagnostics(loader)
    res = d.run_diagnostics()
    cov = res["temporal_coverage"]
    assert cov["actuals"]["unique_delivery_timestamps"] == 1488
    assert cov["forecasts"]["unique_delivery_timestamps"] == 744
    assert cov["forecasts"]["unique_publication_runs"] == 248


def test_interval_cadence(loader):
    """30-min actuals and 60-min forecasts detected at 100% adherence."""
    d = IntervalDiagnostics(loader)
    res = d.run_diagnostics()
    cadence = res["interval_cadence"]
    assert cadence["actuals_granularity"]["adherence_rate_pct"] == 100.0
    assert cadence["forecasts_granularity"]["adherence_rate_pct"] == 100.0


def test_alignment_feasibility(loader):
    """All 744 hours have exactly 2 half-hours — viable for downsampling."""
    d = IntervalDiagnostics(loader)
    res = d.run_diagnostics()
    f = res["alignment_feasibility"]["actual_to_hourly_aggregation_feasibility"]
    assert f["total_calendar_hours"] == 744
    assert f["hours_with_exactly_2_half_hours"] == 744
    assert f["hours_with_incomplete_half_hours"] == 0
    assert f["viable_for_hourly_downsampling"] is True
