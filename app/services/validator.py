"""
Phase 2.3 — Data Quality Validation

Executes comprehensive data-quality checks on normalised Elexon datasets:
- Exact duplicate detection
- Delivery-timestamp uniqueness (actuals) and publish+delivery pair uniqueness (forecasts)
- Timestamp parseability (NaT counts)
- Numeric integrity (NaN, negative generation values)
- Fuel-type audit (unexpected non-WIND records)
- Generation descriptive statistics
- Lead-time / horizon audit for forecasts
- Timestamp boundary reporting

Design decision (from EDA):
  The January 2026 actuals have 0 duplicates, 0 NaTs, 0 negatives, and
  all 1,488 rows are fuelType=WIND.  The 17,536 forecast rows have 0
  duplicate (publishTime, startTime) pairs, 0 NaTs, 0 negatives, and
  3,697 retrospective backcasts (lead_time < 0).  This validator codifies
  those checks so any future data drop is caught immediately.
"""

from typing import Any, Dict, List

import numpy as np
import pandas as pd

from app.services.data_loader import DataLoader, data_loader


class DatasetValidator:
    """Runs systematic data-quality validation across both datasets."""

    def __init__(self, loader: DataLoader = data_loader):
        self.loader = loader

    # ── Actuals ───────────────────────────────────────────────────────

    def validate_actuals(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Validates normalised actuals dataset."""
        total = len(df)
        exact_dups = int(df.duplicated().sum())
        delivery_dups = int(df["startTime_utc"].duplicated().sum())

        nat_start = int(df["startTime_utc"].isna().sum())
        nat_publish = (
            int(df["publishTime_utc"].isna().sum())
            if "publishTime_utc" in df.columns
            else 0
        )
        nan_gen = int(df["generation_mw"].isna().sum())
        neg_gen = int((df["generation_mw"] < 0).sum())

        # Fuel-type audit
        unexpected_fuels: List[str] = []
        non_wind_count = 0
        if "fuelType" in df.columns:
            non_wind = df[df["fuelType"].astype(str).str.upper() != "WIND"]
            unexpected_fuels = sorted(non_wind["fuelType"].unique().tolist())
            non_wind_count = len(non_wind)

        # Generation statistics
        gen_stats = {}
        if nan_gen < total:
            g = df["generation_mw"].dropna()
            gen_stats = {
                "min": float(g.min()),
                "p25": float(g.quantile(0.25)),
                "mean": float(g.mean()),
                "median": float(g.median()),
                "p75": float(g.quantile(0.75)),
                "max": float(g.max()),
                "std": float(g.std()),
            }

        # Timestamp range
        min_d = str(df["startTime_utc"].min()) if total > 0 else None
        max_d = str(df["startTime_utc"].max()) if total > 0 else None

        is_valid = (
            exact_dups == 0
            and delivery_dups == 0
            and nat_start == 0
            and nan_gen == 0
            and neg_gen == 0
            and non_wind_count == 0
        )

        return {
            "dataset_name": "FUELHH (Actuals)",
            "status": "PASS" if is_valid else "FAIL",
            "total_rows": total,
            "exact_duplicate_rows": exact_dups,
            "duplicate_delivery_timestamps": delivery_dups,
            "invalid_timestamps": {
                "startTime_nat": nat_start,
                "publishTime_nat": nat_publish,
            },
            "generation_checks": {
                "invalid_numeric_count": nan_gen,
                "negative_values_count": neg_gen,
                "statistics": gen_stats,
            },
            "fuel_type_audit": {
                "non_wind_records": non_wind_count,
                "unexpected_fuel_types": unexpected_fuels,
            },
            "timestamp_range": {
                "earliest_delivery": min_d,
                "latest_delivery": max_d,
                "distinct_delivery_points": int(df["startTime_utc"].nunique()),
            },
        }

    # ── Forecasts ─────────────────────────────────────────────────────

    def validate_forecasts(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Validates normalised forecasts dataset."""
        total = len(df)
        exact_dups = int(df.duplicated().sum())
        pair_dups = int(
            df.duplicated(subset=["publishTime_utc", "startTime_utc"]).sum()
        )

        nat_start = int(df["startTime_utc"].isna().sum())
        nat_publish = int(df["publishTime_utc"].isna().sum())
        nan_gen = int(df["generation_mw"].isna().sum())
        neg_gen = int((df["generation_mw"] < 0).sum())

        # Generation statistics
        gen_stats = {}
        if nan_gen < total:
            g = df["generation_mw"].dropna()
            gen_stats = {
                "min": float(g.min()),
                "p25": float(g.quantile(0.25)),
                "mean": float(g.mean()),
                "median": float(g.median()),
                "p75": float(g.quantile(0.75)),
                "max": float(g.max()),
                "std": float(g.std()),
            }

        # Lead-time / horizon audit
        retro = int((df["lead_time_hours"] < 0).sum())
        zero_lead = int((df["lead_time_hours"] == 0).sum())
        forward = int((df["lead_time_hours"] > 0).sum())

        lead_stats = {}
        if df["lead_time_hours"].notna().any():
            lt = df["lead_time_hours"].dropna()
            lead_stats = {
                "min_hours": float(lt.min()),
                "median_hours": float(lt.median()),
                "max_hours": float(lt.max()),
                "mean_hours": float(lt.mean()),
            }

        # Timestamp boundaries
        min_d = str(df["startTime_utc"].min()) if total > 0 else None
        max_d = str(df["startTime_utc"].max()) if total > 0 else None
        min_p = str(df["publishTime_utc"].min()) if total > 0 else None
        max_p = str(df["publishTime_utc"].max()) if total > 0 else None

        is_valid = (
            exact_dups == 0
            and pair_dups == 0
            and nat_start == 0
            and nat_publish == 0
            and nan_gen == 0
            and neg_gen == 0
        )

        return {
            "dataset_name": "WINDFOR (Forecasts)",
            "status": "PASS" if is_valid else "FAIL",
            "total_rows": total,
            "exact_duplicate_rows": exact_dups,
            "duplicate_publication_delivery_pairs": pair_dups,
            "invalid_timestamps": {
                "startTime_nat": nat_start,
                "publishTime_nat": nat_publish,
            },
            "generation_checks": {
                "invalid_numeric_count": nan_gen,
                "negative_values_count": neg_gen,
                "statistics": gen_stats,
            },
            "horizon_audit": {
                "lead_time_statistics": lead_stats,
                "retrospective_backcasts": retro,
                "real_time_snapshots": zero_lead,
                "forward_looking_forecasts": forward,
            },
            "timestamp_range": {
                "earliest_delivery": min_d,
                "latest_delivery": max_d,
                "distinct_delivery_points": int(df["startTime_utc"].nunique()),
                "earliest_publication": min_p,
                "latest_publication": max_p,
                "distinct_publication_runs": int(
                    df["publishTime_utc"].nunique()
                ),
            },
        }

    # ── Full validation ───────────────────────────────────────────────

    def run_full_validation(
        self, force_reload: bool = False
    ) -> Dict[str, Any]:
        """Validates both datasets and returns a unified report."""
        act = self.loader.get_normalized_actuals(force_reload=force_reload)
        fct = self.loader.get_normalized_forecasts(force_reload=force_reload)

        act_report = self.validate_actuals(act)
        fct_report = self.validate_forecasts(fct)

        overall = (
            "PASS"
            if act_report["status"] == "PASS" and fct_report["status"] == "PASS"
            else "FAIL"
        )

        return {
            "overall_status": overall,
            "datasets": {
                "actuals": act_report,
                "forecasts": fct_report,
            },
        }


# Global singleton
validator = DatasetValidator()
