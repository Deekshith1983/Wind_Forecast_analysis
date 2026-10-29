import { fetchJson } from './client';
import type {
  SummaryResponse,
  DatasetProfileResponse,
  OverviewResponse,
  ComparisonRecord,
  HourlyRecordsResponse,
  DailyPerformanceRecord,
  ErrorDistributionResponse,
  CutoffComparisonResponse,
  CutoffCoverageItem,
  ForecastVintage,
  CoverageResponse,
  UnmatchedHoursResponse,
  DailyRecordCount,
  ValidationResponse,
  MethodologyResponse,
  DataSourcesResponse,
  HealthResponse,
} from '../types/api';

export const api = {
  // Section A: Executive Overview
  getSummary: (cutoffHours = 24, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({ cutoff_hours: String(cutoffHours) });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return fetchJson<SummaryResponse>(`/summary?${params.toString()}`);
  },

  getDatasetProfile: () => {
    return fetchJson<DatasetProfileResponse>('/dataset-profile');
  },

  getOverview: (cutoffHours = 24) => {
    return fetchJson<OverviewResponse>(`/overview?cutoff_hours=${cutoffHours}`);
  },

  // Section B: Forecast Performance
  getForecasts: (cutoffHours = 24, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({ cutoff_hours: String(cutoffHours) });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return fetchJson<ComparisonRecord[]>(`/forecasts?${params.toString()}`);
  },

  getForecastErrors: (cutoffHours = 24, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({ cutoff_hours: String(cutoffHours) });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return fetchJson<ErrorDistributionResponse>(`/forecast-errors?${params.toString()}`);
  },

  getErrorDistribution: (cutoffHours = 24, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({ cutoff_hours: String(cutoffHours) });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return fetchJson<ErrorDistributionResponse>(`/error-distribution?${params.toString()}`);
  },

  getHourlyRecords: (
    cutoffHours = 24,
    page = 1,
    pageSize = 50,
    sortBy = 'delivery_hour',
    sortOrder = 'asc',
    startDate?: string,
    endDate?: string
  ) => {
    const params = new URLSearchParams({
      cutoff_hours: String(cutoffHours),
      page: String(page),
      page_size: String(pageSize),
      sort_by: sortBy,
      sort_order: sortOrder,
    });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return fetchJson<HourlyRecordsResponse>(`/hourly-records?${params.toString()}`);
  },

  getDailyPerformance: (cutoffHours = 24, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({ cutoff_hours: String(cutoffHours) });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return fetchJson<DailyPerformanceRecord[]>(`/daily-performance?${params.toString()}`);
  },

  // Section C: Purchase Lead-Time Analysis
  getCutoffComparison: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const qs = params.toString();
    return fetchJson<CutoffComparisonResponse>(qs ? `/cutoff-comparison?${qs}` : '/cutoff-comparison');
  },

  getCutoffMetrics: (cutoffHours = 24, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({ cutoff_hours: String(cutoffHours) });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return fetchJson<SummaryResponse>(`/cutoff-metrics?${params.toString()}`);
  },

  getCutoffCoverage: () => {
    return fetchJson<CutoffCoverageItem[]>('/cutoff-coverage');
  },

  getForecastVintages: (deliveryHour: string, cutoffHours = 24) => {
    const params = new URLSearchParams({
      delivery_hour: deliveryHour,
      cutoff_hours: String(cutoffHours),
    });
    return fetchJson<ForecastVintage[]>(`/forecast-vintages?${params.toString()}`);
  },

  // Section D: Data Quality & Coverage
  getDataQuality: () => {
    return fetchJson<ValidationResponse>('/data-quality');
  },

  getValidation: () => {
    return fetchJson<ValidationResponse>('/validation');
  },

  getCoverage: (cutoffHours = 24, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({ cutoff_hours: String(cutoffHours) });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return fetchJson<CoverageResponse>(`/coverage?${params.toString()}`);
  },

  getUnmatchedHours: (cutoffHours = 24) => {
    return fetchJson<UnmatchedHoursResponse>(`/unmatched-hours?cutoff_hours=${cutoffHours}`);
  },

  getDailyRecordCounts: () => {
    return fetchJson<DailyRecordCount[]>('/daily-record-counts');
  },

  // Section E: Methodology & Evidence
  getMethodology: () => {
    return fetchJson<MethodologyResponse>('/methodology');
  },

  getDataSources: () => {
    return fetchJson<DataSourcesResponse>('/data-sources');
  },

  getHealth: () => {
    return fetchJson<HealthResponse>('/health');
  },
};
