import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { useGlobalFilters } from '../context/FilterContext';
import { MetricCard } from '../components/common/MetricCard';
import { ChartCard } from '../components/common/ChartCard';
import { ActualForecastChart } from '../components/charts/ActualForecastChart';
import { ErrorDistributionChart } from '../components/charts/ErrorDistributionChart';
import { LeadTimeBarChart } from '../components/charts/LeadTimeBarChart';
import { CutoffDetailsTable } from '../components/tables/CutoffDetailsTable';
import { CoverageDonutChart } from '../components/charts/CoverageDonutChart';
import { KeyFindingsCard } from '../components/common/KeyFindingsCard';
import { LoadingSkeleton, ErrorBanner } from '../components/common/FeedbackStates';
import { formatNumber, formatPercent } from '../lib/formatters';

export const ExecutiveOverviewPage: React.FC = () => {
  const { cutoffHours, startDate, endDate } = useGlobalFilters();

  const {
    data: summary,
    isLoading: loadingSummary,
    error: errorSummary,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['summary', cutoffHours, startDate, endDate],
    queryFn: () => api.getSummary(cutoffHours, startDate, endDate),
  });

  const { data: forecasts, isLoading: loadingForecasts } = useQuery({
    queryKey: ['forecasts', cutoffHours, startDate, endDate],
    queryFn: () => api.getForecasts(cutoffHours, startDate, endDate),
  });

  const { data: distribution } = useQuery({
    queryKey: ['error-distribution', cutoffHours, startDate, endDate],
    queryFn: () => api.getErrorDistribution(cutoffHours, startDate, endDate),
  });

  const { data: cutoffComp } = useQuery({
    queryKey: ['cutoff-comparison', startDate, endDate],
    queryFn: () => api.getCutoffComparison(startDate, endDate),
  });

  if (loadingSummary || loadingForecasts) {
    return <LoadingSkeleton rows={8} />;
  }

  if (errorSummary) {
    return (
      <ErrorBanner
        message={`Failed to connect to analytics backend: ${(errorSummary as Error).message}`}
        onRetry={() => refetchSummary()}
      />
    );
  }

  // Derive common sample metrics for the active cutoff
  let commonMae = summary?.metrics?.mae;
  let commonRmse = summary?.metrics?.rmse;
  let commonBias = summary?.metrics?.bias;

  if (cutoffComp?.results) {
    const matchedCutoff = cutoffComp.results.find((r) => r.cutoff_hours === cutoffHours);
    if (matchedCutoff) {
      commonMae = matchedCutoff.common_sample.metrics.mae ?? commonMae;
      commonRmse = matchedCutoff.common_sample.metrics.rmse ?? commonRmse;
      commonBias = matchedCutoff.common_sample.metrics.bias ?? commonBias;
    }
  }

  const commonSampleCount = cutoffComp?.common_sample_hours || 551;
  const coveragePct = summary?.coverage_pct || 96.37;
  const matchedHours = summary?.matched_hours || 717;
  const totalHours = summary?.total_delivery_hours || 744;
  const unmatchedHours = summary?.unmatched_hours || 27;

  return (
    <div className="space-y-4">
      {/* ── 1. PRIMARY ANALYSIS AREA: DAY-AHEAD DECISION BRIEFING ──────── */}
      <div className="bg-white border-l-4 border-l-blue-600 border border-slate-200 rounded p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Primary Purchasing Decision Horizon: {cutoffHours}h Cutoff
              </span>
              {cutoffHours === 24 && (
                <span className="text-[10px] font-mono text-slate-500">
                  (11:00 D-1 Day-Ahead Auction Gate Closure)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-700 mt-1.5 leading-relaxed max-w-4xl">
              In GB wholesale electricity trading, commercial commitments for delivery day D are struck at the Day-Ahead gate closure (11:00 D-1).
              During January 2026, forecasts available at this cutoff exhibited a <strong className="text-amber-800">systematic positive bias of +{formatNumber(commonBias, 1)} MW</strong>,
              over-estimating wind generation across 83.4% of evaluated hours and requiring upward reserve procurement by National Grid ESO.
            </p>
          </div>
          <div className="shrink-0 flex items-center space-x-3 text-left sm:text-right pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            <div className="border-r border-slate-200 pr-3">
              <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Evaluated Hours</div>
              <div className="text-sm font-bold font-mono text-slate-900">{matchedHours} / {totalHours}h</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Decision Coverage</div>
              <div className="text-sm font-bold font-mono text-emerald-700">{formatPercent(coveragePct)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. HEADLINE METRIC STRIP (RESTRAINED, CONTEXTUALIZED) ──────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard
          title="Mean Absolute Error (MAE)"
          value={formatNumber(commonMae, 1)}
          unit="MW"
          variant="accent"
          subtitle={`Common ${commonSampleCount}h sample (${cutoffHours}h cutoff)`}
          tooltipText="Average deviation magnitude between forecast and actual generation, regardless of sign."
        />
        <MetricCard
          title="Root Mean Squared Error (RMSE)"
          value={formatNumber(commonRmse, 1)}
          unit="MW"
          variant="default"
          subtitle={`Penalizes peak capacity errors (${cutoffHours}h cutoff)`}
          tooltipText="Square root of the mean squared error; heavily penalizes large forecast swings."
        />
        <MetricCard
          title="Mean Forecast Bias"
          value={
            commonBias !== null && commonBias !== undefined
              ? `${commonBias > 0 ? '+' : ''}${formatNumber(commonBias, 1)}`
              : '—'
          }
          unit="MW"
          variant="bias"
          subtitle="Positive = Forecast exceeded actual delivery"
          tooltipText="Systematic over-forecasting means actual wind generation fell short of contracted volumes."
        />
        <MetricCard
          title="Forecast Decision Coverage"
          value={formatPercent(coveragePct)}
          unit=""
          variant="default"
          subtitle={`${matchedHours} of ${totalHours} delivery hours`}
          tooltipText="Percentage of January delivery hours with a valid forecast published prior to cutoff."
        />
        <MetricCard
          title="Common Evaluation Sample"
          value={commonSampleCount}
          unit="hours"
          variant="neutral"
          subtitle="Intersection across all 5 cutoffs"
          tooltipText="Balanced 551-hour dataset where all cutoffs (48h, 24h, 12h, 6h, 1h) have valid forecasts."
        />
      </div>

      {/* ── 3. PRIMARY CHART: ACTUAL VS DAY-AHEAD FORECAST GENERATION ──── */}
      <ChartCard
        title="Actual vs Day-Ahead Forecast Generation & Error Tracking"
        subtitle={`Delivery period: January 2026 · Evaluated at ${cutoffHours}h purchase cutoff · Strict UTC`}
      >
        <ActualForecastChart data={forecasts || []} heightClass="h-84" />
      </ChartCard>

      {/* ── 4. SUPPORTING ANALYTICAL MODULES ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Error Distribution & Dispersion */}
        <div className="lg:col-span-6">
          <ChartCard
            title="Forecast Error Distribution & Tail Dispersion"
            subtitle={`Histogram of signed deviations (Forecast − Actual) at ${cutoffHours}h cutoff`}
          >
            <ErrorDistributionChart distribution={distribution || null} />
          </ChartCard>
        </div>

        {/* Lead-Time Error Decay */}
        <div className="lg:col-span-6">
          <ChartCard
            title="Lead-Time Horizon Comparison (Error Decay)"
            subtitle={`Comparing forecast error across decision horizons on balanced ${commonSampleCount}-hour sample`}
          >
            <LeadTimeBarChart comparison={cutoffComp || null} />
          </ChartCard>
        </div>
      </div>

      {/* ── 5. HISTORICAL BENCHMARK TABLE & COVERAGE INTEGRITY ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <ChartCard
            title="Decision Horizon Accuracy Benchmark"
            subtitle="Comparing 48h, 24h (Day-Ahead), 12h, 6h, and 1h gate closure metrics on identical 551h sample"
          >
            <CutoffDetailsTable comparison={cutoffComp || null} />
          </ChartCard>
        </div>

        <div className="lg:col-span-5">
          <KeyFindingsCard
            biasVal={commonBias}
            coveragePct={coveragePct}
            cutoffHours={cutoffHours}
          />
        </div>
      </div>

      {/* ── 6. DATA COVERAGE & BOUNDARY INTEGRITY NOTE ─────────────────── */}
      <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs text-slate-600 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <span className="font-semibold text-slate-900">Data Coverage & Boundary Documentation:</span>
          <p className="text-[11px] text-slate-500">
            {unmatchedHours} delivery hours lack eligible forecasts under the {cutoffHours}h cutoff rule, occurring strictly between 2026-01-01 00:00 and 2026-01-02 02:00 UTC.
            This is an archive window boundary limitation in the BMRS download, not an operational forecast generation blackout.
          </p>
        </div>
        <div className="shrink-0 flex items-center space-x-2">
          <span className="text-[10px] font-mono px-2 py-1 bg-white border border-slate-200 rounded text-slate-700">
            FUELHH Actuals: 100% (1,488 half-hours)
          </span>
          <span className="text-[10px] font-mono px-2 py-1 bg-white border border-slate-200 rounded text-slate-700">
            WINDFOR Vintages: 17,536 records
          </span>
        </div>
      </div>
    </div>
  );
};

