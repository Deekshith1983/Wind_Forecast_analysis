"""
Phase 3.5 — Evaluation Engine Integration Tests

Validates the full pipeline against EDA benchmark metrics.

EDA baseline (24h cutoff, 717 matched hours):
  MAE  ≈ 1,984.92 MW
  RMSE ≈ 2,438.06 MW
  Bias ≈ +1,767.49 MW
  MAPE ≈ 20.48%
  Unmatched hours = 27
"""

import pytest

from app.services.evaluation_engine import EvaluationEngine


@pytest.fixture(scope="module")
def engine(loader):
    return EvaluationEngine(loader)


class TestSummary:
    """Executive summary at 24h cutoff must match EDA."""

    def test_matched_hours(self, engine):
        summary = engine.get_summary(cutoff_hours=24)
        assert summary["matched_hours"] == 717

    def test_unmatched_hours(self, engine):
        summary = engine.get_summary(cutoff_hours=24)
        assert summary["unmatched_hours"] == 27

    def test_total_hours(self, engine):
        summary = engine.get_summary(cutoff_hours=24)
        assert summary["total_delivery_hours"] == 744

    def test_coverage(self, engine):
        summary = engine.get_summary(cutoff_hours=24)
        assert summary["coverage_pct"] == pytest.approx(96.37, abs=0.1)

    def test_mae(self, engine):
        summary = engine.get_summary(cutoff_hours=24)
        assert summary["metrics"]["mae"] == pytest.approx(1984.92, abs=1.0)

    def test_rmse(self, engine):
        summary = engine.get_summary(cutoff_hours=24)
        assert summary["metrics"]["rmse"] == pytest.approx(2438.06, abs=1.0)

    def test_bias_positive(self, engine):
        """Positive bias confirms systematic over-forecasting."""
        summary = engine.get_summary(cutoff_hours=24)
        assert summary["metrics"]["bias"] == pytest.approx(1767.49, abs=1.0)
        assert summary["metrics"]["bias"] > 0

    def test_mape(self, engine):
        summary = engine.get_summary(cutoff_hours=24)
        assert summary["metrics"]["mape"] == pytest.approx(20.48, abs=0.5)

    def test_unmatched_reason(self, engine):
        summary = engine.get_summary(cutoff_hours=24)
        assert summary["unmatched_detail"] is not None
        assert summary["unmatched_detail"]["count"] == 27


class TestComparison:
    """Hourly comparison time-series."""

    def test_length(self, engine):
        records = engine.get_comparison(cutoff_hours=24)
        assert len(records) == 744

    def test_matched_count(self, engine):
        records = engine.get_comparison(cutoff_hours=24)
        matched = [r for r in records if r["matched"]]
        assert len(matched) == 717


class TestCutoffComparison:
    """Multi-cutoff comparison on common sample."""

    def test_cutoffs(self, engine):
        result = engine.get_cutoff_comparison()
        assert result["cutoffs"] == [48, 24, 12, 6, 1]

    def test_common_sample_size(self, engine):
        """Common sample across [48, 24, 12, 6, 1]h cutoffs."""
        result = engine.get_cutoff_comparison()
        # 48h cutoff has fewest matched hours; common ≈ 551
        assert result["common_sample_hours"] > 500

    def test_accuracy_improves_with_shorter_cutoff(self, engine):
        """MAE should decrease as cutoff shortens (on common sample)."""
        result = engine.get_cutoff_comparison()
        maes = {
            r["cutoff_hours"]: r["common_sample"]["metrics"]["mae"]
            for r in result["results"]
        }
        assert maes[1] < maes[48]  # 1h should be better than 48h


class TestErrorDistribution:
    """Error distribution for histograms."""

    def test_count(self, engine):
        dist = engine.get_error_distribution(cutoff_hours=24)
        assert dist["n"] == 717

    def test_positive_skew(self, engine):
        dist = engine.get_error_distribution(cutoff_hours=24)
        assert dist["summary"]["skewness_indicator"] == "positive"
