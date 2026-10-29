import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { ChevronLeft, ChevronRight, ArrowUpDown, Clock } from 'lucide-react';
import { api } from '../api/endpoints';
import { useGlobalFilters } from '../context/FilterContext';
import { ChartCard } from '../components/common/ChartCard';
import { MetricCard } from '../components/common/MetricCard';
import { LoadingSkeleton, ErrorBanner } from '../components/common/FeedbackStates';
import { formatNumber, formatUTCDate, formatShortDate } from '../lib/formatters';
import type { ForecastVintage } from '../types/api';

export const ForecastPerformancePage: React.FC = () => {
  const { cutoffHours, startDate, endDate } = useGlobalFilters();
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('delivery_hour');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedVintageHour, setSelectedVintageHour] = useState<string | null>(null);

  const { data: forecasts, isLoading: loadingForecasts, error: errForecasts } = useQuery({
    queryKey: ['forecasts-perf', cutoffHours, startDate, endDate],
    queryFn: () => api.getForecasts(cutoffHours, startDate, endDate),
  });

  const { data: distribution } = useQuery({
    queryKey: ['error-distribution-perf', cutoffHours, startDate, endDate],
    queryFn: () => api.getErrorDistribution(cutoffHours, startDate, endDate),
  });

  const { data: dailyPerf } = useQuery({
    queryKey: ['daily-performance', cutoffHours, startDate, endDate],
    queryFn: () => api.getDailyPerformance(cutoffHours, startDate, endDate),
  });

  const { data: hourlyData } = useQuery({
    queryKey: ['hourly-records', cutoffHours, page, sortBy, sortOrder, startDate, endDate],
    queryFn: () =>
      api.getHourlyRecords(cutoffHours, page, 25, sortBy, sortOrder, startDate, endDate),
  });

  const { data: vintages, isLoading: loadingVintages } = useQuery({
    queryKey: ['vintages', selectedVintageHour, cutoffHours],
    queryFn: () => (selectedVintageHour ? api.getForecastVintages(selectedVintageHour, cutoffHours) : null),
    enabled: !!selectedVintageHour,
  });

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  if (loadingForecasts) {
    return <LoadingSkeleton rows={8} />;
  }

  if (errForecasts) {
    return <ErrorBanner message={(errForecasts as Error).message} />;
  }

  return (
    <div className="space-y-6">
      {/* ── ROW 1: ERROR PERCENTILES CARDS ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard
          title="Median Absolute Error (P50)"
          value={formatNumber(distribution?.summary?.median_absolute_error, 1)}
          unit="MW"
          variant="accent"
          subtitle={`Typical deviation magnitude (${cutoffHours}h cutoff)`}
          tooltipText="Half of all hourly forecasts deviated by less than this amount."
        />
        <MetricCard
          title="90th Percentile (|Error|)"
          value={formatNumber(distribution?.summary?.percentile_90_abs, 1)}
          unit="MW"
          variant="default"
          subtitle="90% of hours deviate by less than this capacity"
          tooltipText="Only 10% of delivery periods experience larger capacity deviations."
        />
        <MetricCard
          title="95th Percentile (|Error|)"
          value={formatNumber(distribution?.summary?.percentile_95_abs, 1)}
          unit="MW"
          variant="warning"
          subtitle="Tail risk / severe forecast swing threshold"
          tooltipText="Benchmark for extreme forecast error scenarios requiring rapid system redispatch."
        />
      </div>

      {/* ── ROW 2: ACTUAL VS FORECAST FULL SERIES & ERROR OVER TIME ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Actual vs Selected Forecast (Full Month)"
          subtitle={`Aligned half-hourly actuals vs forecast available at ${cutoffHours}h cutoff`}
        >
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecasts || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="delivery_hour"
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }}
                  minTickGap={30}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={{ stroke: '#cbd5e1' }}
                />
                <Tooltip
                  formatter={((val: any, name: any) => [
                    `${Number(val).toLocaleString('en-GB', { maximumFractionDigits: 1 })} MW`,
                    name === 'actual_mw' ? 'Actual Generation' : 'Forecast Available',
                  ]) as any}
                  labelFormatter={(l: any) => formatUTCDate(String(l))}
                />
                <Legend verticalAlign="bottom" height={24} iconType="plainline" />
                <Line
                  type="monotone"
                  dataKey="actual_mw"
                  stroke="#0f172a"
                  strokeWidth={1.8}
                  dot={false}
                  name="Actual (MW)"
                />
                <Line
                  type="monotone"
                  dataKey="forecast_mw"
                  stroke="#2563eb"
                  strokeWidth={1.8}
                  strokeDasharray="4 2"
                  dot={false}
                  name="Forecast Available (MW)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Daily MAE & Systematic Bias Trends"
          subtitle="Daily Mean Absolute Error (bars) and Signed Mean Bias (line) across January"
        >
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyPerf || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => `${d.slice(8, 10)} Jan`}
                  tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }}
                  interval={2}
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
                    name === 'mae' ? 'Daily MAE' : name === 'bias' ? 'Daily Mean Bias' : name,
                  ]) as any}
                />
                <Legend verticalAlign="bottom" height={24} />
                <Bar dataKey="mae" fill="#93c5fd" radius={[2, 2, 0, 0]} name="Daily MAE (MW)" />
                <Line
                  type="monotone"
                  dataKey="bias"
                  stroke="#d97706"
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#d97706' }}
                  name="Daily Bias (MW)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* ── ROW 3: DETAILED HOURLY RECORDS TABLE WITH DRILL-DOWN ──────── */}
      <ChartCard
        title="Hourly Forecast & Actual Audit Ledger"
        subtitle={`744 hourly delivery periods for January 2026 (${cutoffHours}h cutoff). Click any row to inspect all historical vintages published before and after cutoff.`}
      >
        <div className="w-full flex flex-col">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider bg-slate-50">
                  <th
                    onClick={() => toggleSort('delivery_hour')}
                    className="py-3 px-3 cursor-pointer hover:text-slate-900"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Delivery Time (UTC)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-slate-600">
                    <span>Forecast Published (UTC)</span>
                  </th>
                  <th className="py-3 px-3 text-right">Lead Time</th>
                  <th
                    onClick={() => toggleSort('actual_mw')}
                    className="py-3 px-3 text-right cursor-pointer hover:text-slate-900"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Actual (MW)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('forecast_mw')}
                    className="py-3 px-3 text-right cursor-pointer hover:text-slate-900"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Forecast Available (MW)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('error_mw')}
                    className="py-3 px-3 text-right cursor-pointer hover:text-slate-900"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Signed Error (F − A)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('abs_error_mw')}
                    className="py-3 px-3 text-right cursor-pointer hover:text-slate-900"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>|Error| (MW)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center">Status / Cutoff Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hourlyData?.records.map((r) => {
                  const isUnmatched = !r.matched;
                  return (
                    <tr
                      key={r.delivery_hour}
                      onClick={() => setSelectedVintageHour(r.delivery_hour)}
                      className={`hover:bg-blue-50/70 cursor-pointer transition-colors ${
                        selectedVintageHour === r.delivery_hour ? 'bg-blue-50/90 font-medium' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                        {formatUTCDate(r.delivery_hour)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {r.publishTime_utc ? (
                          formatUTCDate(r.publishTime_utc)
                        ) : (
                          <span className="text-amber-700 italic">No forecast pre-cutoff</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {r.lead_time_hours !== null && r.lead_time_hours !== undefined
                          ? `${r.lead_time_hours.toFixed(1)}h`
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                        {r.actual_mw !== null ? formatNumber(r.actual_mw, 1) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-700 font-semibold">
                        {r.forecast_mw !== null ? formatNumber(r.forecast_mw, 1) : '—'}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-bold ${
                          r.error_mw !== null && r.error_mw > 0
                            ? 'text-amber-700'
                            : r.error_mw !== null && r.error_mw < 0
                            ? 'text-blue-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {r.error_mw !== null
                          ? `${r.error_mw > 0 ? '+' : ''}${formatNumber(r.error_mw, 1)}`
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-900 font-semibold">
                        {r.abs_error_mw !== null ? formatNumber(r.abs_error_mw, 1) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isUnmatched ? (
                          <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-mono font-semibold">
                            Boundary Missing
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-mono font-semibold">
                            Eligible Vintage
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-slate-100 text-xs text-slate-600">
            <span className="font-mono text-center sm:text-left">
              Page {hourlyData?.page || 1} of {hourlyData?.total_pages || 1} (
              {hourlyData?.total_records || 0} total delivery records)
            </span>
            <div className="flex space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 flex items-center space-x-1 font-medium min-h-[36px]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <button
                disabled={!hourlyData || page >= hourlyData.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 flex items-center space-x-1 font-medium min-h-[36px]"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </ChartCard>

      {/* ── MODAL: VINTAGE DRILL-DOWN MODAL ───────────────────────────── */}
      {selectedVintageHour && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="vintage-modal-title"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setSelectedVintageHour(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full p-4 sm:p-6 space-y-4 max-h-[85vh] supports-[max-height:85dvh]:max-h-[85dvh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 id="vintage-modal-title" className="text-sm sm:text-base font-bold text-slate-900">
                  Forecast Vintages Audit Drill-Down
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 font-mono mt-0.5">
                  Delivery Hour: {formatUTCDate(selectedVintageHour)}
                </p>
              </div>
              <button
                onClick={() => setSelectedVintageHour(null)}
                aria-label="Close modal"
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 rounded-md min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto touch-scroll overflow-x-auto">
              {loadingVintages ? (
                <div className="text-xs text-slate-400 py-10 text-center font-mono">Loading vintages...</div>
              ) : !vintages || vintages.length === 0 ? (
                <div className="text-xs text-amber-700 bg-amber-50 p-4 rounded-lg">
                  No forecast vintages published in the dataset for this delivery hour.
                </div>
              ) : (
                <table className="w-full text-left text-xs min-w-[480px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] bg-slate-50">
                      <th className="py-2 px-3">Publication Time (UTC)</th>
                      <th className="py-2 px-3 text-right">Forecast (MW)</th>
                      <th className="py-2 px-3 text-right">Lead Time (Hours)</th>
                      <th className="py-2 px-3 text-center">Cutoff Status ({cutoffHours}h)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vintages.map((v, i) => (
                      <tr key={i} className={v.is_eligible ? 'bg-emerald-50/40' : ''}>
                        <td className="py-2 px-3 font-mono">{formatUTCDate(v.publishTime)}</td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-900 font-mono">
                          {formatNumber(v.generation_mw, 2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">{v.lead_time_hours.toFixed(1)}h</td>
                        <td className="py-2 px-3 text-center">
                          {v.is_eligible ? (
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold font-mono">
                              Eligible (Selected)
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-mono">
                              Ineligible (After Cutoff)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedVintageHour(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-md min-h-[36px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
