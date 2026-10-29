"""
Phase 3.2 — Interval Alignment (Half-Hourly Actuals → Hourly)

Resolves the fundamental granularity mismatch between FUELHH (30-min
settlement periods) and WINDFOR (60-min delivery hours).

Rule (from EDA):
  For each calendar hour, take the arithmetic mean of the two settlement
  periods that fall within it.  Require BOTH half-hours to be present;
  flag incomplete hours so they can be reported in the dashboard's
  data-coverage section.

  E.g. for hour 2026-01-15 14:00 UTC:
    SP 29 (14:00–14:30)  generation = 8,200 MW
    SP 30 (14:30–15:00)  generation = 8,600 MW
    → hourly_actual_mw = (8,200 + 8,600) / 2 = 8,400 MW

This is arithmetically equivalent to the hourly energy mean because both
intervals are equal-length (MWh/h).
"""

import pandas as pd


class IntervalAligner:
    """Downsamples half-hourly actuals to hourly means."""

    @staticmethod
    def align(actuals_norm: pd.DataFrame) -> pd.DataFrame:
        """
        Parameters
        ----------
        actuals_norm : pd.DataFrame
            Normalised actuals with 'startTime_utc' (tz-aware UTC) and
            'generation_mw' (float64).

        Returns
        -------
        pd.DataFrame
            Columns: delivery_hour, actual_mw, half_hour_records, is_complete
        """
        df = actuals_norm[["startTime_utc", "generation_mw"]].copy()
        df = df.dropna(subset=["startTime_utc", "generation_mw"])

        # Floor to the containing hour
        df["delivery_hour"] = df["startTime_utc"].dt.floor("h")

        # Aggregate: mean generation and count of contributing records
        hourly = (
            df.groupby("delivery_hour")
            .agg(
                actual_mw=("generation_mw", "mean"),
                half_hour_records=("generation_mw", "count"),
            )
            .reset_index()
        )

        # A complete hour has exactly 2 settlement-period records
        hourly["is_complete"] = hourly["half_hour_records"] == 2

        return hourly
