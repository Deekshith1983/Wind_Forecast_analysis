"""
Phase 3.4 — Accuracy Metrics Calculation

Computes forecast-versus-actual accuracy metrics using the signed error
convention:  error = Forecast − Actual

Positive error → over-forecasting (forecast exceeded actual generation).
Negative error → under-forecasting.

Metrics implemented:
  MAE   — Mean Absolute Error (MW)
  RMSE  — Root Mean Squared Error (MW)
  Bias  — Mean signed error (MW); positive = systematic over-forecast
  WAPE  — Weighted Absolute Percentage Error (%)
  MAPE  — Mean Absolute Percentage Error (%) — excludes zero-actual hours
  sMAPE — Symmetric Mean Absolute Percentage Error (%)

EDA baseline (24h cutoff, 717 matched hours):
  MAE   = 1,984.92 MW
  RMSE  = 2,438.06 MW
  Bias  = +1,767.49 MW
  MAPE  = 20.48%
"""

from typing import Any, Dict

import numpy as np
import pandas as pd


class MetricsCalculator:
    """Computes forecast accuracy metrics on a matched comparison dataset."""

    @staticmethod
    def compute(
        actual: pd.Series,
        forecast: pd.Series,
    ) -> Dict[str, Any]:
        """
        Parameters
        ----------
        actual : pd.Series
            Actual hourly generation (MW).
        forecast : pd.Series
            Selected forecast generation (MW).

        Returns
        -------
        dict
            MAE, RMSE, Bias, WAPE, MAPE, sMAPE and sample size.
        """
        if len(actual) == 0 or len(forecast) == 0:
            return {
                "n": 0,
                "mae": None,
                "rmse": None,
                "bias": None,
                "wape": None,
                "mape": None,
                "smape": None,
            }

        a = np.asarray(actual, dtype=float)
        f = np.asarray(forecast, dtype=float)

        error = f - a                       # signed: positive = over-forecast
        abs_error = np.abs(error)

        n = len(a)
        mae = float(np.mean(abs_error))
        rmse = float(np.sqrt(np.mean(error ** 2)))
        bias = float(np.mean(error))

        # WAPE: sum(|error|) / sum(|actual|)
        sum_actual = np.sum(np.abs(a))
        wape = float(np.sum(abs_error) / sum_actual * 100) if sum_actual > 0 else None

        # MAPE: mean(|error / actual|) — exclude zero-actual hours
        nonzero = a != 0
        if nonzero.any():
            mape = float(np.mean(abs_error[nonzero] / np.abs(a[nonzero])) * 100)
        else:
            mape = None

        # sMAPE: mean(2 * |error| / (|actual| + |forecast|))
        denom = np.abs(a) + np.abs(f)
        nonzero_denom = denom > 0
        if nonzero_denom.any():
            smape_vals = np.zeros_like(a)
            smape_vals[nonzero_denom] = (
                2.0 * abs_error[nonzero_denom] / denom[nonzero_denom]
            )
            smape = float(np.mean(smape_vals) * 100)
        else:
            smape = None

        return {
            "n": n,
            "mae": round(mae, 4),
            "rmse": round(rmse, 4),
            "bias": round(bias, 4),
            "wape": round(wape, 4) if wape is not None else None,
            "mape": round(mape, 4) if mape is not None else None,
            "smape": round(smape, 4) if smape is not None else None,
        }
