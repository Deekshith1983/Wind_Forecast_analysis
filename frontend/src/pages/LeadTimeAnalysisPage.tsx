import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { api } from '../api/endpoints';
import { useGlobalFilters } from '../context/FilterContext';
import { ChartCard } from '../components/common/ChartCard';
import { MetricCard } from '../components/common/MetricCard';
import { LoadingSkeleton, ErrorBanner } from '../components/common/FeedbackStates';
import { formatNumber, formatPercent } from '../lib/formatters';

export const LeadTimeAnalysisPage: React.FC = () => {
  const { startDate, endDate } = useGlobalFilters();
  const [sampleMode, setSampleMode] = useState<'common' | 'full'>('common');

  const { data: comparison, isLoading, error } = useQuery({
    queryKey: ['lead-time-comparison', startDate, endDate],
    queryFn: () => api.getCutoffComparison(startDate, endDate),
  });

  const { data: coverageItems } = useQuery({
    queryKey: ['cutoff-coverage'],
    queryFn: () => api.getCutoffCoverage(),
  });

  if (isLoading) {
    return <LoadingSkeleton rows={8} />;
  }

  if (error) {
    return <ErrorBanner message={(error as Error).message} />;
  }

  const results = comparison?.results || [];
  const commonCount = comparison?.common_sample_hours || 551;

  // Prepare chart data
  const accuracyChartData = results.map((r) => {
    const metrics = sampleMode === 'common' ? r.common_sample.metrics : r.full_coverage.metrics;
    return {
      cutoff: `${r.cutoff_hours}h`,
      mae: metrics.mae,
      rmse: metrics.rmse,
      bias: metrics.bias,
    };
  });

  const coverageChartData = results.map((r) => ({
    cutoff: `${r.cutoff_hours}h`,
    coverage_pct: r.full_coverage.coverage_pct,
    matched_hours: r.full_coverage.matched_hours,
  }));

  return (
    <div className="space-y-6">
      {/* ── TOP BANNER: SAMPLE PROTOCOL NOTICE ─────────────────────────── */}
      <div className="bg-white border-l-4 border-l-blue-600 border border-slate-200 rounded p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 leading-relaxed">
            <span className="font-bold text-slate-900">Apples-to-Apples Evaluation Protocol:</span> Comparing forecast horizons
            on the exact same <span className="font-mono font-bold text-slate-900">{commonCount} delivery hours</span> (common intersection sample)
            isolates the true mathematical decay of forecast accuracy from weather sample selection bias.
          </div>
        </div>

        {/* Toggle Sample Mode */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200 shrink-0 text-xs">
          <button
            onClick={() => setSampleMode('common')}
            className={`px-3 py-1 font-mono font-semibold rounded transition ${
              sampleMode === 'common'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Common Sample ({commonCount}h)
          </button>
          <button
            onClick={() => setSampleMode('full')}
            className={`px-3 py-1 font-mono font-semibold rounded transition ${
              sampleMode === 'full'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Full Available Sample
          </button>
        </div>
      </div>

      {/* ── ROW 1: ACCURACY DECAY & BIAS COMPARISONS ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title={`Forecast Error Decay Across Decision Horizons (${sampleMode.toUpperCase()} Sample)`}
          subtitle="MAE and RMSE decay monotonically as decision time approaches physical delivery"
        >
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accuracyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="cutoff"
                  tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'monospace' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={{ stroke: '#cbd5e1' }}
                />
                <Tooltip
                  formatter={((val: any, name: any) => [
                    `${formatNumber(Number(val), 1)} MW`,
                    name === 'mae' ? 'Mean Absolute Error' : 'Root Mean Squared Error',
                  ]) as any}
                />
                <Legend verticalAlign="bottom" height={24} />
                <Bar dataKey="mae" fill="#2563eb" radius={[2, 2, 0, 0]} name="MAE (MW)" />
                <Bar dataKey="rmse" fill="#93c5fd" radius={[2, 2, 0, 0]} name="RMSE (MW)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Systematic Over-Forecasting Bias by Horizon"
          subtitle="Mean signed error (Forecast − Actual) across all cutoffs"
        >
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accuracyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="cutoff"
                  tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'monospace' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={{ stroke: '#cbd5e1' }}
                />
                <Tooltip
                  formatter={(val: any) => [`+${formatNumber(Number(val), 1)} MW`, 'Mean Bias']}
                />
                <Legend verticalAlign="bottom" height={24} />
                <Bar dataKey="bias" fill="#d97706" radius={[2, 2, 0, 0]} name="Mean Bias (MW)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* ── ROW 2: COVERAGE ACROSS CUTOFFS & DETAILS TABLE ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4">
          <ChartCard
            title="Eligible Coverage by Cutoff Horizon"
            subtitle="Shorter cutoffs provide higher coverage of January hours"
          >
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coverageChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="cutoff"
                    tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }}
                    domain={[0, 100]}
                    unit="%"
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={{ stroke: '#cbd5e1' }}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${val}%`, 'Coverage Percentage']}
                  />
                  <Bar dataKey="coverage_pct" fill="#059669" radius={[2, 2, 0, 0]} name="Coverage %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        <div className="lg:col-span-8">
          <ChartCard
            title="Complete Multi-Cutoff Evaluation Ledger"
            subtitle="Comparing full-coverage metrics against the controlled 551-hour common sample"
          >
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] bg-slate-50">
                    <th className="py-2.5 px-3">Cutoff</th>
                    <th className="py-2.5 px-3 text-right">Full Sample Hours</th>
                    <th className="py-2.5 px-3 text-right">Coverage %</th>
                    <th className="py-2.5 px-3 text-right">Full MAE (MW)</th>
                    <th className="py-2.5 px-3 text-right font-bold text-slate-900 bg-blue-50/60">
                      Common MAE (551h)
                    </th>
                    <th className="py-2.5 px-3 text-right">Common RMSE (MW)</th>
                    <th className="py-2.5 px-3 text-right">Common Bias (MW)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((r) => {
                    const is24h = r.cutoff_hours === 24;
                    return (
                      <tr
                        key={r.cutoff_hours}
                        className={`hover:bg-slate-50 ${is24h ? 'bg-blue-50/40 font-semibold' : ''}`}
                      >
                        <td className="py-2.5 px-3 text-slate-900 font-mono">
                          {r.cutoff_hours}h {is24h && '(Day-Ahead Gate)'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700 font-mono">
                          {r.full_coverage.matched_hours} / {r.full_coverage.total_hours}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {formatPercent(r.full_coverage.coverage_pct)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700 font-mono">
                          {formatNumber(r.full_coverage.metrics.mae, 1)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900 bg-blue-50/40">
                          {formatNumber(r.common_sample.metrics.mae, 1)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700 font-mono">
                          {formatNumber(r.common_sample.metrics.rmse, 1)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">
                          +{formatNumber(r.common_sample.metrics.bias, 1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* ── ROW 3: POLICY & ECONOMIC FEASIBILITY CAVEAT ─────────────────── */}
      <div className="bg-slate-50 border border-slate-200 rounded p-4 flex items-start space-x-3 text-xs text-slate-700">
        <AlertCircle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-slate-900">Operational Procurement Reality:</span>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            While 1-hour ahead forecasts deliver 60.3% lower MAE (846 MW) than 24-hour forecasts (2,130 MW), market liquidity
            in the UK wholesale electricity market is overwhelmingly concentrated in the Day-Ahead auction (11:00 D−1).
            Shorter lead-time forecasts cannot substitute for day-ahead forward contracting, but serve as critical signals
            for intra-day physical position balancing and sizing system operator reserve requirements.
          </p>
        </div>
      </div>
    </div>
  );
};
