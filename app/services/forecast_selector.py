"""
Phase 3.3 — Forecast Vintage Selection

Implements the critical business rule: for a purchase lead-time cutoff c,
the eligible forecast for delivery hour h is the LATEST forecast published
at or before the decision time:

    publishTime ≤ startTime − c

Among all eligible vintages for each delivery hour, we select the one
with the latest publishTime (i.e. the most recent information that was
actually available at decision time).

EDA finding:
  At the 24h cutoff, 27 early January hours (Jan 1 00:00 to Jan 2 02:00)
  have NO eligible forecast vintage because the dataset only contains
  forecasts published in January — there are no December 2025 publications.
  These unmatched hours must be tracked and reported, not silently dropped.
"""

from datetime import timedelta

import pandas as pd


class ForecastSelector:
    """Selects the latest eligible forecast vintage per delivery hour."""

    @staticmethod
    def select(
        forecasts_norm: pd.DataFrame,
        cutoff_hours: int = 24,
    ) -> pd.DataFrame:
        """
        Parameters
        ----------
        forecasts_norm : pd.DataFrame
            Normalised forecasts with 'startTime_utc', 'publishTime_utc',
            'generation_mw' (all tz-aware UTC / float64).
        cutoff_hours : int
            Purchase lead-time in hours.

        Returns
        -------
        pd.DataFrame
            One row per delivery hour with columns:
            delivery_hour, forecast_mw, publishTime_utc, lead_time_hours
        """
        df = forecasts_norm.copy()
        df = df.dropna(
            subset=["startTime_utc", "publishTime_utc", "generation_mw"]
        )

        cutoff_delta = timedelta(hours=cutoff_hours)

        # Decision-time eligibility filter
        df["decision_time"] = df["startTime_utc"] - cutoff_delta
        eligible = df[df["publishTime_utc"] <= df["decision_time"]].copy()

        if eligible.empty:
            return pd.DataFrame(
                columns=[
                    "delivery_hour",
                    "forecast_mw",
                    "publishTime_utc",
                    "lead_time_hours",
                ]
            )

        # Select the latest eligible publication per delivery hour
        eligible = eligible.sort_values("publishTime_utc")
        selected = eligible.drop_duplicates(
            subset=["startTime_utc"], keep="last"
        )

        result = pd.DataFrame(
            {
                "delivery_hour": selected["startTime_utc"].array,
                "forecast_mw": selected["generation_mw"].array,
                "publishTime_utc": selected["publishTime_utc"].array,
                "lead_time_hours": selected["lead_time_hours"].to_numpy(),
            }
        )

        return result.reset_index(drop=True)
