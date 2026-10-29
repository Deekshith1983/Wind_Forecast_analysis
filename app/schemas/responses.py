"""
Pydantic response models for all API endpoints.

Defines the contract between the FastAPI backend and the React dashboard.
Every endpoint response is typed, validated, and documented for OpenAPI / Swagger.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ── System ────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str = Field(..., examples=["healthy"])
    service: str
    version: str
    timestamp_utc: str
    datasets_available: Dict[str, bool]


# ── Phase 2 & Section D: Data Quality & Profile ───────────────────────

class ValidationResponse(BaseModel):
    overall_status: str
    datasets: Dict[str, Any]


class DiagnosticsResponse(BaseModel):
    temporal_coverage: Dict[str, Any]
    interval_cadence: Dict[str, Any]
    completeness_against_calendar: Dict[str, Any]
    alignment_feasibility: Dict[str, Any]


class DatasetProfileDetail(BaseModel):
    dataset_name: str
    description: str
    total_records: int
    start_time: str
    end_time: str
    unique_delivery_timestamps: Optional[int] = None
    unique_delivery_hours: Optional[int] = None
    unique_publication_runs: Optional[int] = None
    publish_time_min: Optional[str] = None
    publish_time_max: Optional[str] = None
    fuel_type: Optional[str] = None
    resolution: str


class DatasetProfileResponse(BaseModel):
    period: str
    timezone: str
    actuals: DatasetProfileDetail
    forecasts: DatasetProfileDetail
    evaluation_grid: Dict[str, int]


class DailyRecordCount(BaseModel):
    date: str
    actual_half_hour_records: int
    expected_half_hour_records: int
    forecast_records: int
    is_complete_actuals: bool


# ── Phase 3 & Section A: Executive Overview ───────────────────────────

class MetricsDetail(BaseModel):
    n: int
    mae: Optional[float] = None
    rmse: Optional[float] = None
    bias: Optional[float] = None
    wape: Optional[float] = None
    mape: Optional[float] = None
    smape: Optional[float] = None


class UnmatchedDetail(BaseModel):
    start: str
    end: str
    count: int
    reason: str


class EvaluationPeriod(BaseModel):
    start: str
    end: str


class SummaryResponse(BaseModel):
    evaluation_period: EvaluationPeriod
    cutoff_hours: int
    total_delivery_hours: int
    matched_hours: int
    unmatched_hours: int
    coverage_pct: float
    metrics: MetricsDetail
    unmatched_detail: Optional[UnmatchedDetail] = None


class CompactSeriesPoint(BaseModel):
    date: str
    actual_mw: Optional[float] = None
    forecast_mw: Optional[float] = None
    error_mw: Optional[float] = None


class OverviewResponse(BaseModel):
    evaluation_period: EvaluationPeriod
    cutoff_hours: int
    summary: SummaryResponse
    compact_series: List[CompactSeriesPoint]
    cutoffs: List[int]
    common_sample_mae: Optional[float] = None
    key_findings: List[str]


# ── Section B: Forecast Performance ───────────────────────────────────

class ComparisonRecord(BaseModel):
    delivery_hour: str
    actual_mw: Optional[float] = None
    forecast_mw: Optional[float] = None
    error_mw: Optional[float] = None
    matched: bool
    publishTime_utc: Optional[str] = None
    lead_time_hours: Optional[float] = None


class HourlyRecord(BaseModel):
    delivery_hour: str
    actual_mw: Optional[float] = None
    forecast_mw: Optional[float] = None
    error_mw: Optional[float] = None
    abs_error_mw: Optional[float] = None
    matched: bool
    publishTime_utc: Optional[str] = None
    lead_time_hours: Optional[float] = None


class HourlyRecordsResponse(BaseModel):
    total_records: int
    page: int
    page_size: int
    total_pages: int
    records: List[HourlyRecord]


class DailyPerformanceRecord(BaseModel):
    date: str
    total_hours: int
    matched_hours: int
    coverage_pct: float
    actual_mean_mw: Optional[float] = None
    forecast_mean_mw: Optional[float] = None
    mae: Optional[float] = None
    rmse: Optional[float] = None
    bias: Optional[float] = None
    wape: Optional[float] = None


class HistogramBin(BaseModel):
    bin_start: float
    bin_end: float
    count: int
    frequency: float


class ErrorSummary(BaseModel):
    min: Optional[float] = None
    max: Optional[float] = None
    mean: Optional[float] = None
    median: Optional[float] = None
    std: Optional[float] = None
    skewness_indicator: Optional[str] = None
    median_absolute_error: Optional[float] = None
    percentile_90_abs: Optional[float] = None
    percentile_95_abs: Optional[float] = None


class ErrorDistributionResponse(BaseModel):
    cutoff_hours: int
    n: int
    errors: List[float]
    summary: ErrorSummary
    bins: Optional[List[HistogramBin]] = None


# ── Section C: Purchase Lead-Time Analysis ────────────────────────────

class CutoffCoverageDetail(BaseModel):
    matched_hours: int
    total_hours: int
    coverage_pct: float
    metrics: MetricsDetail


class CutoffCommonSample(BaseModel):
    matched_hours: int
    metrics: MetricsDetail


class CutoffResult(BaseModel):
    cutoff_hours: int
    full_coverage: CutoffCoverageDetail
    common_sample: CutoffCommonSample


class CutoffComparisonResponse(BaseModel):
    cutoffs: List[int]
    common_sample_hours: int
    results: List[CutoffResult]


class CutoffCoverageItem(BaseModel):
    cutoff_hours: int
    expected_hours: int
    eligible_matched_hours: int
    unmatched_hours: int
    coverage_pct: float


class ForecastVintage(BaseModel):
    publishTime: str
    startTime: str
    generation_mw: float
    lead_time_hours: float
    is_eligible: Optional[bool] = None


# ── Section D: Coverage & Unmatched Details ───────────────────────────

class CoverageResponse(BaseModel):
    cutoff_hours: int
    expected_delivery_hours: int
    matched_delivery_hours: int
    unmatched_delivery_hours: int
    coverage_pct: float
    status: str


class UnmatchedHoursResponse(BaseModel):
    cutoff_hours: int
    count: int
    unmatched_hours: List[str]
    reason: str


# ── Section E: Methodology & Data Sources ─────────────────────────────

class MetricDefinition(BaseModel):
    name: str
    unit: str
    formula: str
    interpretation: str


class MethodologyResponse(BaseModel):
    title: str
    evaluation_window: str
    alignment_rule: str
    forecast_selection_policy: str
    metrics: List[MetricDefinition]
    key_assumptions: List[str]
    known_limitations: List[str]
    deliberately_excluded_scope: List[str]


class FieldDefinition(BaseModel):
    field_name: str
    data_type: str
    description: str
    unit: Optional[str] = None


class DataSourceDetail(BaseModel):
    dataset_name: str
    provider: str
    portal: str
    description: str
    coverage_period: str
    fields: List[FieldDefinition]


class DataSourcesResponse(BaseModel):
    title: str
    sources: List[DataSourceDetail]
    licence_and_attribution: str
