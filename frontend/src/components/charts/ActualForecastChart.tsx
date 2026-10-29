import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import type { ComparisonRecord } from '../../types/api';
import { formatShortDate, formatUTCDate, formatNumber } from '../../lib/formatters';

interface Props {
  data: ComparisonRecord[];
  heightClass?: string;
}

type PeriodFilter = 'all' | 'w1' | 'w2' | 'w3' | 'w4' | 'w5';

export const ActualForecastChart: React.FC<Props> = ({ data, heightClass = 'h-80' }) => {
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [viewMode, setViewMode] = useState<'generation' | 'error'>('generation');

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (period === 'w1') return data.slice(0, 168); // Jan 1 - Jan 7
    if (period === 'w2') return data.slice(168, 336); // Jan 8 - Jan 14
    if (period === 'w3') return data.slice(336, 504); // Jan 15 - Jan 21
    if (period === 'w4') return data.slice(504, 672); // Jan 22 - Jan 28
    if (period === 'w5') return data.slice(672); // Jan 29 - Jan 31
    return data;
  }, [data, period]);

  return (
    <div className="w-full flex flex-col h-full min-w-0">
      {/* Controls Bar: Time Slices and View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
        {/* Period Filter Buttons (Horizontally scrollable on mobile) */}
        <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded text-[11px] font-medium text-slate-600 overflow-x-auto touch-scroll max-w-full shrink-0">
          <button
            onClick={() => setPeriod('all')}
            className={`px-2 py-1 sm:py-0.5 rounded whitespace-nowrap ${
              period === 'all' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Full Month (744h)
          </button>
          <button
            onClick={() => setPeriod('w1')}
            className={`px-2 py-1 sm:py-0.5 rounded whitespace-nowrap ${
              period === 'w1' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            01–07 Jan
          </button>
          <button
            onClick={() => setPeriod('w2')}
            className={`px-2 py-1 sm:py-0.5 rounded whitespace-nowrap ${
              period === 'w2' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            08–14 Jan
          </button>
          <button
            onClick={() => setPeriod('w3')}
            className={`px-2 py-1 sm:py-0.5 rounded whitespace-nowrap ${
              period === 'w3' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            15–21 Jan
          </button>
          <button
            onClick={() => setPeriod('w4')}
            className={`px-2 py-1 sm:py-0.5 rounded whitespace-nowrap ${
              period === 'w4' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            22–28 Jan
          </button>
          <button
            onClick={() => setPeriod('w5')}
            className={`px-2 py-1 sm:py-0.5 rounded whitespace-nowrap ${
              period === 'w5' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            29–31 Jan
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded text-[11px] font-medium text-slate-600 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setViewMode('generation')}
            className={`px-2.5 py-1 sm:py-0.5 rounded whitespace-nowrap ${
              viewMode === 'generation'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            Actual vs Forecast
          </button>
          <button
            onClick={() => setViewMode('error')}
            className={`px-2.5 py-1 sm:py-0.5 rounded whitespace-nowrap ${
              viewMode === 'error'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            Signed Error (F − A)
          </button>
        </div>
      </div>

      {/* Main Responsive Chart */}
      <div className={`w-full min-w-0 ${heightClass}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={filteredData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="delivery_hour"
              tickFormatter={(v) => formatShortDate(v)}
              tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }}
              minTickGap={35}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace' }}
              tickFormatter={(v) => `${(v / 1000).toFixed(1)}GW`}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={{ stroke: '#cbd5e1' }}
              width={42}
            />

            {viewMode === 'error' && (
              <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 3" />
            )}

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const row = payload[0].payload as ComparisonRecord;
                const isOver = (row.error_mw ?? 0) > 0;

                return (
                  <div className="bg-white border border-slate-300 rounded shadow-md p-3 text-xs font-sans min-w-[240px]">
                    <div className="font-mono font-bold text-slate-900 border-b border-slate-100 pb-1.5 mb-2">
                      Delivery: {formatUTCDate(row.delivery_hour)}
                    </div>
                    {row.publishTime_utc ? (
                      <div className="text-[11px] text-slate-500 mb-2">
                        <span className="font-semibold text-slate-700">Published:</span>{' '}
                        <span className="font-mono">{formatUTCDate(row.publishTime_utc)}</span>
                        {row.lead_time_hours !== null && row.lead_time_hours !== undefined && (
                          <span className="ml-1 text-blue-600 font-mono">
                            ({row.lead_time_hours.toFixed(1)}h lead)
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mb-2">
                        Missing Forecast at Cutoff (Boundary Window)
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Actual Generation:</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {row.actual_mw !== null ? `${formatNumber(row.actual_mw, 1)} MW` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Forecast Available:</span>
                        <span className="font-mono font-semibold text-blue-600">
                          {row.forecast_mw !== null ? `${formatNumber(row.forecast_mw, 1)} MW` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                        <span className="text-slate-600 font-medium">Signed Error (F − A):</span>
                        <span
                          className={`font-mono font-bold ${
                            isOver ? 'text-amber-700' : 'text-blue-700'
                          }`}
                        >
                          {row.error_mw !== null
                            ? `${row.error_mw > 0 ? '+' : ''}${formatNumber(row.error_mw, 1)} MW`
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />

            <Legend
              verticalAlign="bottom"
              height={28}
              iconType="plainline"
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
            />

            {viewMode === 'generation' ? (
              <>
                <Line
                  type="monotone"
                  dataKey="actual_mw"
                  stroke="#0f172a"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: '#0f172a', strokeWidth: 1 }}
                  name="Actual Generation (MW)"
                />
                <Line
                  type="monotone"
                  dataKey="forecast_mw"
                  stroke="#2563eb"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  dot={false}
                  activeDot={{ r: 4, stroke: '#2563eb', strokeWidth: 1 }}
                  name="Forecast Available at Cutoff (MW)"
                />
              </>
            ) : (
              <Line
                type="monotone"
                dataKey="error_mw"
                stroke="#d97706"
                strokeWidth={1.8}
                dot={false}
                activeDot={{ r: 4 }}
                name="Forecast Error (Forecast − Actual) [MW]"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Analytical Footnote */}
      <div className="mt-2 flex flex-wrap items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
        <span>
          Solid line = Actual National Wind Generation (FUELHH). Dashed blue line = Elexon Forecast available at decision cutoff.
        </span>
        <span className="font-mono text-slate-400">
          Source: Elexon BMRS · Strict UTC
        </span>
      </div>
    </div>
  );
};

