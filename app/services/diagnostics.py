"""
Phase 2.4 — Temporal and Interval Diagnostics

Analyses the structural differences between the two datasets:
- Temporal coverage boundaries for actuals and forecasts.
- Interval cadence verification (30-min actuals vs 60-min forecasts).
- Completeness against the January 2026 calendar grid.
- Alignment feasibility: verifying exactly 2 half-hours exist per
  calendar hour, making arithmetic-mean downsampling valid.

EDA finding driving this module:
  Actuals are half-hourly (1,488 records = 744 hours × 2 SPs).
  Forecasts are hourly (744 unique delivery hours across 248 publication
  runs = 17,536 records).  All 744 hours have exactly 2 half-hours
  present, confirming conservative hourly-mean alignment is viable
  without data loss.
"""

from typing import Any, Dict

import pandas as pd

from app.services.data_loader import DataLoader, data_loader


class IntervalDiagnostics:
    """Inspects interval cadence, coverage gaps, and alignment viability."""

    def __init__(self, loader: DataLoader = data_loader):
        self.loader = loader

    def run_diagnostics(self) -> Dict[str, Any]:
        act = self.loader.get_normalized_actuals()
        fct = self.loader.get_normalized_forecasts()

        # ── 1. Temporal boundaries ────────────────────────────────────
        a_start = act["startTime_utc"].min()
        a_end = act["startTime_utc"].max()
        a_unique = int(act["startTime_utc"].nunique())

        f_d_start = fct["startTime_utc"].min()
        f_d_end = fct["startTime_utc"].max()
        f_d_unique = int(fct["startTime_utc"].nunique())

        f_p_start = fct["publishTime_utc"].min()
        f_p_end = fct["publishTime_utc"].max()
        f_p_unique = int(fct["publishTime_utc"].nunique())

        # ── 2. Interval cadence ───────────────────────────────────────
        sorted_act = act.sort_values("startTime_utc")
        a_diffs = sorted_act["startTime_utc"].diff().dropna()
        a_step_dist = {str(k): int(v) for k, v in a_diffs.value_counts().items()}

        sorted_fct = fct.sort_values(["publishTime_utc", "startTime_utc"])
        f_step_diffs = (
            sorted_fct.groupby("publishTime_utc")["startTime_utc"]
            .diff()
            .dropna()
        )
        f_step_dist = {
            str(k): int(v) for k, v in f_step_diffs.value_counts().items()
        }

        # ── 3. Calendar completeness ─────────────────────────────────
        expected_30m = pd.date_range(
            "2026-01-01", "2026-02-01", freq="30min", inclusive="left", tz="UTC"
        )
        expected_1h = pd.date_range(
            "2026-01-01", "2026-02-01", freq="1h", inclusive="left", tz="UTC"
        )

        missing_act = int(
            len(set(expected_30m) - set(act["startTime_utc"].dropna()))
        )
        missing_fct = int(
            len(set(expected_1h) - set(fct["startTime_utc"].dropna()))
        )

        # ── 4. Alignment feasibility ─────────────────────────────────
        hourly_sp_counts = (
            act.set_index("startTime_utc")["generation_mw"]
            .resample("1h")
            .count()
        )
        exact_2 = int((hourly_sp_counts == 2).sum())
        incomplete = int((hourly_sp_counts != 2).sum())

        return {
            "temporal_coverage": {
                "actuals": {
                    "delivery_start": str(a_start),
                    "delivery_end": str(a_end),
                    "total_records": len(act),
                    "unique_delivery_timestamps": a_unique,
                    "timezone": str(act["startTime_utc"].dt.tz),
                },
                "forecasts": {
                    "delivery_start": str(f_d_start),
                    "delivery_end": str(f_d_end),
                    "total_records": len(fct),
                    "unique_delivery_timestamps": f_d_unique,
                    "publication_start": str(f_p_start),
                    "publication_end": str(f_p_end),
                    "unique_publication_runs": f_p_unique,
                    "timezone": str(fct["startTime_utc"].dt.tz),
                },
            },
            "interval_cadence": {
                "actuals_granularity": {
                    "dominant_interval": "30 minutes (Half-hourly settlement periods)",
                    "distribution": a_step_dist,
                    "adherence_rate_pct": (
                        100.0
                        if len(a_step_dist) == 1
                        and "0 days 00:30:00" in a_step_dist
                        else 0.0
                    ),
                },
                "forecasts_granularity": {
                    "dominant_interval": "60 minutes (Hourly delivery periods)",
                    "intra_run_step_distribution": f_step_dist,
                    "adherence_rate_pct": (
                        100.0
                        if len(f_step_dist) == 1
                        and "0 days 01:00:00" in f_step_dist
                        else 0.0
                    ),
                },
            },
            "completeness_against_calendar": {
                "expected_half_hourly_periods": len(expected_30m),
                "missing_actual_periods": missing_act,
                "expected_hourly_delivery_periods": len(expected_1h),
                "missing_forecast_delivery_hours": missing_fct,
            },
            "alignment_feasibility": {
                "actual_to_hourly_aggregation_feasibility": {
                    "total_calendar_hours": len(expected_1h),
                    "hours_with_exactly_2_half_hours": exact_2,
                    "hours_with_incomplete_half_hours": incomplete,
                    "viable_for_hourly_downsampling": incomplete == 0,
                },
                "recommended_alignment_strategy": (
                    "Conservative aggregation: Downsample half-hourly actuals "
                    "to hourly mean generation (averaging SP 2k-1 and SP 2k "
                    "for each hour k), requiring both half-hours present."
                ),
                "units_verification": {
                    "actuals_unit": "Megawatts (MW) — average power over 30-min SP",
                    "forecasts_unit": "Megawatts (MW) — average power over 60-min delivery",
                    "conservation_of_energy": (
                        "Arithmetic mean of two 30-min MW values equals "
                        "the 60-min hourly mean MW."
                    ),
                },
            },
        }


# Global singleton
diagnostics = IntervalDiagnostics()
