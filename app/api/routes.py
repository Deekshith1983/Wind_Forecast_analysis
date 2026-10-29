"""
FastAPI routes — complete endpoint suite for the UK Wind Forecast Intelligence Dashboard.

Covers all 5 dashboard navigation sections with shared query parameters:
  Section A: Executive Overview (/api/summary, /api/dataset-profile, /api/overview)
  Section B: Forecast Performance (/api/forecasts, /api/forecast-errors, /api/error-distribution,
                                   /api/hourly-records, /api/daily-performance, /api/comparison)
  Section C: Purchase Lead-Time (/api/cutoff-comparison, /api/cutoff-metrics,
                                 /api/cutoff-coverage, /api/forecast-vintages)
  Section D: Data Quality & Coverage (/api/data-quality, /api/coverage, /api/unmatched-hours,
                                      /api/daily-record-counts, /api/validation, /api/diagnostics)
  Section E: Methodology & Evidence (/api/methodology, /api/data-sources, /api/health)
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.config import settings
from app.schemas.responses import (
    ComparisonRecord,
    CoverageResponse,
    CutoffComparisonResponse,
    CutoffCoverageItem,
    DailyPerformanceRecord,
    DailyRecordCount,
    DataSourcesResponse,
    DatasetProfileResponse,
    DiagnosticsResponse,
    ErrorDistributionResponse,
    ForecastVintage,
    HealthResponse,
    HourlyRecordsResponse,
    MethodologyResponse,
    OverviewResponse,
    SummaryResponse,
    UnmatchedHoursResponse,
    ValidationResponse,
)
from app.services.data_loader import DataLoadError
from app.services.diagnostics import diagnostics
from app.services.evaluation_engine import evaluation_engine
from app.services.validator import validator

router = APIRouter(prefix="/api")


# ══════════════════════════════════════════════════════════════════════
# Section A: Executive Overview
# ══════════════════════════════════════════════════════════════════════

@router.get(
    "/summary",
    response_model=SummaryResponse,
    tags=["Executive Overview"],
    summary="Executive KPI cards: MAE, RMSE, bias, WAPE, coverage and evaluated hours",
)
async def get_summary(
    cutoff: Optional[int] = Query(
        None,
        alias="cutoff_hours",
        description="Forecast purchase-decision horizon in hours (default: 24)",
    ),
    cutoff_param: Optional[int] = Query(
        None,
        alias="cutoff",
        description="Backward-compatible cutoff parameter",
    ),
    start_date: Optional[str] = Query(
        None,
        description="Evaluation start date (e.g. 2026-01-01)",
    ),
    end_date: Optional[str] = Query(
        None,
        description="Evaluation end date (e.g. 2026-01-31)",
    ),
):
    active_cutoff = cutoff or cutoff_param or settings.DEFAULT_CUTOFF_HOURS
    return evaluation_engine.get_summary(
        cutoff_hours=active_cutoff,
        start_date=start_date,
        end_date=end_date,
    )


@router.get(
    "/dataset-profile",
    response_model=DatasetProfileResponse,
    tags=["Executive Overview"],
    summary="Actual/forecast record counts, date ranges, unique delivery hours and dataset overview",
)
async def get_dataset_profile():
    return evaluation_engine.get_dataset_profile()


@router.get(
    "/overview",
    response_model=OverviewResponse,
    tags=["Executive Overview"],
    summary="Combined overview data: headline metrics, compact time series, cutoff summary and key findings",
)
async def get_overview(
    cutoff_hours: int = Query(
        settings.DEFAULT_CUTOFF_HOURS,
        description="Purchase lead-time cutoff in hours",
    ),
):
    return evaluation_engine.get_overview(cutoff_hours=cutoff_hours)


# ══════════════════════════════════════════════════════════════════════
# Section B: Forecast Performance
# ══════════════════════════════════════════════════════════════════════

@router.get(
    "/forecasts",
    tags=["Forecast Performance"],
    summary="Actual versus forecast time-series data (or vintages if delivery_hour is given)",
)
async def get_forecasts(
    cutoff_hours: int = Query(
        settings.DEFAULT_CUTOFF_HOURS,
        description="Purchase lead-time cutoff in hours",
    ),
    delivery_hour: Optional[str] = Query(
        None,
        description="Optional delivery hour (ISO-8601) to fetch vintages instead of time-series",
    ),
    start_date: Optional[str] = Query(
        None,
        description="Evaluation start date (e.g. 2026-01-01)",
    ),
    end_date: Optional[str] = Query(
        None,
        description="Evaluation end date (e.g. 2026-01-31)",
    ),
):
    return evaluation_engine.get_forecasts(
        delivery_hour=delivery_hour,
        cutoff_hours=cutoff_hours,
        start_date=start_date,
        end_date=end_date,
    )


@router.get(
    "/comparison",
    response_model=List[ComparisonRecord],
    tags=["Forecast Performance"],
    summary="Hourly actual-versus-forecast time-series (alias for /api/forecasts)",
)
async def get_comparison(
    cutoff: Optional[int] = Query(
        None,
        alias="cutoff_hours",
        description="Forecast purchase-decision horizon in hours",
    ),
    cutoff_param: Optional[int] = Query(
        None,
        alias="cutoff",
        description="Backward-compatible cutoff parameter",
    ),
    start_date: Optional[str] = Query(None, description="Start date filter"),
    end_date: Optional[str] = Query(None, description="End date filter"),
):
    active_cutoff = cutoff or cutoff_param or settings.DEFAULT_CUTOFF_HOURS
    return evaluation_engine.get_comparison(
        cutoff_hours=active_cutoff,
        start_date=start_date,
        end_date=end_date,
    )


@router.get(
    "/forecast-errors",
    response_model=ErrorDistributionResponse,
    tags=["Forecast Performance"],
    summary="Signed errors, absolute errors, percentiles and distribution statistics",
)
async def get_forecast_errors(
    cutoff_hours: int = Query(
        settings.DEFAULT_CUTOFF_HOURS,
        description="Purchase lead-time cutoff in hours",
    ),
    start_date: Optional[str] = Query(None, description="Start date filter"),
    end_date: Optional[str] = Query(None, description="End date filter"),
):
    return evaluation_engine.get_error_distribution(
        cutoff_hours=cutoff_hours,
        start_date=start_date,
        end_date=end_date,
    )


@router.get(
    "/error-distribution",
    response_model=ErrorDistributionResponse,
    tags=["Forecast Performance"],
    summary="Histogram bins, median absolute error and 90th/95th percentiles",
)
async def get_error_distribution(
    cutoff: Optional[int] = Query(
        None,
        alias="cutoff_hours",
        description="Forecast purchase-decision horizon in hours",
    ),
    cutoff_param: Optional[int] = Query(
        None,
        alias="cutoff",
        description="Backward-compatible cutoff parameter",
    ),
    start_date: Optional[str] = Query(None, description="Start date filter"),
    end_date: Optional[str] = Query(None, description="End date filter"),
):
    active_cutoff = cutoff or cutoff_param or settings.DEFAULT_CUTOFF_HOURS
    return evaluation_engine.get_error_distribution(
        cutoff_hours=active_cutoff,
        start_date=start_date,
        end_date=end_date,
    )


@router.get(
    "/hourly-records",
    response_model=HourlyRecordsResponse,
    tags=["Forecast Performance"],
    summary="Paginated and sortable hourly records for detailed investigation",
)
async def get_hourly_records(
    cutoff_hours: int = Query(
        settings.DEFAULT_CUTOFF_HOURS,
        description="Purchase lead-time cutoff in hours",
    ),
    start_date: Optional[str] = Query(None, description="Start date filter"),
    end_date: Optional[str] = Query(None, description="End date filter"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=500, description="Records per page"),
    sort_by: str = Query("delivery_hour", description="Column to sort by"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$", description="Sort direction"),
):
    return evaluation_engine.get_hourly_records(
        cutoff_hours=cutoff_hours,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get(
    "/daily-performance",
    response_model=List[DailyPerformanceRecord],
    tags=["Forecast Performance"],
    summary="Daily accuracy metrics and error trends",
)
async def get_daily_performance(
    cutoff_hours: int = Query(
        settings.DEFAULT_CUTOFF_HOURS,
        description="Purchase lead-time cutoff in hours",
    ),
    start_date: Optional[str] = Query(None, description="Start date filter"),
    end_date: Optional[str] = Query(None, description="End date filter"),
):
    return evaluation_engine.get_daily_performance(
        cutoff_hours=cutoff_hours,
        start_date=start_date,
        end_date=end_date,
    )


# ══════════════════════════════════════════════════════════════════════
# Section C: Purchase Lead-Time Analysis
# ══════════════════════════════════════════════════════════════════════

@router.get(
    "/cutoff-comparison",
    response_model=CutoffComparisonResponse,
    tags=["Purchase Lead-Time"],
    summary="Compare 48h, 24h, 12h, 6h and 1h cutoffs on common sample and full coverage",
)
async def get_cutoff_comparison(
    start_date: Optional[str] = Query(None, description="Start date filter"),
    end_date: Optional[str] = Query(None, description="End date filter"),
):
    return evaluation_engine.get_cutoff_comparison(
        start_date=start_date,
        end_date=end_date,
    )


@router.get(
    "/cutoff-metrics",
    response_model=SummaryResponse,
    tags=["Purchase Lead-Time"],
    summary="Detailed MAE, RMSE, bias, WAPE and coverage for a selected cutoff",
)
async def get_cutoff_metrics(
    cutoff_hours: int = Query(
        settings.DEFAULT_CUTOFF_HOURS,
        description="Selected purchase lead-time cutoff in hours",
    ),
    start_date: Optional[str] = Query(None, description="Start date filter"),
    end_date: Optional[str] = Query(None, description="End date filter"),
):
    return evaluation_engine.get_cutoff_metrics(
        cutoff_hours=cutoff_hours,
        start_date=start_date,
        end_date=end_date,
    )


@router.get(
    "/cutoff-coverage",
    response_model=List[CutoffCoverageItem],
    tags=["Purchase Lead-Time"],
    summary="Eligible forecast hours and coverage percentages at each cutoff",
)
async def get_cutoff_coverage():
    return evaluation_engine.get_cutoff_coverage()


@router.get(
    "/forecast-vintages",
    response_model=List[ForecastVintage],
    tags=["Purchase Lead-Time"],
    summary="Forecast publication timestamps and selected eligible forecast versions for an hour",
)
async def get_forecast_vintages(
    delivery_hour: str = Query(
        ...,
        description="Target delivery hour (ISO-8601 UTC timestamp, e.g. 2026-01-15T14:00:00Z)",
    ),
    cutoff_hours: int = Query(
        settings.DEFAULT_CUTOFF_HOURS,
        description="Purchase lead-time cutoff to evaluate eligibility against",
    ),
):
    try:
        return evaluation_engine.get_forecast_vintages(
            delivery_hour=delivery_hour,
            cutoff_hours=cutoff_hours,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid delivery_hour format: {exc}",
        )


# ══════════════════════════════════════════════════════════════════════
# Section D: Data Quality & Coverage
# ══════════════════════════════════════════════════════════════════════

@router.get(
    "/data-quality",
    response_model=ValidationResponse,
    tags=["Data Quality & Coverage"],
    summary="Nulls, duplicate records, invalid timestamps and validation results (alias for /validation)",
)
async def get_data_quality():
    return validator.run_full_validation()


@router.get(
    "/validation",
    response_model=ValidationResponse,
    tags=["Data Quality & Coverage"],
    summary="Detailed dataset validation results (Phase 2.3)",
)
async def get_validation():
    return validator.run_full_validation()


@router.get(
    "/diagnostics",
    response_model=DiagnosticsResponse,
    tags=["Data Quality & Coverage"],
    summary="Temporal coverage, interval cadence, and alignment feasibility (Phase 2.4)",
)
async def get_diagnostics():
    return diagnostics.run_diagnostics()


@router.get(
    "/coverage",
    response_model=CoverageResponse,
    tags=["Data Quality & Coverage"],
    summary="Expected, matched, eligible and unmatched delivery hours",
)
async def get_coverage(
    cutoff_hours: int = Query(
        settings.DEFAULT_CUTOFF_HOURS,
        description="Purchase lead-time cutoff in hours",
    ),
    start_date: Optional[str] = Query(None, description="Start date filter"),
    end_date: Optional[str] = Query(None, description="End date filter"),
):
    return evaluation_engine.get_coverage(
        cutoff_hours=cutoff_hours,
        start_date=start_date,
        end_date=end_date,
    )


@router.get(
    "/unmatched-hours",
    response_model=UnmatchedHoursResponse,
    tags=["Data Quality & Coverage"],
    summary="Delivery hours without eligible forecast/actual matches and exclusion reasons",
)
async def get_unmatched_hours(
    cutoff_hours: int = Query(
        settings.DEFAULT_CUTOFF_HOURS,
        description="Purchase lead-time cutoff in hours",
    ),
):
    return evaluation_engine.get_unmatched_hours(cutoff_hours=cutoff_hours)


@router.get(
    "/daily-record-counts",
    response_model=List[DailyRecordCount],
    tags=["Data Quality & Coverage"],
    summary="Daily actual and forecast record counts",
)
async def get_daily_record_counts():
    return evaluation_engine.get_daily_record_counts()


# ══════════════════════════════════════════════════════════════════════
# Section E: Methodology & Evidence
# ══════════════════════════════════════════════════════════════════════

@router.get(
    "/methodology",
    response_model=MethodologyResponse,
    tags=["Methodology & Evidence"],
    summary="Metric formulas, evaluation rules, assumptions and limitations",
)
async def get_methodology():
    return evaluation_engine.get_methodology()


@router.get(
    "/data-sources",
    response_model=DataSourcesResponse,
    tags=["Methodology & Evidence"],
    summary="Dataset names, source descriptions, extraction information and field definitions",
)
async def get_data_sources():
    return evaluation_engine.get_data_sources()


@router.get(
    "/health",
    response_model=HealthResponse,
    tags=["Methodology & Evidence"],
    summary="Backend and service health status",
)
async def health_check():
    actuals_ok = settings.actuals_path.exists()
    forecasts_ok = settings.forecasts_path.exists()

    return HealthResponse(
        status="healthy" if (actuals_ok and forecasts_ok) else "degraded",
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
        timestamp_utc=datetime.now(timezone.utc).isoformat(),
        datasets_available={
            "fuelhh_actuals": actuals_ok,
            "windfor_forecasts": forecasts_ok,
        },
    )
