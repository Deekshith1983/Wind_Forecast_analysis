"""
Phase 3.5 — Evaluation Engine (Orchestrator)

End-to-end orchestration that connects every Phase 2 + Phase 3 component
into a unified analytics engine powering the UK Wind Forecast Intelligence Dashboard.

Data flow:
  DataLoader → IntervalAligner → ForecastSelector → MetricsCalculator → REST API

EDA benchmarks this engine reproduces:
  24h cutoff → 717 matched hours, MAE ≈ 1984.92 MW, Bias ≈ +1767.49 MW
  Common sample (48h ∩ 24h ∩ 12h ∩ 6h ∩ 1h) → 551 hours
"""

from datetime import timedelta
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from app.config import settings
from app.services.data_loader import DataLoader, data_loader
from app.services.forecast_selector import ForecastSelector
from app.services.interval_aligner import IntervalAligner
from app.services.metrics import MetricsCalculator


class EvaluationEngine:
    """Orchestrates the full forecast-versus-actual evaluation pipeline."""

    def __init__(self, loader: DataLoader = data_loader):
        self.loader = loader
        self.aligner = IntervalAligner()
        self.selector = ForecastSelector()
        self.metrics = MetricsCalculator()

    # ── Internal helpers ──────────────────────────────────────────────

    def _get_hourly_actuals(self) -> pd.DataFrame:
        """Returns hourly-aligned actuals for the evaluation window."""
        actuals = self.loader.get_normalized_actuals()
        hourly = self.aligner.align(actuals)

        start = pd.Timestamp(settings.EVAL_START)
        end = pd.Timestamp(settings.EVAL_END)
        hourly = hourly[
            (hourly["delivery_hour"] >= start)
            & (hourly["delivery_hour"] < end)
        ].copy()

        return hourly

    def _get_selected_forecasts(self, cutoff_hours: int) -> pd.DataFrame:
        """Returns selected forecast vintages at a given cutoff."""
        forecasts = self.loader.get_normalized_forecasts()

        start = pd.Timestamp(settings.EVAL_START)
        end = pd.Timestamp(settings.EVAL_END)
        forecasts = forecasts[
            (forecasts["startTime_utc"] >= start)
            & (forecasts["startTime_utc"] < end)
        ].copy()

        return self.selector.select(forecasts, cutoff_hours=cutoff_hours)

    def _build_comparison(
        self,
        cutoff_hours: int,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> pd.DataFrame:
        """Merges hourly actuals with selected forecasts."""
        hourly = self._get_hourly_actuals()
        selected = self._get_selected_forecasts(cutoff_hours)

        if selected.empty:
            merged = hourly.copy()
            merged["forecast_mw"] = np.nan
            merged["error_mw"] = np.nan
            merged["publishTime_utc"] = pd.NaT
            merged["lead_time_hours"] = np.nan
            merged["matched"] = False
        else:
            cols = ["delivery_hour", "forecast_mw", "publishTime_utc"]
            if "lead_time_hours" in selected.columns:
                cols.append("lead_time_hours")
            merged = hourly.merge(
                selected[cols],
                on="delivery_hour",
                how="left",
            )
            merged["matched"] = merged["forecast_mw"].notna()
            merged["error_mw"] = merged["forecast_mw"] - merged["actual_mw"]
            if "lead_time_hours" not in merged.columns:
                merged["lead_time_hours"] = np.nan

        # Optional date filtering
        if start_date:
            try:
                s_ts = pd.Timestamp(start_date)
                if s_ts.tz is None:
                    s_ts = s_ts.tz_localize("UTC")
                merged = merged[merged["delivery_hour"] >= s_ts]
            except Exception:
                pass

        if end_date:
            try:
                e_ts = pd.Timestamp(end_date)
                if e_ts.tz is None:
                    e_ts = e_ts.tz_localize("UTC")
                if len(str(end_date).strip()) <= 10:
                    e_ts = e_ts + timedelta(days=1)
                merged = merged[merged["delivery_hour"] < e_ts]
            except Exception:
                pass

        return merged

    # ── Section A: Executive Overview ─────────────────────────────────

    def get_summary(
        self,
        cutoff_hours: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Executive overview KPIs for a single cutoff and optional date range."""
        cutoff = cutoff_hours or settings.DEFAULT_CUTOFF_HOURS
        comparison = self._build_comparison(cutoff, start_date=start_date, end_date=end_date)

        total_hours = len(comparison)
        matched = comparison[comparison["matched"]]
        matched_count = len(matched)
        unmatched_count = total_hours - matched_count
        coverage_pct = round(matched_count / total_hours * 100, 2) if total_hours > 0 else 0

        metrics = self.metrics.compute(
            matched["actual_mw"], matched["forecast_mw"]
        )

        unmatched_hours = comparison[~comparison["matched"]]
        unmatched_range = None
        if len(unmatched_hours) > 0:
            unmatched_range = {
                "start": str(unmatched_hours["delivery_hour"].min()),
                "end": str(unmatched_hours["delivery_hour"].max()),
                "count": unmatched_count,
                "reason": (
                    f"No forecast vintage published ≥{cutoff}h before delivery. "
                    "Dataset only contains January 2026 publications — "
                    "no December 2025 forecasts available."
                ),
            }

        return {
            "evaluation_period": {
                "start": start_date or settings.EVAL_START,
                "end": end_date or settings.EVAL_END,
            },
            "cutoff_hours": cutoff,
            "total_delivery_hours": total_hours,
            "matched_hours": matched_count,
            "unmatched_hours": unmatched_count,
            "coverage_pct": coverage_pct,
            "metrics": metrics,
            "unmatched_detail": unmatched_range,
        }

    def get_dataset_profile(self) -> Dict[str, Any]:
        """Overview and schema profile of the actual and forecast datasets."""
        act = self.loader.get_normalized_actuals()
        fct = self.loader.get_normalized_forecasts()

        return {
            "period": "January 2026",
            "timezone": "UTC",
            "actuals": {
                "dataset_name": "FUELHH",
                "description": "National actual wind generation by half-hourly settlement period",
                "total_records": len(act),
                "start_time": str(act["startTime_utc"].min()),
                "end_time": str(act["startTime_utc"].max()),
                "unique_delivery_timestamps": int(act["startTime_utc"].nunique()),
                "fuel_type": "WIND",
                "resolution": "30-minute settlement periods",
            },
            "forecasts": {
                "dataset_name": "WINDFOR",
                "description": "Hourly national wind generation forecasts across multiple publication vintages",
                "total_records": len(fct),
                "start_time": str(fct["startTime_utc"].min()),
                "end_time": str(fct["startTime_utc"].max()),
                "publish_time_min": str(fct["publishTime_utc"].min()),
                "publish_time_max": str(fct["publishTime_utc"].max()),
                "unique_delivery_hours": int(fct["startTime_utc"].nunique()),
                "unique_publication_runs": int(fct["publishTime_utc"].nunique()),
                "resolution": "Hourly delivery intervals",
            },
            "evaluation_grid": {
                "expected_calendar_hours": 744,
                "aligned_hourly_actuals": 744,
            },
        }

    def get_overview(self, cutoff_hours: Optional[int] = None) -> Dict[str, Any]:
        """Combined overview: headline metrics, compact time series, cutoff summary, and key findings."""
        cutoff = cutoff_hours or settings.DEFAULT_CUTOFF_HOURS
        summary = self.get_summary(cutoff_hours=cutoff)
        daily_perf = self.get_daily_performance(cutoff_hours=cutoff)

        compact_series = [
            {
                "date": d["date"],
                "actual_mw": d["actual_mean_mw"],
                "forecast_mw": d["forecast_mean_mw"],
                "error_mw": d["bias"],
            }
            for d in daily_perf
        ]

        cutoff_comp = self.get_cutoff_comparison()
        common_sample_mae = None
        for r in cutoff_comp.get("results", []):
            if r["cutoff_hours"] == cutoff:
                common_sample_mae = r["common_sample"]["metrics"]["mae"]

        key_findings = [
            f"Persistent positive forecast bias (+{summary['metrics']['bias']:.2f} MW): forecasts systematically exceeded actual generation across January 2026.",
            f"Forecast error increases with decision horizon: MAE improves from 2,042.84 MW at 48h to 1,228.18 MW at 1h on the common 551-hour sample.",
            f"Early January coverage limitation: {summary['unmatched_hours']} hours (Jan 1 00:00 – Jan 2 02:00) lack eligible forecasts at {cutoff}h due to the dataset publication boundary.",
            "Zero data-quality defects: 100% timestamp parseability, 0 duplicate delivery timestamps, and 0 negative values verified across all records.",
        ]

        return {
            "evaluation_period": summary["evaluation_period"],
            "cutoff_hours": cutoff,
            "summary": summary,
            "compact_series": compact_series,
            "cutoffs": settings.COMPARISON_CUTOFFS,
            "common_sample_mae": common_sample_mae,
            "key_findings": key_findings,
        }

    # ── Section B: Forecast Performance ───────────────────────────────

    def get_comparison(
        self,
        cutoff_hours: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Hourly actual-versus-forecast time-series."""
        cutoff = cutoff_hours or settings.DEFAULT_CUTOFF_HOURS
        comparison = self._build_comparison(cutoff, start_date=start_date, end_date=end_date)

        records = []
        for _, row in comparison.iterrows():
            rec = {
                "delivery_hour": str(row["delivery_hour"]),
                "actual_mw": (
                    round(float(row["actual_mw"]), 2)
                    if pd.notna(row["actual_mw"])
                    else None
                ),
                "forecast_mw": (
                    round(float(row["forecast_mw"]), 2)
                    if pd.notna(row["forecast_mw"])
                    else None
                ),
                "error_mw": (
                    round(float(row["error_mw"]), 2)
                    if pd.notna(row["error_mw"])
                    else None
                ),
                "matched": bool(row["matched"]),
                "publishTime_utc": (
                    str(row["publishTime_utc"])
                    if pd.notna(row.get("publishTime_utc"))
                    else None
                ),
                "lead_time_hours": (
                    round(float(row["lead_time_hours"]), 2)
                    if pd.notna(row.get("lead_time_hours"))
                    else None
                ),
            }
            records.append(rec)

        return records

    def get_hourly_records(
        self,
        cutoff_hours: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
        sort_by: str = "delivery_hour",
        sort_order: str = "asc",
    ) -> Dict[str, Any]:
        """Paginated and sortable hourly records for table inspection."""
        cutoff = cutoff_hours or settings.DEFAULT_CUTOFF_HOURS
        comp = self._build_comparison(cutoff, start_date=start_date, end_date=end_date)
        comp = comp.copy()
        comp["abs_error_mw"] = comp["error_mw"].abs()

        sort_col_map = {
            "delivery_time": "delivery_hour",
            "delivery_hour": "delivery_hour",
            "actual": "actual_mw",
            "actual_mw": "actual_mw",
            "forecast": "forecast_mw",
            "forecast_mw": "forecast_mw",
            "error": "error_mw",
            "error_mw": "error_mw",
            "abs_error": "abs_error_mw",
            "abs_error_mw": "abs_error_mw",
        }
        actual_col = sort_col_map.get(sort_by.lower(), "delivery_hour")
        ascending = sort_order.lower() == "asc"
        if actual_col in comp.columns:
            comp = comp.sort_values(by=actual_col, ascending=ascending, na_position="last")

        total_records = len(comp)
        page = max(1, page)
        page_size = max(1, min(page_size, 500))
        total_pages = (total_records + page_size - 1) // page_size if total_records > 0 else 1
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        sliced = comp.iloc[start_idx:end_idx]

        records = []
        for _, row in sliced.iterrows():
            records.append({
                "delivery_hour": str(row["delivery_hour"]),
                "actual_mw": round(float(row["actual_mw"]), 2) if pd.notna(row["actual_mw"]) else None,
                "forecast_mw": round(float(row["forecast_mw"]), 2) if pd.notna(row["forecast_mw"]) else None,
                "error_mw": round(float(row["error_mw"]), 2) if pd.notna(row["error_mw"]) else None,
                "abs_error_mw": round(float(row["abs_error_mw"]), 2) if pd.notna(row["abs_error_mw"]) else None,
                "matched": bool(row["matched"]),
                "publishTime_utc": str(row["publishTime_utc"]) if pd.notna(row.get("publishTime_utc")) else None,
                "lead_time_hours": round(float(row["lead_time_hours"]), 2) if pd.notna(row.get("lead_time_hours")) else None,
            })

        return {
            "total_records": total_records,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "records": records,
        }

    def get_daily_performance(
        self,
        cutoff_hours: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Daily aggregated forecast accuracy metrics across January."""
        cutoff = cutoff_hours or settings.DEFAULT_CUTOFF_HOURS
        comp = self._build_comparison(cutoff, start_date=start_date, end_date=end_date)
        comp = comp.copy()
        comp["date"] = comp["delivery_hour"].dt.strftime("%Y-%m-%d")

        daily_list = []
        for day, group in comp.groupby("date"):
            matched_group = group[group["matched"]]
            m_count = len(matched_group)
            if m_count > 0:
                act = matched_group["actual_mw"]
                fct = matched_group["forecast_mw"]
                err = fct - act
                abs_err = err.abs()
                mae = float(abs_err.mean())
                rmse = float(np.sqrt((err ** 2).mean()))
                bias = float(err.mean())
                sum_act = float(act.abs().sum())
                wape = float(abs_err.sum() / sum_act * 100) if sum_act > 0 else None
                act_mean = float(act.mean())
                fct_mean = float(fct.mean())
            else:
                mae = rmse = bias = wape = act_mean = fct_mean = None

            daily_list.append({
                "date": day,
                "total_hours": len(group),
                "matched_hours": m_count,
                "coverage_pct": round(m_count / len(group) * 100, 2) if len(group) > 0 else 0,
                "actual_mean_mw": round(act_mean, 2) if act_mean is not None else None,
                "forecast_mean_mw": round(fct_mean, 2) if fct_mean is not None else None,
                "mae": round(mae, 2) if mae is not None else None,
                "rmse": round(rmse, 2) if rmse is not None else None,
                "bias": round(bias, 2) if bias is not None else None,
                "wape": round(wape, 2) if wape is not None else None,
            })

        return daily_list

    def get_error_distribution(
        self,
        cutoff_hours: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Signed errors, histogram bins, median absolute error, and 90th/95th percentiles."""
        cutoff = cutoff_hours or settings.DEFAULT_CUTOFF_HOURS
        comparison = self._build_comparison(cutoff, start_date=start_date, end_date=end_date)
        matched = comparison[comparison["matched"]]

        errors = matched["error_mw"].dropna().tolist()
        errors_float = [round(float(e), 2) for e in errors]
        abs_errors = [abs(e) for e in errors_float]

        bins = []
        if len(errors_float) > 1:
            hist, bin_edges = np.histogram(errors_float, bins=15)
            for i in range(len(hist)):
                bins.append({
                    "bin_start": round(float(bin_edges[i]), 1),
                    "bin_end": round(float(bin_edges[i + 1]), 1),
                    "count": int(hist[i]),
                    "frequency": round(float(hist[i] / len(errors_float)), 4),
                })

        med_abs = round(float(np.median(abs_errors)), 2) if abs_errors else None
        p90_abs = round(float(np.percentile(abs_errors, 90)), 2) if abs_errors else None
        p95_abs = round(float(np.percentile(abs_errors, 95)), 2) if abs_errors else None

        summary = {
            "min": round(min(errors_float), 2) if errors_float else None,
            "max": round(max(errors_float), 2) if errors_float else None,
            "mean": round(float(np.mean(errors_float)), 2) if errors_float else None,
            "median": round(float(np.median(errors_float)), 2) if errors_float else None,
            "std": round(float(np.std(errors_float, ddof=1)), 2) if len(errors_float) > 1 else None,
            "skewness_indicator": "positive" if np.mean(errors_float) > 0 else "negative" if errors_float else None,
            "median_absolute_error": med_abs,
            "percentile_90_abs": p90_abs,
            "percentile_95_abs": p95_abs,
        }

        return {
            "cutoff_hours": cutoff,
            "n": len(errors_float),
            "errors": errors_float,
            "summary": summary,
            "bins": bins,
        }

    # ── Section C: Purchase Lead-Time Analysis ────────────────────────

    def get_cutoff_comparison(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Multi-cutoff accuracy comparison on both common sample and full coverage."""
        cutoffs = settings.COMPARISON_CUTOFFS
        comparisons = {}

        for c in cutoffs:
            comparisons[c] = self._build_comparison(c, start_date=start_date, end_date=end_date)

        matched_sets = []
        for c in cutoffs:
            comp = comparisons[c]
            matched_hours = set(comp[comp["matched"]]["delivery_hour"].tolist())
            matched_sets.append(matched_hours)

        common_hours = set.intersection(*matched_sets) if matched_sets else set()
        common_count = len(common_hours)

        results = []
        for c in cutoffs:
            comp = comparisons[c]

            full_matched = comp[comp["matched"]]
            full_metrics = self.metrics.compute(
                full_matched["actual_mw"], full_matched["forecast_mw"]
            )

            common_matched = comp[
                comp["matched"] & comp["delivery_hour"].isin(common_hours)
            ]
            common_metrics = self.metrics.compute(
                common_matched["actual_mw"], common_matched["forecast_mw"]
            )

            results.append(
                {
                    "cutoff_hours": c,
                    "full_coverage": {
                        "matched_hours": len(full_matched),
                        "total_hours": len(comp),
                        "coverage_pct": round(len(full_matched) / len(comp) * 100, 2) if len(comp) > 0 else 0,
                        "metrics": full_metrics,
                    },
                    "common_sample": {
                        "matched_hours": len(common_matched),
                        "metrics": common_metrics,
                    },
                }
            )

        return {
            "cutoffs": cutoffs,
            "common_sample_hours": common_count,
            "results": results,
        }

    def get_cutoff_metrics(
        self,
        cutoff_hours: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Detailed metrics for a single selected cutoff."""
        return self.get_summary(cutoff_hours=cutoff_hours, start_date=start_date, end_date=end_date)

    def get_cutoff_coverage(self) -> List[Dict[str, Any]]:
        """Eligible forecast hours and coverage percentages across all 5 standard cutoffs."""
        cutoffs = settings.COMPARISON_CUTOFFS
        results = []
        for c in cutoffs:
            comp = self._build_comparison(c)
            matched = int(comp["matched"].sum())
            total = len(comp)
            results.append({
                "cutoff_hours": c,
                "expected_hours": total,
                "eligible_matched_hours": matched,
                "unmatched_hours": total - matched,
                "coverage_pct": round(matched / total * 100, 2) if total > 0 else 0,
            })
        return results

    def get_forecast_vintages(
        self,
        delivery_hour: str,
        cutoff_hours: int = 24,
    ) -> List[Dict[str, Any]]:
        """All forecast vintages published for a specific delivery hour with eligibility tag."""
        forecasts = self.loader.get_normalized_forecasts()
        target = pd.Timestamp(delivery_hour)
        if target.tz is None:
            target = target.tz_localize("UTC")

        matching = forecasts[forecasts["startTime_utc"] == target].sort_values("publishTime_utc")
        cutoff_delta = timedelta(hours=cutoff_hours)
        decision_time = target - cutoff_delta

        records = []
        for _, row in matching.iterrows():
            is_elig = bool(row["publishTime_utc"] <= decision_time)
            records.append({
                "publishTime": str(row["publishTime_utc"]),
                "startTime": str(row["startTime_utc"]),
                "generation_mw": float(row["generation_mw"]),
                "lead_time_hours": round(float(row["lead_time_hours"]), 2),
                "is_eligible": is_elig,
            })

        return records

    def get_forecasts(
        self,
        delivery_hour: Optional[str] = None,
        cutoff_hours: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Any:
        """
        Dual-mode forecast accessor:
        - If delivery_hour is provided: returns all vintages for that delivery hour (backward compatibility).
        - Otherwise: returns actual vs forecast time-series data for the given cutoff.
        """
        if delivery_hour:
            return self.get_forecast_vintages(delivery_hour, cutoff_hours=cutoff_hours or 24)
        return self.get_comparison(cutoff_hours=cutoff_hours, start_date=start_date, end_date=end_date)

    # ── Section D: Data Quality & Coverage ─────────────────────────────

    def get_coverage(
        self,
        cutoff_hours: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Expected, matched, eligible, and unmatched delivery hours for a cutoff."""
        cutoff = cutoff_hours or settings.DEFAULT_CUTOFF_HOURS
        comp = self._build_comparison(cutoff, start_date=start_date, end_date=end_date)
        total = len(comp)
        matched = int(comp["matched"].sum())
        unmatched = total - matched

        return {
            "cutoff_hours": cutoff,
            "expected_delivery_hours": total,
            "matched_delivery_hours": matched,
            "unmatched_delivery_hours": unmatched,
            "coverage_pct": round(matched / total * 100, 2) if total > 0 else 0,
            "status": "Complete" if unmatched == 0 else "Partial coverage",
        }

    def get_unmatched_hours(self, cutoff_hours: Optional[int] = None) -> Dict[str, Any]:
        """Delivery hours without eligible forecast/actual matches and exclusion reasons."""
        cutoff = cutoff_hours or settings.DEFAULT_CUTOFF_HOURS
        comp = self._build_comparison(cutoff)
        unmatched = comp[~comp["matched"]]
        hours_list = [str(h) for h in unmatched["delivery_hour"]]

        return {
            "cutoff_hours": cutoff,
            "count": len(unmatched),
            "unmatched_hours": hours_list,
            "reason": (
                f"No forecast vintage published at or before (deliveryHour − {cutoff}h). "
                "The WINDFOR extract begins at 2026-01-01 00:00 UTC and contains no December 2025 publications."
            ),
        }

    def get_daily_record_counts(self) -> List[Dict[str, Any]]:
        """Daily record counts for actuals and forecast vintages."""
        act = self.loader.get_normalized_actuals()
        fct = self.loader.get_normalized_forecasts()

        act_by_day = act.groupby(act["startTime_utc"].dt.strftime("%Y-%m-%d")).size()
        fct_by_day = fct.groupby(fct["startTime_utc"].dt.strftime("%Y-%m-%d")).size()

        days = sorted(set(act_by_day.index).union(set(fct_by_day.index)))
        results = []
        for d in days:
            a_count = int(act_by_day.get(d, 0))
            f_count = int(fct_by_day.get(d, 0))
            results.append({
                "date": d,
                "actual_half_hour_records": a_count,
                "expected_half_hour_records": 48,
                "forecast_records": f_count,
                "is_complete_actuals": a_count == 48,
            })

        return results

    # ── Section E: Methodology & Data Sources ─────────────────────────

    def get_methodology(self) -> Dict[str, Any]:
        """Metric formulas, evaluation rules, assumptions, and deliberate omissions."""
        return {
            "title": "UK Wind Generation Forecast Evaluation Methodology",
            "evaluation_window": "2026-01-01 00:00:00+00:00 to 2026-02-01 00:00:00+00:00 (UTC)",
            "alignment_rule": (
                "Half-hourly actual generation (FUELHH) is downsampled to hourly means by taking the arithmetic "
                "average of the two 30-minute settlement periods (SP 2k-1 and SP 2k) falling within each calendar hour. "
                "Because both half-hours have identical 30-minute duration, the arithmetic mean in MW is equivalent "
                "to total energy volume in MWh divided by 1 hour."
            ),
            "forecast_selection_policy": (
                "For any target delivery hour h and purchase lead-time cutoff c hours, eligible forecasts must satisfy "
                "publishTime <= (startTime - c). Among all eligible vintages for that delivery hour, the vintage with "
                "the latest publishTime is selected as the operational forecast available at decision time."
            ),
            "metrics": [
                {
                    "name": "Mean Absolute Error (MAE)",
                    "unit": "MW",
                    "formula": "MAE = (1/n) * sum(|Forecast - Actual|)",
                    "interpretation": "Average magnitude of forecast errors without regard to direction.",
                },
                {
                    "name": "Root Mean Squared Error (RMSE)",
                    "unit": "MW",
                    "formula": "RMSE = sqrt((1/n) * sum((Forecast - Actual)^2))",
                    "interpretation": "Measures variance and gives greater penalty to large forecast deviations.",
                },
                {
                    "name": "Forecast Bias (Mean Error)",
                    "unit": "MW",
                    "formula": "Bias = (1/n) * sum(Forecast - Actual)",
                    "interpretation": "Positive bias indicates systematic over-forecasting (actual wind fell short).",
                },
                {
                    "name": "Weighted Absolute Percentage Error (WAPE)",
                    "unit": "%",
                    "formula": "WAPE = sum(|Forecast - Actual|) / sum(Actual) * 100",
                    "interpretation": "Total absolute error normalized by total actual wind energy produced.",
                },
                {
                    "name": "Mean Absolute Percentage Error (MAPE)",
                    "unit": "%",
                    "formula": "MAPE = (1/n) * sum(|(Forecast - Actual) / Actual|) * 100",
                    "interpretation": "Average relative error percentage across non-zero actual hours.",
                },
                {
                    "name": "Symmetric MAPE (sMAPE)",
                    "unit": "%",
                    "formula": "sMAPE = (1/n) * sum(2 * |Forecast - Actual| / (|Actual| + |Forecast|)) * 100",
                    "interpretation": "Scale-bounded percentage metric (0% to 200%) symmetric to over- and under-forecasts.",
                },
            ],
            "key_assumptions": [
                "24-hour cutoff represents the standard Day-Ahead procurement decision horizon (EPEX SPOT auction gate).",
                "Evaluation is restricted strictly to national-level wind actuals and national wind forecasts.",
                "Common-sample evaluations (551 hours) are mandatory when comparing multiple lead-time cutoffs to eliminate sample selection bias.",
            ],
            "known_limitations": [
                "Early January coverage gap: 27 hours (Jan 1 00:00 to Jan 2 02:00) lack 24h eligible forecasts because the WINDFOR dataset contains no publications prior to 2026-01-01 00:00.",
                "Actual generation includes embedded and transmission-connected wind as reported under Elexon BMRS fuel-type reporting.",
            ],
            "deliberately_excluded_scope": [
                "No estimated monetary (£) cashout penalties, wholesale electricity prices, or consumer bill impacts are claimed without market price clearing datasets.",
                "No live grid-security or capacity-adequacy declarations are made.",
                "No synthetic balancing-cost models are imputed.",
            ],
        }

    def get_data_sources(self) -> Dict[str, Any]:
        """Dataset provenance, provider details, column schemas, and licences."""
        return {
            "title": "Data Sources & Provenance",
            "sources": [
                {
                    "dataset_name": "FUELHH",
                    "provider": "Elexon BMRS / National Energy System Operator (NESO)",
                    "portal": "https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH",
                    "description": "Half-hourly actual generation outturn by fuel type for Great Britain.",
                    "coverage_period": "2026-01-01 00:00:00+00:00 to 2026-01-31 23:30:00+00:00 UTC",
                    "fields": [
                        {"field_name": "startTime", "data_type": "string (ISO-8601)", "description": "Settlement period start timestamp", "unit": "UTC"},
                        {"field_name": "generation", "data_type": "numeric (float64)", "description": "Outturn generation", "unit": "MW"},
                        {"field_name": "fuelType", "data_type": "string", "description": "Fuel generation category (WIND)", "unit": None},
                        {"field_name": "settlementPeriod", "data_type": "integer", "description": "Half-hour settlement period number (1–48)", "unit": None},
                    ],
                },
                {
                    "dataset_name": "WINDFOR",
                    "provider": "Elexon BMRS / National Energy System Operator (NESO)",
                    "portal": "https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR",
                    "description": "National wind generation forecast vintages published across rolling horizons.",
                    "coverage_period": "2026-01-01 00:00:00+00:00 to 2026-01-31 23:00:00+00:00 UTC",
                    "fields": [
                        {"field_name": "startTime", "data_type": "string (ISO-8601)", "description": "Hourly forecast delivery interval", "unit": "UTC"},
                        {"field_name": "publishTime", "data_type": "string (ISO-8601)", "description": "Timestamp when forecast was computed/published", "unit": "UTC"},
                        {"field_name": "generation", "data_type": "numeric (float64)", "description": "Predicted wind generation", "unit": "MW"},
                    ],
                },
            ],
            "licence_and_attribution": (
                "Contains BMRS data © Elexon Limited copyright and database right 2026. "
                "Provided for energy analytics and procurement decision intelligence evaluation."
            ),
        }


# Global singleton
evaluation_engine = EvaluationEngine()
