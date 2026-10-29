/**
 * TypeScript API contracts matching FastAPI Pydantic response models.
 */

export type CutoffHours = 48 | 24 | 12 | 6 | 1;

export interface GlobalFilterState {
  startDate: string;
  endDate: string;
  cutoffHours: CutoffHours;
}

export interface MetricsDetail {
  n: number;
  mae: number | null;
  rmse: number | null;
  bias: number | null;
  wape: number | null;
  mape: number | null;
  smape: number | null;
}

export interface UnmatchedDetail {
  start: string;
  end: string;
  count: number;
  reason: string;
}

export interface SummaryResponse {
  evaluation_period: {
    start: string;
    end: string;
  };
  cutoff_hours: number;
  total_delivery_hours: number;
  matched_hours: number;
  unmatched_hours: number;
  coverage_pct: number;
  metrics: MetricsDetail;
  unmatched_detail: UnmatchedDetail | null;
}

export interface DatasetProfileDetail {
  dataset_name: string;
  description: string;
  total_records: number;
  start_time: string;
  end_time: string;
  unique_delivery_timestamps?: number;
  unique_delivery_hours?: number;
  unique_publication_runs?: number;
  publish_time_min?: string;
  publish_time_max?: string;
  fuel_type?: string;
  resolution: string;
}

export interface DatasetProfileResponse {
  period: string;
  timezone: string;
  actuals: DatasetProfileDetail;
  forecasts: DatasetProfileDetail;
  evaluation_grid: {
    expected_calendar_hours: number;
    aligned_hourly_actuals: number;
  };
}

export interface CompactSeriesPoint {
  date: string;
  actual_mw: number | null;
  forecast_mw: number | null;
  error_mw: number | null;
}

export interface OverviewResponse {
  evaluation_period: {
    start: string;
    end: string;
  };
  cutoff_hours: number;
  summary: SummaryResponse;
  compact_series: CompactSeriesPoint[];
  cutoffs: number[];
  common_sample_mae: number | null;
  key_findings: string[];
}

export interface ComparisonRecord {
  delivery_hour: string;
  actual_mw: number | null;
  forecast_mw: number | null;
  error_mw: number | null;
  matched: boolean;
  publishTime_utc?: string | null;
  lead_time_hours?: number | null;
}

export interface HourlyRecord {
  delivery_hour: string;
  actual_mw: number | null;
  forecast_mw: number | null;
  error_mw: number | null;
  abs_error_mw: number | null;
  matched: boolean;
  publishTime_utc?: string | null;
  lead_time_hours?: number | null;
}

export interface HourlyRecordsResponse {
  total_records: number;
  page: number;
  page_size: number;
  total_pages: number;
  records: HourlyRecord[];
}

export interface DailyPerformanceRecord {
  date: string;
  total_hours: number;
  matched_hours: number;
  coverage_pct: number;
  actual_mean_mw: number | null;
  forecast_mean_mw: number | null;
  mae: number | null;
  rmse: number | null;
  bias: number | null;
  wape: number | null;
}

export interface HistogramBin {
  bin_start: number;
  bin_end: number;
  count: number;
  frequency: number;
}

export interface ErrorSummary {
  min: number | null;
  max: number | null;
  mean: number | null;
  median: number | null;
  std: number | null;
  skewness_indicator: string | null;
  median_absolute_error?: number | null;
  percentile_90_abs?: number | null;
  percentile_95_abs?: number | null;
}

export interface ErrorDistributionResponse {
  cutoff_hours: number;
  n: number;
  errors: number[];
  summary: ErrorSummary;
  bins?: HistogramBin[];
}

export interface CutoffCoverageDetail {
  matched_hours: number;
  total_hours: number;
  coverage_pct: number;
  metrics: MetricsDetail;
}

export interface CutoffCommonSample {
  matched_hours: number;
  metrics: MetricsDetail;
}

export interface CutoffResult {
  cutoff_hours: number;
  full_coverage: CutoffCoverageDetail;
  common_sample: CutoffCommonSample;
}

export interface CutoffComparisonResponse {
  cutoffs: number[];
  common_sample_hours: number;
  results: CutoffResult[];
}

export interface CutoffCoverageItem {
  cutoff_hours: number;
  expected_hours: number;
  eligible_matched_hours: number;
  unmatched_hours: number;
  coverage_pct: number;
}

export interface ForecastVintage {
  publishTime: string;
  startTime: string;
  generation_mw: number;
  lead_time_hours: number;
  is_eligible?: boolean;
}

export interface CoverageResponse {
  cutoff_hours: number;
  expected_delivery_hours: number;
  matched_delivery_hours: number;
  unmatched_delivery_hours: number;
  coverage_pct: number;
  status: string;
}

export interface UnmatchedHoursResponse {
  cutoff_hours: number;
  count: number;
  unmatched_hours: string[];
  reason: string;
}

export interface DailyRecordCount {
  date: string;
  actual_half_hour_records: number;
  expected_half_hour_records: number;
  forecast_records: number;
  is_complete_actuals: boolean;
}

export interface ValidationResponse {
  overall_status: string;
  datasets: {
    actuals: any;
    forecasts: any;
  };
}

export interface MetricDefinition {
  name: string;
  unit: string;
  formula: string;
  interpretation: string;
}

export interface MethodologyResponse {
  title: string;
  evaluation_window: string;
  alignment_rule: string;
  forecast_selection_policy: string;
  metrics: MetricDefinition[];
  key_assumptions: string[];
  known_limitations: string[];
  deliberately_excluded_scope: string[];
}

export interface DataSourceDetail {
  dataset_name: string;
  provider: string;
  portal: string;
  description: string;
  coverage_period: string;
  fields: {
    field_name: string;
    data_type: string;
    description: string;
    unit?: string | null;
  }[];
}

export interface DataSourcesResponse {
  title: string;
  sources: DataSourceDetail[];
  licence_and_attribution: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp_utc: string;
  datasets_available: Record<string, boolean>;
}

