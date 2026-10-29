"""
Comprehensive API Endpoint Tests for all 5 Dashboard Sections.

Validates that every single endpoint:
- Returns HTTP 200 OK
- Conforms to the expected Pydantic response models
- Handles query parameters (cutoff_hours, start_date, end_date, pagination, sorting)
- Preserves backward compatibility
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


# ══════════════════════════════════════════════════════════════════════
# Section A: Executive Overview Tests
# ══════════════════════════════════════════════════════════════════════

class TestExecutiveOverviewEndpoints:

    def test_summary_default(self, client):
        resp = client.get("/api/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert data["matched_hours"] == 717
        assert data["unmatched_hours"] == 27
        assert data["metrics"]["mae"] is not None
        assert data["metrics"]["rmse"] is not None
        assert data["metrics"]["bias"] > 0
        assert data["coverage_pct"] == 96.37

    def test_summary_query_parameters(self, client):
        resp = client.get("/api/summary?cutoff_hours=12&start_date=2026-01-10&end_date=2026-01-20")
        assert resp.status_code == 200
        data = resp.json()
        assert data["cutoff_hours"] == 12
        assert data["total_delivery_hours"] > 0

    def test_dataset_profile(self, client):
        resp = client.get("/api/dataset-profile")
        assert resp.status_code == 200
        data = resp.json()
        assert data["actuals"]["total_records"] == 1488
        assert data["forecasts"]["total_records"] == 17536
        assert data["evaluation_grid"]["expected_calendar_hours"] == 744

    def test_overview(self, client):
        resp = client.get("/api/overview")
        assert resp.status_code == 200
        data = resp.json()
        assert "summary" in data
        assert "compact_series" in data
        assert len(data["compact_series"]) == 31  # 31 days in January
        assert len(data["key_findings"]) >= 4


# ══════════════════════════════════════════════════════════════════════
# Section B: Forecast Performance Tests
# ══════════════════════════════════════════════════════════════════════

class TestForecastPerformanceEndpoints:

    def test_forecasts_timeseries(self, client):
        resp = client.get("/api/forecasts")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 744
        assert "actual_mw" in data[0]
        assert "forecast_mw" in data[0]

    def test_comparison_alias(self, client):
        resp = client.get("/api/comparison")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 744
        matched = [r for r in data if r["matched"]]
        assert len(matched) == 717

    def test_forecast_errors(self, client):
        resp = client.get("/api/forecast-errors")
        assert resp.status_code == 200
        data = resp.json()
        assert data["n"] == 717
        assert len(data["errors"]) == 717
        assert data["summary"]["mean"] > 0

    def test_error_distribution(self, client):
        resp = client.get("/api/error-distribution")
        assert resp.status_code == 200
        data = resp.json()
        assert data["n"] == 717
        assert data["summary"]["median_absolute_error"] is not None
        assert data["summary"]["percentile_90_abs"] is not None
        assert len(data["bins"]) > 0

    def test_hourly_records_pagination(self, client):
        resp = client.get("/api/hourly-records?page=1&page_size=20&sort_by=delivery_hour&sort_order=asc")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_records"] == 744
        assert data["page"] == 1
        assert data["page_size"] == 20
        assert len(data["records"]) == 20
        assert data["records"][0]["abs_error_mw"] is not None or not data["records"][0]["matched"]

    def test_daily_performance(self, client):
        resp = client.get("/api/daily-performance")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 31
        assert data[15]["matched_hours"] == 24  # Jan 16 has 24 matched hours


# ══════════════════════════════════════════════════════════════════════
# Section C: Purchase Lead-Time Analysis Tests
# ══════════════════════════════════════════════════════════════════════

class TestPurchaseLeadTimeEndpoints:

    def test_cutoff_comparison(self, client):
        resp = client.get("/api/cutoff-comparison")
        assert resp.status_code == 200
        data = resp.json()
        assert data["cutoffs"] == [48, 24, 12, 6, 1]
        assert data["common_sample_hours"] == 551

    def test_cutoff_metrics(self, client):
        resp = client.get("/api/cutoff-metrics?cutoff_hours=48")
        assert resp.status_code == 200
        data = resp.json()
        assert data["cutoff_hours"] == 48
        assert data["matched_hours"] == 551

    def test_cutoff_coverage(self, client):
        resp = client.get("/api/cutoff-coverage")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 5
        cutoffs = [item["cutoff_hours"] for item in data]
        assert cutoffs == [48, 24, 12, 6, 1]

    def test_forecast_vintages_endpoint(self, client):
        resp = client.get("/api/forecast-vintages?delivery_hour=2026-01-15T14:00:00%2B00:00")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert "is_eligible" in data[0]

    def test_forecasts_drilldown_backward_compat(self, client):
        resp = client.get("/api/forecasts?delivery_hour=2026-01-15T14:00:00%2B00:00")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0


# ══════════════════════════════════════════════════════════════════════
# Section D: Data Quality & Coverage Tests
# ══════════════════════════════════════════════════════════════════════

class TestDataQualityAndCoverageEndpoints:

    def test_data_quality(self, client):
        resp = client.get("/api/data-quality")
        assert resp.status_code == 200
        data = resp.json()
        assert data["overall_status"] == "PASS"

    def test_validation(self, client):
        resp = client.get("/api/validation")
        assert resp.status_code == 200
        data = resp.json()
        assert data["overall_status"] == "PASS"

    def test_diagnostics(self, client):
        resp = client.get("/api/diagnostics")
        assert resp.status_code == 200
        data = resp.json()
        assert "temporal_coverage" in data

    def test_coverage(self, client):
        resp = client.get("/api/coverage?cutoff_hours=24")
        assert resp.status_code == 200
        data = resp.json()
        assert data["expected_delivery_hours"] == 744
        assert data["matched_delivery_hours"] == 717
        assert data["unmatched_delivery_hours"] == 27
        assert data["coverage_pct"] == 96.37

    def test_unmatched_hours(self, client):
        resp = client.get("/api/unmatched-hours?cutoff_hours=24")
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] == 27
        assert len(data["unmatched_hours"]) == 27
        assert "WINDFOR extract begins at 2026-01-01" in data["reason"]

    def test_daily_record_counts(self, client):
        resp = client.get("/api/daily-record-counts")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 31
        assert all(d["actual_half_hour_records"] == 48 for d in data)
        assert all(d["is_complete_actuals"] for d in data)


# ══════════════════════════════════════════════════════════════════════
# Section E: Methodology & Evidence Tests
# ══════════════════════════════════════════════════════════════════════

class TestMethodologyAndEvidenceEndpoints:

    def test_methodology(self, client):
        resp = client.get("/api/methodology")
        assert resp.status_code == 200
        data = resp.json()
        assert "metrics" in data
        assert len(data["metrics"]) >= 5
        assert "alignment_rule" in data
        assert "deliberately_excluded_scope" in data

    def test_data_sources(self, client):
        resp = client.get("/api/data-sources")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["sources"]) == 2
        names = [s["dataset_name"] for s in data["sources"]]
        assert "FUELHH" in names
        assert "WINDFOR" in names

    def test_health(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["datasets_available"]["fuelhh_actuals"] is True
        assert data["datasets_available"]["windfor_forecasts"] is True

    def test_docs_and_openapi(self, client):
        assert client.get("/docs").status_code == 200
        assert client.get("/openapi.json").status_code == 200
