"""
Phase 2.3 — Validator Tests

Verifies data-quality validation against known January 2026 dataset
characteristics from the EDA.
"""

from app.services.data_loader import DataLoader
from app.services.validator import DatasetValidator


def test_actuals_pass(loader, actuals_norm):
    """Actuals pass all quality checks: 1,488 rows, 0 errors."""
    v = DatasetValidator(loader)
    report = v.validate_actuals(actuals_norm)
    assert report["status"] == "PASS"
    assert report["total_rows"] == 1488
    assert report["exact_duplicate_rows"] == 0
    assert report["duplicate_delivery_timestamps"] == 0
    assert report["invalid_timestamps"]["startTime_nat"] == 0
    assert report["generation_checks"]["negative_values_count"] == 0
    assert report["fuel_type_audit"]["non_wind_records"] == 0


def test_forecasts_pass(loader, forecasts_norm):
    """Forecasts pass quality checks: 17,536 rows, 3,697 backcasts."""
    v = DatasetValidator(loader)
    report = v.validate_forecasts(forecasts_norm)
    assert report["status"] == "PASS"
    assert report["total_rows"] == 17536
    assert report["exact_duplicate_rows"] == 0
    assert report["duplicate_publication_delivery_pairs"] == 0
    assert report["invalid_timestamps"]["startTime_nat"] == 0
    assert report["invalid_timestamps"]["publishTime_nat"] == 0
    assert report["generation_checks"]["negative_values_count"] == 0
    assert report["horizon_audit"]["retrospective_backcasts"] == 3697


def test_full_validation_pass(loader):
    """Full validation returns overall PASS."""
    v = DatasetValidator(loader)
    report = v.run_full_validation()
    assert report["overall_status"] == "PASS"
    assert "actuals" in report["datasets"]
    assert "forecasts" in report["datasets"]
